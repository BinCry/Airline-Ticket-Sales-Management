package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.BackofficeRevenueDashboardResponse;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.RefundRequestRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BackofficeRevenueServiceTest {

  private static final ZoneId REPORT_ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");

  @Mock
  private BookingRepository bookingRepository;

  @Mock
  private RefundRequestRepository refundRequestRepository;

  private BackofficeRevenueService backofficeRevenueService;

  @BeforeEach
  void setUp() {
    Clock reportClock = Clock.fixed(Instant.parse("2026-06-17T03:00:00Z"), REPORT_ZONE_ID);
    backofficeRevenueService = new BackofficeRevenueService(
        bookingRepository,
        refundRequestRepository,
        reportClock
    );
  }

  @Test
  void getRevenueDashboard_shouldApplyDateRangeWhenGranularityDay() {
    OffsetDateTime from = OffsetDateTime.parse("2026-06-15T00:00:00+07:00");
    OffsetDateTime to = OffsetDateTime.parse("2026-06-18T00:00:00+07:00");
    BookingEntity paidBooking = createPaidBooking("QC5004", 1700000L, 2, OffsetDateTime.parse("2026-06-15T08:30:00+07:00"));

    when(bookingRepository.findPaidRevenueBookings(BookingEntity.PAYMENT_STATUS_PAID, from, to))
        .thenReturn(List.of(paidBooking));
    when(refundRequestRepository.findApprovedRevenueRefunds(RefundRequestEntity.STATUS_APPROVED, from, to))
        .thenReturn(List.of());

    BackofficeRevenueDashboardResponse response = backofficeRevenueService.getRevenueDashboard(
        "day",
        null,
        "2026-06-15",
        "2026-06-17"
    );

    assertThat(response.periodLabel()).isEqualTo("Từ 15/06/2026 đến 17/06/2026");
    assertThat(response.buckets()).hasSize(3);
    assertThat(response.totalRevenue()).isEqualTo(1700000L);
    assertThat(response.soldTicketCount()).isEqualTo(2);
    assertThat(response.buckets().getFirst().key()).isEqualTo("2026-06-15");
    assertThat(response.buckets().getFirst().netRevenue()).isEqualTo(1700000L);
  }

  @Test
  void getRevenueDashboard_shouldAllowSingleDayRange() {
    OffsetDateTime from = OffsetDateTime.parse("2026-06-15T00:00:00+07:00");
    OffsetDateTime to = OffsetDateTime.parse("2026-06-16T00:00:00+07:00");

    when(bookingRepository.findPaidRevenueBookings(BookingEntity.PAYMENT_STATUS_PAID, from, to))
        .thenReturn(List.of());
    when(refundRequestRepository.findApprovedRevenueRefunds(RefundRequestEntity.STATUS_APPROVED, from, to))
        .thenReturn(List.of());

    BackofficeRevenueDashboardResponse response = backofficeRevenueService.getRevenueDashboard(
        "day",
        null,
        "2026-06-15",
        "2026-06-15"
    );

    assertThat(response.periodLabel()).isEqualTo("Từ 15/06/2026 đến 15/06/2026");
    assertThat(response.buckets()).hasSize(1);
    assertThat(response.buckets().getFirst().label()).isEqualTo("15/06");
  }

  @Test
  void getRevenueDashboard_shouldRejectWhenDateRangeMissingBoundary() {
    assertThatThrownBy(() ->
        backofficeRevenueService.getRevenueDashboard("day", null, "2026-06-15", null)
    )
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Cần nhập đầy đủ Từ ngày và Đến ngày để lọc doanh thu theo khoảng ngày.");
  }

  @Test
  void getRevenueDashboard_shouldRejectWhenDateRangeInvalidFormat() {
    assertThatThrownBy(() ->
        backofficeRevenueService.getRevenueDashboard("day", null, "15-06-2026", "2026-06-17")
    )
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Từ ngày phải đúng định dạng yyyy-MM-dd.");
  }

  @Test
  void getRevenueDashboard_shouldRejectWhenFromDateAfterToDate() {
    assertThatThrownBy(() ->
        backofficeRevenueService.getRevenueDashboard("day", null, "2026-06-18", "2026-06-17")
    )
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.");
  }

  private BookingEntity createPaidBooking(
      String bookingCode,
      long totalAmount,
      int ticketCount,
      OffsetDateTime ticketedAt
  ) {
    OffsetDateTime createdAt = ticketedAt.minusDays(1);
    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        "one_way",
        totalAmount,
        0L,
        totalAmount,
        "VND",
        createdAt,
        createdAt.plusMinutes(BookingService.HOLD_MINUTES)
    );
    booking.markTicketed("SANDBOX-000000000001", ticketedAt);
    for (int index = 0; index < ticketCount; index++) {
      booking.addTicket(mock(TicketEntity.class));
    }
    return booking;
  }
}
