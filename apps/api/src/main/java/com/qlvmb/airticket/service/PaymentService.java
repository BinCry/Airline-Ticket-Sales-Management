package com.qlvmb.airticket.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.qlvmb.airticket.domain.dto.BookingOverviewResponse;
import com.qlvmb.airticket.domain.dto.PaymentCallbackRequest;
import com.qlvmb.airticket.domain.dto.PaymentSessionResponse;
import com.qlvmb.airticket.domain.dto.SePayWebhookRequest;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingPassengerEntity;
import com.qlvmb.airticket.domain.entity.PaymentTransactionEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.repository.PaymentTransactionRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
public class PaymentService {

  private static final Logger LOGGER = LoggerFactory.getLogger(PaymentService.class);
  private static final String PAYMENT_FAILED_MESSAGE =
      "Thanh to\u00e1n ch\u01b0a th\u00e0nh c\u00f4ng.";
  private static final String SEPAY_PROVIDER = "sepay";
  private static final String SESSION_MODE_LIVE = "live";
  private static final String SESSION_MODE_LOCAL = "local";
  private static final String SEPAY_CALLBACK_AUTH_PREFIX = "Apikey ";
  private static final String SEPAY_ORDER_BANK_BIDV = "BIDV";
  private static final String SEPAY_BANK_SLUG_BIDV = "bidv";
  private static final String SEPAY_BANK_SLUG_MBB = "mbb";

  private final BookingService bookingService;
  private final MemberVoucherService memberVoucherService;
  private final NotificationOutboxService notificationOutboxService;
  private final PaymentTransactionRepository paymentTransactionRepository;
  private final RestClient sePayRestClient;
  private final String sePayToken;
  private final String sePayBankAccountId;
  private final String sePayWebhookApiKey;
  private final String sePayBankName;
  private final String sePayAccountNumber;
  private final String sePayAccountHolderName;
  private final long sePayOrderDurationSeconds;
  private final String sePayQrBaseUrl;

  public PaymentService(
      BookingService bookingService,
      MemberVoucherService memberVoucherService,
      NotificationOutboxService notificationOutboxService,
      PaymentTransactionRepository paymentTransactionRepository,
      @Value("${app.payment.sepay.token:}") String sePayToken,
      @Value("${app.payment.sepay.bank-account-id:}") String sePayBankAccountId,
      @Value("${app.payment.sepay.webhook-api-key:}") String sePayWebhookApiKey,
      @Value("${app.payment.sepay.bank-name:BIDV}") String sePayBankName,
      @Value("${app.payment.sepay.account-number:}") String sePayAccountNumber,
      @Value("${app.payment.sepay.account-holder-name:}") String sePayAccountHolderName,
      @Value("${app.payment.sepay.order-duration-seconds:900}") long sePayOrderDurationSeconds,
      @Value("${app.payment.sepay.api-base-url:https://userapi.sepay.vn/v2}") String sePayApiBaseUrl,
      @Value("${app.payment.sepay.qr-base-url:https://qr.sepay.vn/img}") String sePayQrBaseUrl
  ) {
    this.bookingService = bookingService;
    this.memberVoucherService = memberVoucherService;
    this.notificationOutboxService = notificationOutboxService;
    this.paymentTransactionRepository = paymentTransactionRepository;
    this.sePayRestClient = RestClient.builder()
        .baseUrl(sePayApiBaseUrl)
        .build();
    this.sePayToken = trimToNull(sePayToken);
    this.sePayBankAccountId = trimToNull(sePayBankAccountId);
    this.sePayWebhookApiKey = trimToNull(sePayWebhookApiKey);
    this.sePayBankName = trimToNull(sePayBankName);
    this.sePayAccountNumber = trimToNull(sePayAccountNumber);
    this.sePayAccountHolderName = trimToNull(sePayAccountHolderName);
    this.sePayOrderDurationSeconds = sePayOrderDurationSeconds;
    this.sePayQrBaseUrl = trimToNull(sePayQrBaseUrl);
  }

