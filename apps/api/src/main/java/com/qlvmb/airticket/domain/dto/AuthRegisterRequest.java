package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AuthRegisterRequest(
    @NotBlank @Size(max = 160) String displayName,
    @NotBlank @Email @Size(max = 160) String email,
    @Pattern(regexp = "^[0-9+]{9,15}$") String phone,
    @NotBlank @Size(min = 10, max = 72) String password
) {
}
