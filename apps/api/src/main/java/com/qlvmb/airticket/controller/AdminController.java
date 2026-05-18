package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.AdminDashboardResponse;
import com.qlvmb.airticket.domain.dto.AdminUserResponse;
import com.qlvmb.airticket.domain.dto.AdminUserRoleUpdateRequest;
import com.qlvmb.airticket.domain.dto.AdminUserStatusUpdateRequest;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.AdminDashboardService;
import com.qlvmb.airticket.service.AdminUserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_ADMIN + "')")
public class AdminController {

  private final AdminDashboardService adminDashboardService;
  private final AdminUserService adminUserService;

  public AdminController(
      AdminDashboardService adminDashboardService,
      AdminUserService adminUserService
  ) {
    this.adminDashboardService = adminDashboardService;
    this.adminUserService = adminUserService;
  }

  @GetMapping("/dashboard")
  public AdminDashboardResponse getDashboard() {
    return adminDashboardService.getDashboard();
  }

  @GetMapping("/users")
  public List<AdminUserResponse> getUsers() {
    return adminUserService.getUsers();
  }

  @DeleteMapping("/audit-logs/{auditLogId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteAuditLog(@PathVariable Long auditLogId) {
    adminDashboardService.deleteAuditLog(auditLogId);
  }

  @PatchMapping("/users/{userId}/roles")
  public AdminUserResponse updateUserRoles(
      Authentication authentication,
      @PathVariable Long userId,
      @Valid @RequestBody AdminUserRoleUpdateRequest request
  ) {
    return adminUserService.updateRoles(requireAuthenticatedUser(authentication), userId, request);
  }

  @PatchMapping("/users/{userId}/status")
  public AdminUserResponse updateUserStatus(
      Authentication authentication,
      @PathVariable Long userId,
      @Valid @RequestBody AdminUserStatusUpdateRequest request
  ) {
    return adminUserService.updateStatus(requireAuthenticatedUser(authentication), userId, request);
  }

  private AuthenticatedUser requireAuthenticatedUser(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser)) {
      throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện thao tác này.");
    }
    return authenticatedUser;
  }
}
