package com.qlvmb.airticket.domain.dto;

import java.util.List;

public record CopilotContextResponse(
    String authMode,
    UserItem user,
    List<String> roles,
    List<String> permissions,
    List<String> allowedAgentScopes,
    BookingRules bookingRules
) {

  public record UserItem(
      Long id,
      String email,
      String displayName
  ) {
  }

  public record BookingRules(
      int holdMinutes,
      String paymentProvider,
      boolean supportsGuestBooking,
      boolean supportsQrCode,
      boolean requiresUserPaymentConfirmation,
      String seatConflictMessage
  ) {
  }
}
