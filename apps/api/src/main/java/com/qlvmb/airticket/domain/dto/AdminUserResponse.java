package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record AdminUserResponse(
    Long id,
    String email,
    String displayName,
    String phone,
    String status,
    boolean emailVerified,
    String avatarUrl,
    OffsetDateTime lockedAt,
    OffsetDateTime lastLoginAt,
    List<String> roles
) {
}
