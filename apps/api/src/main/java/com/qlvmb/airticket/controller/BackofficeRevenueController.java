package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.BackofficeRevenueDashboardResponse;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.BackofficeRevenueService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/backoffice/operations/revenue")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_OPERATIONS + "')")
public class BackofficeRevenueController {

  private final BackofficeRevenueService backofficeRevenueService;

  public BackofficeRevenueController(BackofficeRevenueService backofficeRevenueService) {
    this.backofficeRevenueService = backofficeRevenueService;
  }

  @GetMapping
  public BackofficeRevenueDashboardResponse getRevenueDashboard(
      @RequestParam(required = false, defaultValue = "day") String granularity,
      @RequestParam(required = false) String period,
      @RequestParam(required = false) String fromDate,
      @RequestParam(required = false) String toDate
  ) {
    return backofficeRevenueService.getRevenueDashboard(granularity, period, fromDate, toDate);
  }
}
