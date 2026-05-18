package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.CmsHomepageResponse;
import com.qlvmb.airticket.service.CmsHomepageService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cms")
public class CmsController {

  private final CmsHomepageService cmsHomepageService;

  public CmsController(CmsHomepageService cmsHomepageService) {
    this.cmsHomepageService = cmsHomepageService;
  }

  @GetMapping("/homepage")
  public CmsHomepageResponse getHomepageContent() {
    return cmsHomepageService.getHomepageContent();
  }
}
