package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.BackofficeRevenueDashboardResponse;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.RefundRequestRepository;
import java.time.LocalDate;
import java.time.Month;
import java.time.OffsetDateTime;
import java.time.Year;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BackofficeRevenueService {

  private static final ZoneId REPORT_ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final DateTimeFormatter DAILY_KEY_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
  private static final DateTimeFormatter MONTHLY_KEY_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

  private final BookingRepository bookingRepository;
  private final RefundRequestRepository refundRequestRepository;

  public BackofficeRevenueService(
      BookingRepository bookingRepository,
      RefundRequestRepository refundRequestRepository
  ) {
    this.bookingRepository = bookingRepository;
    this.refundRequestRepository = refundRequestRepository;
  }

  @Transactional(readOnly = true)
  public BackofficeRevenueDashboardResponse getRevenueDashboard(String granularity) {
    return getRevenueDashboard(granularity, null, null, null);
  }

  @Transactional(readOnly = true)
  public BackofficeRevenueDashboardResponse getRevenueDashboard(String granularity, String period) {
    return getRevenueDashboard(granularity, period, null, null);
  }

  @Transactional(readOnly = true)
  public BackofficeRevenueDashboardResponse getRevenueDashboard(
      String granularity,
      String period,
      String fromDate,
      String toDate
  ) {
    RevenueGranularity revenueGranularity = RevenueGranularity.from(granularity);
    OffsetDateTime generatedAt = OffsetDateTime.now(REPORT_ZONE_ID);
    RevenueWindow window = RevenueWindow.create(revenueGranularity, generatedAt, period, fromDate, toDate);
    Map<String, MutableRevenueBucket> buckets = createEmptyBuckets(window);

    bookingRepository.findPaidRevenueBookings(
        BookingEntity.PAYMENT_STATUS_PAID,
        window.from(),
        window.to()
    ).forEach(booking -> addPaidBooking(buckets, revenueGranularity, booking));

    refundRequestRepository.findApprovedRevenueRefunds(
        RefundRequestEntity.STATUS_APPROVED,
        window.from(),
        window.to()
    ).forEach(refundRequest -> addApprovedRefund(buckets, revenueGranularity, refundRequest));

    List<BackofficeRevenueDashboardResponse.RevenueBucket> responseBuckets = buckets.values().stream()
        .map(MutableRevenueBucket::toResponse)
        .toList();

    long paidAmount = responseBuckets.stream()
        .mapToLong(BackofficeRevenueDashboardResponse.RevenueBucket::paidAmount)
        .sum();
    long refundedAmount = responseBuckets.stream()
        .mapToLong(BackofficeRevenueDashboardResponse.RevenueBucket::refundedAmount)
        .sum();
    int soldTicketCount = responseBuckets.stream()
        .mapToInt(BackofficeRevenueDashboardResponse.RevenueBucket::soldTicketCount)
        .sum();
    int refundedTicketCount = responseBuckets.stream()
        .mapToInt(BackofficeRevenueDashboardResponse.RevenueBucket::refundedTicketCount)
        .sum();

    return new BackofficeRevenueDashboardResponse(
        revenueGranularity.apiValue(),
        window.label(),
        generatedAt,
        paidAmount - refundedAmount,
        paidAmount,
        refundedAmount,
        soldTicketCount,
        refundedTicketCount,
        responseBuckets
    );
  }

  private Map<String, MutableRevenueBucket> createEmptyBuckets(RevenueWindow window) {
    Map<String, MutableRevenueBucket> buckets = new LinkedHashMap<>();
    if (window.granularity() == RevenueGranularity.MONTH) {
      for (int monthIndex = 1; monthIndex <= 12; monthIndex++) {
        YearMonth month = YearMonth.of(window.from().getYear(), monthIndex);
        String key = month.format(MONTHLY_KEY_FORMATTER);
        buckets.put(key, new MutableRevenueBucket(key, "Tháng " + monthIndex));
      }
      return buckets;
    }

    LocalDate cursor = window.from().toLocalDate();
    LocalDate endDate = window.to().toLocalDate();
    while (cursor.isBefore(endDate)) {
      String key = cursor.format(DAILY_KEY_FORMATTER);
      String label = "%02d/%02d".formatted(cursor.getDayOfMonth(), cursor.getMonthValue());
      buckets.put(key, new MutableRevenueBucket(key, label));
      cursor = cursor.plusDays(1);
    }
    return buckets;
  }

  private void addPaidBooking(
      Map<String, MutableRevenueBucket> buckets,
      RevenueGranularity granularity,
      BookingEntity booking
  ) {
    MutableRevenueBucket bucket = buckets.get(resolveBucketKey(granularity, booking.getTicketedAt()));
    if (bucket == null) {
      return;
    }

    bucket.paidAmount += booking.getTotalAmount();
    bucket.soldTicketCount += booking.getTickets().size();
  }

  private void addApprovedRefund(
      Map<String, MutableRevenueBucket> buckets,
      RevenueGranularity granularity,
      RefundRequestEntity refundRequest
  ) {
    MutableRevenueBucket bucket = buckets.get(resolveBucketKey(granularity, refundRequest.getUpdatedAt()));
    if (bucket == null) {
      return;
    }

    bucket.refundedAmount += refundRequest.getRefundAmount();
    bucket.refundedTicketCount += refundRequest.getRequestedTickets().isEmpty()
        ? refundRequest.getBooking().getTickets().size()
        : refundRequest.getRequestedTickets().size();
  }

  private String resolveBucketKey(RevenueGranularity granularity, OffsetDateTime value) {
    OffsetDateTime zonedValue = value.atZoneSameInstant(REPORT_ZONE_ID).toOffsetDateTime();
    if (granularity == RevenueGranularity.MONTH) {
      return YearMonth.from(zonedValue).format(MONTHLY_KEY_FORMATTER);
    }

    return zonedValue.toLocalDate().format(DAILY_KEY_FORMATTER);
  }

  private enum RevenueGranularity {
    DAY("day"),
    MONTH("month"),
    CUSTOM("custom");

    private final String apiValue;

    RevenueGranularity(String apiValue) {
      this.apiValue = apiValue;
    }

    String apiValue() {
      return apiValue;
    }

    static RevenueGranularity from(String value) {
      if (value == null || value.isBlank()) {
        return DAY;
      }

      String normalizedValue = value.trim().toLowerCase(Locale.ROOT);
      return switch (normalizedValue) {
        case "month", "monthly", "year" -> MONTH;
        case "custom", "range", "date_range" -> CUSTOM;
        default -> DAY;
      };
    }
  }

  private record RevenueWindow(
      RevenueGranularity granularity,
      OffsetDateTime from,
      OffsetDateTime to,
      String label
  ) {

    static RevenueWindow create(
        RevenueGranularity granularity,
        OffsetDateTime currentTime,
        String period,
        String fromDate,
        String toDate
    ) {
      if (granularity == RevenueGranularity.MONTH) {
        Year selectedYear = resolveYearPeriod(period, currentTime);
        OffsetDateTime from = selectedYear.atMonth(Month.JANUARY).atDay(1)
            .atStartOfDay(REPORT_ZONE_ID)
            .toOffsetDateTime();
        OffsetDateTime to = selectedYear.plusYears(1).atMonth(Month.JANUARY).atDay(1)
            .atStartOfDay(REPORT_ZONE_ID)
            .toOffsetDateTime();
        return new RevenueWindow(granularity, from, to, "Năm " + selectedYear.getValue());
      }

      if (granularity == RevenueGranularity.CUSTOM) {
        return createCustomWindow(currentTime, fromDate, toDate);
      }

      YearMonth currentMonth = resolveMonthPeriod(period, currentTime);
      OffsetDateTime from = currentMonth.atDay(1)
          .atStartOfDay(REPORT_ZONE_ID)
          .toOffsetDateTime();
      OffsetDateTime to = currentMonth.plusMonths(1)
          .atDay(1)
          .atStartOfDay(REPORT_ZONE_ID)
          .toOffsetDateTime();
      String label = "Tháng %d/%d".formatted(currentMonth.getMonthValue(), currentMonth.getYear());
      return new RevenueWindow(granularity, from, to, label);
    }

    private static RevenueWindow createCustomWindow(
        OffsetDateTime currentTime,
        String fromDate,
        String toDate
    ) {
      LocalDate defaultFromDate = currentTime.toLocalDate().withDayOfMonth(1);
      LocalDate defaultToDate = currentTime.toLocalDate();
      LocalDate selectedFromDate = resolveDate(fromDate, defaultFromDate);
      LocalDate selectedToDate = resolveDate(toDate, defaultToDate);
      if (selectedFromDate.isAfter(selectedToDate)) {
        LocalDate swappedFromDate = selectedToDate;
        selectedToDate = selectedFromDate;
        selectedFromDate = swappedFromDate;
      }

      OffsetDateTime from = selectedFromDate
          .atStartOfDay(REPORT_ZONE_ID)
          .toOffsetDateTime();
      OffsetDateTime to = selectedToDate.plusDays(1)
          .atStartOfDay(REPORT_ZONE_ID)
          .toOffsetDateTime();
      String label = "Từ %02d/%02d/%d đến %02d/%02d/%d".formatted(
          selectedFromDate.getDayOfMonth(),
          selectedFromDate.getMonthValue(),
          selectedFromDate.getYear(),
          selectedToDate.getDayOfMonth(),
          selectedToDate.getMonthValue(),
          selectedToDate.getYear()
      );
      return new RevenueWindow(RevenueGranularity.CUSTOM, from, to, label);
    }

    private static YearMonth resolveMonthPeriod(String period, OffsetDateTime currentTime) {
      if (period == null || period.isBlank()) {
        return YearMonth.from(currentTime);
      }

      try {
        return YearMonth.parse(period.trim(), MONTHLY_KEY_FORMATTER);
      } catch (RuntimeException exception) {
        return YearMonth.from(currentTime);
      }
    }

    private static Year resolveYearPeriod(String period, OffsetDateTime currentTime) {
      if (period == null || period.isBlank()) {
        return Year.from(currentTime);
      }

      try {
        return Year.parse(period.trim());
      } catch (RuntimeException exception) {
        return Year.from(currentTime);
      }
    }

    private static LocalDate resolveDate(String value, LocalDate fallbackDate) {
      if (value == null || value.isBlank()) {
        return fallbackDate;
      }

      try {
        return LocalDate.parse(value.trim(), DAILY_KEY_FORMATTER);
      } catch (RuntimeException exception) {
        return fallbackDate;
      }
    }
  }

  private static final class MutableRevenueBucket {

    private final String key;
    private final String label;
    private long paidAmount;
    private long refundedAmount;
    private int soldTicketCount;
    private int refundedTicketCount;

    private MutableRevenueBucket(String key, String label) {
      this.key = key;
      this.label = label;
    }

    private BackofficeRevenueDashboardResponse.RevenueBucket toResponse() {
      return new BackofficeRevenueDashboardResponse.RevenueBucket(
          key,
          label,
          paidAmount,
          refundedAmount,
          paidAmount - refundedAmount,
          soldTicketCount,
          refundedTicketCount
      );
    }
  }
}
