package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.BackofficeRevenueDashboardResponse;
import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingPassengerEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.RefundRequestRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
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
  void getRevenueDashboard_shouldFilterDailyDashboardByDateRange() {
    BookingEntity booking = createTicketedBooking(
        "QC5004",
        OffsetDateTime.parse("2026-06-10T10:30:00+07:00"),
        1490000L
    );
    RefundRequestEntity refundRequest = RefundRequestEntity.createPending(
        booking,
        "Khach doi lich",
        300000L,
        OffsetDateTime.parse("2026-06-11T09:00:00+07:00"),
        List.of(booking.getTickets().iterator().next())
    );
    refundRequest.markApproved(OffsetDateTime.parse("2026-06-11T09:15:00+07:00"));

    when(bookingRepository.findPaidRevenueBookings(
        BookingEntity.PAYMENT_STATUS_PAID,
        OffsetDateTime.parse("2026-06-10T00:00:00+07:00"),
        OffsetDateTime.parse("2026-06-13T00:00:00+07:00")
    )).thenReturn(List.of(booking));
    when(refundRequestRepository.findApprovedRevenueRefunds(
        RefundRequestEntity.STATUS_APPROVED,
        OffsetDateTime.parse("2026-06-10T00:00:00+07:00"),
        OffsetDateTime.parse("2026-06-13T00:00:00+07:00")
    )).thenReturn(List.of(refundRequest));

    BackofficeRevenueDashboardResponse response = backofficeRevenueService.getRevenueDashboard(
        "day",
        null,
        "2026-06-10",
        "2026-06-12"
    );

    assertThat(response.periodLabel()).isEqualTo("Tá»« 10/06/2026 Ä‘áº¿n 12/06/2026");
    assertThat(response.buckets()).hasSize(3);
    assertThat(response.totalRevenue()).isEqualTo(1190000L);
    assertThat(response.paidAmount()).isEqualTo(1490000L);
    assertThat(response.refundedAmount()).isEqualTo(300000L);
    assertThat(response.buckets())
        .extracting(BackofficeRevenueDashboardResponse.RevenueBucket::label)
        .containsExactly("10/06", "11/06", "12/06");
  }

  @Test
  void getRevenueDashboard_shouldSwapDateRangeWhenUserChoosesNguocChieu() {
    when(bookingRepository.findPaidRevenueBookings(
        BookingEntity.PAYMENT_STATUS_PAID,
        OffsetDateTime.parse("2026-06-10T00:00:00+07:00"),
        OffsetDateTime.parse("2026-06-13T00:00:00+07:00")
    )).thenReturn(List.of());
    when(refundRequestRepository.findApprovedRevenueRefunds(
        RefundRequestEntity.STATUS_APPROVED,
        OffsetDateTime.parse("2026-06-10T00:00:00+07:00"),
        OffsetDateTime.parse("2026-06-13T00:00:00+07:00")
    )).thenReturn(List.of());

    BackofficeRevenueDashboardResponse response = backofficeRevenueService.getRevenueDashboard(
        "day",
        null,
        "2026-06-12",
        "2026-06-10"
    );

    assertThat(response.periodLabel()).isEqualTo("Tá»« 10/06/2026 Ä‘áº¿n 12/06/2026");
    assertThat(response.buckets()).hasSize(3);
  }

  private BookingEntity createTicketedBooking(
      String bookingCode,
      OffsetDateTime ticketedAt,
      long totalAmount
  ) {
    OffsetDateTime createdAt = ticketedAt.minusDays(2);
    OffsetDateTime departureAt = ticketedAt.plusDays(1);
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

    booking.assignContact(BookingContactEntity.create(
        booking,
        "Nguyen Van A",
        "a@example.com",
        "0912345678"
    ));

    BookingPassengerEntity passenger = BookingPassengerEntity.create(
        booking,
        "Nguyen Van A",
        "adult",
        LocalDate.of(1995, 5, 12),
        "CCCD",
        "079123456789",
        createdAt
    );
    booking.addPassenger(passenger);

    FlightEntity flight = org.mockito.Mockito.mock(FlightEntity.class);
    FlightFareInventoryEntity inventory = org.mockito.Mockito.mock(FlightFareInventoryEntity.class);
    org.mockito.Mockito.lenient().when(flight.getStatus()).thenReturn("scheduled");
    org.mockito.Mockito.lenient().when(inventory.getId()).thenReturn(20101L);
    org.mockito.Mockito.lenient().when(inventory.getFlight()).thenReturn(flight);

    BookingSegmentEntity segment = BookingSegmentEntity.create(
        booking,
        inventory,
        "AU201",
        "Thanh pho Ho Chi Minh",
        "Ha Noi",
        "SGN",
        "HAN",
        departureAt,
        departureAt.plusHours(2),
        "pho_thong_tiet_kiem",
        "Pho thong tiet kiem",
        totalAmount,
        1,
        totalAmount,
        createdAt
    );
    booking.addSegment(segment);
    booking.markTicketed("FT123456789", ticketedAt);
    booking.addTicket(TicketEntity.issue(
        booking,
        passenger,
        segment,
        "7380000000001",
        ticketedAt
    ));
    return booking;
  }
}
