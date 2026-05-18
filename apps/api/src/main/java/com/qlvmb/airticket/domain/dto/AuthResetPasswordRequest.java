package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AuthResetPasswordRequest(
    @NotBlank @Email @Size(max = 160) String email,
    @NotBlank @Pattern(regexp = "^[0-9]{6}$") String otp,
    @NotBlank @Size(min = 10, max = 72) String newPassword
) {
}
