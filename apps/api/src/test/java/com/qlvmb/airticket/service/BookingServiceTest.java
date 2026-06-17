package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
import com.qlvmb.airticket.repository.BookingSeatSelectionRepository;
import com.qlvmb.airticket.repository.FlightFareInventoryRepository;
import com.qlvmb.airticket.repository.TicketRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
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
  private BookingSeatSelectionRepository bookingSeatSelectionRepository;

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
        bookingSeatSelectionRepository,
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
    when(bookingSeatSelectionRepository.findOccupiedSeatNumbersByFlightId(any(), any())).thenReturn(List.of());
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
    when(bookingSeatSelectionRepository.findOccupiedSeatNumbersByFlightId(any(), any())).thenReturn(List.of());

    assertThatThrownBy(() -> bookingService.createHold(oneWayHoldRequest(List.of(), List.of(20101L))))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Chuyến bay đã hết ghế trống cho hạng vé này.");
  }

  @Test
  void createHold_shouldRejectWhenFlightPastPublicCutoff() {
    OffsetDateTime khoiHanh = PublicFlightWindowPolicy.currentTime().plusMinutes(20);
    FlightFareInventoryEntity inventory = mockInventoryOnFlight(
        20101L,
        501L,
        "VN501",
        5,
        1490000L,
        "pho_thong_tiet_kiem",
        khoiHanh,
        khoiHanh.plusHours(2),
        "scheduled"
    );
    when(flightFareInventoryRepository.lockByIds(List.of(20101L))).thenReturn(List.of(inventory));
    when(bookingRepository.lockExpiredHoldsByInventoryIds(any(), any(), any())).thenReturn(List.of());

    assertThatThrownBy(() -> bookingService.createHold(oneWayHoldRequest(List.of(), List.of(20101L))))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Chuyến bay hiện không còn mở bán công khai.");
  }

  @Test
  void createHold_shouldRejectWhenSeatAlreadyHeldByAnotherKhach() {
    FlightFareInventoryEntity inventory = mockInventory(20101L, 5, 1490000L, "pho_thong_tiet_kiem");
    when(flightFareInventoryRepository.lockByIds(List.of(20101L))).thenReturn(List.of(inventory));
    when(bookingRepository.lockExpiredHoldsByInventoryIds(any(), any(), any())).thenReturn(List.of());
    when(bookingSeatSelectionRepository.findOccupiedSeatNumbersByFlightId(any(), any()))
        .thenReturn(List.of("9A"));

    assertThatThrownBy(() -> bookingService.createHold(oneWayHoldRequest(List.of(), List.of(20101L))))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Không được chọn trùng ghế cho cùng một chặng bay.");
  }

  @Test
  void createHold_shouldRetryWhenBookingCodeCollisionOccurs() {
    FlightFareInventoryEntity inventory = mockInventory(20101L, 5, 1490000L, "pho_thong_tiet_kiem");
    when(flightFareInventoryRepository.lockByIds(List.of(20101L))).thenReturn(List.of(inventory));
    when(bookingRepository.lockExpiredHoldsByInventoryIds(any(), any(), any())).thenReturn(List.of());
    when(bookingSeatSelectionRepository.findOccupiedSeatNumbersByFlightId(any(), any())).thenReturn(List.of());
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
    when(bookingSeatSelectionRepository.findOccupiedSeatNumbersByFlightId(any(), any())).thenReturn(List.of());
    when(bookingRepository.existsByBookingCodeIgnoreCase(any())).thenReturn(false);
    when(bookingRepository.save(any(BookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BookingHoldResponse response = bookingService.createHold(
        oneWayHoldRequest(
            List.of(
                new BookingHoldRequest.AncillaryRequest("BAG_23", 1),
                new BookingHoldRequest.AncillaryRequest("MEAL_VN", 1)
            ),
            List.of(20101L)
        )
    );

    assertThat(response.selectedAncillaries()).hasSize(2);
    assertThat(response.priceSummary().ancillaryAmount()).isEqualTo(470000L);
    assertThat(response.priceSummary().totalAmount()).isEqualTo(1960000L);
  }

  @Test
  void createHold_shouldAllowNhieuHanhKhachKhacHangVeTrenCungMotChuyenBay() {
    FlightFareInventoryEntity saverInventory = mockInventoryOnFlight(
        20101L,
        501L,
        "VN501",
        9,
        1200000L,
        "pho_thong_tiet_kiem"
    );
    FlightFareInventoryEntity flexInventory = mockInventoryOnFlight(
        20102L,
        501L,
        "VN501",
        6,
        1700000L,
        "pho_thong_linh_hoat"
    );
    FlightFareInventoryEntity businessInventory = mockInventoryOnFlight(
        20103L,
        501L,
        "VN501",
        4,
        2200000L,
        "thuong_gia"
    );

    when(flightFareInventoryRepository.lockByIds(List.of(20101L, 20102L, 20103L)))
        .thenReturn(List.of(saverInventory, flexInventory, businessInventory));
    when(bookingRepository.lockExpiredHoldsByInventoryIds(any(), any(), any())).thenReturn(List.of());
    when(bookingSeatSelectionRepository.findOccupiedSeatNumbersByFlightId(any(), any())).thenReturn(List.of());
    when(bookingRepository.existsByBookingCodeIgnoreCase(any())).thenReturn(false);
    when(bookingRepository.save(any(BookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BookingHoldResponse response = bookingService.createHold(bookingHoldChoNhieuHanhKhachMotChieu());

    assertThat(response.passengers()).hasSize(3);
    assertThat(response.selectedSegments())
        .extracting(BookingHoldResponse.SelectedSegmentResponse::fareFamily)
        .containsExactly("thuong_gia", "pho_thong_linh_hoat", "pho_thong_tiet_kiem");
    assertThat(response.selectedSegments())
        .extracting(BookingHoldResponse.SelectedSegmentResponse::passengerCount)
        .containsExactly(1, 1, 1);
    assertThat(response.priceSummary().totalAmount()).isEqualTo(5100000L);
    verify(saverInventory).reserveSeats(1);
    verify(flexInventory).reserveSeats(1);
    verify(businessInventory).reserveSeats(1);
  }

  @Test
  void createHold_shouldAllowKhuHoiNhieuHanhKhachVaChoPhepTrungSoGheKhacChuyenBay() {
    FlightFareInventoryEntity outboundSaverInventory = mockInventoryOnFlight(
        30101L,
        601L,
        "VN601",
        8,
        1200000L,
        "pho_thong_tiet_kiem"
    );
    FlightFareInventoryEntity outboundFlexInventory = mockInventoryOnFlight(
        30102L,
        601L,
        "VN601",
        6,
        1700000L,
        "pho_thong_linh_hoat"
    );
    FlightFareInventoryEntity returnSaverInventory = mockInventoryOnFlight(
        30201L,
        701L,
        "VN701",
        8,
        1250000L,
        "pho_thong_tiet_kiem"
    );
    FlightFareInventoryEntity returnFlexInventory = mockInventoryOnFlight(
        30202L,
        701L,
        "VN701",
        6,
        1750000L,
        "pho_thong_linh_hoat"
    );

    when(flightFareInventoryRepository.lockByIds(argThat(ids ->
        ids != null
            && ids.size() == 4
            && ids.containsAll(List.of(30101L, 30102L, 30201L, 30202L))
    )))
        .thenReturn(List.of(
            outboundSaverInventory,
            outboundFlexInventory,
            returnSaverInventory,
            returnFlexInventory
        ));
    when(bookingRepository.lockExpiredHoldsByInventoryIds(any(), any(), any())).thenReturn(List.of());
    when(bookingSeatSelectionRepository.findOccupiedSeatNumbersByFlightId(any(), any())).thenReturn(List.of());
    when(bookingRepository.existsByBookingCodeIgnoreCase(any())).thenReturn(false);
    when(bookingRepository.save(any(BookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BookingHoldResponse response = bookingService.createHold(bookingHoldKhuHoiNhieuHanhKhach());

    assertThat(response.selectedSegments()).hasSize(4);
    assertThat(response.selectedSegments())
        .extracting(
            BookingHoldResponse.SelectedSegmentResponse::code,
            BookingHoldResponse.SelectedSegmentResponse::fareFamily,
            BookingHoldResponse.SelectedSegmentResponse::passengerCount
        )
        .containsExactly(
            org.assertj.core.groups.Tuple.tuple("VN601", "pho_thong_linh_hoat", 1),
            org.assertj.core.groups.Tuple.tuple("VN601", "pho_thong_tiet_kiem", 1),
            org.assertj.core.groups.Tuple.tuple("VN701", "pho_thong_linh_hoat", 1),
            org.assertj.core.groups.Tuple.tuple("VN701", "pho_thong_tiet_kiem", 1)
        );
    assertThat(response.priceSummary().totalAmount()).isEqualTo(5900000L);
    verify(outboundSaverInventory).reserveSeats(1);
    verify(outboundFlexInventory).reserveSeats(1);
    verify(returnSaverInventory).reserveSeats(1);
    verify(returnFlexInventory).reserveSeats(1);
  }

  @Test
  void createHold_shouldRejectSeatPlusForBookingMoi() {
    assertThatThrownBy(() -> bookingService.createHold(
        oneWayHoldRequest(
            List.of(new BookingHoldRequest.AncillaryRequest("SEAT_PLUS", 1)),
            List.of(20101L)
        )
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Ghế ưu tiên không còn được bán riêng trong luồng đặt vé này.");
  }

  @Test
  void createHold_shouldRejectPassengerTypeMismatchAtDeparture() {
    FlightFareInventoryEntity inventory = mockInventory(20101L, 5, 1490000L, "pho_thong_tiet_kiem");
    when(flightFareInventoryRepository.lockByIds(List.of(20101L))).thenReturn(List.of(inventory));
    when(bookingRepository.lockExpiredHoldsByInventoryIds(any(), any(), any())).thenReturn(List.of());

    BookingHoldRequest request = new BookingHoldRequest(
        "one_way",
        new BookingHoldRequest.ContactRequest(
            "Nguyen Van A",
            "a@example.com",
            "0912345678"
        ),
        List.of(
            new BookingHoldRequest.PassengerRequest(
                "Nguoi lon A",
                "adult",
                LocalDate.now().minusYears(30),
                "CCCD",
                "079123456788"
            ),
            new BookingHoldRequest.PassengerRequest(
                "Em be B",
                "child",
                LocalDate.now().minusYears(1),
                "Giay khai sinh",
                "KS20250607"
            )
        ),
        List.of(new BookingHoldRequest.SegmentRequest(null, 20101L)),
        List.of(),
        List.of(
            new BookingHoldRequest.SeatSelectionRequest(20101L, 0, 0, "9A"),
            new BookingHoldRequest.SeatSelectionRequest(20101L, 1, 0, "9B")
        )
    );

    assertThatThrownBy(() -> bookingService.createHold(request))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Hành khách trẻ em phải từ 2 đến dưới 12 tuổi tại ngày khởi hành đầu tiên.");
  }

  @Test
  void getBookingOverview_shouldReleaseSeatForExpiredHold() {
    FlightFareInventoryEntity inventory = mockInventory(20101L, 1, 1490000L, "pho_thong_tiet_kiem");
    BookingEntity booking = expiredBooking("A6C2P1", inventory);

    when(bookingRepository.findDetailedByBookingCode("A6C2P1")).thenReturn(Optional.of(booking));
    when(flightFareInventoryRepository.lockByIds(List.of(20101L))).thenReturn(List.of(inventory));

    BookingOverviewResponse response = bookingService.getBookingOverview("A6C2P1");

    assertThat(response.status()).isEqualTo("cancelled");
    assertThat(response.paymentStatus()).isEqualTo("expired");
    verify(bookingRepository).findDetailedByBookingCode("A6C2P1");
    verify(bookingRepository, never()).lockDetailedByBookingCode(any());
    verify(inventory).releaseSeats(1);
  }

  @Test
  void removeVoucher_shouldDelegateToMemberVoucherServiceAndReturnUpdatedOverview() {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(5);
    BookingEntity booking = BookingEntity.createHold(
        "A6C2P1",
        "one_way",
        1490000L,
        200000L,
        1690000L,
        "VND",
        createdAt,
        createdAt.plusMinutes(BookingService.HOLD_MINUTES)
    );
    booking.assignContact(BookingContactEntity.create(
        booking,
        "Hoi vien A",
        "member@example.com",
        "0912345678"
    ));
    booking.applyVoucher("MEM52026", 180000L, createdAt.plusMinutes(1));
    when(bookingRepository.lockDetailedByBookingCode("A6C2P1")).thenReturn(Optional.of(booking));

    BookingOverviewResponse response = bookingService.removeVoucher(
        "A6C2P1",
        new AuthenticatedUser(
            151L,
            "member@example.com",
            "Hoi vien A",
            List.of("member"),
            List.of("customer.self_service", "member.loyalty")
        )
    );

    assertThat(response.bookingCode()).isEqualTo("A6C2P1");
    verify(memberVoucherService).removeVoucherFromBooking(any(), any(), any());
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

  @Test
  void requestRefund_shouldRejectWhenJourneyAlreadyStarted() {
    BookingEntity booking = ticketedBooking(
        "A6C2P1",
        "one_way",
        false,
        false,
        OffsetDateTime.now().minusHours(2),
        "departed",
        false
    );
    when(bookingRepository.lockDetailedByBookingCode("A6C2P1")).thenReturn(Optional.of(booking));

    assertThatThrownBy(() -> bookingService.requestRefund(
        "A6C2P1",
        new com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest("Khong bay nua")
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Không thể gửi yêu cầu hoàn vé khi hành trình đã bắt đầu.");
  }

  @Test
  void requestRefund_shouldAllowCancelledPaidBookingFromOperations() {
    BookingEntity booking = ticketedBooking(
        "A6C2P1",
        "one_way",
        false,
        false,
        OffsetDateTime.now().minusHours(2),
        "cancelled",
        true
    );
    when(bookingRepository.lockDetailedByBookingCode("A6C2P1")).thenReturn(Optional.of(booking));

    BookingOverviewResponse response = bookingService.requestRefund(
        "A6C2P1",
        new com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest("Chuyen bay bi huy")
    );

    assertThat(response.status()).isEqualTo("cancelled");
    assertThat(response.refundRequest()).isNotNull();
    assertThat(response.refundRequest().status()).isEqualTo("pending");
  }

  @Test
  void requestRefund_shouldAllowCancelledPaidBookingFromOperationsForSelectedTickets() {
    BookingEntity booking = cancelledRoundTripBookingFromOperationsWithVoucher("A6C2X9");
    when(bookingRepository.lockDetailedByBookingCode("A6C2X9")).thenReturn(Optional.of(booking));

    BookingOverviewResponse response = bookingService.requestRefund(
        "A6C2X9",
        new com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest(
            "Chuyen bay bi huy",
            List.of("7380000000002")
        )
    );

    assertThat(response.status()).isEqualTo("cancelled");
    assertThat(response.refundRequest()).isNotNull();
    assertThat(response.refundRequest().refundAmount()).isEqualTo(1000000L);
    assertThat(booking.getRefundRequests()).hasSize(1);
    assertThat(booking.getRefundRequests().iterator().next().getRequestedTickets())
        .extracting(TicketEntity::getTicketNumber)
        .containsExactly("7380000000002");
  }

  @Test
  void requestRefund_shouldAllowRefundReturnLegAfterOutboundCheckedIn() {
    BookingEntity booking = roundTripBookingWithCheckedInOutbound("A6C2P9");
    when(bookingRepository.lockDetailedByBookingCode("A6C2P9")).thenReturn(Optional.of(booking));

    BookingOverviewResponse response = bookingService.requestRefund(
        "A6C2P9",
        new com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest(
            "Khong bay chang ve",
            List.of("7380000000002")
        )
    );

    assertThat(response.status()).isEqualTo("refund_pending");
    assertThat(response.refundRequest()).isNotNull();
    assertThat(response.refundRequest().refundAmount()).isEqualTo(1490000L);
    assertThat(booking.getRefundRequests()).hasSize(1);
    assertThat(booking.getRefundRequests().iterator().next().getRequestedTickets())
        .extracting(TicketEntity::getTicketNumber)
        .containsExactly("7380000000002");
  }

  @Test
  void requestRefund_shouldApplyVoucherShareWhenRefundingReturnLegOnly() {
    BookingEntity booking = roundTripBookingWithVoucherAndCheckedInOutbound("A6C2V9");
    when(bookingRepository.lockDetailedByBookingCode("A6C2V9")).thenReturn(Optional.of(booking));

    BookingOverviewResponse response = bookingService.requestRefund(
        "A6C2V9",
        new com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest(
            "Khong bay chang ve",
            List.of("7380000000002")
        )
    );

    assertThat(response.status()).isEqualTo("refund_pending");
    assertThat(response.refundRequest()).isNotNull();
    assertThat(response.refundRequest().refundAmount()).isEqualTo(1000000L);
  }

  @Test
  void requestRefund_shouldUseRemainingNetAmountWhenOtherLegWasRefundedEarlier() {
    BookingEntity booking = roundTripBookingWithRefundedOutboundAndVoucher("A6C2R9");
    when(bookingRepository.lockDetailedByBookingCode("A6C2R9")).thenReturn(Optional.of(booking));

    BookingOverviewResponse response = bookingService.requestRefund(
        "A6C2R9",
        new com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest(
            "Khong bay chang ve",
            List.of("7380000000002")
        )
    );

    assertThat(response.status()).isEqualTo("refund_pending");
    assertThat(response.refundRequest()).isNotNull();
    assertThat(response.refundRequest().refundAmount()).isEqualTo(1000000L);
  }

  private BookingHoldRequest oneWayHoldRequest(
      List<BookingHoldRequest.AncillaryRequest> ancillaries,
      List<Long> inventoryIds
  ) {
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
        List.of(new BookingHoldRequest.SeatSelectionRequest(inventoryIds.get(0), 0, 0, "9A"))
    );
  }

  private BookingHoldRequest bookingHoldChoNhieuHanhKhachMotChieu() {
    return new BookingHoldRequest(
        "one_way",
        new BookingHoldRequest.ContactRequest(
            "Nguyen Van Dat Cho",
            "dat-cho@example.com",
            "0912345678"
        ),
        List.of(
            new BookingHoldRequest.PassengerRequest(
                "Nguyen Van A",
                "adult",
                LocalDate.of(1990, 1, 10),
                "CCCD",
                "079123456781"
            ),
            new BookingHoldRequest.PassengerRequest(
                "Tran Thi B",
                "adult",
                LocalDate.of(1992, 3, 14),
                "CCCD",
                "079123456782"
            ),
            new BookingHoldRequest.PassengerRequest(
                "Le Van C",
                "child",
                LocalDate.now().minusYears(10),
                "Giấy khai sinh",
                "KS20150820"
            )
        ),
        List.of(new BookingHoldRequest.SegmentRequest(null, 501L)),
        List.of(),
        List.of(
            new BookingHoldRequest.SeatSelectionRequest(20101L, 0, 0, "9A"),
            new BookingHoldRequest.SeatSelectionRequest(20102L, 1, 0, "3A"),
            new BookingHoldRequest.SeatSelectionRequest(20103L, 2, 0, "1A")
        )
    );
  }

  private BookingHoldRequest bookingHoldKhuHoiNhieuHanhKhach() {
    return new BookingHoldRequest(
        "round_trip",
        new BookingHoldRequest.ContactRequest(
            "Nguoi Dat Khu Hoi",
            "khu-hoi@example.com",
            "0912345678"
        ),
        List.of(
            new BookingHoldRequest.PassengerRequest(
                "Nguyen Van A",
                "adult",
                LocalDate.of(1990, 1, 10),
                "CCCD",
                "079123456781"
            ),
            new BookingHoldRequest.PassengerRequest(
                "Le Thi B",
                "child",
                LocalDate.now().minusYears(8),
                "Giấy khai sinh",
                "KS20140609"
            )
        ),
        List.of(
            new BookingHoldRequest.SegmentRequest(null, 601L),
            new BookingHoldRequest.SegmentRequest(null, 701L)
        ),
        List.of(),
        List.of(
            new BookingHoldRequest.SeatSelectionRequest(30101L, 0, 0, "9A"),
            new BookingHoldRequest.SeatSelectionRequest(30102L, 1, 0, "3A"),
            new BookingHoldRequest.SeatSelectionRequest(30202L, 0, 1, "3B"),
            new BookingHoldRequest.SeatSelectionRequest(30201L, 1, 1, "9A")
        )
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
    return ticketedBooking(
        bookingCode,
        tripType,
        checkedIn,
        hasPendingRefund,
        OffsetDateTime.now().plusDays(10),
        "scheduled",
        false
    );
  }

  private BookingEntity ticketedBooking(
      String bookingCode,
      String tripType,
      boolean checkedIn,
      boolean hasPendingRefund,
      OffsetDateTime departureAt,
      String flightStatus,
      boolean cancelledByOperations
  ) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(10);
    OffsetDateTime arrivalAt = departureAt.plusHours(2);
    FlightFareInventoryEntity inventory = mockInventoryOnFlight(
        20101L,
        20101L,
        "AU201",
        5,
        1490000L,
        "pho_thong_tiet_kiem",
        departureAt,
        arrivalAt,
        flightStatus
    );
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
        departureAt,
        arrivalAt,
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

    if (cancelledByOperations) {
      ticket.markCancelled(createdAt.plusMinutes(6));
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

    if (cancelledByOperations) {
      booking.markCancelled(createdAt.plusMinutes(6));
    }

    return booking;
  }

  private BookingEntity roundTripBookingWithCheckedInOutbound(String bookingCode) {
    return roundTripBookingForRefundScenarios(bookingCode, 1490000L, 0L, true, false);
  }

  private BookingEntity roundTripBookingWithVoucherAndCheckedInOutbound(String bookingCode) {
    return roundTripBookingForRefundScenarios(bookingCode, 1100000L, 200000L, true, false);
  }

  private BookingEntity roundTripBookingWithRefundedOutboundAndVoucher(String bookingCode) {
    return roundTripBookingForRefundScenarios(bookingCode, 1100000L, 200000L, false, true);
  }

  private BookingEntity cancelledRoundTripBookingFromOperationsWithVoucher(String bookingCode) {
    BookingEntity booking = roundTripBookingForRefundScenarios(bookingCode, 1100000L, 200000L, false, false);
    OffsetDateTime cancelledAt = OffsetDateTime.now().minusMinutes(2);
    booking.getTickets().forEach(ticket -> ticket.markCancelled(cancelledAt));
    booking.markCancelled(cancelledAt);
    return booking;
  }

  private BookingEntity roundTripBookingForRefundScenarios(
      String bookingCode,
      long segmentPrice,
      long voucherDiscount,
      boolean checkedInOutbound,
      boolean refundedOutbound
  ) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(10);
    OffsetDateTime outboundDepartureAt = OffsetDateTime.now().plusDays(3);
    OffsetDateTime returnDepartureAt = OffsetDateTime.now().plusDays(7);

    FlightFareInventoryEntity outboundInventory = mockInventoryOnFlight(
        20101L,
        20101L,
        "AU201",
        5,
        segmentPrice,
        "pho_thong_tiet_kiem",
        outboundDepartureAt,
        outboundDepartureAt.plusHours(2),
        "scheduled"
    );
    FlightFareInventoryEntity returnInventory = mockInventoryOnFlight(
        20102L,
        20102L,
        "AU202",
        5,
        segmentPrice,
        "pho_thong_tiet_kiem",
        returnDepartureAt,
        returnDepartureAt.plusHours(2),
        "scheduled"
    );

    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        "round_trip",
        segmentPrice * 2,
        0L,
        segmentPrice * 2,
        "VND",
        createdAt,
        createdAt.plusMinutes(BookingService.HOLD_MINUTES)
    );

    if (voucherDiscount > 0L) {
      booking.applyVoucher("MEM200", voucherDiscount, createdAt.plusMinutes(1));
    }

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

    BookingSegmentEntity outboundSegment = BookingSegmentEntity.create(
        booking,
        outboundInventory,
        "AU201",
        "Thanh pho Ho Chi Minh",
        "Ha Noi",
        "SGN",
        "HAN",
        outboundDepartureAt,
        outboundDepartureAt.plusHours(2),
        "pho_thong_tiet_kiem",
        "Pho thong tiet kiem",
        segmentPrice,
        1,
        segmentPrice,
        createdAt
    );
    booking.addSegment(outboundSegment);

    BookingSegmentEntity returnSegment = BookingSegmentEntity.create(
        booking,
        returnInventory,
        "AU202",
        "Ha Noi",
        "Thanh pho Ho Chi Minh",
        "HAN",
        "SGN",
        returnDepartureAt,
        returnDepartureAt.plusHours(2),
        "pho_thong_tiet_kiem",
        "Pho thong tiet kiem",
        segmentPrice,
        1,
        segmentPrice,
        createdAt
    );
    booking.addSegment(returnSegment);

    booking.markTicketed("SANDBOX-000000000001", createdAt.plusMinutes(5));

    TicketEntity outboundTicket = TicketEntity.issue(
        booking,
        passenger,
        outboundSegment,
        "7380000000001",
        createdAt.plusMinutes(5)
    );
    if (checkedInOutbound) {
      outboundTicket.markCheckedIn(createdAt.plusMinutes(6));
    }
    if (refundedOutbound) {
      outboundTicket.markCancelled(createdAt.plusMinutes(6));
    }
    booking.addTicket(outboundTicket);

    TicketEntity returnTicket = TicketEntity.issue(
        booking,
        passenger,
        returnSegment,
        "7380000000002",
        createdAt.plusMinutes(5)
    );
    booking.addTicket(returnTicket);

    if (refundedOutbound) {
      RefundRequestEntity approvedRefundRequest = RefundRequestEntity.createPending(
          booking,
          "Da duyet hoan chang di",
          1000000L,
          createdAt.plusMinutes(7),
          List.of(outboundTicket)
      );
      approvedRefundRequest.markApproved(createdAt.plusMinutes(8));
      booking.addRefundRequest(approvedRefundRequest);
    }

    return booking;
  }

  private FlightFareInventoryEntity mockInventory(
      long inventoryId,
      int availableSeats,
      long price,
      String fareFamily
  ) {
    return mockInventoryOnFlight(
        inventoryId,
        inventoryId,
        "AU201",
        availableSeats,
        price,
        fareFamily,
        OffsetDateTime.now().plusDays(10),
        OffsetDateTime.now().plusDays(10).plusHours(2),
        "scheduled"
    );
  }

  private FlightFareInventoryEntity mockInventoryOnFlight(
      long inventoryId,
      long flightId,
      String flightCode,
      int availableSeats,
      long price,
      String fareFamily
  ) {
    return mockInventoryOnFlight(
        inventoryId,
        flightId,
        flightCode,
        availableSeats,
        price,
        fareFamily,
        OffsetDateTime.now().plusDays(10),
        OffsetDateTime.now().plusDays(10).plusHours(2),
        "scheduled"
    );
  }

  private FlightFareInventoryEntity mockInventoryOnFlight(
      long inventoryId,
      long flightId,
      String flightCode,
      int availableSeats,
      long price,
      String fareFamily,
      OffsetDateTime departureAt,
      OffsetDateTime arrivalAt,
      String flightStatus
  ) {
    FlightFareInventoryEntity inventory = mock(FlightFareInventoryEntity.class);
    FlightEntity flight = mock(FlightEntity.class);
    AirportEntity originAirport = mock(AirportEntity.class);
    AirportEntity destinationAirport = mock(AirportEntity.class);

    lenient().when(originAirport.getCode()).thenReturn("SGN");
    lenient().when(originAirport.getCityName()).thenReturn("Thanh pho Ho Chi Minh");
    lenient().when(destinationAirport.getCode()).thenReturn("HAN");
    lenient().when(destinationAirport.getCityName()).thenReturn("Ha Noi");
    lenient().when(flight.getId()).thenReturn(flightId);
    lenient().when(flight.getCode()).thenReturn(flightCode);
    lenient().when(flight.getOriginAirport()).thenReturn(originAirport);
    lenient().when(flight.getDestinationAirport()).thenReturn(destinationAirport);
    lenient().when(flight.getDepartureAt()).thenReturn(departureAt);
    lenient().when(flight.getArrivalAt()).thenReturn(arrivalAt);
    lenient().when(flight.getStatus()).thenReturn(flightStatus);
    lenient().when(flight.isSalesOpen()).thenReturn(true);
    lenient().when(flight.isCancelled()).thenReturn("cancelled".equals(flightStatus));

    lenient().when(inventory.getId()).thenReturn(inventoryId);
    lenient().when(inventory.getAvailableSeats()).thenReturn(availableSeats);
    lenient().when(inventory.getPrice()).thenReturn(price);
    lenient().when(inventory.getFareFamily()).thenReturn(fareFamily);
    lenient().when(inventory.getFlight()).thenReturn(flight);

    return inventory;
  }
}
