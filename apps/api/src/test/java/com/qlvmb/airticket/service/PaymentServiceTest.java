package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.sun.net.httpserver.HttpServer;
import com.qlvmb.airticket.domain.dto.PaymentCallbackRequest;
import com.qlvmb.airticket.domain.dto.PaymentSessionResponse;
import com.qlvmb.airticket.domain.dto.SePayWebhookRequest;
import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingPassengerEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.entity.PaymentTransactionEntity;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.PaymentTransactionRepository;
import java.net.InetSocketAddress;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

  @Mock
  private BookingService bookingService;

  @Mock
  private NotificationOutboxService notificationOutboxService;

  @Mock
  private PaymentTransactionRepository paymentTransactionRepository;

  @Mock
  private MemberVoucherService memberVoucherService;

  private PaymentService paymentService;

  @BeforeEach
  void setUp() {
    paymentService = new PaymentService(
        bookingService,
        memberVoucherService,
        notificationOutboxService,
        paymentTransactionRepository,
        "",
        "",
        "",
        "BIDV",
        "",
        "",
        900,
        "https://userapi.sepay.vn/v2",
        "https://qr.sepay.vn/img"
    );
  }

  @Test
  void createPaymentSession_shouldReturnLocalSePaySession() {
    BookingEntity booking = heldBooking("A6C2P1");
    when(bookingService.findBookingForPayment("A6C2P1")).thenReturn(booking);
    when(bookingService.mapPaymentStatus(BookingEntity.PAYMENT_STATUS_PENDING)).thenReturn("pending");
    when(paymentTransactionRepository.findByBookingId(any())).thenReturn(Optional.empty());
    when(paymentTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(bookingService.generatePaymentReference()).thenReturn("SEPAY-000000000001");

    PaymentSessionResponse response = paymentService.createPaymentSession("A6C2P1");

    assertThat(response.bookingCode()).isEqualTo("A6C2P1");
    assertThat(response.provider()).isEqualTo("sepay");
    assertThat(response.sessionMode()).isEqualTo("local");
    assertThat(response.referenceCode()).isEqualTo("SEPAY-000000000001");
    assertThat(response.paymentStatus()).isEqualTo("pending");
    assertThat(response.discountAmount()).isZero();
    assertThat(response.appliedVoucherCode()).isNull();
  }

  @Test
  void createPaymentSession_shouldReturnQrSessionWhenMbBankConfigured() {
    PaymentService service = new PaymentService(
        bookingService,
        memberVoucherService,
        notificationOutboxService,
        paymentTransactionRepository,
        "",
        "",
        "",
        "MB Bank",
        "0985512831",
        "PHAM MINH QUAN",
        900,
        "https://userapi.sepay.vn/v2",
        "https://qr.sepay.vn/img"
    );
    BookingEntity booking = heldBooking("A6C2P2");
    when(bookingService.findBookingForPayment("A6C2P2")).thenReturn(booking);
    when(bookingService.mapPaymentStatus(BookingEntity.PAYMENT_STATUS_PENDING)).thenReturn("pending");
    when(paymentTransactionRepository.findByBookingId(any())).thenReturn(Optional.empty());
    when(paymentTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(bookingService.generatePaymentReference()).thenReturn("SEPAY-000000000003");

    PaymentSessionResponse response = service.createPaymentSession("A6C2P2");

    assertThat(response.sessionMode()).isEqualTo("live");
    assertThat(response.qrCodeUrl()).contains("qr.sepay.vn/img");
    assertThat(response.qrCodeUrl()).contains("acc=0985512831");
    assertThat(response.qrCodeUrl()).contains("bank=MBBank");
    assertThat(response.qrCodeUrl()).contains("des=SEPAY-000000000003");
  }

  @Test
  void createPaymentSession_shouldReturnQrSessionWhenQrBaseUrlBlank() {
    PaymentService service = new PaymentService(
        bookingService,
        memberVoucherService,
        notificationOutboxService,
        paymentTransactionRepository,
        "",
        "",
        "",
        "MB Bank",
        "0985512831",
        "PHAM MINH QUAN",
        900,
        "https://userapi.sepay.vn/v2",
        ""
    );
    BookingEntity booking = heldBooking("A6C2P9");
    when(bookingService.findBookingForPayment("A6C2P9")).thenReturn(booking);
    when(bookingService.mapPaymentStatus(BookingEntity.PAYMENT_STATUS_PENDING)).thenReturn("pending");
    when(paymentTransactionRepository.findByBookingId(any())).thenReturn(Optional.empty());
    when(paymentTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(bookingService.generatePaymentReference()).thenReturn("SEPAY-000000000009");

    PaymentSessionResponse response = service.createPaymentSession("A6C2P9");

    assertThat(response.sessionMode()).isEqualTo("live");
    assertThat(response.qrCodeUrl()).contains("qr.sepay.vn/img");
  }

  @Test
  void createPaymentSession_shouldReturnLocalSePaySessionWhenBankAccountIdMissing() {
    PaymentService service = new PaymentService(
        bookingService,
        memberVoucherService,
        notificationOutboxService,
        paymentTransactionRepository,
        "token-gia-lap",
        "",
        "",
        "BIDV",
        "",
        "",
        900,
        "https://userapi.sepay.vn/v2",
        "https://qr.sepay.vn/img"
    );
    BookingEntity booking = heldBooking("A6C2P3");
    when(bookingService.findBookingForPayment("A6C2P3")).thenReturn(booking);
    when(bookingService.mapPaymentStatus(BookingEntity.PAYMENT_STATUS_PENDING)).thenReturn("pending");
    when(paymentTransactionRepository.findByBookingId(any())).thenReturn(Optional.empty());
    when(paymentTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(bookingService.generatePaymentReference()).thenReturn("SEPAY-000000000004");

    PaymentSessionResponse response = service.createPaymentSession("A6C2P3");

    assertThat(response.sessionMode()).isEqualTo("local");
    assertThat(response.referenceCode()).isEqualTo("SEPAY-000000000004");
  }

  @Test
  void createPaymentSession_shouldReconcilePendingPaymentFromSePayApiWhenWebhookMissing() throws Exception {
    HttpServer httpServer = HttpServer.create(new InetSocketAddress(0), 0);
    httpServer.createContext("/v2/transactions", exchange -> {
      byte[] responseBytes = """
          {
            "status": "success",
            "data": [
              {
                "id": "tx-01",
                "transaction_content": "130168866747-SEPAY123456789012-CHUYEN TIEN-MOMO",
                "reference_number": "FT26142055418483",
                "amount_in": 1490000,
                "transfer_type": "in"
              }
            ]
          }
          """.getBytes(StandardCharsets.UTF_8);
      exchange.getResponseHeaders().add("Content-Type", "application/json");
      exchange.sendResponseHeaders(200, responseBytes.length);
      exchange.getResponseBody().write(responseBytes);
      exchange.close();
    });
    httpServer.start();

    try {
      PaymentService service = new PaymentService(
          bookingService,
          memberVoucherService,
          notificationOutboxService,
          paymentTransactionRepository,
          "token-gia-lap",
          "",
          "",
          "MB Bank",
          "0985512831",
          "PHAM MINH QUAN",
          900,
          "http://localhost:" + httpServer.getAddress().getPort() + "/v2",
          "https://qr.sepay.vn/img"
      );
      BookingEntity booking = heldBooking("A6C2P8");
      PaymentTransactionEntity transaction = pendingTransaction(booking, "SEPAY-123456789012");
      when(bookingService.findBookingForPayment("A6C2P8")).thenReturn(booking);
      when(paymentTransactionRepository.findByBookingId(any())).thenReturn(Optional.of(transaction));
      when(bookingService.mapPaymentStatus(BookingEntity.PAYMENT_STATUS_PAID)).thenReturn("paid");
      when(bookingService.generateUniqueTicketNumber()).thenReturn("7380000000108");

      PaymentSessionResponse response = service.createPaymentSession("A6C2P8");

      assertThat(response.paymentStatus()).isEqualTo("paid");
      assertThat(booking.isTicketed()).isTrue();
      assertThat(transaction.getStatus()).isEqualTo(PaymentTransactionEntity.STATUS_PAID);
      assertThat(transaction.getExternalReferenceCode()).isEqualTo("FT26142055418483");
    } finally {
      httpServer.stop(0);
    }
  }

  @Test
  void createPaymentSession_shouldReturnExistingSessionWhenBookingAlreadyPaid() {
    BookingEntity booking = heldBooking("A6C2PA");
    PaymentTransactionEntity transaction = pendingTransaction(booking, "SEPAY-123456789999");
    OffsetDateTime paidAt = OffsetDateTime.now();
    transaction.markPaid(123460L, "FT26142420400038", "{}", paidAt);
    booking.markTicketed("FT26142420400038", paidAt);

    when(bookingService.findBookingForPayment("A6C2PA")).thenReturn(booking);
    when(bookingService.mapPaymentStatus(BookingEntity.PAYMENT_STATUS_PAID)).thenReturn("paid");
    when(paymentTransactionRepository.findByBookingId(any())).thenReturn(Optional.of(transaction));

    PaymentSessionResponse response = paymentService.createPaymentSession("A6C2PA");

    assertThat(response.paymentStatus()).isEqualTo("paid");
    assertThat(response.referenceCode()).isEqualTo("SEPAY-123456789999");
    assertThat(response.bankName()).isEqualTo("MB Bank");
    assertThat(response.accountNumber()).isEqualTo("0985512831");
  }

  @Test
  void handlePaymentCallback_shouldTicketBookingAndCreateTicket() {
    BookingEntity booking = heldBooking("A6C2P1");
    when(bookingService.findBookingForPayment("A6C2P1")).thenReturn(booking);
    when(paymentTransactionRepository.findByBookingId(any())).thenReturn(Optional.empty());
    when(paymentTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(bookingService.generatePaymentReference()).thenReturn("SEPAY-000000000001", "SEPAY-000000000002");
    when(bookingService.generateUniqueTicketNumber()).thenReturn("7380000000001");
    when(bookingService.mapOverviewResponse(booking)).thenCallRealMethod();
    when(bookingService.mapBookingStatus(BookingEntity.STATUS_TICKETED)).thenReturn("ticketed");
    when(bookingService.mapPaymentStatus(BookingEntity.PAYMENT_STATUS_PAID)).thenReturn("paid");
    when(bookingService.mapTicketStatus("ISSUED")).thenReturn("issued");

    var response = paymentService.handlePaymentCallback(new PaymentCallbackRequest("A6C2P1", "success"));

    assertThat(response.status()).isEqualTo("ticketed");
    assertThat(response.paymentStatus()).isEqualTo("paid");
    assertThat(response.tickets()).hasSize(1);
  }

  @Test
  void handlePaymentCallback_shouldCreateSeparateTicketsForRoundTripBooking() {
    BookingEntity booking = heldRoundTripBooking("A6C2P7");
    when(bookingService.findBookingForPayment("A6C2P7")).thenReturn(booking);
    when(paymentTransactionRepository.findByBookingId(any())).thenReturn(Optional.empty());
    when(paymentTransactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(bookingService.generatePaymentReference()).thenReturn("SEPAY-000000000007", "SEPAY-000000000008");
    when(bookingService.generateUniqueTicketNumber()).thenReturn("7380000000007", "7380000000008");
    when(bookingService.mapOverviewResponse(booking)).thenCallRealMethod();
    when(bookingService.mapBookingStatus(BookingEntity.STATUS_TICKETED)).thenReturn("ticketed");
    when(bookingService.mapPaymentStatus(BookingEntity.PAYMENT_STATUS_PAID)).thenReturn("paid");
    when(bookingService.mapTicketStatus("ISSUED")).thenReturn("issued");

    var response = paymentService.handlePaymentCallback(new PaymentCallbackRequest("A6C2P7", "success"));

    assertThat(response.tickets()).hasSize(2);
    assertThat(booking.getTickets()).hasSize(2);
  }

  @Test
  void handleSePayWebhook_shouldTicketBookingWhenContentContainsPaymentCode() {
    BookingEntity booking = heldBooking("A6C2W1");
    PaymentTransactionEntity transaction = pendingTransaction(booking, "SEPAY-123456789012");
    SePayWebhookRequest request = new SePayWebhookRequest(
        123456L,
        "MBBank",
        "2026-05-22 01:21:00",
        "0985512831",
        null,
        null,
        "SEPAY123456789012- Ma GD ACSP/ II296625",
        "in",
        null,
        booking.getTotalAmount(),
        0L,
        "FT123456789"
    );

    when(paymentTransactionRepository.findByOrderCodeIgnoreCase("SEPAY-123456789012"))
        .thenReturn(Optional.of(transaction));
    when(bookingService.lockDetailedBooking(eq("A6C2W1"), any())).thenReturn(booking);
    when(bookingService.generateUniqueTicketNumber()).thenReturn("7380000000101");

    paymentService.handleSePayWebhook(request, null);

    assertThat(booking.isTicketed()).isTrue();
    assertThat(booking.getPaymentStatus()).isEqualTo(BookingEntity.PAYMENT_STATUS_PAID);
    assertThat(transaction.getStatus()).isEqualTo(PaymentTransactionEntity.STATUS_PAID);
    assertThat(transaction.getExternalTransactionId()).isEqualTo(123456L);
    assertThat(transaction.getExternalReferenceCode()).isEqualTo("FT123456789");
    assertThat(booking.getTickets()).hasSize(1);
  }

  @Test
  void handleSePayWebhook_shouldTicketBookingWhenDescriptionContainsPaymentCode() {
    BookingEntity booking = heldBooking("A6C2W2");
    PaymentTransactionEntity transaction = pendingTransaction(booking, "SEPAY-987654321098");
    SePayWebhookRequest request = new SePayWebhookRequest(
        123457L,
        "MBBank",
        "2026-05-22 01:22:00",
        "0985512831",
        null,
        " ",
        null,
        "in",
        "Thanh toan cho ma SEPAY987654321098 - MBBank",
        booking.getTotalAmount() + 1_000L,
        0L,
        "FT123456780"
    );

    when(paymentTransactionRepository.findByOrderCodeIgnoreCase("SEPAY-987654321098"))
        .thenReturn(Optional.of(transaction));
    when(bookingService.lockDetailedBooking(eq("A6C2W2"), any())).thenReturn(booking);
    when(bookingService.generateUniqueTicketNumber()).thenReturn("7380000000102");

    paymentService.handleSePayWebhook(request, null);

    assertThat(booking.isTicketed()).isTrue();
    assertThat(transaction.getStatus()).isEqualTo(PaymentTransactionEntity.STATUS_PAID);
    assertThat(booking.getTickets()).hasSize(1);
  }

  @Test
  void handleSePayWebhook_shouldMarkTransactionFailedWhenAmountInsufficient() {
    BookingEntity booking = heldBooking("A6C2W3");
    PaymentTransactionEntity transaction = pendingTransaction(booking, "SEPAY-111122223333");
    SePayWebhookRequest request = new SePayWebhookRequest(
        123458L,
        "MBBank",
        "2026-05-22 01:23:00",
        "0985512831",
        null,
        null,
        "SEPAY111122223333",
        "in",
        null,
        booking.getTotalAmount() - 1L,
        0L,
        "FT123456781"
    );

    when(paymentTransactionRepository.findByOrderCodeIgnoreCase("SEPAY-111122223333"))
        .thenReturn(Optional.of(transaction));
    when(bookingService.lockDetailedBooking(eq("A6C2W3"), any())).thenReturn(booking);

    paymentService.handleSePayWebhook(request, null);

    assertThat(booking.isHold()).isTrue();
    assertThat(booking.getPaymentStatus()).isEqualTo(BookingEntity.PAYMENT_STATUS_PENDING);
    assertThat(transaction.getStatus()).isEqualTo(PaymentTransactionEntity.STATUS_FAILED);
    assertThat(booking.getTickets()).isEmpty();
  }

  @Test
  void handleSePayWebhook_shouldIgnoreWebhookWhenNoPaymentCodeFound() {
    BookingEntity booking = heldBooking("A6C2W4");
    PaymentTransactionEntity transaction = pendingTransaction(booking, "SEPAY-444455556666");
    SePayWebhookRequest request = new SePayWebhookRequest(
        123459L,
        "MBBank",
        "2026-05-22 01:24:00",
        "0985512831",
        null,
        null,
        "Noi dung khong co ma thanh toan",
        "in",
        "Mo ta khong co ma",
        booking.getTotalAmount(),
        0L,
        "FT123456782"
    );

    paymentService.handleSePayWebhook(request, null);

    assertThat(booking.isHold()).isTrue();
    assertThat(transaction.getStatus()).isEqualTo(PaymentTransactionEntity.STATUS_PENDING);
    assertThat(booking.getTickets()).isEmpty();
  }

  @Test
  void handlePaymentCallback_shouldPropagateExpiredHold() {
    when(bookingService.findBookingForPayment("A6C2P1"))
        .thenThrow(new NotFoundException("Mã đặt chỗ không hợp lệ hoặc đã hết hạn giữ chỗ."));

    assertThatThrownBy(() ->
        paymentService.handlePaymentCallback(new PaymentCallbackRequest("A6C2P1", "success"))
    )
        .isInstanceOf(NotFoundException.class)
        .hasMessage("Mã đặt chỗ không hợp lệ hoặc đã hết hạn giữ chỗ.");
  }

  @Test
  void resolveSePaySupportedOrderBank_shouldSupportBidv() {
    assertThat(PaymentService.resolveSePaySupportedOrderBank("BIDV")).isEqualTo("BIDV");
  }

  @Test
  void resolveSePaySupportedOrderBank_shouldRejectMbBank() {
    assertThatThrownBy(() -> PaymentService.resolveSePaySupportedOrderBank("MB Bank"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("SePay");
  }

  @Test
  void requireSePayBankAccountXid_shouldAcceptUuid() {
    assertThat(PaymentService.requireSePayBankAccountXid("7c773680-2ad1-4c1d-a5a2-7d1d7d2cf7e7"))
        .isEqualTo("7c773680-2ad1-4c1d-a5a2-7d1d7d2cf7e7");
  }

  @Test
  void requireSePayBankAccountXid_shouldRejectNumericId() {
    assertThatThrownBy(() -> PaymentService.requireSePayBankAccountXid("39127"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("APP_PAYMENT_SEPAY_BANK_ACCOUNT_ID");
  }

  private BookingEntity heldBooking(String bookingCode) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(2);
    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        "one_way",
        1490000L,
        0L,
        1490000L,
        "VND",
        createdAt,
        createdAt.plusMinutes(BookingService.HOLD_MINUTES)
    );

    booking.assignContact(BookingContactEntity.create(
        booking,
        "Nguyen Van A",
        "a@example.com",
        "0912345678"
    ));

    booking.addPassenger(BookingPassengerEntity.create(
        booking,
        "Nguyen Van A",
        "adult",
        LocalDate.of(1995, 5, 12),
        "CCCD",
        "079123456789",
        createdAt
    ));

    booking.addSegment(createSegment(
        booking,
        20101L,
        "AU201",
        "Thanh pho Ho Chi Minh",
        "Ha Noi",
        "SGN",
        "HAN",
        createdAt.plusDays(3)
    ));

    return booking;
  }

  private BookingEntity heldRoundTripBooking(String bookingCode) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(2);
    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        "round_trip",
        2980000L,
        0L,
        2980000L,
        "VND",
        createdAt,
        createdAt.plusMinutes(BookingService.HOLD_MINUTES)
    );

    booking.assignContact(BookingContactEntity.create(
        booking,
        "Nguyen Van A",
        "a@example.com",
        "0912345678"
    ));

    booking.addPassenger(BookingPassengerEntity.create(
        booking,
        "Nguyen Van A",
        "adult",
        LocalDate.of(1995, 5, 12),
        "CCCD",
        "079123456789",
        createdAt
    ));

    booking.addSegment(createSegment(
        booking,
        20101L,
        "AU201",
        "Thanh pho Ho Chi Minh",
        "Ha Noi",
        "SGN",
        "HAN",
        createdAt.plusDays(3)
    ));
    booking.addSegment(createSegment(
        booking,
        20102L,
        "AU202",
        "Ha Noi",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "SGN",
        createdAt.plusDays(7)
    ));

    return booking;
  }

  private BookingSegmentEntity createSegment(
      BookingEntity booking,
      long inventoryId,
      String flightCode,
      String fromCity,
      String toCity,
      String originCode,
      String destinationCode,
      OffsetDateTime departureAt
  ) {
    FlightEntity flight = org.mockito.Mockito.mock(FlightEntity.class);
    FlightFareInventoryEntity inventory = org.mockito.Mockito.mock(FlightFareInventoryEntity.class);
    org.mockito.Mockito.lenient().when(flight.getStatus()).thenReturn("scheduled");
    org.mockito.Mockito.lenient().when(inventory.getId()).thenReturn(inventoryId);
    org.mockito.Mockito.lenient().when(inventory.getFlight()).thenReturn(flight);

    return BookingSegmentEntity.create(
        booking,
        inventory,
        flightCode,
        fromCity,
        toCity,
        originCode,
        destinationCode,
        departureAt,
        departureAt.plusHours(2),
        "pho_thong_tiet_kiem",
        "Pho thong tiet kiem",
        1490000L,
        1,
        1490000L,
        departureAt.minusDays(1)
    );
  }

  private PaymentTransactionEntity pendingTransaction(BookingEntity booking, String orderCode) {
    return PaymentTransactionEntity.createPending(
        booking,
        "sepay",
        "live",
        orderCode,
        booking.getTotalAmount(),
        null,
        null,
        null,
        "MB Bank",
        "0985512831",
        "PHAM MINH QUAN",
        null,
        OffsetDateTime.now().minusMinutes(1)
    );
  }
}
