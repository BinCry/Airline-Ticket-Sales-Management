package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record AuthSessionResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    OffsetDateTime accessTokenExpiresAt,
    UserSummary user
) {

  public record UserSummary(
      Long id,
      String email,
      String displayName,
      String phone,
      boolean emailVerified,
      List<String> roles,
      List<String> permissions
  ) {
  }
}
