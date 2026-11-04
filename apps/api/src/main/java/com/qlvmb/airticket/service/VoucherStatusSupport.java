package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import java.time.OffsetDateTime;

public final class VoucherStatusSupport {
  private VoucherStatusSupport() {}

  public static String effectiveStatus(String status, OffsetDateTime expiresAt, OffsetDateTime asOf) {
    return MemberVoucherEntity.STATUS_AVAILABLE.equals(status) && !expiresAt.isAfter(asOf)
        ? MemberVoucherEntity.STATUS_EXPIRED : status;
  }
}
