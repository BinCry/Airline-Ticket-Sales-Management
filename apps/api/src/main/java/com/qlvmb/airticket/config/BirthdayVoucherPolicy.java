package com.qlvmb.airticket.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public final class BirthdayVoucherPolicy {
  public static final long DEFAULT_DISCOUNT_AMOUNT = 100000;
  public static final int DEFAULT_VALID_DAYS = 30;
  private final long discountAmount;
  private final int validDays;

  public BirthdayVoucherPolicy(
      @Value("${app.voucher.birthday.discount-amount:" + DEFAULT_DISCOUNT_AMOUNT + "}") long discountAmount,
      @Value("${app.voucher.birthday.valid-days:" + DEFAULT_VALID_DAYS + "}") int validDays) {
    // Chỉ cho phép ưu đãi trong giới hạn đã duyệt; không tự tăng mức giảm hoặc gia hạn.
    if (discountAmount <= 0 || discountAmount > DEFAULT_DISCOUNT_AMOUNT) {
      throw new IllegalArgumentException("Mức giảm sinh nhật phải từ 1 đến 100000 VND.");
    }
    if (validDays <= 0 || validDays > DEFAULT_VALID_DAYS) {
      throw new IllegalArgumentException("Hạn quà sinh nhật phải từ 1 đến 30 ngày.");
    }
    this.discountAmount = discountAmount;
    this.validDays = validDays;
  }

  public long discountAmount() {
    return discountAmount;
  }

  public int validDays() {
    return validDays;
  }
}
