package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.SupportOverviewResponse;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.SupportOverviewService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/support")
public class SupportController {

  private final SupportOverviewService supportOverviewService;

  public SupportController(SupportOverviewService supportOverviewService) {
    this.supportOverviewService = supportOverviewService;
  }

  @PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_SUPPORT + "')")
  @GetMapping("/overview")
  public SupportOverviewResponse getSupportOverview() {
    return supportOverviewService.getOverview();
  }
}
