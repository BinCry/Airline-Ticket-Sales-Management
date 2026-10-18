package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;

public record MyNotificationResponse(
    Long id,
    String type,
    String bookingCode,
    String subject,
    String body,
    String status,
    OffsetDateTime createdAt,
    OffsetDateTime sentAt,
    String flightCode,
    OffsetDateTime readAt
) {
  // Compatibility with controller tests created before realtime metadata was added.
  public MyNotificationResponse(Long id, String type, String bookingCode, String subject,
      String body, String status, OffsetDateTime createdAt, OffsetDateTime sentAt) {
    this(id, type, bookingCode, subject, body, status, createdAt, sentAt, null, null);
  }
}
