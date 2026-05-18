package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;

public record MyLoyaltyLedgerItemResponse(
    String entryType,
    int pointsDelta,
    int balanceAfter,
    String bookingCode,
    String description,
    OffsetDateTime createdAt
) {
}