  @Transactional
  public PaymentSessionResponse createPaymentSession(String bookingCode) {
    BookingEntity booking = bookingService.findBookingForPayment(bookingCode);
    OffsetDateTime currentTime = OffsetDateTime.now();

    if (!booking.isHold()) {
      throw new BadRequestException(bookingService.getWaitingPaymentMessage());
    }

    PaymentTransactionEntity transaction = paymentTransactionRepository.findByBookingId(booking.getId()).orElse(null);
    String orderCode = transaction == null ? bookingService.generatePaymentReference() : transaction.getOrderCode();
    boolean sePayReady = isSePayConfigured();
    if (sePayReady) {
      LOGGER.info(
          "Booking {} đang khởi tạo phiên thanh toán SePay live với cấu hình: {}",
          bookingCode,
          describeSePayConfig()
      );
    } else {
      LOGGER.info(
          "Booking {} dùng session thanh toán local vì cấu hình SePay chưa đủ: {}",
          bookingCode,
          describeSePayConfig()
      );
    }

    SePaySessionData sessionData;
    if (canCreateAutomaticOrderSession()) {
      sessionData = createLiveSession(booking, orderCode);
    } else if (canCreateQrTransferSession()) {
      sessionData = createQrTransferSession(booking, orderCode);
    } else {
      sessionData = createLocalSession(booking, orderCode);
    }

    if (transaction == null) {
      transaction = PaymentTransactionEntity.createPending(
          booking,
          SEPAY_PROVIDER,
          sessionData.sessionMode(),
          orderCode,
          booking.getTotalAmount(),
          sessionData.paymentUrl(),
          sessionData.qrCodeUrl(),
          sessionData.qrCodeDataUrl(),
          sessionData.bankName(),
          sessionData.accountNumber(),
          sessionData.accountHolderName(),
          sessionData.providerOrderId(),
          currentTime
      );
    } else {
      transaction.refreshPendingSession(
          sessionData.sessionMode(),
          sessionData.paymentUrl(),
          sessionData.qrCodeUrl(),
          sessionData.qrCodeDataUrl(),
          sessionData.bankName(),
          sessionData.accountNumber(),
          sessionData.accountHolderName(),
          sessionData.providerOrderId(),
          currentTime
      );
    }

    paymentTransactionRepository.save(transaction);
    booking.markPaymentSessionPending(sessionData.paymentUrl(), currentTime);
    return mapPaymentSession(booking, transaction);
  }

  @Transactional
  public BookingOverviewResponse handlePaymentCallback(PaymentCallbackRequest request) {
    BookingEntity booking = bookingService.findBookingForPayment(request.bookingCode());
    OffsetDateTime currentTime = OffsetDateTime.now();

    if (BookingEntity.STATUS_CANCELLED.equals(booking.getStatus())
        && BookingEntity.PAYMENT_STATUS_EXPIRED.equals(booking.getPaymentStatus())) {
      throw new NotFoundException(bookingService.getBookingExpiredMessage());
    }

    PaymentTransactionEntity transaction = paymentTransactionRepository.findByBookingId(booking.getId())
        .orElseGet(() -> paymentTransactionRepository.save(
            PaymentTransactionEntity.createPending(
                booking,
                SEPAY_PROVIDER,
                SESSION_MODE_LOCAL,
                bookingService.generatePaymentReference(),
                booking.getTotalAmount(),
                null,
                null,
                null,
                defaultBankName(),
                sePayAccountNumber,
                sePayAccountHolderName,
                null,
                currentTime
            )
        ));

    if ("success".equals(request.normalizedResult())
        && booking.isTicketed()
        && BookingEntity.PAYMENT_STATUS_PAID.equals(booking.getPaymentStatus())) {
      return bookingService.mapOverviewResponse(booking);
    }

    if (!booking.isHold()) {
      throw new BadRequestException(bookingService.getWaitingPaymentMessage());
    }

    if (!"success".equals(request.normalizedResult())) {
      booking.markPaymentFailed(currentTime);
      transaction.markFailed("legacy_local_callback", currentTime);
      throw new BadRequestException(PAYMENT_FAILED_MESSAGE);
    }

    finalizeSuccessfulPayment(
        booking,
        transaction,
        null,
        "LOCAL-" + bookingService.generatePaymentReference(),
        currentTime,
        "legacy_local_callback"
    );
    return bookingService.mapOverviewResponse(booking);
  }

