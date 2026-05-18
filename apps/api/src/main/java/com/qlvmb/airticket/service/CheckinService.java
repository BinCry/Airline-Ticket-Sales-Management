package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.CheckinCompleteRequest;
import com.qlvmb.airticket.domain.dto.CheckinCompleteResponse;
import com.qlvmb.airticket.domain.entity.BoardingPassEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.BoardingPassRepository;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckinService {

  private static final String CHECKIN_NOT_SUPPORTED_MESSAGE =
      "L\u00e0m th\u1ee7 t\u1ee5c tr\u1ef1c tuy\u1ebfn cho h\u00e0nh tr\u00ecnh kh\u1ee9 h\u1ed3i ch\u01b0a \u0111\u01b0\u1ee3c h\u1ed7 tr\u1ee3 \u1edf giai \u0111o\u1ea1n n\u00e0y.";
  private static final String CHECKIN_STATUS_MESSAGE =
      "M\u00e3 \u0111\u1eb7t ch\u1ed7 ch\u01b0a \u1edf tr\u1ea1ng th\u00e1i c\u00f3 th\u1ec3 l\u00e0m th\u1ee7 t\u1ee5c tr\u1ef1c tuy\u1ebfn.";
  private static final String CHECKIN_TICKET_LIST_MESSAGE =
      "Danh s\u00e1ch v\u00e9 l\u00e0m th\u1ee7 t\u1ee5c tr\u1ef1c tuy\u1ebfn kh\u00f4ng h\u1ee3p l\u1ec7.";
  private static final String CHECKIN_TICKET_NOT_FOUND_MESSAGE =
      "Kh\u00f4ng t\u00ecm th\u1ea5y v\u00e9 ph\u00f9 h\u1ee3p v\u1edbi m\u00e3 \u0111\u1eb7t ch\u1ed7 \u0111\u00e3 nh\u1eadp.";
  private static final String CHECKIN_TICKET_USED_MESSAGE =
      "V\u00e9 \u0111\u00e3 \u0111\u01b0\u1ee3c l\u00e0m th\u1ee7 t\u1ee5c tr\u1ef1c tuy\u1ebfn tr\u01b0\u1edbc \u0111\u00f3 ho\u1eb7c kh\u00f4ng c\u00f2n h\u1ee3p l\u1ec7.";
  private static final String CHECKIN_SEAT_INVALID_MESSAGE =
      "Gh\u1ebf \u0111\u01b0\u1ee3c ch\u1ecdn khi l\u00e0m th\u1ee7 t\u1ee5c kh\u00f4ng h\u1ee3p l\u1ec7.";
  private static final String CHECKIN_SEAT_UNAVAILABLE_MESSAGE =
      "Gh\u1ebf \u0111\u01b0\u1ee3c ch\u1ecdn kh\u00f4ng c\u00f2n tr\u1ed1ng cho thao t\u00e1c n\u00e0y.";
  private static final String SEAT_ASSIGNMENT_FAILED_MESSAGE =
      "Kh\u00f4ng th\u1ec3 ph\u00e2n b\u1ed5 gh\u1ebf l\u00ean t\u00e0u bay v\u00e0o l\u00fac n\u00e0y.";
  private static final char[] SEAT_COLUMNS = {'A', 'B', 'C', 'D', 'E', 'F'};
  private static final char[] GATE_ZONES = {'A', 'B', 'C', 'D', 'E', 'F'};

  private final BookingService bookingService;
  private final BoardingPassRepository boardingPassRepository;
  private final SecureRandom secureRandom = new SecureRandom();

  public CheckinService(
      BookingService bookingService,
      BoardingPassRepository boardingPassRepository
  ) {
    this.bookingService = bookingService;
    this.boardingPassRepository = boardingPassRepository;
  }

  @Transactional
  public CheckinCompleteResponse completeCheckin(CheckinCompleteRequest request) {
    BookingEntity booking = bookingService.lockDetailedBooking(
        request.bookingCode(),
        bookingService.getBookingNotFoundMessage()
    );

    if (!booking.isTicketed()) {
      throw new BadRequestException(CHECKIN_STATUS_MESSAGE);
    }

    if (!"one_way".equals(booking.getTripType())) {
      throw new BadRequestException(CHECKIN_NOT_SUPPORTED_MESSAGE);
    }

    if (booking.getSegments().isEmpty()) {
      throw new BadRequestException(CHECKIN_STATUS_MESSAGE);
    }

    LinkedHashSet<String> normalizedTicketNumbers = new LinkedHashSet<>();
    for (String ticketNumber : request.ticketNumbers()) {
      String normalizedTicketNumber = ticketNumber == null ? "" : ticketNumber.trim().toUpperCase();
      if (normalizedTicketNumber.isBlank() || !normalizedTicketNumbers.add(normalizedTicketNumber)) {
        throw new BadRequestException(CHECKIN_TICKET_LIST_MESSAGE);
      }
    }

    Map<String, TicketEntity> ticketByNumber = new LinkedHashMap<>();
    booking.getTickets().forEach(ticket -> ticketByNumber.put(ticket.getTicketNumber().trim().toUpperCase(), ticket));

    List<TicketEntity> selectedTickets = new ArrayList<>();
    for (String ticketNumber : normalizedTicketNumbers) {
      TicketEntity ticket = ticketByNumber.get(ticketNumber);
      if (ticket == null) {
        throw new BadRequestException(CHECKIN_TICKET_NOT_FOUND_MESSAGE);
      }
      if (!TicketEntity.STATUS_ISSUED.equals(ticket.getStatus()) || ticket.getBoardingPass() != null) {
        throw new BadRequestException(CHECKIN_TICKET_USED_MESSAGE);
      }
      selectedTickets.add(ticket);
    }

    Set<String> usedSeats = new LinkedHashSet<>();
    booking.getTickets().stream()
        .map(TicketEntity::getBoardingPass)
        .filter(boardingPass -> boardingPass != null)
        .map(BoardingPassEntity::getSeatNumber)
        .forEach(usedSeats::add);

    BookingSegmentEntity segment = booking.getSegments().iterator().next();
    FlightEntity flight = segment.getInventory() == null ? null : segment.getInventory().getFlight();
    if (flight != null && "cancelled".equals(flight.getStatus())) {
      throw new BadRequestException("Không thể làm thủ tục trực tuyến cho chuyến bay đã hủy.");
    }
    OffsetDateTime currentTime = OffsetDateTime.now();
    OffsetDateTime boardingTime = segment.getDepartureAt().minusMinutes(45);
    String gate = resolveGate(flight);
    List<CheckinCompleteResponse.BoardingPassItem> boardingPasses = new ArrayList<>();
    Map<String, String> requestedSeatByTicketNumber = buildRequestedSeatMap(request, normalizedTicketNumbers);

    for (TicketEntity ticket : selectedTickets) {
      String seatNumber = resolveSeatNumber(booking, segment, ticket, requestedSeatByTicketNumber, usedSeats);
      String barcode = generateBarcode(booking.getBookingCode(), ticket.getTicketNumber());

      BoardingPassEntity boardingPass = BoardingPassEntity.create(
          ticket,
          seatNumber,
          gate,
          boardingTime,
          barcode,
          currentTime
      );

      ticket.assignBoardingPass(boardingPass);
      ticket.markCheckedIn(currentTime);
      boardingPassRepository.save(boardingPass);
      usedSeats.add(seatNumber);

      boardingPasses.add(new CheckinCompleteResponse.BoardingPassItem(
          ticket.getTicketNumber(),
          ticket.getPassenger().getFullName(),
          seatNumber,
          gate,
          boardingTime,
          barcode
      ));
    }

    return new CheckinCompleteResponse(
        booking.getBookingCode(),
        selectedTickets.stream().map(TicketEntity::getTicketNumber).toList(),
        boardingPasses
    );
  }

  private Map<String, String> buildRequestedSeatMap(
      CheckinCompleteRequest request,
      Set<String> normalizedTicketNumbers
  ) {
    Map<String, String> requestedSeatByTicketNumber = new LinkedHashMap<>();
    Set<String> normalizedSeatNumbers = new LinkedHashSet<>();

    for (CheckinCompleteRequest.SeatSelectionRequest seatSelectionRequest : request.seatSelections()) {
      String normalizedTicketNumber = seatSelectionRequest.ticketNumber().trim().toUpperCase();
      if (!normalizedTicketNumbers.contains(normalizedTicketNumber)) {
        throw new BadRequestException(CHECKIN_SEAT_INVALID_MESSAGE);
      }

      String normalizedSeatNumber = normalizeSeatNumber(seatSelectionRequest.seatNumber());
      if (requestedSeatByTicketNumber.putIfAbsent(normalizedTicketNumber, normalizedSeatNumber) != null) {
        throw new BadRequestException(CHECKIN_SEAT_INVALID_MESSAGE);
      }
      if (!normalizedSeatNumbers.add(normalizedSeatNumber)) {
        throw new BadRequestException(CHECKIN_SEAT_UNAVAILABLE_MESSAGE);
      }
    }

    return requestedSeatByTicketNumber;
  }

  private String resolveSeatNumber(
      BookingEntity booking,
      BookingSegmentEntity segment,
      TicketEntity ticket,
      Map<String, String> requestedSeatByTicketNumber,
      Set<String> usedSeats
  ) {
    String requestedSeatNumber = requestedSeatByTicketNumber.get(ticket.getTicketNumber().trim().toUpperCase());
    if (requestedSeatNumber != null) {
      if (usedSeats.contains(requestedSeatNumber)) {
        throw new BadRequestException(CHECKIN_SEAT_UNAVAILABLE_MESSAGE);
      }
      return requestedSeatNumber;
    }

    return booking.getSeatSelections().stream()
        .filter(seatSelection -> seatSelection.getPassenger().getId().equals(ticket.getPassenger().getId()))
        .filter(seatSelection -> seatSelection.getSegment().getId().equals(segment.getId()))
        .map(seatSelection -> seatSelection.getSeatNumber())
        .filter(seatNumber -> !usedSeats.contains(seatNumber))
        .findFirst()
        .orElseGet(() -> generateSeatNumber(usedSeats));
  }

  private String generateSeatNumber(Set<String> usedSeats) {
    for (int attempt = 0; attempt < 60; attempt++) {
      String seatNumber = (secureRandom.nextInt(23) + 6)
          + String.valueOf(SEAT_COLUMNS[secureRandom.nextInt(SEAT_COLUMNS.length)]);
      if (!usedSeats.contains(seatNumber)) {
        return seatNumber;
      }
    }

    throw new IllegalStateException(SEAT_ASSIGNMENT_FAILED_MESSAGE);
  }

  private String generateGate() {
    return GATE_ZONES[secureRandom.nextInt(GATE_ZONES.length)]
        + String.valueOf(secureRandom.nextInt(12) + 1);
  }

  private String resolveGate(FlightEntity flight) {
    if (flight == null) {
      return generateGate();
    }
    if (flight.getGate() != null && !flight.getGate().isBlank()) {
      return flight.getGate().trim().toUpperCase();
    }
    return generateGate();
  }

  private String generateBarcode(String bookingCode, String ticketNumber) {
    return "BP-" + bookingCode + "-" + ticketNumber;
  }

  private String normalizeSeatNumber(String seatNumber) {
    String normalizedSeatNumber = seatNumber == null ? "" : seatNumber.trim().toUpperCase();
    if (!normalizedSeatNumber.matches("^[1-9][0-9]?[A-F]$")) {
      throw new BadRequestException(CHECKIN_SEAT_INVALID_MESSAGE);
    }
    return normalizedSeatNumber;
  }
}
