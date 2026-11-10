package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.VoucherStatsResponse;
import com.qlvmb.airticket.domain.dto.VoucherStatsResponse.Summary;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.VoucherStatsRepository;
import com.qlvmb.airticket.repository.VoucherStatsRepository.IssuedVoucher;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoucherStatsService {
  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private final VoucherStatsRepository repository;

  public VoucherStatsService(VoucherStatsRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true)
  public VoucherStatsResponse getStats(String fromDate, String toDate) {
    return getStats(fromDate, toDate, OffsetDateTime.now(ZONE));
  }

  VoucherStatsResponse getStats(String fromDate, String toDate, OffsetDateTime asOf) {
    LocalDate from = parseDate(fromDate);
    LocalDate to = parseDate(toDate);
    if (from != null && to != null && from.isAfter(to)) {
      throw new BadRequestException("Ngày bắt đầu không được sau ngày kết thúc.");
    }
    OffsetDateTime end;
    try {
      end = to == null ? null : to.plusDays(1).atStartOfDay(ZONE).toOffsetDateTime();
    } catch (DateTimeException exception) {
      throw new BadRequestException("Ngày kết thúc nằm ngoài phạm vi được hỗ trợ.");
    }
    var unique = new LinkedHashMap<Long, IssuedVoucher>();
    repository.findIssued(from == null ? null : from.atStartOfDay(ZONE).toOffsetDateTime(), end)
        .forEach(row -> {
          var previous = unique.putIfAbsent(row.id(), row);
          if (previous != null && !previous.equals(row)) {
            throw new IllegalStateException("Dữ liệu thống kê voucher không nhất quán.");
          }
        });
    var bookingReferences = unique.values().stream()
        .filter(row -> "USED".equals(row.status()) && row.bookingId() != null)
        .map(IssuedVoucher::bookingId)
        .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
    var total = new Bucket();
    var sources = new TreeMap<String, Bucket>();
    sources.put("MANUAL", new Bucket());
    sources.put("BIRTHDAY", new Bucket());
    var months = new TreeMap<String, Bucket>();
    for (var row : unique.values()) {
      String status = VoucherStatusSupport.effectiveStatus(row.status(), row.expiresAt(), asOf);
      boolean matched = "USED".equals(status) && row.bookingId() != null
          && bookingReferences.get(row.bookingId()) == 1L
          && row.actualDiscount() != null && row.actualDiscount() >= 0
          && row.bookingCurrency() != null && !row.bookingCurrency().isBlank();
      String month = YearMonth.from(row.createdAt().atZoneSameInstant(ZONE)).toString();
      total.add(row, status, matched);
      sources.computeIfAbsent(row.source(), ignored -> new Bucket()).add(row, status, matched);
      months.computeIfAbsent(month, ignored -> new Bucket()).add(row, status, matched);
    }
    return new VoucherStatsResponse(from, to, "CREATED_AT", ZONE.getId(), asOf, true,
        "BOOKING_RECORDED_DISCOUNT", total.toResponse(),
        sources.entrySet().stream()
            .map(entry -> new VoucherStatsResponse.SourceStats(entry.getKey(), entry.getValue().toResponse()))
            .toList(),
        months.entrySet().stream()
            .map(entry -> new VoucherStatsResponse.MonthStats(entry.getKey(), entry.getValue().toResponse()))
            .toList());
  }

  private LocalDate parseDate(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      String normalized = value.trim();
      if (!normalized.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") || normalized.startsWith("0000-")) {
        throw new BadRequestException("Ngày thống kê phải có định dạng yyyy-MM-dd hợp lệ.");
      }
      return LocalDate.parse(normalized);
    } catch (DateTimeException exception) {
      throw new BadRequestException("Ngày thống kê phải có định dạng yyyy-MM-dd hợp lệ.");
    }
  }

  private static final class Bucket {
    private long total;
    private long hidden;
    private long unmatched;
    private final Map<String, Long> statuses = new LinkedHashMap<>();
    private final Map<String, Long> discounts = new TreeMap<>();

    private Bucket() {
      for (String status : List.of("AVAILABLE", "RESERVED", "USED", "EXPIRED", "REVOKED")) {
        statuses.put(status, 0L);
      }
    }

    private void add(IssuedVoucher row, String status, boolean matched) {
      total++;
      statuses.merge(status, 1L, Long::sum);
      if (row.operationsHidden()) {
        hidden++;
      }
      if ("USED".equals(status)) {
        if (matched) {
          discounts.merge(row.bookingCurrency(), row.actualDiscount(), Math::addExact);
        } else {
          unmatched++;
        }
      }
    }

    private Summary toResponse() {
      long denominator = total - statuses.get("REVOKED");
      BigDecimal rate = denominator == 0 ? null : BigDecimal.valueOf(statuses.get("USED"))
          .divide(BigDecimal.valueOf(denominator), 6, RoundingMode.HALF_UP);
      return new Summary(total, Collections.unmodifiableMap(new LinkedHashMap<>(statuses)),
          denominator, rate, Collections.unmodifiableMap(new TreeMap<>(discounts)),
          unmatched, unmatched == 0, hidden);
    }
  }
}
