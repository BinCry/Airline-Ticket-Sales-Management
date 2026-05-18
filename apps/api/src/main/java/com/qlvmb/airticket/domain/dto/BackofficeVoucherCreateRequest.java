package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public record BackofficeVoucherCreateRequest(
    @NotBlank @Email String memberEmail,
    @NotBlank @Size(max = 40) String voucherCode,
    @NotBlank @Size(max = 160) String title,
    @NotBlank @Size(max = 255) String description,
    @Min(1) long discountAmount,
    @NotBlank @Size(max = 8) String currency,
    @NotNull OffsetDateTime expiresAt
) {
}
