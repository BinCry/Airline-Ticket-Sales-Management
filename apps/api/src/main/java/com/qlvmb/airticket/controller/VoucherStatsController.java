package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.VoucherStatsResponse;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.VoucherStatsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/backoffice/operations/vouchers/stats")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_OPERATIONS + "')")
public class VoucherStatsController {
  private final VoucherStatsService stats;

  public VoucherStatsController(VoucherStatsService stats) {
    this.stats = stats;
  }

  @GetMapping
  public VoucherStatsResponse getStats(
      @RequestParam(required = false) String fromDate,
      @RequestParam(required = false) String toDate) {
    return stats.getStats(fromDate, toDate);
  }
}
