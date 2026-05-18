package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;

public record MyVoucherResponse(
    String voucherCode,
    String title,
    String description,
    long discountAmount,
    String currency,
    String status,
    OffsetDateTime expiresAt,
    OffsetDateTime usedAt,
    String bookingCode
) {
}
