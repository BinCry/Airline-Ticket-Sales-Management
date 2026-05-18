package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;

public record BookingLookupVerifyOtpResponse(
    String status,
    String lookupToken,
    OffsetDateTime expiresAt
) {
}
