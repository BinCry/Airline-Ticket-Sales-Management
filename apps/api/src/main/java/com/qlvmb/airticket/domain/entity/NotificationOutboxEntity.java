package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "notification_outbox")
public class NotificationOutboxEntity {

  public static final String TYPE_TICKET_EMAIL = "TICKET_EMAIL";
  public static final String TYPE_FLIGHT_CANCELLATION_EMAIL = "FLIGHT_CANCELLATION_EMAIL";
  public static final String STATUS_PENDING = "PENDING";
  public static final String STATUS_SENT = "SENT";
  public static final String STATUS_FAILED = "FAILED";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 80)
  private String type;

  @Column(name = "booking_code", length = 6)
  private String bookingCode;

  @Column(name = "recipient_email", nullable = false, length = 160)
  private String recipientEmail;

  @Column(nullable = false, length = 200)
  private String subject;

  @Column(nullable = false, columnDefinition = "text")
  private String body;

  @Column(nullable = false, length = 16)
  private String status;

  @Column(name = "retry_count", nullable = false)
  private int retryCount;

  @Column(name = "last_error", length = 1000)
  private String lastError;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @Column(name = "sent_at")
  private OffsetDateTime sentAt;

  protected NotificationOutboxEntity() {
  }

  public static NotificationOutboxEntity createTicketEmail(
      String bookingCode,
      String recipientEmail,
      String subject,
      String body,
      OffsetDateTime createdAt
  ) {
    NotificationOutboxEntity outbox = new NotificationOutboxEntity();
    outbox.type = TYPE_TICKET_EMAIL;
    outbox.bookingCode = bookingCode;
    outbox.recipientEmail = recipientEmail;
    outbox.subject = subject;
    outbox.body = body;
    outbox.status = STATUS_PENDING;
    outbox.retryCount = 0;
    outbox.createdAt = createdAt;
    outbox.updatedAt = createdAt;
    return outbox;
  }

  public static NotificationOutboxEntity createFlightCancellationEmail(
      String bookingCode,
      String recipientEmail,
      String subject,
      String body,
      OffsetDateTime createdAt
  ) {
    NotificationOutboxEntity outbox = new NotificationOutboxEntity();
    outbox.type = TYPE_FLIGHT_CANCELLATION_EMAIL;
    outbox.bookingCode = bookingCode;
    outbox.recipientEmail = recipientEmail;
    outbox.subject = subject;
    outbox.body = body;
    outbox.status = STATUS_PENDING;
    outbox.retryCount = 0;
    outbox.createdAt = createdAt;
    outbox.updatedAt = createdAt;
    return outbox;
  }

  public Long getId() {
    return id;
  }

  public String getType() {
    return type;
  }

  public String getBookingCode() {
    return bookingCode;
  }

  public String getRecipientEmail() {
    return recipientEmail;
  }

  public String getSubject() {
    return subject;
  }

  public String getBody() {
    return body;
  }

  public String getStatus() {
    return status;
  }

  public int getRetryCount() {
    return retryCount;
  }

  public String getLastError() {
    return lastError;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public OffsetDateTime getSentAt() {
    return sentAt;
  }

  public void markSent(OffsetDateTime sentAt) {
    status = STATUS_SENT;
    lastError = null;
    this.sentAt = sentAt;
    updatedAt = sentAt;
  }

  public void markFailed(String error, OffsetDateTime failedAt) {
    status = STATUS_FAILED;
    retryCount++;
    lastError = truncate(error);
    updatedAt = failedAt;
  }

  public void markRetrying(OffsetDateTime updatedAt) {
    status = STATUS_PENDING;
    lastError = null;
    this.updatedAt = updatedAt;
  }

  private String truncate(String value) {
    if (value == null || value.isBlank()) {
      return "Không xác định được lỗi gửi email.";
    }
    return value.length() > 1000 ? value.substring(0, 1000) : value;
  }
}
