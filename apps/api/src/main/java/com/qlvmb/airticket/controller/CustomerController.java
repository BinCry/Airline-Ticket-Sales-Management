package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.CustomerOverviewResponse;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.CustomerOverviewService;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

  private final CustomerOverviewService customerOverviewService;

  public CustomerController(CustomerOverviewService customerOverviewService) {
    this.customerOverviewService = customerOverviewService;
  }

  @PreAuthorize("hasAuthority('" + PermissionCode.CUSTOMER_SELF_SERVICE + "')")
  @GetMapping("/me/overview")
  public CustomerOverviewResponse getOverview(Authentication authentication) {
    return customerOverviewService.getOverview(requireAuthenticatedUser(authentication));
  }

  private AuthenticatedUser requireAuthenticatedUser(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser)) {
      throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện thao tác này.");
    }
    return authenticatedUser;
  }
}
