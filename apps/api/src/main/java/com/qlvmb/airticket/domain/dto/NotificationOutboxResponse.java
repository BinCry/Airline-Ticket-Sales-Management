package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;

public record NotificationOutboxResponse(
    Long id,
    String type,
    String bookingCode,
    String recipientEmail,
    String subject,
    String status,
    int retryCount,
    String lastError,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    OffsetDateTime sentAt
) {
}
