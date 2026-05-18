package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;

public record PaymentSessionResponse(
    String bookingCode,
    String provider,
    String sessionMode,
    String paymentUrl,
    String paymentStatus,
    OffsetDateTime expiresAt,
    String referenceCode,
    long amount,
    String bankName,
    String accountNumber,
    String accountHolderName,
    String qrCodeUrl,
    String qrCodeDataUrl,
    long discountAmount,
    String appliedVoucherCode
) {
}
