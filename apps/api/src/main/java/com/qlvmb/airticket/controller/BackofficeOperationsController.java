package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.BackofficeFlightCreateRequest;
import com.qlvmb.airticket.domain.dto.BackofficeFlightOperationUpdateRequest;
import com.qlvmb.airticket.domain.dto.BackofficeFlightOperationsResponse;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.BackofficeOperationsService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/backoffice/operations/flights")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_OPERATIONS + "')")
public class BackofficeOperationsController {

  private final BackofficeOperationsService backofficeOperationsService;

  public BackofficeOperationsController(BackofficeOperationsService backofficeOperationsService) {
    this.backofficeOperationsService = backofficeOperationsService;
  }

  @GetMapping
  public BackofficeFlightOperationsResponse getFlights(
      @RequestParam(required = false) String code,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
  ) {
    return backofficeOperationsService.getFlights(code, date);
  }

  @PostMapping
  public ResponseEntity<BackofficeFlightOperationsResponse.FlightItem> createFlight(
      Authentication authentication,
      @Valid @RequestBody BackofficeFlightCreateRequest request
  ) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(backofficeOperationsService.createFlight(requireAuthenticatedUser(authentication), request));
  }

  @PatchMapping("/{flightId}")
  public BackofficeFlightOperationsResponse.FlightItem updateFlight(
      Authentication authentication,
      @PathVariable Long flightId,
      @Valid @RequestBody BackofficeFlightOperationUpdateRequest request
  ) {
    return backofficeOperationsService.updateFlight(requireAuthenticatedUser(authentication), flightId, request);
  }

  @PostMapping("/{flightId}/cancel")
  public BackofficeFlightOperationsResponse.FlightItem cancelFlight(
      Authentication authentication,
      @PathVariable Long flightId
  ) {
    return backofficeOperationsService.cancelFlight(requireAuthenticatedUser(authentication), flightId);
  }

  @DeleteMapping("/{flightId}")
  public ResponseEntity<Void> hideCancelledFlight(
      Authentication authentication,
      @PathVariable Long flightId
  ) {
    backofficeOperationsService.hideCancelledFlight(requireAuthenticatedUser(authentication), flightId);
    return ResponseEntity.noContent().build();
  }

  private AuthenticatedUser requireAuthenticatedUser(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser)) {
      throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện thao tác này.");
    }
    return authenticatedUser;
  }
}
