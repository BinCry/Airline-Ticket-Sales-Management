package com.qlvmb.airticket.domain.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record VoucherStatsResponse(
    LocalDate fromDate, LocalDate toDate, String dateBasis, String timezone,
    OffsetDateTime asOf, boolean includesHidden, String discountBasis,
    Summary summary, List<SourceStats> bySource, List<MonthStats> byMonth
) {
  public record Summary(
      long totalVouchers, Map<String, Long> statusCounts,
      long usageDenominator, BigDecimal usageRate,
      Map<String, Long> actualDiscountByCurrency, long unmatchedUsedCount,
      boolean actualDiscountComplete, long operationsHiddenCount
  ) {}
  public record SourceStats(String source, Summary summary) {}
  public record MonthStats(String month, Summary summary) {}
}
