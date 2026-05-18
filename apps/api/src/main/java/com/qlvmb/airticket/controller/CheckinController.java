package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.CheckinCompleteRequest;
import com.qlvmb.airticket.domain.dto.CheckinCompleteResponse;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.service.BookingLookupSessionService;
import com.qlvmb.airticket.service.CheckinService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/check-in")
public class CheckinController {

  private static final String BOOKING_LOOKUP_TOKEN_HEADER = "X-Booking-Lookup-Token";

  private final CheckinService checkinService;
  private final BookingLookupSessionService bookingLookupSessionService;

  public CheckinController(
      CheckinService checkinService,
      BookingLookupSessionService bookingLookupSessionService
  ) {
    this.checkinService = checkinService;
    this.bookingLookupSessionService = bookingLookupSessionService;
  }

  @PostMapping("/complete")
  public CheckinCompleteResponse completeCheckin(
      Authentication authentication,
      @Valid @RequestBody CheckinCompleteRequest request,
      @RequestHeader(value = BOOKING_LOOKUP_TOKEN_HEADER, required = false) String lookupToken
  ) {
    assertGuestLookupTokenIfNeeded(authentication, request.bookingCode(), lookupToken);
    return checkinService.completeCheckin(request);
  }

  private void assertGuestLookupTokenIfNeeded(
      Authentication authentication,
      String bookingCode,
      String lookupToken
  ) {
    if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser) {
      return;
    }
    bookingLookupSessionService.assertLookupSessionAllowed(bookingCode, lookupToken);
  }
}
