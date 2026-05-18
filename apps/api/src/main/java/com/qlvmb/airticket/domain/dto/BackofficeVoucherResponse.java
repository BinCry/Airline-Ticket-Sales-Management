package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record BackofficeVoucherResponse(
    String queryEmail,
    String queryCode,
    String queryStatus,
    List<VoucherItem> vouchers
) {

  public record VoucherItem(
      Long voucherId,
      Long userId,
      String memberEmail,
      String memberDisplayName,
      String voucherCode,
      String title,
      String description,
      long discountAmount,
      String currency,
      String status,
      OffsetDateTime expiresAt,
      OffsetDateTime usedAt,
      String bookingCode
  ) {
  }
}
