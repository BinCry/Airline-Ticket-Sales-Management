package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.CheckinCompleteRequest;
import com.qlvmb.airticket.domain.dto.CheckinCompleteResponse;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.BookingService;
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
  private final BookingService bookingService;

  public CheckinController(
      CheckinService checkinService,
      BookingLookupSessionService bookingLookupSessionService,
      BookingService bookingService
  ) {
    this.checkinService = checkinService;
    this.bookingLookupSessionService = bookingLookupSessionService;
    this.bookingService = bookingService;
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
    // Sửa lỗi: trước đây mọi tài khoản đăng nhập đều bỏ qua kiểm tra; nay khách hàng phải là chủ booking
    // hoặc có phiên tra cứu OTP hợp lệ, giống luồng quản lý đặt chỗ.
    if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser) {
      if (authenticatedUser.permissions().contains(PermissionCode.CUSTOMER_SELF_SERVICE)) {
        if (lookupToken != null && !lookupToken.isBlank()) {
          bookingLookupSessionService.assertLookupSessionAllowed(bookingCode, lookupToken);
        } else {
          bookingService.assertOwnedByAuthenticatedUser(bookingCode, authenticatedUser);
        }
      }
      return;
    }
    bookingLookupSessionService.assertLookupSessionAllowed(bookingCode, lookupToken);
  }
}
