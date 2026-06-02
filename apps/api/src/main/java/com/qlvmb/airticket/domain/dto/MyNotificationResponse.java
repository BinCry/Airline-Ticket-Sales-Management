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
    OffsetDateTime sentAt
) {
}
