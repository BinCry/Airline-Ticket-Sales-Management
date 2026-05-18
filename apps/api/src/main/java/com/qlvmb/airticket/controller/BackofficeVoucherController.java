package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.BackofficeVoucherCreateRequest;
import com.qlvmb.airticket.domain.dto.BackofficeVoucherResponse;
import com.qlvmb.airticket.domain.dto.BackofficeVoucherUpdateRequest;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.BackofficeVoucherService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;

@RestController
@RequestMapping("/api/backoffice/operations/vouchers")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_OPERATIONS + "')")
public class BackofficeVoucherController {

  private final BackofficeVoucherService backofficeVoucherService;

  public BackofficeVoucherController(BackofficeVoucherService backofficeVoucherService) {
    this.backofficeVoucherService = backofficeVoucherService;
  }

  @GetMapping
  public BackofficeVoucherResponse getVouchers(
      @RequestParam(required = false) String email,
      @RequestParam(required = false) String code,
      @RequestParam(required = false) String status
  ) {
    return backofficeVoucherService.getVouchers(email, code, status);
  }

  @PostMapping
  public BackofficeVoucherResponse.VoucherItem createVoucher(
      Authentication authentication,
      @Valid @RequestBody BackofficeVoucherCreateRequest request
  ) {
    return backofficeVoucherService.createVoucher(requireAuthenticatedUser(authentication), request);
  }

  @PatchMapping("/{voucherId}")
  public BackofficeVoucherResponse.VoucherItem updateVoucher(
      Authentication authentication,
      @PathVariable Long voucherId,
      @Valid @RequestBody BackofficeVoucherUpdateRequest request
  ) {
    return backofficeVoucherService.updateVoucher(requireAuthenticatedUser(authentication), voucherId, request);
  }

  @PostMapping("/{voucherId}/revoke")
  public BackofficeVoucherResponse.VoucherItem revokeVoucher(
      Authentication authentication,
      @PathVariable Long voucherId
  ) {
    return backofficeVoucherService.revokeVoucher(requireAuthenticatedUser(authentication), voucherId);
  }

  @DeleteMapping("/{voucherId}")
  public ResponseEntity<Void> hideVoucherFromOperations(
      Authentication authentication,
      @PathVariable Long voucherId
  ) {
    backofficeVoucherService.hideVoucherFromOperations(requireAuthenticatedUser(authentication), voucherId);
    return ResponseEntity.noContent().build();
  }

  private AuthenticatedUser requireAuthenticatedUser(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser)) {
      throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện thao tác này.");
    }
    return authenticatedUser;
  }
}
