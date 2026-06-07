package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.MyNotificationResponse;
import com.qlvmb.airticket.domain.dto.NotificationOutboxResponse;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.NotificationOutboxEntity;
import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.NotificationOutboxRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;

import java.text.NumberFormat;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class NotificationOutboxService {

  private static final String TICKET_EMAIL_SUBJECT_PREFIX = "Vé điện tử cho mã đặt chỗ ";
  private static final String TICKET_EMAIL_SUBJECT_SUFFIX = " | Vietnam Airlines";
  private static final String FLIGHT_CANCELLATION_SUBJECT_PREFIX = "Cập nhật hành trình cho mã đặt chỗ ";
  private static final String FLIGHT_CANCELLATION_SUBJECT_SUFFIX = " | Vietnam Airlines";
  private static final String RETRY_NOT_FOUND_MESSAGE = "Không tìm thấy email cần gửi lại.";
  private static final String MAIL_DISABLED_MESSAGE = "Chưa bật cấu hình gửi email.";
  private static final String MAIL_SENDER_NOT_READY_MESSAGE = "Chưa cấu hình dịch vụ gửi email.";
  private static final String MAIL_FROM_NOT_READY_MESSAGE = "Chưa cấu hình email gửi.";
  private static final String MAIL_DELIVERY_FAILED_MESSAGE =
      "Không thể gửi email tới hộp thư người nhận lúc này.";
  private static final String EMPTY_PASSENGERS_MESSAGE = "- Chưa có thông tin hành khách";
  private static final String EMPTY_SEGMENTS_MESSAGE = "- Chưa có thông tin chặng bay";
  private static final String EMPTY_TICKETS_MESSAGE = "- Chưa có số vé";

  private static final String REFUND_STATUS_SUBJECT_PREFIX = "Káº¿t quáº£ hoÃ n vÃ© cho mÃ£ Ä‘áº·t chá»— ";
  private static final String REFUND_STATUS_SUBJECT_SUFFIX = " | Vietnam Airlines";

  private final NotificationOutboxRepository notificationOutboxRepository;
  private final @Nullable JavaMailSender mailSender;
  private final boolean mailEnabled;
  private final String fromEmail;

  public NotificationOutboxService(
      NotificationOutboxRepository notificationOutboxRepository,
      @Nullable JavaMailSender mailSender,
      @Value("${app.mail.enabled}") boolean mailEnabled,
      @Value("${app.mail.from-email:}") String fromEmail
  ) {
    this.notificationOutboxRepository = notificationOutboxRepository;
    this.mailSender = mailSender;
    this.mailEnabled = mailEnabled;
    this.fromEmail = fromEmail;
  }

  @Transactional
  public NotificationOutboxResponse createAndSendTicketEmail(BookingEntity booking) {
    OffsetDateTime currentTime = OffsetDateTime.now(ZoneOffset.UTC);
    NotificationOutboxEntity outbox = NotificationOutboxEntity.createTicketEmail(
        booking.getBookingCode(),
        booking.getContact().getEmail(),
        TICKET_EMAIL_SUBJECT_PREFIX + booking.getBookingCode() + TICKET_EMAIL_SUBJECT_SUFFIX,
        buildTicketEmailBody(booking),
        currentTime
    );
    notificationOutboxRepository.save(outbox);
    dispatchDelivery(outbox);
    return toResponse(outbox);
  }

  @Transactional
  public NotificationOutboxResponse createAndSendFlightCancellationEmail(
      BookingEntity booking,
      FlightEntity flight,
      String cancellationNote
  ) {
    OffsetDateTime currentTime = OffsetDateTime.now(ZoneOffset.UTC);
    NotificationOutboxEntity outbox = NotificationOutboxEntity.createFlightCancellationEmail(
        booking.getBookingCode(),
        booking.getContact().getEmail(),
        FLIGHT_CANCELLATION_SUBJECT_PREFIX
            + booking.getBookingCode()
            + FLIGHT_CANCELLATION_SUBJECT_SUFFIX,
        buildFlightCancellationEmailBody(booking, flight, cancellationNote),
        currentTime
    );
    notificationOutboxRepository.save(outbox);
    dispatchDelivery(outbox);
    return toResponse(outbox);
  }

  @Transactional
  public NotificationOutboxResponse createAndSendRefundStatusEmail(
      BookingEntity booking,
      RefundRequestEntity refundRequest
  ) {
    OffsetDateTime currentTime = OffsetDateTime.now(ZoneOffset.UTC);
    NotificationOutboxEntity outbox = NotificationOutboxEntity.createRefundStatusEmail(
        booking.getBookingCode(),
        booking.getContact().getEmail(),
        REFUND_STATUS_SUBJECT_PREFIX + booking.getBookingCode() + REFUND_STATUS_SUBJECT_SUFFIX,
        buildRefundStatusEmailBody(booking, refundRequest),
        currentTime
    );
    notificationOutboxRepository.save(outbox);
    dispatchDelivery(outbox);
    return toResponse(outbox);
  }

  @Transactional(readOnly = true)
  public List<NotificationOutboxResponse> getNotifications() {
    return notificationOutboxRepository.findAllByOrderByCreatedAtDesc().stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public NotificationOutboxResponse retryNotification(Long id) {
    NotificationOutboxEntity outbox = notificationOutboxRepository.findById(id)
        .orElseThrow(() -> new NotFoundException(RETRY_NOT_FOUND_MESSAGE));
    if (!NotificationOutboxEntity.STATUS_SENT.equals(outbox.getStatus())) {
      outbox.markRetrying(OffsetDateTime.now(ZoneOffset.UTC));
      send(outbox);
    }
    return toResponse(outbox);
  }

  private void send(NotificationOutboxEntity outbox) {
    OffsetDateTime currentTime = OffsetDateTime.now(ZoneOffset.UTC);
    if (!mailEnabled) {
      outbox.markFailed(MAIL_DISABLED_MESSAGE, currentTime);
      return;
    }
    if (mailSender == null) {
      outbox.markFailed(MAIL_SENDER_NOT_READY_MESSAGE, currentTime);
      return;
    }
    if (fromEmail == null || fromEmail.isBlank()) {
      outbox.markFailed(MAIL_FROM_NOT_READY_MESSAGE, currentTime);
      return;
    }

    try {
      SimpleMailMessage message = new SimpleMailMessage();
      message.setTo(outbox.getRecipientEmail());
      message.setFrom(fromEmail);
      message.setSubject(outbox.getSubject());
      message.setText(outbox.getBody());
      mailSender.send(message);
      outbox.markSent(currentTime);
    } catch (MailException exception) {
      outbox.markFailed(MAIL_DELIVERY_FAILED_MESSAGE, currentTime);
    } catch (RuntimeException exception) {
      outbox.markFailed(MAIL_DELIVERY_FAILED_MESSAGE, currentTime);
    }
  }

  private void dispatchDelivery(NotificationOutboxEntity outbox) {
    if (TransactionSynchronizationManager.isActualTransactionActive()
        && TransactionSynchronizationManager.isSynchronizationActive()) {
      Long outboxId = outbox.getId();
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
          deliverPersistedOutbox(outboxId);
        }
      });
      return;
    }

    send(outbox);
  }

  private void deliverPersistedOutbox(Long outboxId) {
    if (outboxId == null) {
      return;
    }

    notificationOutboxRepository.findById(outboxId).ifPresent(outbox -> {
      if (NotificationOutboxEntity.STATUS_SENT.equals(outbox.getStatus())) {
        return;
      }
      send(outbox);
      notificationOutboxRepository.save(outbox);
    });
  }

  private String buildTicketEmailBody(BookingEntity booking) {
    String passengers = booking.getPassengers().stream()
        .map(passenger -> "- " + passenger.getFullName() + " (" + passenger.getPassengerType() + ")")
        .reduce((left, right) -> left + "\n" + right)
        .orElse(EMPTY_PASSENGERS_MESSAGE);

    String segments = booking.getSegments().stream()
        .map(this::formatSegment)
        .reduce((left, right) -> left + "\n" + right)
        .orElse(EMPTY_SEGMENTS_MESSAGE);

    String tickets = booking.getTickets().stream()
        .map(this::formatTicket)
        .reduce((left, right) -> left + "\n" + right)
        .orElse(EMPTY_TICKETS_MESSAGE);

    return """
        Xin chào %s,

        Chúng tôi xác nhận mã đặt chỗ %s đã thanh toán thành công và vé điện tử của bạn đã được phát hành.

        Thông tin hành khách:
        %s

        Thông tin hành trình:
        %s

        Số vé:
        %s

        Tổng tiền: %s
        Trạng thái thanh toán: Đã thanh toán

        Vui lòng lưu lại email này để xuất trình khi cần tra cứu, hỗ trợ hoặc đối chiếu thông tin hành trình.

        Trân trọng,
        Vietnam Airlines
        """.formatted(
        booking.getContact().getFullName(),
        booking.getBookingCode(),
        passengers,
        segments,
        tickets,
        formatAmount(booking.getTotalAmount(), booking.getCurrency())
    );
  }

  private String buildFlightCancellationEmailBody(
      BookingEntity booking,
      FlightEntity flight,
      String cancellationNote
  ) {
    return """
        Xin chào %s,

        Chúng tôi rất tiếc phải thông báo chuyến bay %s trong mã đặt chỗ %s đã được bộ phận vận hành hủy.

        Trạng thái hiện tại:
        - Đặt chỗ: Đã hủy
        - Vé điện tử: Đã hủy

        Thông tin chuyến bay bị ảnh hưởng:
        - Mã chuyến: %s
        - Hành trình: %s đến %s
        - Giờ khởi hành dự kiến: %s

        Ghi chú vận hành:
        %s

        Vui lòng liên hệ bộ phận hỗ trợ để được hướng dẫn đổi hành trình hoặc phương án hỗ trợ tiếp theo.

        Trân trọng,
        Vietnam Airlines
        """.formatted(
        booking.getContact().getFullName(),
        flight.getCode(),
        booking.getBookingCode(),
        flight.getCode(),
        flight.getOriginAirport().getCityName(),
        flight.getDestinationAirport().getCityName(),
        flight.getDepartureAt(),
        cancellationNote
    );
  }

  private String buildRefundStatusEmailBody(
      BookingEntity booking,
      RefundRequestEntity refundRequest
  ) {
    boolean approved = RefundRequestEntity.STATUS_APPROVED.equals(refundRequest.getStatus());
    String refundStatusLabel = approved ? "Đã chấp thuận" : "Từ chối";
    String bookingStatusLabel = approved ? "Đặt chỗ đã hủy" : "Đặt chỗ tiếp tục hiệu lực";
    String nextStep = approved
        ? "Chúng tôi sẽ tiếp tục xử lý giao dịch hoàn tiền theo quy trình tại kênh thanh toán."
        : "Bạn có thể giữ nguyên hành trình hoặc liên hệ bộ phận hỗ trợ nếu cần được xem xét thêm.";

    return """
        Xin chào %s,

        Yêu cầu hoàn vé cho mã đặt chỗ %s đã được cập nhật.

        Kết quả xử lý:
        - Trạng thái yêu cầu: %s
        - Trạng thái đặt chỗ: %s
        - Lý do đã gửi: %s
        - Số tiền xem xét hoàn: %s

        %s

        Trân trọng,
        Vietnam Airlines
        """.formatted(
        booking.getContact().getFullName(),
        booking.getBookingCode(),
        refundStatusLabel,
        bookingStatusLabel,
        refundRequest.getReason(),
        formatAmount(refundRequest.getRefundAmount(), booking.getCurrency()),
        nextStep
    );
  }

  private String formatSegment(BookingSegmentEntity segment) {
    return "- " + segment.getFlightCode()
        + ": " + segment.getOriginCode()
        + " đến " + segment.getDestinationCode()
        + ", khởi hành " + segment.getDepartureAt();
  }

  private String formatTicket(TicketEntity ticket) {
    return "- " + ticket.getTicketNumber() + ": " + ticket.getPassenger().getFullName();
  }

  private String formatAmount(long amount, String currency) {
    NumberFormat formatter = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
    return formatter.format(amount) + " " + currency;
  }

  private NotificationOutboxResponse toResponse(NotificationOutboxEntity outbox) {
    return new NotificationOutboxResponse(
        outbox.getId(),
        outbox.getType(),
        outbox.getBookingCode(),
        outbox.getRecipientEmail(),
        outbox.getSubject(),
        outbox.getStatus(),
        outbox.getRetryCount(),
        outbox.getLastError(),
        outbox.getCreatedAt(),
        outbox.getUpdatedAt(),
        outbox.getSentAt()
    );
  }

  @Transactional(readOnly = true)
  public List<MyNotificationResponse> getMyNotifications(AuthenticatedUser authenticatedUser) {
    return notificationOutboxRepository
        .findTop5ByRecipientEmailIgnoreCaseOrderByCreatedAtDesc(authenticatedUser.email())
        .stream()
        .map(this::toMyNotificationResponse)
        .toList();
  }

  private MyNotificationResponse toMyNotificationResponse(NotificationOutboxEntity outbox) {
    return new MyNotificationResponse(
        outbox.getId(),
        outbox.getType(),
        outbox.getBookingCode(),
        outbox.getSubject(),
        outbox.getBody(),
        outbox.getStatus(),
        outbox.getCreatedAt(),
        outbox.getSentAt()
    );
  }
}
