package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.CmsHomepageResponse;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.DemoDataService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/backoffice/cms")
public class BackofficeCmsController {

  private final DemoDataService demoDataService;

  public BackofficeCmsController(DemoDataService demoDataService) {
    this.demoDataService = demoDataService;
  }

  @PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_CMS + "')")
  @GetMapping("/homepage")
  public CmsHomepageResponse getHomepageContent() {
    return demoDataService.getCmsHomepage();
  }
}
