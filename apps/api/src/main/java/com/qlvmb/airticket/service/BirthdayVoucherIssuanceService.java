package com.qlvmb.airticket.service;

import com.qlvmb.airticket.repository.BirthdayVoucherRepository;
import com.qlvmb.airticket.repository.BirthdayVoucherRepository.Candidate;
import com.qlvmb.airticket.repository.BirthdayVoucherRepository.Outcome;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class BirthdayVoucherIssuanceService {
  private static final Logger LOGGER = LoggerFactory.getLogger(BirthdayVoucherIssuanceService.class);
  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private final BirthdayVoucherRepository vouchers;
  private final TransactionTemplate scan;
  private final TransactionTemplate member;

  public BirthdayVoucherIssuanceService(BirthdayVoucherRepository vouchers,
      PlatformTransactionManager manager) {
    this.vouchers = vouchers;
    scan = new TransactionTemplate(manager);
    scan.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    scan.setReadOnly(true);
    member = new TransactionTemplate(manager);
    member.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    member.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
  }

  public Report issueDue(Instant now) {
    Objects.requireNonNull(now, "Thiếu thời điểm xét cấp.");
    LocalDate today = now.atZone(ZONE).toLocalDate();
    long cursor = 0;
    int issued = 0, already = 0, skipped = 0, anomalies = 0, failed = 0;
    while (true) {
      List<Candidate> page;
      try {
        long afterId = cursor;
        page = Objects.requireNonNull(scan.execute(tx -> vouchers.findCandidates(afterId, today, 200)));
      } catch (RuntimeException exception) {
        LOGGER.error("Không đọc được danh sách xét quà sinh nhật: {}.", exception.getClass().getSimpleName());
        return new Report(issued, already, skipped, anomalies, failed, true);
      }
      if (page.isEmpty()) {
        return new Report(issued, already, skipped, anomalies, failed, false);
      }
      for (Candidate candidate : page) {
        if (candidate == null || candidate.userId() <= cursor) {
          LOGGER.error("Danh sách xét quà sinh nhật không tăng theo ID.");
          return new Report(issued, already, skipped, anomalies, failed, true);
        }
        cursor = candidate.userId();
        Optional<LocalDate> birthday = birthdayWithinWindow(candidate.dateOfBirth(), today);
        if (birthday.isEmpty()) {
          skipped++;
          continue;
        }
        try {
          Outcome result = Objects.requireNonNull(member.execute(
              tx -> vouchers.issue(candidate.userId(), birthday.get(), now)));
          switch (result) {
            case ISSUED -> issued++;
            case ALREADY_ISSUED -> already++;
            case SKIPPED -> skipped++;
            case ANOMALY -> {
              anomalies++;
              LOGGER.warn("Mã quà sinh nhật xung đột chính sách tại tài khoản {}.", candidate.userId());
            }
          }
        } catch (RuntimeException exception) {
          // Bắt lỗi ngoài transaction, gồm cả lỗi commit; không retry hội viên này.
          failed++;
          LOGGER.error("Chưa cấp được quà sinh nhật cho tài khoản {}: {}.",
              candidate.userId(), exception.getClass().getSimpleName());
        }
      }
    }
  }

  static Optional<LocalDate> birthdayWithinWindow(LocalDate dob, LocalDate today) {
    if (dob == null || dob.getYear() < 1 || dob.isAfter(today)) {
      return Optional.empty();
    }
    for (int offset = 0; offset <= 3; offset++) {
      LocalDate date = today.minusDays(offset);
      int day = dob.getMonthValue() == 2 && dob.getDayOfMonth() == 29 && !Year.isLeap(date.getYear())
          ? 28 : dob.getDayOfMonth();
      LocalDate anniversary = LocalDate.of(date.getYear(), dob.getMonthValue(), day);
      if (anniversary.equals(date) && !dob.isAfter(date)) {
        return Optional.of(date);
      }
    }
    return Optional.empty();
  }

  public record Report(int issued, int alreadyIssued, int skipped, int anomalies,
      int failed, boolean scanFailed) {}
}
