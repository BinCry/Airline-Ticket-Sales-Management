package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.CopilotContextResponse;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.PermissionCode;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/copilot")
public class CopilotContextController {

  private static final int HOLD_MINUTES = 15;
  private static final String PAYMENT_PROVIDER = "sepay";
  private static final String SEAT_CONFLICT_MESSAGE = "Ghế này đã có người khác chọn";
  private static final List<String> BASE_AGENT_SCOPES = List.of(
      "booking.public_search",
      "booking.form_fill",
      "booking.seat_map_readonly",
      "booking.seat_selection",
      "booking.payment_guidance",
      "booking.payment_session_create"
  );
  private static final Set<String> VISIBLE_PERMISSION_CODES = Set.of(
      PermissionCode.PUBLIC_BOOKING_LOOKUP,
      PermissionCode.CUSTOMER_SELF_SERVICE,
      PermissionCode.MEMBER_LOYALTY
  );

  @GetMapping("/context")
  public CopilotContextResponse getContext(Authentication authentication) {
    if (
        authentication == null ||
        !(authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser)
    ) {
      return buildGuestContext();
    }

    return buildAuthenticatedContext(authenticatedUser);
  }

  private CopilotContextResponse buildGuestContext() {
    return new CopilotContextResponse(
        "guest",
        null,
        List.of(),
        List.of(),
        BASE_AGENT_SCOPES,
        buildBookingRules()
    );
  }

  private CopilotContextResponse buildAuthenticatedContext(AuthenticatedUser authenticatedUser) {
    List<String> roles = normalizeValues(authenticatedUser.roles());
    List<String> visiblePermissions = resolveVisiblePermissions(authenticatedUser.permissions());

    return new CopilotContextResponse(
        "authenticated",
        new CopilotContextResponse.UserItem(
            authenticatedUser.userId(),
            authenticatedUser.email(),
            authenticatedUser.displayName()
        ),
        roles,
        visiblePermissions,
        resolveAllowedAgentScopes(visiblePermissions),
        buildBookingRules()
    );
  }

  private List<String> resolveVisiblePermissions(List<String> permissions) {
    return normalizeValues(permissions)
        .stream()
        .filter(VISIBLE_PERMISSION_CODES::contains)
        .toList();
  }

  private List<String> resolveAllowedAgentScopes(List<String> visiblePermissions) {
    LinkedHashSet<String> allowedAgentScopes = new LinkedHashSet<>(BASE_AGENT_SCOPES);

    if (visiblePermissions.contains(PermissionCode.CUSTOMER_SELF_SERVICE)) {
      allowedAgentScopes.add("booking.manage_own_booking");
    }

    if (visiblePermissions.contains(PermissionCode.MEMBER_LOYALTY)) {
      allowedAgentScopes.add("booking.member_voucher_guidance");
    }

    return List.copyOf(allowedAgentScopes);
  }

  private List<String> normalizeValues(List<String> values) {
    if (values == null || values.isEmpty()) {
      return List.of();
    }

    LinkedHashSet<String> normalizedValues = new LinkedHashSet<>();

    for (String value : values) {
      if (value != null && !value.isBlank()) {
        normalizedValues.add(value.trim());
      }
    }

    return List.copyOf(normalizedValues);
  }

  private CopilotContextResponse.BookingRules buildBookingRules() {
    return new CopilotContextResponse.BookingRules(
        HOLD_MINUTES,
        PAYMENT_PROVIDER,
        true,
        true,
        true,
        SEAT_CONFLICT_MESSAGE
    );
  }
}
