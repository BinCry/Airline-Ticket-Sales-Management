package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record BackofficeRevenueDashboardResponse(
    String granularity,
    String periodLabel,
    OffsetDateTime generatedAt,
    long totalRevenue,
    long paidAmount,
    long refundedAmount,
    int soldTicketCount,
    int refundedTicketCount,
    List<RevenueBucket> buckets
) {

  public record RevenueBucket(
      String key,
      String label,
      long paidAmount,
      long refundedAmount,
      long netRevenue,
      int soldTicketCount,
      int refundedTicketCount
  ) {
  }
}
