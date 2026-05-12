package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;

public record FinanceRefundItem(
    long id,
    String bookingCode,
    String bookingStatus,
    String contactName,
    String reason,
    long refundAmount,
    String status,
    OffsetDateTime createdAt
) {
}