  @Transactional
  public void handleSePayWebhook(SePayWebhookRequest request, String authorizationHeader) {
    validateWebhookAuthorization(authorizationHeader);
    if (!request.isIncomingTransfer() || request.normalizedCode() == null) {
      return;
    }

    PaymentTransactionEntity transaction = paymentTransactionRepository
        .findByOrderCodeIgnoreCase(request.normalizedCode())
        .orElse(null);

    if (transaction == null) {
      return;
    }

    if (request.id() != null
        && transaction.getExternalTransactionId() != null
        && transaction.getExternalTransactionId().equals(request.id())) {
      return;
    }

    BookingEntity booking = bookingService.lockDetailedBooking(
        transaction.getBooking().getBookingCode(),
        bookingService.getBookingNotFoundMessage()
    );
    OffsetDateTime currentTime = OffsetDateTime.now();

    if (BookingEntity.STATUS_CANCELLED.equals(booking.getStatus())
        && BookingEntity.PAYMENT_STATUS_EXPIRED.equals(booking.getPaymentStatus())) {
      transaction.markExpired(currentTime);
      return;
    }

    if (booking.isTicketed() && BookingEntity.PAYMENT_STATUS_PAID.equals(booking.getPaymentStatus())) {
      transaction.markPaid(request.id(), request.referenceCode(), request.toString(), currentTime);
      return;
    }

    if (request.transferAmount() == null || request.transferAmount() < booking.getTotalAmount()) {
      transaction.markFailed(request.toString(), currentTime);
      return;
    }

    finalizeSuccessfulPayment(
        booking,
        transaction,
        request.id(),
        request.referenceCode(),
        currentTime,
        request.toString()
    );
  }

  private void finalizeSuccessfulPayment(
      BookingEntity booking,
      PaymentTransactionEntity transaction,
      Long externalTransactionId,
      String paymentReference,
      OffsetDateTime currentTime,
      String rawPayload
  ) {
    String resolvedPaymentReference = paymentReference == null || paymentReference.isBlank()
        ? transaction.getOrderCode()
        : paymentReference.trim();

    transaction.markPaid(externalTransactionId, resolvedPaymentReference, rawPayload, currentTime);
    booking.markTicketed(resolvedPaymentReference, currentTime);
    memberVoucherService.finalizeVoucherForBooking(booking, currentTime);

    if (booking.getTickets().isEmpty()) {
      for (BookingPassengerEntity passenger : booking.getPassengers()) {
        booking.addTicket(
            TicketEntity.issue(
                booking,
                passenger,
                bookingService.generateUniqueTicketNumber(),
                currentTime
            )
        );
      }
    }

    notificationOutboxService.createAndSendTicketEmail(booking);
  }

  private PaymentSessionResponse mapPaymentSession(BookingEntity booking, PaymentTransactionEntity transaction) {
    return new PaymentSessionResponse(
        booking.getBookingCode(),
        SEPAY_PROVIDER,
        transaction.getSessionMode(),
        transaction.getPaymentUrl(),
        bookingService.mapPaymentStatus(booking.getPaymentStatus()),
        booking.getExpiresAt(),
        transaction.getOrderCode(),
        booking.getTotalAmount(),
        transaction.getBankName(),
        transaction.getAccountNumber(),
        transaction.getAccountHolderName(),
        transaction.getQrCodeUrl(),
        transaction.getQrCodeDataUrl(),
        booking.getDiscountAmount(),
        booking.getAppliedVoucherCode()
    );
  }

  private boolean isSePayConfigured() {
    return canCreateAutomaticOrderSession() || canCreateQrTransferSession();
  }

