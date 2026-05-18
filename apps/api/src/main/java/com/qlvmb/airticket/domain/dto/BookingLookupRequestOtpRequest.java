package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record BookingLookupRequestOtpRequest(
    @NotBlank @Pattern(regexp = "^[A-Za-z0-9]{6}$") String bookingCode,
    @NotBlank @Email String email
) {
}
