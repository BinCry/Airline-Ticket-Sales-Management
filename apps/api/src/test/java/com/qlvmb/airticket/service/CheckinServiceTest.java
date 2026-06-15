package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.CheckinCompleteRequest;
import com.qlvmb.airticket.domain.dto.CheckinCompleteResponse;
import com.qlvmb.airticket.domain.entity.BoardingPassEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingPassengerEntity;
import com.qlvmb.airticket.domain.entity.BookingSeatSelectionEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.BoardingPassRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CheckinServiceTest {

  @Mock
  private BookingService bookingService;

  @Mock
  private BoardingPassRepository boardingPassRepository;

  private CheckinService checkinService;

  @BeforeEach
  void setUp() {
    checkinService = new CheckinService(bookingService, boardingPassRepository);
  }

  @Test
  void completeCheckin_shouldCreateBoardingPassAndMarkTicketCheckedIn() {
    BookingEntity booking = ticketedBooking("A6C2P1", "one_way", false);
    when(bookingService.getBookingNotFoundMessage()).thenReturn("Khong tim thay dat cho.");
    when(bookingService.lockDetailedBooking("A6C2P1", "Khong tim thay dat cho.")).thenReturn(booking);
    when(boardingPassRepository.save(any(BoardingPassEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    CheckinCompleteResponse response = checkinService.completeCheckin(
        new CheckinCompleteRequest("A6C2P1", java.util.List.of("7380000000001"), java.util.List.of())
    );

    assertThat(response.bookingCode()).isEqualTo("A6C2P1");
    assertThat(response.ticketNumbers()).containsExactly("7380000000001");
    assertThat(response.boardingPasses()).hasSize(1);
    assertThat(booking.getTickets().iterator().next().getStatus()).isEqualTo(TicketEntity.STATUS_CHECKED_IN);
    assertThat(booking.getTickets().iterator().next().getBoardingPass()).isNotNull();
  }

  @Test
  void completeCheckin_shouldAllowRoundTripBookingWhenSelectingOneDirection() {
    BookingEntity booking = roundTripBooking("A6C2P1", false);
    when(bookingService.getBookingNotFoundMessage()).thenReturn("Khong tim thay dat cho.");
    when(bookingService.lockDetailedBooking("A6C2P1", "Khong tim thay dat cho.")).thenReturn(booking);
    when(boardingPassRepository.save(any(BoardingPassEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    CheckinCompleteResponse response = checkinService.completeCheckin(
        new CheckinCompleteRequest("A6C2P1", java.util.List.of("7380000000001"), java.util.List.of())
    );

    assertThat(response.ticketNumbers()).containsExactly("7380000000001");
    assertThat(booking.getTickets().stream()
        .filter(ticket -> "7380000000001".equals(ticket.getTicketNumber()))
        .findFirst()
        .orElseThrow()
        .getStatus()).isEqualTo(TicketEntity.STATUS_CHECKED_IN);
    assertThat(booking.getTickets().stream()
        .filter(ticket -> "7380000000002".equals(ticket.getTicketNumber()))
        .findFirst()
        .orElseThrow()
        .getStatus()).isEqualTo(TicketEntity.STATUS_ISSUED);
  }

  @Test
  void completeCheckin_shouldRejectWhenBookingNotTicketed() {
    BookingEntity booking = heldBooking("A6C2P1");
    when(bookingService.getBookingNotFoundMessage()).thenReturn("Khong tim thay dat cho.");
    when(bookingService.lockDetailedBooking("A6C2P1", "Khong tim thay dat cho.")).thenReturn(booking);

    assertThatThrownBy(() -> checkinService.completeCheckin(
        new CheckinCompleteRequest("A6C2P1", java.util.List.of("7380000000001"), java.util.List.of())
    )).isInstanceOf(BadRequestException.class);
  }

  @Test
  void completeCheckin_shouldRejectWhenTicketAlreadyCheckedIn() {
    BookingEntity booking = ticketedBooking("A6C2P1", "one_way", true);
    when(bookingService.getBookingNotFoundMessage()).thenReturn("Khong tim thay dat cho.");
    when(bookingService.lockDetailedBooking("A6C2P1", "Khong tim thay dat cho.")).thenReturn(booking);

    assertThatThrownBy(() -> checkinService.completeCheckin(
        new CheckinCompleteRequest("A6C2P1", java.util.List.of("7380000000001"), java.util.List.of())
    )).isInstanceOf(BadRequestException.class);
  }

  @Test
  void completeCheckin_shouldRejectWhenJourneyAlreadyStarted() {
    BookingEntity booking = ticketedBooking(
        "A6C2P1",
        "one_way",
        false,
        OffsetDateTime.now().minusMinutes(30),
        "boarding"
    );
    when(bookingService.getBookingNotFoundMessage()).thenReturn("Khong tim thay dat cho.");
    when(bookingService.lockDetailedBooking("A6C2P1", "Khong tim thay dat cho.")).thenReturn(booking);

    assertThatThrownBy(() -> checkinService.completeCheckin(
        new CheckinCompleteRequest("A6C2P1", java.util.List.of("7380000000001"), java.util.List.of())
    )).isInstanceOf(BadRequestException.class);
  }

  @Test
  void completeCheckin_shouldRejectWhenFlightCancelled() {
    BookingEntity booking = ticketedBooking(
        "A6C2P1",
        "one_way",
        false,
        OffsetDateTime.now().plusDays(1),
        "cancelled"
    );
    when(bookingService.getBookingNotFoundMessage()).thenReturn("Khong tim thay dat cho.");
    when(bookingService.lockDetailedBooking("A6C2P1", "Khong tim thay dat cho.")).thenReturn(booking);

    assertThatThrownBy(() -> checkinService.completeCheckin(
        new CheckinCompleteRequest("A6C2P1", java.util.List.of("7380000000001"), java.util.List.of())
    )).isInstanceOf(BadRequestException.class);
  }

  @Test
  void completeCheckin_shouldReuseSeatTheoDungFlightKhiBookingMotChieuCoNhieuFareSegment() {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(10);
    OffsetDateTime departureAt = OffsetDateTime.now().plusDays(3);
    OffsetDateTime arrivalAt = departureAt.plusHours(2);
    BookingEntity booking = BookingEntity.createHold(
        "A6C2P1",
        "one_way",
        1990000L,
        0L,
        1990000L,
        "VND",
        createdAt,
        createdAt.plusMinutes(BookingService.HOLD_MINUTES)
    );

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
    when(flight.getStatus()).thenReturn("scheduled");
    when(flight.getGate()).thenReturn("G5");

    FlightFareInventoryEntity saverInventory = org.mockito.Mockito.mock(FlightFareInventoryEntity.class);
    FlightFareInventoryEntity flexInventory = org.mockito.Mockito.mock(FlightFareInventoryEntity.class);
    when(flexInventory.getFlight()).thenReturn(flight);

    BookingSegmentEntity saverSegment = BookingSegmentEntity.create(
        booking,
        saverInventory,
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
    );
    booking.addSegment(saverSegment);

    BookingSegmentEntity flexSegment = BookingSegmentEntity.create(
        booking,
        flexInventory,
        "AU201",
        "Thanh pho Ho Chi Minh",
        "Ha Noi",
        "SGN",
        "HAN",
        departureAt,
        arrivalAt,
        "pho_thong_linh_hoat",
        "Pho thong linh hoat",
        1990000L,
        1,
        1990000L,
        createdAt
    );
    booking.addSegment(flexSegment);

    booking.addSeatSelection(BookingSeatSelectionEntity.create(
        booking,
        passenger,
        flexSegment,
        "3A",
        0L,
        createdAt
    ));

    booking.markTicketed("SANDBOX-000000000001", createdAt.plusMinutes(5));
    TicketEntity ticket = TicketEntity.issue(
        booking,
        passenger,
        flexSegment,
        "7380000000001",
        createdAt.plusMinutes(5)
    );
    booking.addTicket(ticket);

    when(bookingService.getBookingNotFoundMessage()).thenReturn("Khong tim thay dat cho.");
    when(bookingService.lockDetailedBooking("A6C2P1", "Khong tim thay dat cho.")).thenReturn(booking);
    when(boardingPassRepository.save(any(BoardingPassEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    CheckinCompleteResponse response = checkinService.completeCheckin(
        new CheckinCompleteRequest("A6C2P1", java.util.List.of("7380000000001"), java.util.List.of())
    );

    assertThat(response.boardingPasses()).hasSize(1);
    assertThat(response.boardingPasses().getFirst().seatNumber()).isEqualTo("3A");
  }

  private BookingEntity heldBooking(String bookingCode) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(5);
    OffsetDateTime departureAt = OffsetDateTime.now().plusDays(3);
    OffsetDateTime arrivalAt = departureAt.plusHours(2);
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

    booking.addSegment(BookingSegmentEntity.create(
        booking,
        org.mockito.Mockito.mock(FlightFareInventoryEntity.class),
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

    return booking;
  }

  private BookingEntity ticketedBooking(String bookingCode, String tripType, boolean checkedIn) {
    return ticketedBooking(
        bookingCode,
        tripType,
        checkedIn,
        OffsetDateTime.now().plusDays(3),
        "scheduled"
    );
  }

  private BookingEntity ticketedBooking(
      String bookingCode,
      String tripType,
      boolean checkedIn,
      OffsetDateTime departureAt,
      String flightStatus
  ) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(10);
    OffsetDateTime arrivalAt = departureAt.plusHours(2);
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
    org.mockito.Mockito.lenient().when(flight.getStatus()).thenReturn(flightStatus);
    org.mockito.Mockito.lenient().when(inventory.getFlight()).thenReturn(flight);

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
      BoardingPassEntity boardingPass = BoardingPassEntity.create(
          ticket,
          "12A",
          "G3",
          departureAt.minusMinutes(45),
          "BP-A6C2P1-7380000000001",
          createdAt.plusMinutes(6)
      );
      ticket.assignBoardingPass(boardingPass);
      ticket.markCheckedIn(createdAt.plusMinutes(6));
    }

    booking.addTicket(ticket);
    return booking;
  }

  private BookingEntity roundTripBooking(String bookingCode, boolean outboundCheckedIn) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(10);
    OffsetDateTime outboundDepartureAt = OffsetDateTime.now().plusDays(3);
    OffsetDateTime returnDepartureAt = OffsetDateTime.now().plusDays(7);
    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        "round_trip",
        2980000L,
        0L,
        2980000L,
        "VND",
        createdAt,
        createdAt.plusMinutes(BookingService.HOLD_MINUTES)
    );

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

    FlightEntity outboundFlight = org.mockito.Mockito.mock(FlightEntity.class);
    FlightFareInventoryEntity outboundInventory = org.mockito.Mockito.mock(FlightFareInventoryEntity.class);
    org.mockito.Mockito.lenient().when(outboundFlight.getStatus()).thenReturn("scheduled");
    org.mockito.Mockito.lenient().when(outboundFlight.getGate()).thenReturn("G3");
    org.mockito.Mockito.lenient().when(outboundInventory.getId()).thenReturn(20101L);
    org.mockito.Mockito.lenient().when(outboundInventory.getFlight()).thenReturn(outboundFlight);

    FlightEntity returnFlight = org.mockito.Mockito.mock(FlightEntity.class);
    FlightFareInventoryEntity returnInventory = org.mockito.Mockito.mock(FlightFareInventoryEntity.class);
    org.mockito.Mockito.lenient().when(returnFlight.getStatus()).thenReturn("scheduled");
    org.mockito.Mockito.lenient().when(returnFlight.getGate()).thenReturn("G4");
    org.mockito.Mockito.lenient().when(returnInventory.getId()).thenReturn(20102L);
    org.mockito.Mockito.lenient().when(returnInventory.getFlight()).thenReturn(returnFlight);

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
        1490000L,
        1,
        1490000L,
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
        1490000L,
        1,
        1490000L,
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
    if (outboundCheckedIn) {
      BoardingPassEntity boardingPass = BoardingPassEntity.create(
          outboundTicket,
          "12A",
          "G3",
          outboundDepartureAt.minusMinutes(45),
          "BP-A6C2P1-7380000000001",
          createdAt.plusMinutes(6)
      );
      outboundTicket.assignBoardingPass(boardingPass);
      outboundTicket.markCheckedIn(createdAt.plusMinutes(6));
    }
    booking.addTicket(outboundTicket);

    booking.addTicket(TicketEntity.issue(
        booking,
        passenger,
        returnSegment,
        "7380000000002",
        createdAt.plusMinutes(5)
    ));
    return booking;
  }
}