  private boolean canCreateAutomaticOrderSession() {
    return sePayToken != null
        && sePayBankAccountId != null
        && isSePayOrderBankSupported(defaultBankName());
  }

  private boolean canCreateQrTransferSession() {
    return sePayBankName != null
        && sePayAccountNumber != null
        && sePayAccountHolderName != null
        && sePayQrBaseUrl != null;
  }

  private void validateWebhookAuthorization(String authorizationHeader) {
    if (sePayWebhookApiKey == null) {
      return;
    }

    String expectedValue = SEPAY_CALLBACK_AUTH_PREFIX + sePayWebhookApiKey;
    if (!expectedValue.equals(authorizationHeader == null ? "" : authorizationHeader.trim())) {
      throw new UnauthorizedException("Webhook SePay kh\u00f4ng h\u1ee3p l\u1ec7.");
    }
  }

  private SePaySessionData createLocalSession(BookingEntity booking, String orderCode) {
    return new SePaySessionData(
        SESSION_MODE_LOCAL,
        null,
        null,
        null,
        defaultBankName(),
        sePayAccountNumber,
        sePayAccountHolderName,
        null,
        orderCode
    );
  }

  private SePaySessionData createQrTransferSession(BookingEntity booking, String orderCode) {
    String qrBankCode = resolveSePayQrBankCode(defaultBankName());
    String qrCodeUrl = buildSePayQrUrl(qrBankCode, sePayAccountNumber, booking.getTotalAmount(), orderCode);
    LOGGER.info(
        "Booking {} dÃ¹ng QR chuyá»ƒn khoáº£n SePay vá»›i bank code {} vÃ  sá»‘ tÃ i khoáº£n {}.",
        booking.getBookingCode(),
        qrBankCode,
        sePayAccountNumber
    );

    return new SePaySessionData(
        SESSION_MODE_LIVE,
        qrCodeUrl,
        qrCodeUrl,
        qrCodeUrl,
        defaultBankName(),
        sePayAccountNumber,
        sePayAccountHolderName,
        null,
        orderCode
    );
  }

  private SePaySessionData createLiveSession(BookingEntity booking, String orderCode) {
    String supportedOrderBank = resolveSePaySupportedOrderBank(defaultBankName());
    String sePayBankAccountXid = requireSePayBankAccountXid(sePayBankAccountId);
    LOGGER.info(
        "Booking {} dùng bank slug SePay {} từ bank name {}.",
        booking.getBookingCode(),
        supportedOrderBank,
        sePayBankAccountXid
    );

    try {
      SePayOrderResponse response = sePayRestClient.post()
          .uri("/bank-accounts/{bankAccountXid}/orders", sePayBankAccountXid)
          .header(HttpHeaders.AUTHORIZATION, "Bearer " + sePayToken)
          .contentType(MediaType.APPLICATION_JSON)
          .body(new SePayCreateOrderRequest(
              null,
              booking.getTotalAmount(),
              orderCode,
              null,
              sePayOrderDurationSeconds,
              "1",
              "compact"
          ))
          .retrieve()
          .body(SePayOrderResponse.class);

      if (response == null || response.data() == null || response.data().orderCode() == null) {
        LOGGER.warn(
            "Booking {} nhận response SePay thiếu dữ liệu bắt buộc khi tạo phiên thanh toán.",
            booking.getBookingCode()
        );
        throw new IllegalStateException("Kh\u00f4ng th\u1ec3 kh\u1edfi t\u1ea1o phi\u00ean thanh to\u00e1n SePay.");
      }

      return new SePaySessionData(
          SESSION_MODE_LIVE,
          response.data().qrCodeUrl(),
          response.data().qrCodeUrl(),
          response.data().qrCode(),
          response.data().bankName(),
          response.data().accountNumber(),
          response.data().accountHolderName(),
          response.data().id(),
          response.data().orderCode()
      );
    } catch (IllegalStateException exception) {
      LOGGER.warn(
          "Booking {} không thể chuẩn bị phiên thanh toán SePay live: {}",
          booking.getBookingCode(),
          exception.getMessage()
      );
      throw exception;
    } catch (RuntimeException exception) {
      LOGGER.error(
          "Booking {} gọi SePay live thất bại với cấu hình: {}",
          booking.getBookingCode(),
          describeSePayConfig(),
          exception
      );
      throw exception;
    }
  }

