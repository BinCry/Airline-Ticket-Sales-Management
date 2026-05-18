package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.FinanceRefundItem;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.FinanceService;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/backoffice/finance/refunds")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_FINANCE + "')")
public class FinanceController {

  private final FinanceService financeService;

  public FinanceController(FinanceService financeService) {
    this.financeService = financeService;
  }

  @GetMapping
  public List<FinanceRefundItem> getRefunds() {
    return financeService.getRefunds();
  }

  @PostMapping("/{refundRequestId}/approve")
  public FinanceRefundItem approveRefund(@PathVariable long refundRequestId) {
    return financeService.approveRefund(refundRequestId);
  }

  @PostMapping("/{refundRequestId}/reject")
  public FinanceRefundItem rejectRefund(@PathVariable long refundRequestId) {
    return financeService.rejectRefund(refundRequestId);
  }

  @DeleteMapping("/{refundRequestId}")
  public void hideResolvedRefund(@PathVariable long refundRequestId) {
    financeService.hideResolvedRefund(refundRequestId);
  }
}
