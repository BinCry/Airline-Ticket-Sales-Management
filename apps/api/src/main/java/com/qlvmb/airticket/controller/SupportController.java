package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.SupportOverviewResponse;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.DemoDataService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/support")
public class SupportController {

  private final DemoDataService demoDataService;

  public SupportController(DemoDataService demoDataService) {
    this.demoDataService = demoDataService;
  }

  @PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_SUPPORT + "')")
  @GetMapping("/overview")
  public SupportOverviewResponse getSupportOverview() {
    return demoDataService.getSupportOverview();
  }
}
