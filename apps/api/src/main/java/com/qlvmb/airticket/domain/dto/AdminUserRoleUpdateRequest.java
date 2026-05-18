package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AdminUserRoleUpdateRequest(
    @NotEmpty @Size(max = 5) List<String> roles
) {
}
