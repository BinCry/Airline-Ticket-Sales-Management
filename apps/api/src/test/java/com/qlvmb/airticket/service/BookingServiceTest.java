package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.BookingHoldRequest;
import com.qlvmb.airticket.domain.dto.BookingHoldResponse;
import com.qlvmb.airticket.domain.dto.BookingOverviewResponse;
import com.qlvmb.airticket.domain.entity.AirportEntity;
import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingPassengerEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.FlightFareInventoryRepository;
import com.qlvmb.airticket.repository.TicketRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

  @Mock
  private FlightFareInventoryRepository flightFareInventoryRepository;

  @Mock
  private BookingRepository bookingRepository;

  @Mock
  private TicketRepository ticketRepository;

  @Mock
  private MemberVoucherService memberVoucherService;

  private BookingService bookingService;

  @BeforeEach
  void setUp() {
    bookingService = new BookingService(
        flightFareInventoryRepository,
        bookingRepository,
        ticketRepository,
        new ProductCatalogService(),
        memberVoucherService
    );
  }

  @Test
  void createHold_shouldCreateHeldBookingAndReserveSeat() {
    FlightFareInventoryEntity inventory = mockInventory(20101L, 5, 1490000L, "pho_thong_tiet_kiem");
    when(flightFareInventoryRepository.lockByIds(List.of(20101L))).thenReturn(List.of(inventory));
    when(bookingRepository.lockExpiredHoldsByInventoryIds(any(), any(), any())).thenReturn(List.of());
    when(bookingRepository.existsByBookingCodeIgnoreCase(any())).thenReturn(false);
    when(bookingRepository.save(any(BookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BookingHoldResponse response = bookingService.createHold(oneWayHoldRequest(List.of(), List.of(20101L)));

    assertThat(response.status()).isEqualTo("held");
    assertThat(response.bookingCode()).hasSize(6);
    assertThat(response.selectedSegments()).hasSize(1);
    assertThat(response.priceSummary().totalAmount()).isEqualTo(1490000L);
    verify(inventory).reserveSeats(1);
  }

  @Test
  void createHold_shouldRejectWhenSeatUnavailable() {
    FlightFareInventoryEntity inventory = mockInventory(20101L, 0, 1490000L, "pho_thong_tiet_kiem");
    when(flightFareInventoryRepository.lockByIds(List.of(20101L))).thenReturn(List.of(inventory));
    when(bookingRepository.lockExpiredHoldsByInventoryIds(any(), any(), any())).thenReturn(List.of());

    assertThatThrownBy(() -> bookingService.createHold(oneWayHoldRequest(List.of(), List.of(20101L))))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Chuyến bay đã hết ghế trống cho hạng vé này.");
  }

  @Test
  void createHold_shouldRetryWhenBookingCodeCollisionOccurs() {
    FlightFareInventoryEntity inventory = mockInventory(20101L, 5, 1490000L, "pho_thong_tiet_kiem");
    when(flightFareInventoryRepository.lockByIds(List.of(20101L))).thenReturn(List.of(inventory));
    when(bookingRepository.lockExpiredHoldsByInventoryIds(any(), any(), any())).thenReturn(List.of());
    when(bookingRepository.existsByBookingCodeIgnoreCase(any())).thenReturn(true, false);
    when(bookingRepository.save(any(BookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BookingHoldResponse response = bookingService.createHold(oneWayHoldRequest(List.of(), List.of(20101L)));

    assertThat(response.bookingCode()).hasSize(6);
    verify(bookingRepository, times(2)).existsByBookingCodeIgnoreCase(any());
  }

  @Test
  void createHold_shouldIncludeAncillaryAmount() {
    FlightFareInventoryEntity inventory = mockInventory(20101L, 5, 1490000L, "pho_thong_tiet_kiem");
    when(flightFareInventoryRepository.lockByIds(List.of(20101L))).thenReturn(List.of(inventory));
    when(bookingRepository.lockExpiredHoldsByInventoryIds(any(), any(), any())).thenReturn(List.of());
    when(bookingRepository.existsByBookingCodeIgnoreCase(any())).thenReturn(false);
    when(bookingRepository.save(any(BookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BookingHoldResponse response = bookingService.createHold(
        oneWayHoldRequest(
            List.of(
                new BookingHoldRequest.AncillaryRequest("SEAT_PLUS", 1),
                new BookingHoldRequest.AncillaryRequest("BAG_23", 1)
            ),
            List.of(20101L)
        )
    );

    assertThat(response.selectedAncillaries()).hasSize(2);
    assertThat(response.priceSummary().ancillaryAmount()).isEqualTo(610000L);
    assertThat(response.priceSummary().totalAmount()).isEqualTo(2100000L);
  }

  @Test
  void getBookingOverview_shouldReleaseSeatForExpiredHold() {
    FlightFareInventoryEntity inventory = mockInventory(20101L, 1, 1490000L, "pho_thong_tiet_kiem");
    BookingEntity booking = expiredBooking("A6C2P1", inventory);

    when(bookingRepository.lockDetailedByBookingCode("A6C2P1")).thenReturn(Optional.of(booking));
    when(flightFareInventoryRepository.lockByIds(List.of(20101L))).thenReturn(List.of(inventory));

    BookingOverviewResponse response = bookingService.getBookingOverview("A6C2P1");

    assertThat(response.status()).isEqualTo("cancelled");
    assertThat(response.paymentStatus()).isEqualTo("expired");
    verify(inventory).releaseSeats(1);
  }

  @Test
  void requestRefund_shouldMarkBookingRefundPendingWhenEligible() {
    BookingEntity booking = ticketedBooking("A6C2P1", "one_way", false, false);
    when(bookingRepository.lockDetailedByBookingCode("A6C2P1")).thenReturn(Optional.of(booking));

    BookingOverviewResponse response = bookingService.requestRefund(
        "A6C2P1",
        new com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest("Thay doi ke hoach")
    );

    assertThat(response.status()).isEqualTo("refund_pending");
    assertThat(response.refundRequest()).isNotNull();
    assertThat(response.refundRequest().status()).isEqualTo("pending");
    assertThat(response.refundRequest().refundAmount()).isEqualTo(1490000L);
  }

  @Test
  void requestRefund_shouldRejectWhenTicketAlreadyCheckedIn() {
    BookingEntity booking = ticketedBooking("A6C2P1", "one_way", true, false);
    when(bookingRepository.lockDetailedByBookingCode("A6C2P1")).thenReturn(Optional.of(booking));

    assertThatThrownBy(() -> bookingService.requestRefund(
        "A6C2P1",
        new com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest("Khong bay nua")
    )).isInstanceOf(BadRequestException.class);
  }

  @Test
  void requestRefund_shouldRejectWhenPendingRefundAlreadyExists() {
    BookingEntity booking = ticketedBooking("A6C2P1", "one_way", false, true);
    when(bookingRepository.lockDetailedByBookingCode("A6C2P1")).thenReturn(Optional.of(booking));

    assertThatThrownBy(() -> bookingService.requestRefund(
        "A6C2P1",
        new com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest("Khong bay nua")
    )).isInstanceOf(BadRequestException.class);
  }

  private BookingHoldRequest oneWayHoldRequest(
      List<BookingHoldRequest.AncillaryRequest> ancillaries,
      List<Long> inventoryIds
  ) {
    List<BookingHoldRequest.SeatSelectionRequest> seatSelections = ancillaries.stream()
        .anyMatch(ancillary -> "SEAT_PLUS".equalsIgnoreCase(ancillary.code()))
        ? List.of(new BookingHoldRequest.SeatSelectionRequest(inventoryIds.get(0), 0, "12A"))
        : List.of();

    return new BookingHoldRequest(
        "one_way",
        new BookingHoldRequest.ContactRequest(
            "Nguyen Van A",
            "a@example.com",
            "0912345678"
        ),
        List.of(
            new BookingHoldRequest.PassengerRequest(
                "Nguyen Van A",
                "adult",
                LocalDate.of(1995, 5, 12),
                "CCCD",
                "079123456789"
            )
        ),
        inventoryIds.stream()
            .map(BookingHoldRequest.SegmentRequest::new)
            .toList(),
        ancillaries,
        seatSelections
    );
  }

  private BookingEntity expiredBooking(String bookingCode, FlightFareInventoryEntity inventory) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(20);
    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        "one_way",
        1490000L,
        0L,
        1490000L,
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

    booking.addPassenger(BookingPassengerEntity.create(
        booking,
        "Nguyen Van A",
        "adult",
        LocalDate.of(1995, 5, 12),
        "CCCD",
        "079123456789",
        createdAt
    ));

    booking.addSegment(BookingSegmentEntity.create(
        booking,
        inventory,
        "AU201",
        "Thanh pho Ho Chi Minh",
        "Ha Noi",
        "SGN",
        "HAN",
        OffsetDateTime.parse("2026-03-20T06:10:00+07:00"),
        OffsetDateTime.parse("2026-03-20T08:20:00+07:00"),
        "pho_thong_tiet_kiem",
        "Pho thong tiet kiem",
        1490000L,
        1,
        1490000L,
        createdAt
    ));

    return booking;
  }

  private BookingEntity ticketedBooking(
      String bookingCode,
      String tripType,
      boolean checkedIn,
      boolean hasPendingRefund
  ) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(10);
    FlightFareInventoryEntity inventory = mockInventory(20101L, 5, 1490000L, "pho_thong_tiet_kiem");
    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        tripType,
        1490000L,
        0L,
        1490000L,
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

    booking.addSegment(BookingSegmentEntity.create(
        booking,
        inventory,
        "AU201",
        "Thanh pho Ho Chi Minh",
        "Ha Noi",
        "SGN",
        "HAN",
        OffsetDateTime.parse("2026-03-20T06:10:00+07:00"),
        OffsetDateTime.parse("2026-03-20T08:20:00+07:00"),
        "pho_thong_tiet_kiem",
        "Pho thong tiet kiem",
        1490000L,
        1,
        1490000L,
        createdAt
    ));

    booking.markTicketed("SANDBOX-000000000001", createdAt.plusMinutes(5));

    TicketEntity ticket = TicketEntity.issue(
        booking,
        passenger,
        "7380000000001",
        createdAt.plusMinutes(5)
    );
    if (checkedIn) {
      ticket.markCheckedIn(createdAt.plusMinutes(6));
    }
    booking.addTicket(ticket);

    if (hasPendingRefund) {
      booking.addRefundRequest(RefundRequestEntity.createPending(
          booking,
          "Thay doi ke hoach",
          1490000L,
          createdAt.plusMinutes(6)
      ));
    }

    return booking;
  }

  private FlightFareInventoryEntity mockInventory(
      long inventoryId,
      int availableSeats,
      long price,
      String fareFamily
  ) {
    FlightFareInventoryEntity inventory = mock(FlightFareInventoryEntity.class);
    FlightEntity flight = mock(FlightEntity.class);
    AirportEntity originAirport = mock(AirportEntity.class);
    AirportEntity destinationAirport = mock(AirportEntity.class);

    lenient().when(originAirport.getCode()).thenReturn("SGN");
    lenient().when(originAirport.getCityName()).thenReturn("Thanh pho Ho Chi Minh");
    lenient().when(destinationAirport.getCode()).thenReturn("HAN");
    lenient().when(destinationAirport.getCityName()).thenReturn("Ha Noi");
    lenient().when(flight.getCode()).thenReturn("AU201");
    lenient().when(flight.getOriginAirport()).thenReturn(originAirport);
    lenient().when(flight.getDestinationAirport()).thenReturn(destinationAirport);
    lenient().when(flight.getDepartureAt()).thenReturn(OffsetDateTime.parse("2026-03-20T06:10:00+07:00"));
    lenient().when(flight.getArrivalAt()).thenReturn(OffsetDateTime.parse("2026-03-20T08:20:00+07:00"));

    lenient().when(inventory.getId()).thenReturn(inventoryId);
    lenient().when(inventory.getAvailableSeats()).thenReturn(availableSeats);
    lenient().when(inventory.getPrice()).thenReturn(price);
    lenient().when(inventory.getFareFamily()).thenReturn(fareFamily);
    lenient().when(inventory.getFlight()).thenReturn(flight);

    return inventory;
  }
}
