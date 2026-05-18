package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminUserStatusUpdateRequest(
    @NotBlank String status
) {
}
