package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.BackofficeFlightCreateRequest;
import com.qlvmb.airticket.domain.dto.BackofficeFlightOperationUpdateRequest;
import com.qlvmb.airticket.domain.dto.BackofficeFlightOperationsResponse;
import com.qlvmb.airticket.domain.entity.AirportEntity;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.repository.AirportRepository;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.FlightRepository;
import com.qlvmb.airticket.repository.MemberVoucherRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class BackofficeOperationsServiceTest {

  @Mock
  private FlightRepository flightRepository;

  @Mock
  private AirportRepository airportRepository;

  @Mock
  private BookingRepository bookingRepository;

  @Mock
  private MemberVoucherRepository memberVoucherRepository;

  @Mock
  private UserAccountRepository userAccountRepository;

  @Mock
  private AuditLogRepository auditLogRepository;

  @Mock
  private ProductCatalogService productCatalogService;

  @Mock
  private NotificationOutboxService notificationOutboxService;

  private BackofficeOperationsService backofficeOperationsService;

  @BeforeEach
  void setUp() {
    backofficeOperationsService = new BackofficeOperationsService(
        flightRepository,
        airportRepository,
        bookingRepository,
        memberVoucherRepository,
        userAccountRepository,
        auditLogRepository,
        productCatalogService,
        notificationOutboxService
    );
  }

  @Test
  void updateFlight_shouldUpdateStatusGateNoteAndAudit() {
    FlightEntity flight = createFlight(
        18L,
        "VN5201",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        OffsetDateTime.parse("2026-05-23T01:30:00Z")
    );
    UserAccountEntity actorAccount = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(actorAccount, "id", 301L);

    when(flightRepository.findDetailedById(18L)).thenReturn(Optional.of(flight));
    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount));
    when(auditLogRepository.save(any(AuditLogEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BackofficeFlightOperationsResponse.FlightItem item = backofficeOperationsService.updateFlight(
        actor(),
        18L,
        new BackofficeFlightOperationUpdateRequest("delayed", "g8", "Tre do dieu phoi tau bay.", false)
    );

    assertThat(item.status()).isEqualTo("delayed");
    assertThat(item.statusLabel()).isEqualTo("Trễ");
    assertThat(item.gate()).isEqualTo("G8");
    assertThat(item.note()).isEqualTo("Tre do dieu phoi tau bay.");
    assertThat(item.salesOpen()).isFalse();
    verify(auditLogRepository).save(any(AuditLogEntity.class));
  }

  @Test
  void getFlights_shouldReturnEmptyWhenDateDoesNotMatchCode() {
    FlightEntity flight = createFlight(
        18L,
        "VN5201",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        OffsetDateTime.parse("2026-05-23T01:30:00Z")
    );
    when(flightRepository.findStatusByCode("VN5201")).thenReturn(Optional.of(flight));

    BackofficeFlightOperationsResponse response = backofficeOperationsService.getFlights(
        "VN5201",
        LocalDate.of(2026, 5, 24)
    );

    assertThat(response.flights()).isEmpty();
  }

  @Test
  void createFlight_shouldCreateFareInventoryAndAudit() {
    UserAccountEntity actorAccount = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(actorAccount, "id", 301L);
    AirportEntity originAirport = createAirport("SGN", "Thanh pho Ho Chi Minh");
    AirportEntity destinationAirport = createAirport("HAN", "Ha Noi");

    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount));
    when(flightRepository.existsByCodeIgnoreCase("VN6201")).thenReturn(false);
    when(airportRepository.findByCodeIgnoreCase("SGN")).thenReturn(Optional.of(originAirport));
    when(airportRepository.findByCodeIgnoreCase("HAN")).thenReturn(Optional.of(destinationAirport));
    when(productCatalogService.normalizeFareFamily("pho_thong_tiet_kiem")).thenReturn("pho_thong_tiet_kiem");
    when(productCatalogService.requireFareMeta("pho_thong_tiet_kiem"))
        .thenReturn(new ProductCatalogService.FareMeta("Pho thong tiet kiem", List.of("7kg")));
    when(auditLogRepository.save(any(AuditLogEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(flightRepository.save(any(FlightEntity.class))).thenAnswer(invocation -> {
      FlightEntity saved = invocation.getArgument(0);
      ReflectionTestUtils.setField(saved, "id", 88L);
      return saved;
    });

    BackofficeFlightCreateRequest request = new BackofficeFlightCreateRequest(
        "vn6201",
        "sgn",
        "han",
        OffsetDateTime.parse("2026-06-10T01:00:00Z"),
        OffsetDateTime.parse("2026-06-10T03:00:00Z"),
        "g12",
        "Chuyen bay bo sung.",
        true,
        List.of(new BackofficeFlightCreateRequest.FareInventoryItem("pho_thong_tiet_kiem", 40, 1200000L))
    );

    BackofficeFlightOperationsResponse.FlightItem item = backofficeOperationsService.createFlight(actor(), request);

    assertThat(item.code()).isEqualTo("VN6201");
    assertThat(item.originCode()).isEqualTo("SGN");
    assertThat(item.destinationCode()).isEqualTo("HAN");
    verify(flightRepository).save(any(FlightEntity.class));
    verify(auditLogRepository).save(any(AuditLogEntity.class));
  }

  @Test
  void cancelFlight_shouldCloseSalesAndWriteAudit() {
    FlightEntity flight = createFlight(
        18L,
        "VN5201",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        OffsetDateTime.parse("2026-05-23T01:30:00Z")
    );
    UserAccountEntity actorAccount = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(actorAccount, "id", 301L);

    when(flightRepository.findDetailedIncludingHiddenById(18L)).thenReturn(Optional.of(flight));
    when(bookingRepository.findAllDetailedByFlightId(18L)).thenReturn(List.of());
    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount));
    when(auditLogRepository.save(any(AuditLogEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BackofficeFlightOperationsResponse.FlightItem item = backofficeOperationsService.cancelFlight(actor(), 18L);

    assertThat(item.status()).isEqualTo("cancelled");
    assertThat(item.salesOpen()).isFalse();
    verify(bookingRepository).findAllDetailedByFlightId(18L);
    verify(auditLogRepository).save(any(AuditLogEntity.class));
  }

  @Test
  void hideCancelledFlight_shouldHideCancelledRecordAndAudit() {
    FlightEntity flight = createFlight(
        18L,
        "VN5201",
        "SGN",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "Ha Noi",
        OffsetDateTime.parse("2026-05-23T01:30:00Z")
    );
    flight.markCancelled("Da huy do dieu hanh.", OffsetDateTime.parse("2026-05-20T01:00:00Z"));
    UserAccountEntity actorAccount = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(actorAccount, "id", 301L);

    when(flightRepository.findDetailedIncludingHiddenById(18L)).thenReturn(Optional.of(flight));
    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount));
    when(auditLogRepository.save(any(AuditLogEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    backofficeOperationsService.hideCancelledFlight(actor(), 18L);

    assertThat(flight.getHiddenAt()).isNotNull();
    verify(auditLogRepository).save(any(AuditLogEntity.class));
  }

  private AuthenticatedUser actor() {
    return new AuthenticatedUser(
        301L,
        "bincry2006@gmail.com",
        "Operations",
        List.of("operations_staff"),
        List.of("backoffice.operations", "backoffice.admin")
    );
  }

  private FlightEntity createFlight(
      Long flightId,
      String code,
      String originCode,
      String originCity,
      String destinationCode,
      String destinationCity,
      OffsetDateTime departureAt
  ) {
    FlightEntity flight = BeanUtils.instantiateClass(FlightEntity.class);
    ReflectionTestUtils.setField(flight, "id", flightId);
    ReflectionTestUtils.setField(flight, "code", code);
    ReflectionTestUtils.setField(flight, "originAirport", createAirport(originCode, originCity));
    ReflectionTestUtils.setField(flight, "destinationAirport", createAirport(destinationCode, destinationCity));
    ReflectionTestUtils.setField(flight, "departureAt", departureAt);
    ReflectionTestUtils.setField(flight, "arrivalAt", departureAt.plusHours(2));
    ReflectionTestUtils.setField(flight, "status", "scheduled");
    ReflectionTestUtils.setField(flight, "salesOpen", true);
    ReflectionTestUtils.setField(flight, "hiddenAt", null);
    ReflectionTestUtils.setField(flight, "cancelledAt", null);
    return flight;
  }

  private AirportEntity createAirport(String code, String cityName) {
    AirportEntity airport = BeanUtils.instantiateClass(AirportEntity.class);
    ReflectionTestUtils.setField(airport, "code", code);
    ReflectionTestUtils.setField(airport, "cityName", cityName);
    return airport;
  }
}