  private String defaultBankName() {
    return sePayBankName == null ? "BIDV" : sePayBankName;
  }

  static String resolveSePaySupportedOrderBank(String bankName) {
    String normalized = normalizeBankName(bankName);
    return switch (normalized) {
      case "BIDV" -> SEPAY_ORDER_BANK_BIDV;
      default -> throw new IllegalStateException(
          "Ngân hàng SePay chưa được hỗ trợ cho tạo phiên thanh toán: " + bankName
      );
    };
  }

  static String requireSePayBankAccountXid(String bankAccountId) {
    if (bankAccountId == null) {
      throw new IllegalStateException("APP_PAYMENT_SEPAY_BANK_ACCOUNT_ID đang thiếu.");
    }

    try {
      return UUID.fromString(bankAccountId).toString();
    } catch (IllegalArgumentException exception) {
      throw new IllegalStateException(
          "APP_PAYMENT_SEPAY_BANK_ACCOUNT_ID phải là UUID tài khoản ngân hàng SePay API v2."
      );
    }
  }

  static boolean isSePayOrderBankSupported(String bankName) {
    return "BIDV".equals(normalizeBankName(bankName));
  }

  static String resolveSePayQrBankCode(String bankName) {
    String normalized = normalizeBankName(bankName);
    return switch (normalized) {
      case "BIDV" -> "BIDV";
      case "MB", "MBB", "MBBANK" -> "MBBank";
      default -> bankName;
    };
  }

  private String buildSePayQrUrl(String qrBankCode, String accountNumber, long amount, String orderCode) {
    return String.format(
        "%s?acc=%s&bank=%s&amount=%d&des=%s&template=compact",
        sePayQrBaseUrl,
        accountNumber,
        qrBankCode,
        amount,
        orderCode
    );
  }

  private static String normalizeBankName(String bankName) {
    if (bankName == null) {
      return "";
    }

    return bankName
        .replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit}]+", "")
        .toUpperCase();
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }

    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private String describeSePayConfig() {
    return "token=" + describePresence(sePayToken)
        + ", bankAccountId=" + describePresence(sePayBankAccountId)
        + ", webhookApiKey=" + describePresence(sePayWebhookApiKey)
        + ", bankName=" + defaultBankName()
        + ", accountNumber=" + describePresence(sePayAccountNumber)
        + ", accountHolderName=" + describePresence(sePayAccountHolderName);
  }

  private String describePresence(String value) {
    return value == null ? "thiếu" : "có";
  }

  private record SePaySessionData(
      String sessionMode,
      String paymentUrl,
      String qrCodeUrl,
      String qrCodeDataUrl,
      String bankName,
      String accountNumber,
      String accountHolderName,
      String providerOrderId,
      String orderCode
  ) {
  }

  private record SePayCreateOrderRequest(
      String va_prefix,
      long amount,
      String order_code,
      String va_holder_name,
      long duration,
      String with_qrcode,
      String qrcode_template
  ) {
  }

  private record SePayOrderResponse(
      String status,
      String message,
      SePayOrderData data
  ) {
  }

  @JsonIgnoreProperties(ignoreUnknown = true)
  private record SePayOrderData(
      String id,
      @JsonProperty("order_code") String orderCode,
      @JsonProperty("va_number") String vaNumber,
      @JsonProperty("va_holder_name") String vaHolderName,
      long amount,
      String status,
      @JsonProperty("bank_name") String bankName,
      @JsonProperty("account_holder_name") String accountHolderName,
      @JsonProperty("account_number") String accountNumber,
      @JsonProperty("expired_at") String expiredAt,
      @JsonProperty("qr_code") String qrCode,
      @JsonProperty("qr_code_url") String qrCodeUrl
  ) {
  }
}
