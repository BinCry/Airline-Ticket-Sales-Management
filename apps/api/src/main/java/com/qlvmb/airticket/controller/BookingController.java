package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.ApplyVoucherRequest;
import com.qlvmb.airticket.domain.dto.BookingHoldRequest;
import com.qlvmb.airticket.domain.dto.BookingHoldResponse;
import com.qlvmb.airticket.domain.dto.BookingLookupOtpResponse;
import com.qlvmb.airticket.domain.dto.BookingLookupRequestOtpRequest;
import com.qlvmb.airticket.domain.dto.BookingLookupVerifyOtpRequest;
import com.qlvmb.airticket.domain.dto.BookingLookupVerifyOtpResponse;
import com.qlvmb.airticket.domain.dto.BookingOverviewResponse;
import com.qlvmb.airticket.domain.dto.PaymentSessionResponse;
import com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.BookingLookupSessionService;
import com.qlvmb.airticket.service.BookingService;
import com.qlvmb.airticket.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

  private static final String BOOKING_LOOKUP_TOKEN_HEADER = "X-Booking-Lookup-Token";

  private final BookingService bookingService;
  private final PaymentService paymentService;
  private final BookingLookupSessionService bookingLookupSessionService;

  public BookingController(
      BookingService bookingService,
      PaymentService paymentService,
      BookingLookupSessionService bookingLookupSessionService
  ) {
    this.bookingService = bookingService;
    this.paymentService = paymentService;
    this.bookingLookupSessionService = bookingLookupSessionService;
  }

  @PostMapping("/holds")
  public BookingHoldResponse createHold(@Valid @RequestBody BookingHoldRequest request) {
    return bookingService.createHold(request);
  }

  @PostMapping("/lookup/request-otp")
  public BookingLookupOtpResponse requestLookupOtp(@Valid @RequestBody BookingLookupRequestOtpRequest request) {
    return bookingLookupSessionService.requestLookupOtp(request);
  }

  @PostMapping("/lookup/verify-otp")
  public BookingLookupVerifyOtpResponse verifyLookupOtp(@Valid @RequestBody BookingLookupVerifyOtpRequest request) {
    return bookingLookupSessionService.verifyLookupOtp(request);
  }

  @GetMapping("/manage/{bookingCode}")
  public BookingOverviewResponse getBooking(
      Authentication authentication,
      @PathVariable String bookingCode,
      @RequestHeader(value = BOOKING_LOOKUP_TOKEN_HEADER, required = false) String lookupToken
  ) {
    assertGuestLookupTokenIfNeeded(authentication, bookingCode, lookupToken);
    return bookingService.getBookingOverview(bookingCode);
  }

  @PostMapping("/{bookingCode}/refund-request")
  public BookingOverviewResponse createRefundRequest(
      Authentication authentication,
      @PathVariable String bookingCode,
      @Valid @RequestBody RefundRequestCreateRequest request,
      @RequestHeader(value = BOOKING_LOOKUP_TOKEN_HEADER, required = false) String lookupToken
  ) {
    assertGuestLookupTokenIfNeeded(authentication, bookingCode, lookupToken);
    return bookingService.requestRefund(bookingCode, request);
  }

  @PreAuthorize("hasAuthority('" + PermissionCode.MEMBER_LOYALTY + "')")
  @PostMapping("/{bookingCode}/apply-voucher")
  public BookingOverviewResponse applyVoucher(
      Authentication authentication,
      @PathVariable String bookingCode,
      @Valid @RequestBody ApplyVoucherRequest request
  ) {
    return bookingService.applyVoucher(bookingCode, requireAuthenticatedUser(authentication), request);
  }

  @PreAuthorize("hasAuthority('" + PermissionCode.MEMBER_LOYALTY + "')")
  @DeleteMapping("/{bookingCode}/applied-voucher")
  public BookingOverviewResponse removeAppliedVoucher(
      Authentication authentication,
      @PathVariable String bookingCode
  ) {
    return bookingService.removeAppliedVoucher(bookingCode, requireAuthenticatedUser(authentication));
  }

  @PostMapping("/{bookingCode}/payments/session")
  public PaymentSessionResponse createPaymentSession(@PathVariable String bookingCode) {
    return paymentService.createPaymentSession(bookingCode);
  }

  private void assertGuestLookupTokenIfNeeded(
      Authentication authentication,
      String bookingCode,
      String lookupToken
  ) {
    if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser) {
      if (authenticatedUser.permissions().contains(PermissionCode.CUSTOMER_SELF_SERVICE)) {
        bookingService.assertOwnedByAuthenticatedUser(bookingCode, authenticatedUser);
      }
      return;
    }
    bookingLookupSessionService.assertLookupSessionAllowed(bookingCode, lookupToken);
  }

  private AuthenticatedUser requireAuthenticatedUser(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser)) {
      throw new UnauthorizedException("B\u1ea1n c\u1ea7n \u0111\u0103ng nh\u1eadp \u0111\u1ec3 th\u1ef1c hi\u1ec7n thao t\u00e1c n\u00e0y.");
    }
    return authenticatedUser;
  }
}
