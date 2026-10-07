package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.qlvmb.airticket.domain.dto.BackofficeFlightOperationUpdateRequest;
import com.qlvmb.airticket.domain.dto.MyLoyaltyResponse;
import com.qlvmb.airticket.domain.entity.*;
import com.qlvmb.airticket.repository.*;
import com.qlvmb.airticket.security.AuthenticatedUser;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@EnabledIfEnvironmentVariable(named = "LOYALTY_TEST_DB_URL", matches = ".+")
@SpringBootTest(classes = LoyaltyPostgresIntegrationTest.TestConfiguration.class,
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {"app.mail.enabled=true", "app.mail.from-email=test@example.com"})
class LoyaltyPostgresIntegrationTest {
  private static final String SCHEMA = "loyalty_test_" + UUID.randomUUID().toString().replace("-", "");

  @Configuration
  @EnableAutoConfiguration
  @EntityScan(basePackageClasses = BookingEntity.class)
  @EnableJpaRepositories(basePackageClasses = BookingRepository.class)
  @Import({LoyaltyEngineService.class, LoyaltyReconciliationService.class, MemberLoyaltyService.class,
      NotificationOutboxService.class, BookingService.class, MemberVoucherService.class,
      ProductCatalogService.class, BackofficeOperationsService.class, SeatMapService.class})
  static class TestConfiguration {
  }

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) {
    properties.add("spring.datasource.url", () -> System.getenv("LOYALTY_TEST_DB_URL"));
    properties.add("spring.datasource.username", () -> System.getenv().getOrDefault("LOYALTY_TEST_DB_USER", "loyalty_test"));
    properties.add("spring.datasource.password", () -> System.getenv().getOrDefault("LOYALTY_TEST_DB_PASSWORD", ""));
    properties.add("spring.flyway.schemas", () -> SCHEMA);
    properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    properties.add("spring.datasource.hikari.connection-init-sql", () -> "set search_path to " + SCHEMA);
  }

  @Autowired LoyaltyEngineService engine;
  @Autowired LoyaltyReconciliationService reconciliation;
  @Autowired MemberLoyaltyService loyalty;
  @Autowired BackofficeOperationsService operations;
  @Autowired NotificationOutboxService notifications;
  @Autowired BookingSegmentRepository segments;
  @Autowired EntityManager em;
  @Autowired JdbcTemplate jdbc;
  @Autowired PlatformTransactionManager transactionManager;
  @MockitoBean JavaMailSender mailSender;
  private TransactionTemplate transaction;

  @BeforeEach
  void beforeEach() {
    transaction = new TransactionTemplate(transactionManager);
  }

  @Test
  void concurrentCreationAndRepeatedSegmentAreAtomic() throws Exception {
    Fixture fixture = fixture(null, 1_250_999, 2, 0, "landed");
    concurrent(fixture.segmentId(), fixture.segmentId());
    engine.processSegment(fixture.segmentId());
    assertPoints(fixture, 2501);
    assertThat(jdbc.queryForObject("select count(*) from member_loyalty_account where user_id=?",
        Long.class, fixture.userId())).isEqualTo(1L);
    assertThat(jdbc.queryForObject("select count(*) from member_loyalty_ledger where booking_segment_id=?",
        Long.class, fixture.segmentId())).isEqualTo(1L);
    assertThatThrownBy(() -> jdbc.update("""
        insert into member_loyalty_ledger (loyalty_account_id, booking_segment_id, entry_type,
            points_delta, balance_after, description)
        select id, ?, 'FLIGHT_EARN', 2501, 2501, 'Trùng chặng'
        from member_loyalty_account where user_id=?
        """, fixture.segmentId(), fixture.userId())).hasMessageContaining("uk_loyalty_flight_earn_segment");
  }

  @Test
  void simultaneousFlightsDoNotLoseUpdates() throws Exception {
    Fixture first = fixture(null, 1_000_000, 1, 0, "landed");
    Fixture second = fixture(first.userId(), 2_000_000, 1, 0, "landed");
    concurrent(first.segmentId(), second.segmentId());
    assertPoints(first, 3000);
    assertThat(jdbc.queryForObject("""
        select count(*) from member_loyalty_ledger ledger join member_loyalty_account account
          on account.id=ledger.loyalty_account_id
        where account.user_id=? and ledger.entry_type='FLIGHT_EARN'
        """, Long.class, first.userId())).isEqualTo(2L);
  }

  @Test
  void cancelledTicketsAndReturnSegmentAreExcludedUntilLanded() {
    Fixture outbound = fixture(null, 1_250_000, 3, 1, "landed");
    Fixture inbound = addReturnSegment(outbound, "departed");
    engine.processSegment(outbound.segmentId());
    engine.processSegment(inbound.segmentId());
    assertPoints(outbound, 2500);
    land(inbound);
    assertPoints(outbound, 5000);
    land(inbound);
    reconciliation.reconcile();
    assertPoints(outbound, 5000);
  }

  @Test
  void eligibilityRequiresMemberPaidBookingAndValidTickets() {
    Fixture anonymous = fixture(null, 1_000_000, 1, 0, "landed");
    jdbc.update("update booking set member_user_id=null where id=?", anonymous.bookingId());
    Fixture removedMember = fixture(null, 1_000_000, 1, 0, "landed");
    jdbc.update("delete from user_role where user_id=?", removedMember.userId());
    Fixture unpaid = fixture(null, 1_000_000, 1, 0, "landed");
    jdbc.update("update booking set payment_status='PENDING' where id=?", unpaid.bookingId());
    Fixture cancelled = fixture(null, 1_000_000, 1, 0, "landed");
    jdbc.update("update booking set status='CANCELLED' where id=?", cancelled.bookingId());
    Fixture empty = fixture(null, 1_000_000, 1, 1, "landed");
    Fixture departed = fixture(null, 1_000_000, 1, 0, "departed");
    for (Fixture fixture : List.of(anonymous, removedMember, unpaid, cancelled, empty, departed)) {
      engine.processSegment(fixture.segmentId());
      assertThat(jdbc.queryForObject("select count(*) from member_loyalty_ledger where booking_segment_id=?",
          Long.class, fixture.segmentId())).isZero();
    }
    assertThat(segments.findUncreditedLandedSegmentIds(null))
        .doesNotContain(anonymous.segmentId(), removedMember.segmentId(), unpaid.segmentId(),
            cancelled.segmentId(), empty.segmentId(), departed.segmentId());
  }

  @Test
  void tierUpgradeIsCommittedBeforeMailAndProgressUsesDatabaseRules() {
    Fixture fixture = fixture(null, 20_500_000, 1, 0, "departed");
    doAnswer(invocation -> {
      SimpleMailMessage message = invocation.getArgument(0);
      assertThat(message.getTo()).containsExactly(fixture.email());
      assertThat(jdbc.queryForObject("select lifetime_points from member_loyalty_account where user_id=?",
          Integer.class, fixture.userId())).isEqualTo(20500);
      return null;
    }).when(mailSender).send(any(SimpleMailMessage.class));
    land(fixture);
    verify(mailSender).send(any(SimpleMailMessage.class));
    MyLoyaltyResponse response = loyalty.getMyLoyalty(auth(fixture));
    assertThat(response.membershipTier()).isEqualTo("Hội viên Vàng");
    assertThat(response.nextTier()).isEqualTo("Hội viên Bạch Kim");
    assertThat(response.pointsToNextTier()).isEqualTo(19500);
    assertThat(response.progressPercent()).isEqualTo(51.25);
    assertThat(response.recentEntries()).extracting(entry -> entry.entryType())
        .contains("FLIGHT_EARN", "TIER_UPGRADE");
    assertThat(jdbc.queryForObject("select count(*) from audit_log where action='member.loyalty.tier_upgrade' and target_id=?",
        Long.class, jdbc.queryForObject("select id::text from member_loyalty_account where user_id=?", String.class,
            fixture.userId()))).isEqualTo(1L);
    assertThat(jdbc.queryForObject("select status from notification_outbox where booking_code=?",
        String.class, fixture.code())).isEqualTo("SENT");
  }

  @Test
  void upgradeOneTierHighestTierAndNoDowngrade() {
    Fixture fixture = fixture(null, 1_000_000, 1, 0, "landed");
    jdbc.update("""
        insert into member_loyalty_account (user_id, membership_tier, point_balance, lifetime_points)
        values (?, 'Hội viên Bạc', 19500, 19500)
        """, fixture.userId());
    engine.processSegment(fixture.segmentId());
    assertThat(loyalty.getMyLoyalty(auth(fixture)).membershipTier()).isEqualTo("Hội viên Vàng");
    Fixture high = fixture(null, 40_000_000, 1, 0, "landed");
    engine.processSegment(high.segmentId());
    MyLoyaltyResponse response = loyalty.getMyLoyalty(auth(high));
    assertThat(response.membershipTier()).isEqualTo("Hội viên Bạch Kim");
    assertThat(response.nextTier()).isNull();
    assertThat(response.nextTierMinPoints()).isNull();
    assertThat(response.pointsToNextTier()).isZero();
    assertThat(response.progressPercent()).isEqualTo(100);
    Fixture retained = fixture(null, 1_000, 1, 0, "landed");
    jdbc.update("insert into member_loyalty_account (user_id, membership_tier) values (?, 'Hội viên Bạch Kim')",
        retained.userId());
    engine.processSegment(retained.segmentId());
    assertThat(loyalty.getMyLoyalty(auth(retained)).membershipTier()).isEqualTo("Hội viên Bạch Kim");
  }

  @Test
  void loyaltyFailureDoesNotRollbackFlightAndReconciliationRetriesOnce() {
    Fixture fixture = fixture(null, 1_000_000, 1, 0, "departed");
    jdbc.execute("alter table member_loyalty_ledger add constraint test_fail_credit check (booking_code <> '"
        + fixture.code() + "')");
    try {
      land(fixture);
      assertThat(jdbc.queryForObject("select status from flight where id=?", String.class, fixture.flightId()))
          .isEqualTo("landed");
      assertThat(jdbc.queryForObject("select count(*) from member_loyalty_account where user_id=?",
          Long.class, fixture.userId())).isZero();
    } finally {
      jdbc.execute("alter table member_loyalty_ledger drop constraint test_fail_credit");
    }
    assertThat(segments.findUncreditedLandedSegmentIds(null)).contains(fixture.segmentId());
    reconciliation.reconcile();
    reconciliation.reconcile();
    assertPoints(fixture, 1000);
  }

  @Test
  void rolledBackFlightDoesNotTriggerLoyaltyAndRolledBackOutboxDoesNotSendMail() {
    Fixture fixture = fixture(null, 1_000_000, 1, 0, "departed");
    assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
      land(fixture);
      throw new IllegalStateException("Hoàn tác trạng thái chuyến");
    })).isInstanceOf(IllegalStateException.class);
    assertThat(jdbc.queryForObject("select status from flight where id=?", String.class, fixture.flightId()))
        .isEqualTo("departed");
    assertThat(jdbc.queryForObject("select count(*) from member_loyalty_account where user_id=?",
        Long.class, fixture.userId())).isZero();
    assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
      notifications.createAndSendLoyaltyTierUpgradeEmail(fixture.email(), fixture.code(), "Bạc → Vàng");
      verifyNoInteractions(mailSender);
      throw new IllegalStateException("Hoàn tác nâng hạng");
    })).isInstanceOf(IllegalStateException.class);
    verifyNoInteractions(mailSender);
    assertThat(jdbc.queryForObject("select count(*) from notification_outbox where booking_code=?",
        Long.class, fixture.code())).isZero();
  }

  @Test
  void missingAccountReportsInitialProgressAndRemovedMemberCannotReadLoyalty() {
    Fixture fixture = fixture(null, 1_000_000, 1, 0, "departed");
    MyLoyaltyResponse response = loyalty.getMyLoyalty(auth(fixture));
    assertThat(response.membershipTier()).isEqualTo("Hội viên");
    assertThat(response.nextTierMinPoints()).isEqualTo(10000);
    assertThat(response.progressPercent()).isZero();
    jdbc.update("delete from user_role where user_id=?", fixture.userId());
    assertThatThrownBy(() -> loyalty.getMyLoyalty(auth(fixture)))
        .isInstanceOf(com.qlvmb.airticket.exception.UnauthorizedException.class);
  }

  @Test
  void changedTierThresholdIsReadFromDatabase() {
    Fixture fixture = fixture(null, 1_234_000, 1, 0, "landed");
    jdbc.update("update loyalty_tier_rule set min_lifetime_points=1234 where tier_name='Hội viên Bạc'");
    try {
      engine.processSegment(fixture.segmentId());
      assertThat(loyalty.getMyLoyalty(auth(fixture)).membershipTier()).isEqualTo("Hội viên Bạc");
    } finally {
      jdbc.update("update loyalty_tier_rule set min_lifetime_points=10000 where tier_name='Hội viên Bạc'");
    }
  }

  private void concurrent(Long first, Long second) throws Exception {
    CountDownLatch start = new CountDownLatch(1);
    try (var executor = Executors.newFixedThreadPool(2)) {
      var futures = List.of(first, second).stream().map(id -> executor.submit(() -> {
        if (!start.await(10, TimeUnit.SECONDS)) { throw new IllegalStateException("Quá hạn đồng bộ test"); }
        engine.processSegment(id);
        return null;
      })).toList();
      start.countDown();
      for (var future : futures) { future.get(20, TimeUnit.SECONDS); }
    }
  }

  private void assertPoints(Fixture fixture, int expected) {
    assertThat(jdbc.queryForObject("select point_balance from member_loyalty_account where user_id=?",
        Integer.class, fixture.userId())).isEqualTo(expected);
    assertThat(jdbc.queryForObject("select lifetime_points from member_loyalty_account where user_id=?",
        Integer.class, fixture.userId())).isEqualTo(expected);
  }

  private AuthenticatedUser auth(Fixture fixture) {
    return new AuthenticatedUser(fixture.userId(), fixture.email(), "Hội viên", List.of("member"), List.of());
  }

  private void land(Fixture fixture) {
    operations.updateFlight(auth(fixture), fixture.flightId(),
        new BackofficeFlightOperationUpdateRequest("landed", "G1", null, false, null));
  }

  private Fixture fixture(Long existingMemberId, long price, int count, int cancelledCount, String status) {
    return transaction.execute(tx -> {
      UserAccountEntity member;
      if (existingMemberId == null) {
        member = UserAccountEntity.register(UUID.randomUUID() + "@example.com", "hash", "Hội viên",
            null, "active", OffsetDateTime.now());
        member.getRoles().add(em.createQuery("select role from RoleEntity role where role.code='member'", RoleEntity.class)
            .getSingleResult());
        em.persist(member);
      } else {
        member = em.find(UserAccountEntity.class, existingMemberId);
      }
      OffsetDateTime now = OffsetDateTime.now();
      FlightEntity flight = newFlight(status);
      BookingEntity booking = BookingEntity.createHold(UUID.randomUUID().toString().substring(0, 6).toUpperCase(),
          "one_way", price * count, 500_000, price * count + 500_000, "VND", now, now.plusMinutes(15));
      booking.assignMember(member.getId());
      booking.assignContact(BookingContactEntity.create(booking, "Liên hệ", "contact@example.com", "0900000000"));
      booking.markTicketed("TEST", now);
      addSegment(booking, flight, price, count, cancelledCount);
      em.persist(booking);
      em.flush();
      return new Fixture(member.getId(), booking.getId(), booking.getSegments().iterator().next().getId(),
          flight.getId(), member.getEmail(), booking.getBookingCode());
    });
  }

  private Fixture addReturnSegment(Fixture outbound, String status) {
    return transaction.execute(tx -> {
      BookingEntity booking = em.find(BookingEntity.class, outbound.bookingId());
      FlightEntity flight = newFlight(status);
      BookingSegmentEntity segment = addSegment(booking, flight, 1_250_000, 2, 0);
      em.flush();
      return new Fixture(outbound.userId(), booking.getId(), segment.getId(), flight.getId(),
          outbound.email(), booking.getBookingCode());
    });
  }

  private FlightEntity newFlight(String status) {
    var airports = em.createQuery("select airport from AirportEntity airport order by airport.id", AirportEntity.class)
        .setMaxResults(2).getResultList();
    FlightEntity flight = FlightEntity.create("LT" + UUID.randomUUID().toString().replace("-", "").substring(0, 12),
        airports.get(0), airports.get(1), OffsetDateTime.now().minusHours(3), OffsetDateTime.now().minusHours(1),
        "G1", null, false);
    flight.updateOperations(status, "G1", null, false);
    flight.addFareInventory(FlightFareInventoryEntity.create(flight, "pho_thong_tiet_kiem", 100, 1_000_000));
    em.persist(flight);
    return flight;
  }

  private BookingSegmentEntity addSegment(BookingEntity booking, FlightEntity flight, long price, int count, int cancelledCount) {
    OffsetDateTime now = OffsetDateTime.now();
    BookingSegmentEntity segment = BookingSegmentEntity.create(booking, flight.getFareInventories().get(0), flight.getCode(),
        "Đi", "Đến", "SGN", "HAN", flight.getDepartureAt(), flight.getArrivalAt(), "pho_thong_tiet_kiem",
        "Phổ thông", price, count, price * count, now);
    booking.addSegment(segment);
    for (int index = 0; index < count; index++) {
      BookingPassengerEntity passenger = BookingPassengerEntity.create(booking, "Hành khách", "adult",
          LocalDate.of(1990, 1, 1), "CCCD", UUID.randomUUID().toString(), now);
      booking.addPassenger(passenger);
      TicketEntity ticket = TicketEntity.issue(booking, passenger, segment,
          UUID.randomUUID().toString().replace("-", "").substring(0, 20), now);
      if (index < cancelledCount) { ticket.markCancelled(now); }
      booking.addTicket(ticket);
    }
    return segment;
  }

  private record Fixture(Long userId, Long bookingId, Long segmentId, Long flightId, String email, String code) {
  }
}
