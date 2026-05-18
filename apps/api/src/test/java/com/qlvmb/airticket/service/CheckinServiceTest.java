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
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
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
  void completeCheckin_shouldRejectRoundTripBooking() {
    BookingEntity booking = ticketedBooking("A6C2P1", "round_trip", false);
    when(bookingService.getBookingNotFoundMessage()).thenReturn("Khong tim thay dat cho.");
    when(bookingService.lockDetailedBooking("A6C2P1", "Khong tim thay dat cho.")).thenReturn(booking);

    assertThatThrownBy(() -> checkinService.completeCheckin(
        new CheckinCompleteRequest("A6C2P1", java.util.List.of("7380000000001"), java.util.List.of())
    )).isInstanceOf(BadRequestException.class);
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

  private BookingEntity heldBooking(String bookingCode) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(5);
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

  private BookingEntity ticketedBooking(String bookingCode, String tripType, boolean checkedIn) {
    OffsetDateTime createdAt = OffsetDateTime.now().minusMinutes(10);
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

    booking.addSegment(BookingSegmentEntity.create(
        booking,
        org.mockito.Mockito.mock(FlightFareInventoryEntity.class),
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
      BoardingPassEntity boardingPass = BoardingPassEntity.create(
          ticket,
          "12A",
          "G3",
          OffsetDateTime.parse("2026-03-20T05:25:00+07:00"),
          "BP-A6C2P1-7380000000001",
          createdAt.plusMinutes(6)
      );
      ticket.assignBoardingPass(boardingPass);
      ticket.markCheckedIn(createdAt.plusMinutes(6));
    }

    booking.addTicket(ticket);
    return booking;
  }
}
