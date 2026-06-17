package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.RefundRequestRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BackofficeRevenueServiceTest {

  @Mock
  private BookingRepository bookingRepository;

  @Mock
  private RefundRequestRepository refundRequestRepository;

  private BackofficeRevenueService backofficeRevenueService;

  @BeforeEach
  void setUp() {
    backofficeRevenueService = new BackofficeRevenueService(bookingRepository, refundRequestRepository);
  }

  @Test
  void getRevenueDashboard_shouldGroupRevenueByInclusiveDateRange() {
    BookingEntity booking = taoBookingDaThanhToan("2026-06-17T09:15:00+07:00", 1_200_000L, 2);
    RefundRequestEntity refundRequest = taoYeuCauHoan("2026-06-18T10:30:00+07:00", 200_000L, 1, 2);

    when(bookingRepository.findPaidRevenueBookings(
        BookingEntity.PAYMENT_STATUS_PAID,
        OffsetDateTime.parse("2026-06-17T00:00:00+07:00"),
        OffsetDateTime.parse("2026-06-19T00:00:00+07:00")
    )).thenReturn(List.of(booking));
    when(refundRequestRepository.findApprovedRevenueRefunds(
        RefundRequestEntity.STATUS_APPROVED,
        OffsetDateTime.parse("2026-06-17T00:00:00+07:00"),
        OffsetDateTime.parse("2026-06-19T00:00:00+07:00")
    )).thenReturn(List.of(refundRequest));

    var response = backofficeRevenueService.getRevenueDashboard(
        "day",
        null,
        "2026-06-17",
        "2026-06-18"
    );

    assertThat(response.granularity()).isEqualTo("day");
    assertThat(response.periodLabel()).isEqualTo("Từ 17/06/2026 đến 18/06/2026");
    assertThat(response.totalRevenue()).isEqualTo(1_000_000L);
    assertThat(response.paidAmount()).isEqualTo(1_200_000L);
    assertThat(response.refundedAmount()).isEqualTo(200_000L);
    assertThat(response.soldTicketCount()).isEqualTo(2);
    assertThat(response.refundedTicketCount()).isEqualTo(1);
    assertThat(response.buckets()).hasSize(2);
    assertThat(response.buckets().get(0).key()).isEqualTo("2026-06-17");
    assertThat(response.buckets().get(0).label()).isEqualTo("17/06");
    assertThat(response.buckets().get(0).netRevenue()).isEqualTo(1_200_000L);
    assertThat(response.buckets().get(1).key()).isEqualTo("2026-06-18");
    assertThat(response.buckets().get(1).label()).isEqualTo("18/06");
    assertThat(response.buckets().get(1).netRevenue()).isEqualTo(-200_000L);
  }

  @Test
  void getRevenueDashboard_shouldRejectWhenMissingDateBoundary() {
    assertThatThrownBy(() -> backofficeRevenueService.getRevenueDashboard(
        "day",
        null,
        "2026-06-17",
        null
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Vui lòng chọn đầy đủ từ ngày và đến ngày.");
  }

  @Test
  void getRevenueDashboard_shouldRejectWhenDateBoundaryFormatIsInvalid() {
    assertThatThrownBy(() -> backofficeRevenueService.getRevenueDashboard(
        "day",
        null,
        "17/06/2026",
        "2026-06-18"
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Từ ngày phải đúng định dạng yyyy-MM-dd.");
  }

  @Test
  void getRevenueDashboard_shouldRejectWhenFromDateAfterToDate() {
    assertThatThrownBy(() -> backofficeRevenueService.getRevenueDashboard(
        "day",
        null,
        "2026-06-20",
        "2026-06-18"
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Từ ngày không được lớn hơn đến ngày.");
  }

  @Test
  void getRevenueDashboard_shouldKeepYearModeWhenGranularityIsMonth() {
    when(bookingRepository.findPaidRevenueBookings(
        BookingEntity.PAYMENT_STATUS_PAID,
        OffsetDateTime.parse("2026-01-01T00:00:00+07:00"),
        OffsetDateTime.parse("2027-01-01T00:00:00+07:00")
    )).thenReturn(List.of());
    when(refundRequestRepository.findApprovedRevenueRefunds(
        RefundRequestEntity.STATUS_APPROVED,
        OffsetDateTime.parse("2026-01-01T00:00:00+07:00"),
        OffsetDateTime.parse("2027-01-01T00:00:00+07:00")
    )).thenReturn(List.of());

    var response = backofficeRevenueService.getRevenueDashboard(
        "month",
        "2026",
        "2026-06-17",
        "2026-06-18"
    );

    assertThat(response.granularity()).isEqualTo("month");
    assertThat(response.periodLabel()).isEqualTo("Năm 2026");
    assertThat(response.buckets()).hasSize(12);

    verify(bookingRepository).findPaidRevenueBookings(
        BookingEntity.PAYMENT_STATUS_PAID,
        OffsetDateTime.parse("2026-01-01T00:00:00+07:00"),
        OffsetDateTime.parse("2027-01-01T00:00:00+07:00")
    );
    verify(refundRequestRepository).findApprovedRevenueRefunds(
        RefundRequestEntity.STATUS_APPROVED,
        OffsetDateTime.parse("2026-01-01T00:00:00+07:00"),
        OffsetDateTime.parse("2027-01-01T00:00:00+07:00")
    );
  }

  private BookingEntity taoBookingDaThanhToan(String ticketedAt, long totalAmount, int soLuongVe) {
    BookingEntity booking = mock(BookingEntity.class);
    when(booking.getTicketedAt()).thenReturn(OffsetDateTime.parse(ticketedAt));
    when(booking.getTotalAmount()).thenReturn(totalAmount);
    when(booking.getTickets()).thenReturn(taoDanhSachVe(soLuongVe));
    return booking;
  }

  private RefundRequestEntity taoYeuCauHoan(
      String updatedAt,
      long refundAmount,
      int soLuongVeYeuCauHoan,
      int tongSoVeBooking
  ) {
    RefundRequestEntity refundRequest = mock(RefundRequestEntity.class);
    when(refundRequest.getUpdatedAt()).thenReturn(OffsetDateTime.parse(updatedAt));
    when(refundRequest.getRefundAmount()).thenReturn(refundAmount);
    when(refundRequest.getRequestedTickets()).thenReturn(taoDanhSachVe(soLuongVeYeuCauHoan));

    if (soLuongVeYeuCauHoan == 0) {
      BookingEntity booking = mock(BookingEntity.class);
      when(refundRequest.getBooking()).thenReturn(booking);
      when(booking.getTickets()).thenReturn(taoDanhSachVe(tongSoVeBooking));
    }

    return refundRequest;
  }

  private Set<TicketEntity> taoDanhSachVe(int soLuongVe) {
    return java.util.stream.IntStream.range(0, soLuongVe)
        .mapToObj(index -> mock(TicketEntity.class))
        .collect(java.util.stream.Collectors.toSet());
  }
}
