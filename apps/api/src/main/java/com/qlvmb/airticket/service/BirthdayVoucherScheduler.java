package com.qlvmb.airticket.service;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "app.voucher.birthday", name = "enabled",
    havingValue = "true", matchIfMissing = false)
public class BirthdayVoucherScheduler {
  private static final Logger LOGGER = LoggerFactory.getLogger(BirthdayVoucherScheduler.class);
  private final BirthdayVoucherIssuanceService issuance;

  public BirthdayVoucherScheduler(BirthdayVoucherIssuanceService issuance) {
    this.issuance = issuance;
  }

  @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
  public void issueDaily() {
    try {
      var report = issuance.issueDue(Instant.now());
      if (report.scanFailed() || report.failed() > 0 || report.anomalies() > 0) {
        LOGGER.warn("Lượt cấp quà sinh nhật cần kiểm tra: {}.", report);
      } else {
        LOGGER.info("Kết quả cấp quà sinh nhật: {}.", report);
      }
    } catch (RuntimeException exception) {
      LOGGER.error("Lượt cấp quà sinh nhật bị gián đoạn: {}.",
          exception.getClass().getSimpleName());
    }
  }
}
