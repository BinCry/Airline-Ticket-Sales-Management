package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.BookingHoldRequest;
import com.qlvmb.airticket.domain.dto.BookingHoldResponse;
import com.qlvmb.airticket.domain.dto.BookingOverviewResponse;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.BackofficeSalesService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/backoffice/sales/bookings")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_SALES + "')")
public class BackofficeSalesController {

  private final BackofficeSalesService backofficeSalesService;

  public BackofficeSalesController(BackofficeSalesService backofficeSalesService) {
    this.backofficeSalesService = backofficeSalesService;
  }

  @GetMapping
  public List<BookingOverviewResponse> getBookings(
      @RequestParam(required = false) String bookingCode,
      @RequestParam(required = false) String email,
      @RequestParam(required = false) Integer limit
  ) {
    return backofficeSalesService.getBookings(bookingCode, email, limit);
  }

  @PostMapping
  public ResponseEntity<BookingHoldResponse> createBooking(
      Authentication authentication,
      @Valid @RequestBody BookingHoldRequest request
  ) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(backofficeSalesService.createBooking(requireAuthenticatedUser(authentication), request));
  }

  @PostMapping("/{bookingCode}/issue-ticket")
  public BookingOverviewResponse issueTicket(
      Authentication authentication,
      @PathVariable String bookingCode
  ) {
    return backofficeSalesService.issueTicket(requireAuthenticatedUser(authentication), bookingCode);
  }

  private AuthenticatedUser requireAuthenticatedUser(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser)) {
      throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện thao tác này.");
    }
    return authenticatedUser;
  }
}
