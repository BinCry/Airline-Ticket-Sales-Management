package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.BookingHoldRequest;
import com.qlvmb.airticket.domain.dto.BookingHoldResponse;
import com.qlvmb.airticket.domain.dto.BookingOverviewResponse;
import com.qlvmb.airticket.domain.dto.PaymentCallbackRequest;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BookingRepository;
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
class BackofficeSalesServiceTest {

  @Mock
  private BookingService bookingService;

  @Mock
  private PaymentService paymentService;

  @Mock
  private BookingRepository bookingRepository;

  @Mock
  private UserAccountRepository userAccountRepository;

  @Mock
  private AuditLogRepository auditLogRepository;

  private BackofficeSalesService backofficeSalesService;

  @BeforeEach
  void setUp() {
    backofficeSalesService = new BackofficeSalesService(
        bookingService,
        paymentService,
        bookingRepository,
        userAccountRepository,
        auditLogRepository
    );
  }

  @Test
  void getBookings_shouldReturnSingleBookingWhenBookingCodeProvided() {
    BookingOverviewResponse expected = createOverview("QC5001", "held", "pending");
    when(bookingService.getBookingOverview("QC5001")).thenReturn(expected);

    List<BookingOverviewResponse> responses = backofficeSalesService.getBookings("qc5001", null, null);

    assertThat(responses).containsExactly(expected);
  }

  @Test
  void getBookings_shouldRespectRecentOrderWhenSearchByEmail() {
    BookingEntity bookingOne = createBookingEntity(1L, "QC5001");
    BookingEntity bookingTwo = createBookingEntity(2L, "QC5002");
    BookingOverviewResponse responseOne = createOverview("QC5001", "held", "pending");
    BookingOverviewResponse responseTwo = createOverview("QC5002", "ticketed", "paid");

    when(bookingRepository.findRecentIdsByContactEmail(eq("khach.hang@gmail.com"), any()))
        .thenReturn(List.of(2L, 1L));
    when(bookingRepository.findAllDetailedByIdIn(List.of(2L, 1L)))
        .thenReturn(List.of(bookingOne, bookingTwo));
    when(bookingService.mapOverviewResponse(bookingOne)).thenReturn(responseOne);
    when(bookingService.mapOverviewResponse(bookingTwo)).thenReturn(responseTwo);

    List<BookingOverviewResponse> responses = backofficeSalesService.getBookings(
        null,
        "khach.hang@gmail.com",
        20
    );

    assertThat(responses).containsExactly(responseTwo, responseOne);
  }

  @Test
  void createBooking_shouldCreateAuditLog() {
    BookingHoldRequest request = createHoldRequest();
    BookingHoldResponse holdResponse = new BookingHoldResponse(
        "QC6001",
        "held",
        OffsetDateTime.parse("2026-05-18T04:00:00Z"),
        OffsetDateTime.parse("2026-05-18T03:45:00Z"),
        "one_way",
        new BookingHoldResponse.ContactResponse("Trần Văn B", "khach.hang@gmail.com", "0911222333"),
        List.of(
            new BookingHoldResponse.PassengerResponse(
                "Trần Văn B",
                "adult",
                LocalDate.of(1990, 2, 10),
                "CCCD",
                "079123456789"
            )
        ),
        List.of(),
        List.of(),
        new BookingHoldResponse.PriceSummaryResponse(1200000L, 0L, 0L, 1200000L, "VND", null)
    );

    when(bookingService.createHold(request)).thenReturn(holdResponse);
    when(userAccountRepository.findOneWithRolesById(201L)).thenReturn(Optional.of(createActorAccount()));

    BookingHoldResponse response = backofficeSalesService.createBooking(actor(), request);

    assertThat(response.bookingCode()).isEqualTo("QC6001");
    verify(auditLogRepository).save(any(AuditLogEntity.class));
  }

  @Test
  void createBooking_shouldRejectWhenFlightPastPublicCutoff() {
    BookingHoldRequest request = createHoldRequest();
    when(userAccountRepository.findOneWithRolesById(201L)).thenReturn(Optional.of(createActorAccount()));
    when(bookingService.createHold(request))
        .thenThrow(new BadRequestException("Chuyến bay hiện không còn mở bán công khai."));

    assertThatThrownBy(() -> backofficeSalesService.createBooking(actor(), request))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Chuyến bay hiện không còn mở bán công khai.");
    verify(auditLogRepository, never()).save(any(AuditLogEntity.class));
  }

  @Test
  void issueTicket_shouldUsePaymentCallbackAndCreateAuditLog() {
    when(userAccountRepository.findOneWithRolesById(201L)).thenReturn(Optional.of(createActorAccount()));
    when(paymentService.handlePaymentCallback(any(PaymentCallbackRequest.class)))
        .thenReturn(createOverview("QC6001", "ticketed", "paid"));

    BookingOverviewResponse response = backofficeSalesService.issueTicket(actor(), "qc6001");

    assertThat(response.bookingCode()).isEqualTo("QC6001");
    verify(paymentService).handlePaymentCallback(any(PaymentCallbackRequest.class));
    verify(auditLogRepository).save(any(AuditLogEntity.class));
  }

  private AuthenticatedUser actor() {
    return new AuthenticatedUser(
        201L,
        "anmycfs2006@gmail.com",
        "Nhân viên chăm sóc khách hàng",
        List.of("customer_support"),
        List.of("backoffice.sales", "backoffice.support", "backoffice.finance", "backoffice.cms")
    );
  }

  private UserAccountEntity createActorAccount() {
    UserAccountEntity userAccount = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(userAccount, "id", 201L);
    ReflectionTestUtils.setField(userAccount, "email", "anmycfs2006@gmail.com");
    ReflectionTestUtils.setField(userAccount, "displayName", "Nhân viên chăm sóc khách hàng");
    return userAccount;
  }

  private BookingEntity createBookingEntity(Long id, String bookingCode) {
    BookingEntity booking = BeanUtils.instantiateClass(BookingEntity.class);
    ReflectionTestUtils.setField(booking, "id", id);
    ReflectionTestUtils.setField(booking, "bookingCode", bookingCode);
    return booking;
  }

  private BookingOverviewResponse createOverview(String bookingCode, String status, String paymentStatus) {
    return new BookingOverviewResponse(
        bookingCode,
        status,
        paymentStatus,
        OffsetDateTime.parse("2026-05-18T04:00:00Z"),
        null,
        "one_way",
        List.of("Giữ chỗ thành công"),
        List.of(),
        null,
        List.of(),
        List.of(),
        List.of(),
        List.of(),
        List.of(),
        null,
        List.of("Chuyển khoản SePay"),
        new BookingOverviewResponse.PriceSummaryItem(1200000L, 0L, 0L, 1200000L, "VND", null)
    );
  }

  private BookingHoldRequest createHoldRequest() {
    return new BookingHoldRequest(
        "one_way",
        new BookingHoldRequest.ContactRequest("Trần Văn B", "khach.hang@gmail.com", "0911222333"),
        List.of(
            new BookingHoldRequest.PassengerRequest(
                "Trần Văn B",
                "adult",
                LocalDate.of(1990, 2, 10),
                "CCCD",
                "079123456789"
            )
        ),
        List.of(new BookingHoldRequest.SegmentRequest(20101L)),
        List.of(),
        List.of()
    );
  }
}
