package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.NotBlank;

public record ApplyVoucherRequest(
    @NotBlank String voucherCode
) {
}
