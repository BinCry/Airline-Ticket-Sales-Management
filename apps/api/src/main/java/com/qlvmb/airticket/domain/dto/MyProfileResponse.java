package com.qlvmb.airticket.domain.dto;

import java.util.List;

public record MyProfileResponse(
    Long id,
    String email,
    String displayName,
    String phone,
    String avatarUrl,
    boolean emailVerified,
    String status,
    List<String> roles
) {
}
