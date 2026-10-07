package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.dto.*;
import com.qlvmb.airticket.domain.entity.*;
import com.qlvmb.airticket.domain.mapper.FlightSearchMapper;
import com.qlvmb.airticket.exception.*;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@EnabledIfEnvironmentVariable(named = "LOYALTY_TEST_DB_URL", matches = ".+")
@SpringBootTest(classes = SeatMapPostgresIntegrationTest.TestConfiguration.class,
    webEnvironment = SpringBootTest.WebEnvironment.NONE)
class SeatMapPostgresIntegrationTest {
  private static final String SCHEMA = "seat_test_" + UUID.randomUUID().toString().replace("-", "");
  @Configuration @EnableAutoConfiguration
  @EntityScan(basePackageClasses = BookingEntity.class)
  @EnableJpaRepositories(basePackageClasses = BookingRepository.class)
  @Import({SeatMapService.class, AircraftOperationsService.class, BookingService.class,
      CheckinService.class, ProductCatalogService.class, FlightSearchService.class,
      FlightSearchMapper.class, BackofficeOperationsService.class, FinanceService.class, PaymentService.class})
  static class TestConfiguration {}

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) {
    properties.add("spring.datasource.url", () -> System.getenv("LOYALTY_TEST_DB_URL"));
    properties.add("spring.datasource.username", () -> System.getenv().getOrDefault("LOYALTY_TEST_DB_USER", "loyalty_test"));
    properties.add("spring.datasource.password", () -> System.getenv().getOrDefault("LOYALTY_TEST_DB_PASSWORD", ""));
    properties.add("spring.flyway.schemas", () -> SCHEMA);
    properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    properties.add("spring.datasource.hikari.connection-init-sql", () -> "set search_path to " + SCHEMA);
  }
  @Autowired SeatMapService seats;
  @Autowired AircraftOperationsService aircraft;
  @Autowired BookingService bookings;
  @Autowired CheckinService checkin;
  @Autowired BackofficeOperationsService operations;
  @Autowired FlightSearchService search;
  @Autowired FinanceService finance;
  @Autowired PaymentService payments;
  @Autowired JdbcTemplate jdbc;
  @Autowired EntityManager em;
  @Autowired PlatformTransactionManager txManager;
  @MockitoBean MemberVoucherService vouchers;
  @MockitoBean NotificationOutboxService notifications;
  private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

  // Kịch bản 1, 15, 18: cabin thật, bảo mật dữ liệu khách và lỗi cấu hình.
  @Test void seatMapUsesDatabaseLayoutAndDoesNotExposeOwners() throws Exception {
    long flight = flight(null);
    String code = hold(flight, "12A");
    var map = seats.getSeatMap(flight);
    assertThat(map.seats()).hasSize(168);
    assertThat(occupied(flight, "12A")).isTrue();
    String json = mapper.writeValueAsString(map);
    assertThat(json).doesNotContain(code, "private@example.com", "fullName", "passengerName", "bookingCode", "passengerId");
    assertThat(search.getBookingOptions(flight).seats()).hasSize(168);
    jdbc.update("update flight set aircraft_id=null where id=?", flight);
    assertThatThrownBy(() -> seats.getSeatMap(flight)).isInstanceOf(ConflictException.class)
        .hasMessageContaining("chưa được cấu hình tàu bay");
    assertThatThrownBy(() -> hold(flight, "12B")).isInstanceOf(ConflictException.class);
  }

  // Kịch bản 2, 14, 17: gán tàu khác, trạng thái bảo trì và sơ đồ từng chặng.
  @Test void aircraftSwitchAndRoundTripUseSeparateLayouts() {
    long outbound = flight(null), inbound = flight(null);
    var small = plane(layout(List.of(new SeatMapResponse.Row(12,ProductCatalogService.FARE_SAVER,List.of("A","F"))), List.of()));
    switchAircraft(inbound, small.id());
    assertThat(seats.getSeatMap(inbound).seats()).hasSize(2);
    assertThat(search.getBookingOptions(inbound).fareOptions().stream()
        .filter(f -> f.fareFamily().equals(ProductCatalogService.FARE_SAVER)).findFirst().orElseThrow().rowStart()).isEqualTo(12);
    var request = request(List.of(outbound,inbound), List.of(List.of("12A"),List.of("12F")),ProductCatalogService.FARE_SAVER);
    String code = bookings.createHold(request).bookingCode();
    assertThat(bookings.getBookingOverview(code).segments()).extracting(BookingOverviewResponse.SegmentItem::flightId)
        .containsExactly(outbound,inbound);
    assertThat(occupied(outbound,"12A")).isTrue();
    assertThat(occupied(inbound,"12F")).isTrue();
    aircraft.saveAircraft(small.id(),new AircraftRequest(small.aircraftTypeId(),small.registrationCode(),"MAINTENANCE"));
    assertThatThrownBy(() -> switchAircraft(outbound,small.id())).isInstanceOf(BadRequestException.class)
        .hasMessageContaining("ACTIVE");
  }

  // Kịch bản 3, 4, 5, 16: ghế tồn tại, đúng hạng, không khóa/trùng và JSON nghiêm ngặt.
  @Test void validatesSeatsFareFamilyDuplicatesAndDisabledSeats() {
    long flight = flight(null);
    assertThatThrownBy(() -> hold(flight,"99A")).isInstanceOf(BadRequestException.class);
    assertThatThrownBy(() -> hold(flight,"1A")).isInstanceOf(BadRequestException.class);
    assertThatThrownBy(() -> hold(flight,"12A","12A")).isInstanceOf(BadRequestException.class);
    var restricted = plane(layout(SeatMapTestFixtures.LAYOUT.rows(),List.of("12A")));
    switchAircraft(flight,restricted.id());
    assertThat(seats.getSeatMap(flight).seats().stream().filter(s -> s.seatNumber().equals("12A")).findFirst().orElseThrow().disabled()).isTrue();
    assertThatThrownBy(() -> hold(flight,"12A")).isInstanceOf(BadRequestException.class);
    String code = hold(flight,"12B");
    assertThat(bookings.getBookingOverview(code).seatSelections()).extracting(BookingOverviewResponse.SeatSelectionItem::unitPrice).containsExactly(0L);
    var bad = mapper.createObjectNode();
    bad.putArray("columns").add("A").add("A"); bad.putArray("aislesAfter"); bad.putArray("rows"); bad.putArray("disabledSeats");
    assertThatThrownBy(() -> aircraft.saveType(null,new AircraftTypeRequest("INVALID","Cabin sai",1,bad)))
        .isInstanceOf(BadRequestException.class);
  }

  // Kịch bản 6: hai booking tranh ghế, chỉ một giao dịch commit.
  @Test void concurrentBookingsCannotHoldOneSeatTwice() throws Exception {
    long flight = flight(null);
    assertOneWinner(() -> hold(flight,"12A"),() -> hold(flight,"12A"));
    assertThat(occupied(flight,"12A")).isTrue();
    assertThat(jdbc.queryForObject("""
        select count(*) from booking_seat_selection s join booking_segment bs on bs.id=s.booking_segment_id
        join flight_fare_inventory i on i.id=bs.inventory_id where i.flight_id=? and s.seat_number='12A'
        """,Long.class,flight)).isEqualTo(1L);
  }

  // Kịch bản 7, 8: hold hết hạn/hủy nhả ghế; vé xuất còn chiếm.
  @Test void expirationAndCancellationReleaseSeatsButTicketedKeepsSeat() {
    long flight = flight(null);
    String expired = hold(flight,"12A");
    jdbc.update("update booking set expires_at=now()-interval '1 minute' where booking_code=?",expired);
    assertThat(occupied(flight,"12A")).isFalse();
    String fresh = hold(flight,"12A");
    assertThat(jdbc.queryForObject("select status from booking where booking_code=?",String.class,expired)).isEqualTo("CANCELLED");
    issue(fresh);
    jdbc.update("update booking set expires_at=now()-interval '1 minute' where booking_code=?",fresh);
    assertThat(occupied(flight,"12A")).isTrue();
    jdbc.update("update booking set status='CANCELLED' where booking_code=?",fresh);
    assertThat(occupied(flight,"12A")).isFalse();
  }

  @Test void bookingOptionsCommitsReleasedQuotaAfterExpiredHold() {
    long flight = flight(null);
    int initial = saverQuota(flight);
    String expired = hold(flight,"12A");
    assertThat(saverQuota(flight)).isEqualTo(initial-1);
    jdbc.update("update booking set expires_at=now()-interval '1 minute' where booking_code=?",expired);
    var options = search.getBookingOptions(flight);
    assertThat(jdbc.queryForObject("select status from booking where booking_code=?",String.class,expired)).isEqualTo("CANCELLED");
    assertThat(saverQuota(flight)).isEqualTo(initial);
    assertThat(options.fareOptions().stream().filter(f -> f.fareFamily().equals(ProductCatalogService.FARE_SAVER))
        .findFirst().orElseThrow().seatsLeft()).isEqualTo(initial);
    assertThat(occupied(flight,"12A")).isFalse();
  }

  @Test void lateWebhookCannotResurrectExpiredHoldAfterLegacyCheckinTakesSeat() {
    long flight = flight(null);
    String expired = hold(flight,"12A");
    var session = payments.createPaymentSession(expired);
    String legacy = hold(flight,"12B"), ticket = issue(legacy).getFirst();
    jdbc.update("delete from booking_seat_selection where booking_id=(select id from booking where booking_code=?)",legacy);
    jdbc.update("update booking set expires_at=now()-interval '1 minute' where booking_code=?",expired);
    checkin.completeCheckin(new CheckinCompleteRequest(legacy,List.of(ticket),List.of(
        new CheckinCompleteRequest.SeatSelectionRequest(ticket,"12A"))));
    payments.handleSePayWebhook(webhook(session.referenceCode()),null);
    assertExpiredWithoutTickets(expired);
    assertThat(jdbc.queryForObject("select status from payment_transaction where order_code=?",String.class,session.referenceCode()))
        .isEqualTo("EXPIRED");
    assertThat(seats.occupiedSeats(flight,java.time.OffsetDateTime.now(),null,null)).contains("12A");
    assertThat(jdbc.queryForObject("select count(*) from boarding_pass where seat_number='12A' and ticket_id in (select id from ticket where ticket_number=?)",
        Long.class,ticket)).isEqualTo(1L);
  }

  @Test void webhookReloadsPreloadedBookingAfterConcurrentCancellation() throws Exception {
    long flight = flight(null);
    String code = hold(flight,"12A");
    var session = payments.createPaymentSession(code);
    CountDownLatch loaded = new CountDownLatch(1), changed = new CountDownLatch(1);
    try (var pool = Executors.newSingleThreadExecutor()) {
      var result = pool.submit(() -> new TransactionTemplate(txManager).execute(status -> {
        var transaction = em.createQuery("select t from PaymentTransactionEntity t where t.orderCode=:code",PaymentTransactionEntity.class)
            .setParameter("code",session.referenceCode()).getSingleResult();
        assertThat(transaction.getBooking().getStatus()).isEqualTo("HOLD");
        loaded.countDown(); await(changed);
        payments.handleSePayWebhook(webhook(session.referenceCode()),null);
        return true;
      }));
      assertThat(loaded.await(10,TimeUnit.SECONDS)).isTrue();
      new TransactionTemplate(txManager).executeWithoutResult(status -> {
        seats.lockFlights(List.of(flight));
        jdbc.update("update booking set status='CANCELLED' where booking_code=?",code);
      });
      changed.countDown(); assertThat(result.get(30,TimeUnit.SECONDS)).isTrue();
    }
    assertThat(jdbc.queryForObject("select status from booking where booking_code=?",String.class,code)).isEqualTo("CANCELLED");
    assertThat(jdbc.queryForObject("select count(*) from ticket where booking_id=(select id from booking where booking_code=?)",Long.class,code)).isZero();
    assertThat(jdbc.queryForObject("select status from payment_transaction where order_code=?",String.class,session.referenceCode())).isEqualTo("PENDING");
  }

  @Test void expiredWebhookRacingCheckinStillHasOneOwner() throws Exception {
    long flight = flight(null);
    String expired = hold(flight,"12A"); var session = payments.createPaymentSession(expired);
    String legacy = hold(flight,"12B"), ticket = issue(legacy).getFirst();
    jdbc.update("delete from booking_seat_selection where booking_id=(select id from booking where booking_code=?)",legacy);
    jdbc.update("update booking set expires_at=now()-interval '1 minute' where booking_code=?",expired);
    var results = concurrently(() -> { payments.handleSePayWebhook(webhook(session.referenceCode()),null); return true; },
        () -> checkin.completeCheckin(new CheckinCompleteRequest(legacy,List.of(ticket),List.of(
            new CheckinCompleteRequest.SeatSelectionRequest(ticket,"12A")))));
    assertThat(results).noneMatch(o -> o instanceof Throwable);
    assertExpiredWithoutTickets(expired);
    assertThat(occupied(flight,"12A")).isTrue();
  }

  private int saverQuota(long flight) {
    return jdbc.queryForObject("select available_seats from flight_fare_inventory where flight_id=? and fare_family=?",Integer.class,flight,ProductCatalogService.FARE_SAVER);
  }
  private void assertExpiredWithoutTickets(String code) {
    assertThat(jdbc.queryForObject("select status from booking where booking_code=?",String.class,code)).isEqualTo("CANCELLED");
    assertThat(jdbc.queryForObject("select payment_status from booking where booking_code=?",String.class,code)).isEqualTo("EXPIRED");
    assertThat(jdbc.queryForObject("select count(*) from ticket where booking_id=(select id from booking where booking_code=?)",Long.class,code)).isZero();
  }
  private SePayWebhookRequest webhook(String code) {
    return new SePayWebhookRequest(100000000L+Math.abs((long)code.hashCode()),"TEST",null,null,null,code,null,"in",null,10000000L,0L,"TEST-"+code);
  }

  // Kịch bản 9, 10, 12: preselect, bắt chọn cho vé cũ, đổi nguyên tử rồi phát boarding pass.
  @Test void checkinUsesConfirmedSelectionAndDoesNotAssignRandomSeat() {
    long flight = flight(null);
    String code = hold(flight,"12A");
    String ticket = issue(code).getFirst();
    assertThat(bookings.getBookingOverview(code).tickets().getFirst().currentSeatNumber()).isEqualTo("12A");
    var response = checkin.completeCheckin(new CheckinCompleteRequest(code,List.of(ticket),List.of(
        new CheckinCompleteRequest.SeatSelectionRequest(ticket,"12B"))));
    assertThat(response.boardingPasses().getFirst().seatNumber()).isEqualTo("12B");
    assertThat(occupied(flight,"12A")).isFalse();
    assertThat(occupied(flight,"12B")).isTrue();
    assertThat(bookings.getBookingOverview(code).tickets().getFirst().currentSeatNumber()).isEqualTo("12B");
    assertThatThrownBy(() -> checkin.completeCheckin(new CheckinCompleteRequest(code,List.of(ticket),List.of(
        new CheckinCompleteRequest.SeatSelectionRequest(ticket,"12C"))))).isInstanceOf(BadRequestException.class);
    String legacy = hold(flight,"12C"); String legacyTicket = issue(legacy).getFirst();
    jdbc.update("delete from booking_seat_selection where booking_id=(select id from booking where booking_code=?)",legacy);
    assertThatThrownBy(() -> checkin.completeCheckin(new CheckinCompleteRequest(legacy,List.of(legacyTicket),List.of())))
        .isInstanceOf(BadRequestException.class).hasMessageContaining("Vé chưa có ghế");
    assertThat(checkin.completeCheckin(new CheckinCompleteRequest(legacy,List.of(legacyTicket),List.of(
        new CheckinCompleteRequest.SeatSelectionRequest(legacyTicket,"12C")))).boardingPasses().getFirst().seatNumber()).isEqualTo("12C");
    String unchanged = hold(flight,"12D"); String unchangedTicket = issue(unchanged).getFirst();
    assertThat(checkin.completeCheckin(new CheckinCompleteRequest(unchanged,List.of(unchangedTicket),List.of()))
        .boardingPasses().getFirst().seatNumber()).isEqualTo("12D");
  }

  // Kịch bản 11: check-in và booking dùng cùng khóa toàn chuyến.
  @Test void concurrentCheckinAndBookingCannotTakeSameSeat() throws Exception {
    long flight = flight(null);
    String code = hold(flight,"12B"); String ticket = issue(code).getFirst();
    jdbc.update("delete from booking_seat_selection where booking_id=(select id from booking where booking_code=?)",code);
    assertOneWinner(() -> hold(flight,"12A"),() -> checkin.completeCheckin(new CheckinCompleteRequest(code,List.of(ticket),List.of(
        new CheckinCompleteRequest.SeatSelectionRequest(ticket,"12A")))));
    assertThat(occupied(flight,"12A")).isTrue();
  }

  @Test void concurrentCheckinsCannotTakeSameSeat() throws Exception {
    long flight = flight(null);
    String first = hold(flight,"12B"), second = hold(flight,"12C");
    String firstTicket = issue(first).getFirst(), secondTicket = issue(second).getFirst();
    assertOneWinner(() -> checkin.completeCheckin(new CheckinCompleteRequest(first,List.of(firstTicket),List.of(
        new CheckinCompleteRequest.SeatSelectionRequest(firstTicket,"12A")))),
        () -> checkin.completeCheckin(new CheckinCompleteRequest(second,List.of(secondTicket),List.of(
            new CheckinCompleteRequest.SeatSelectionRequest(secondTicket,"12A")))));
  }

  // Kịch bản 13: đổi tàu, đổi loại tàu vật lý và sửa layout đều bảo toàn ghế/hạng.
  @Test void protectsLiveSeatsWhenChangingAircraftOrLayout() {
    var original = plane(SeatMapTestFixtures.LAYOUT);
    long flight = flight(original.id()); hold(flight,"12A");
    var missing = plane(layout(List.of(new SeatMapResponse.Row(12,ProductCatalogService.FARE_SAVER,List.of("B"))),List.of()));
    assertThatThrownBy(() -> switchAircraft(flight,missing.id())).isInstanceOf(ConflictException.class).hasMessageContaining("12A");
    assertThatThrownBy(() -> aircraft.saveAircraft(original.id(),new AircraftRequest(missing.aircraftTypeId(),original.registrationCode(),"ACTIVE")))
        .isInstanceOf(ConflictException.class).hasMessageContaining("12A");
    var type = aircraft.getTypes().stream().filter(t -> t.id()==original.aircraftTypeId()).findFirst().orElseThrow();
    assertThatThrownBy(() -> aircraft.saveType(type.id(),new AircraftTypeRequest(type.code(),type.name(),28,
        mapper.valueToTree(layout(SeatMapTestFixtures.LAYOUT.rows(),List.of("12A")))))).isInstanceOf(ConflictException.class);
    var wrongFare = plane(layout(List.of(new SeatMapResponse.Row(12,ProductCatalogService.FARE_BUSINESS,List.of("A"))),List.of()));
    assertThatThrownBy(() -> switchAircraft(flight,wrongFare.id())).isInstanceOf(ConflictException.class);
    assertThat(seats.getSeatMap(flight).aircraftId()).isEqualTo(original.id());
  }

  @Test void aircraftSwitchRacingBookingNeverLeavesInvalidSeat() throws Exception {
    long flight = flight(null);
    var small = plane(layout(List.of(new SeatMapResponse.Row(12,ProductCatalogService.FARE_SAVER,List.of("B"))),List.of()));
    List<Object> outcomes = concurrently(() -> hold(flight,"12A"), () -> switchAircraft(flight,small.id()));
    assertThat(outcomes.stream().filter(o -> !(o instanceof Throwable)).count()).isEqualTo(1L);
    if (occupied(flight,"12A")) assertThat(seats.getSeatMap(flight).aircraftId()).isNotEqualTo(small.id());
    else assertThat(seats.getSeatMap(flight).aircraftId()).isEqualTo(small.id());
  }

  @Test void layoutEditRacingBookingNeverDisablesLiveSeat() throws Exception {
    var original = plane(SeatMapTestFixtures.LAYOUT); long flight = flight(original.id());
    var type = aircraft.getTypes().stream().filter(t -> t.id()==original.aircraftTypeId()).findFirst().orElseThrow();
    List<Object> outcomes = concurrently(() -> hold(flight,"12A"), () -> aircraft.saveType(type.id(),new AircraftTypeRequest(
        type.code(),type.name(),28,mapper.valueToTree(layout(SeatMapTestFixtures.LAYOUT.rows(),List.of("12A"))))));
    assertThat(outcomes.stream().filter(o -> !(o instanceof Throwable)).count()).isEqualTo(1L);
    var target = seats.getSeatMap(flight).seats().stream().filter(s -> s.seatNumber().equals("12A")).findFirst().orElseThrow();
    assertThat(target.occupied() && target.disabled()).isFalse();
  }

  @Test void preloadedFlightDoesNotUseStaleAircraftAfterWaitingForLock() throws Exception {
    long flight = flight(null);
    var small = plane(layout(List.of(new SeatMapResponse.Row(12,ProductCatalogService.FARE_SAVER,List.of("B"))),List.of()));
    CountDownLatch loaded = new CountDownLatch(1), changed = new CountDownLatch(1);
    try (var pool = Executors.newSingleThreadExecutor()) {
      var result = pool.submit(() -> new TransactionTemplate(txManager).execute(status -> {
        em.find(FlightEntity.class,flight); loaded.countDown(); await(changed);
        Object outcome = outcome(() -> hold(flight,"12A"));
        if (outcome instanceof Throwable) status.setRollbackOnly();
        return outcome;
      }));
      assertThat(loaded.await(10,TimeUnit.SECONDS)).isTrue(); switchAircraft(flight,small.id()); changed.countDown();
      assertThat(result.get(30,TimeUnit.SECONDS)).isInstanceOf(BadRequestException.class);
    }
  }

  @Test void partialRefundOnlyReleasesCancelledTicketAndBoardingPassIsAuthoritative() {
    long flight = flight(null); String code = hold(flight,"12A","12B");
    List<String> tickets = issue(code);
    bookings.requestRefund(code,new RefundRequestCreateRequest("Hoàn một vé thử",List.of(tickets.getFirst())));
    long refundId = jdbc.queryForObject("select id from refund_request where booking_code=?",Long.class,code);
    finance.approveRefund(refundId);
    assertThat(occupied(flight,"12A")).isFalse(); assertThat(occupied(flight,"12B")).isTrue();
    checkin.completeCheckin(new CheckinCompleteRequest(code,List.of(tickets.getLast()),List.of()));
    jdbc.update("update booking_seat_selection set seat_number='12C' where seat_number='12B' and booking_id=(select id from booking where booking_code=?)",code);
    assertThat(occupied(flight,"12B")).isTrue(); assertThat(occupied(flight,"12C")).isFalse();
    assertThatThrownBy(() -> hold(flight,"12B")).isInstanceOf(ConflictException.class);
  }

  @Test void oppositeRoundTripLockOrderDoesNotDeadlock() throws Exception {
    long first = flight(null), second = flight(null);
    assertOneWinner(() -> bookings.createHold(request(List.of(first,second),List.of(List.of("12A"),List.of("12A")),ProductCatalogService.FARE_SAVER)),
        () -> bookings.createHold(request(List.of(second,first),List.of(List.of("12A"),List.of("12A")),ProductCatalogService.FARE_SAVER)));
  }

  private long flight(Long aircraftId) {
    if (aircraftId==null) aircraftId=jdbc.queryForObject("select id from aircraft where registration_code='VN-DEMO-A321'",Long.class);
    String code = "ST"+UUID.randomUUID().toString().replace("-","").substring(0,12).toUpperCase();
    long id = jdbc.queryForObject("""
        insert into flight(code,origin_airport_id,destination_airport_id,departure_at,arrival_at,status,sales_open,aircraft_id)
        values (?,(select id from airport where code='SGN'),(select id from airport where code='HAN'),
          now()+interval '3 days',now()+interval '3 days 2 hours','scheduled',true,?) returning id
        """,Long.class,code,aircraftId);
    for (String fare: ProductCatalogService.FIXED_FARE_FAMILIES) jdbc.update("""
        insert into flight_fare_inventory(flight_id,fare_family,total_seats,available_seats,price) values (?,?,120,120,1250000)
        """,id,fare);
    return id;
  }

  private String hold(long flight, String... chosen) {
    return bookings.createHold(request(List.of(flight),List.of(List.of(chosen)),ProductCatalogService.FARE_SAVER)).bookingCode();
  }

  private BookingHoldRequest request(List<Long> flights, List<List<String>> chosen, String fare) {
    List<BookingHoldRequest.SegmentRequest> segments = new ArrayList<>();
    List<BookingHoldRequest.SeatSelectionRequest> selections = new ArrayList<>();
    for (int s=0;s<flights.size();s++) {
      long inventory = jdbc.queryForObject("select id from flight_fare_inventory where flight_id=? and fare_family=?",Long.class,flights.get(s),fare);
      segments.add(new BookingHoldRequest.SegmentRequest(inventory,flights.get(s)));
      for (int p=0;p<chosen.get(s).size();p++) selections.add(new BookingHoldRequest.SeatSelectionRequest(inventory,p,s,chosen.get(s).get(p)));
    }
    var passengers = java.util.stream.IntStream.range(0,chosen.getFirst().size()).mapToObj(p -> new BookingHoldRequest.PassengerRequest(
        "Khách thử "+p,"adult",LocalDate.of(1990,1,1),"CCCD","TEST"+p)).toList();
    return new BookingHoldRequest(flights.size()==2?"round_trip":"one_way",new BookingHoldRequest.ContactRequest("Khách riêng","private@example.com","0900000000"),
        passengers,segments,List.of(),selections);
  }

  private List<String> issue(String code) {
    jdbc.update("update booking set status='TICKETED',payment_status='PAID',ticketed_at=now() where booking_code=?",code);
    return jdbc.queryForList("""
        insert into ticket(booking_id,booking_passenger_id,booking_segment_id,ticket_number,status,issued_at,created_at,updated_at)
        select b.id,s.booking_passenger_id,s.booking_segment_id,'ST'||nextval('ticket_id_seq')::text,'ISSUED',now(),now(),now()
        from booking b join booking_seat_selection s on s.booking_id=b.id where b.booking_code=?
        order by s.booking_passenger_id returning ticket_number
        """,String.class,code);
  }

  private boolean occupied(long flight,String seat) {
    return seats.getSeatMap(flight).seats().stream().filter(s -> s.seatNumber().equals(seat)).anyMatch(SeatMapResponse.Seat::occupied);
  }
  private SeatMapResponse.Layout layout(List<SeatMapResponse.Row> rows,List<String> disabled) {
    return new SeatMapResponse.Layout(List.of("A","B","C","D","E","F"),List.of("C"),rows,disabled);
  }
  private AircraftResponse plane(SeatMapResponse.Layout layout) {
    String suffix = UUID.randomUUID().toString().substring(0,8).toUpperCase();
    var type = aircraft.saveType(null,new AircraftTypeRequest("ST-"+suffix,"Cabin thử",layout.rows().size(),mapper.valueToTree(layout)));
    return aircraft.saveAircraft(null,new AircraftRequest(type.id(),"VN-ST-"+suffix,"ACTIVE"));
  }
  private Object switchAircraft(long flight,long plane) {
    long actorId = jdbc.queryForObject("select id from user_account where email='bincry2006@gmail.com'",Long.class);
    return operations.updateFlight(new AuthenticatedUser(actorId,"bincry2006@gmail.com","Vận hành",List.of("operations_staff"),List.of("backoffice.operations")),
        flight,new BackofficeFlightOperationUpdateRequest("scheduled",null,null,true,null,plane));
  }
  private Object outcome(Supplier<?> operation) {
    try { return operation.get(); } catch (RuntimeException ex) { return ex; }
  }
  private List<Object> concurrently(Supplier<?> first,Supplier<?> second) throws Exception {
    CountDownLatch start = new CountDownLatch(1);
    try (var pool = Executors.newFixedThreadPool(2)) {
      var a = pool.submit(() -> { await(start); return outcome(first); });
      var b = pool.submit(() -> { await(start); return outcome(second); }); start.countDown();
      return List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS));
    }
  }
  private void assertOneWinner(Supplier<?> first,Supplier<?> second) throws Exception {
    List<Object> results = concurrently(first,second);
    assertThat(results.stream().filter(o -> !(o instanceof Throwable)).count()).isEqualTo(1L);
    assertThat(results.stream().filter(o -> o instanceof Throwable).toList()).allMatch(o -> o instanceof ConflictException);
  }
  private static void await(CountDownLatch latch) {
    try { if (!latch.await(15,TimeUnit.SECONDS)) throw new IllegalStateException("Quá hạn chờ giao dịch thử"); }
    catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new IllegalStateException(ex); }
  }
}
