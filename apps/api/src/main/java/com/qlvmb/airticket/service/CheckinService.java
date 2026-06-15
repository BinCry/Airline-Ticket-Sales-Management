package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.CheckinCompleteRequest;
import com.qlvmb.airticket.domain.dto.CheckinCompleteResponse;
import com.qlvmb.airticket.domain.entity.BoardingPassEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingPassengerEntity;
import com.qlvmb.airticket.domain.entity.BookingSeatSelectionEntity;
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

  private static final String CHECKIN_STATUS_MESSAGE =
      "Mã đặt chỗ chưa ở trạng thái có thể làm thủ tục trực tuyến.";
  private static final String CHECKIN_TICKET_LIST_MESSAGE =
      "Danh sách vé làm thủ tục trực tuyến không hợp lệ.";
  private static final String CHECKIN_TICKET_NOT_FOUND_MESSAGE =
      "Không tìm thấy vé phù hợp với mã đặt chỗ đã nhập.";
  private static final String CHECKIN_TICKET_USED_MESSAGE =
      "Vé đã được làm thủ tục trực tuyến trước đó hoặc không còn hợp lệ.";
  private static final String CHECKIN_MULTI_FLIGHT_MESSAGE =
      "Mỗi lần làm thủ tục chỉ áp dụng cho một chiều bay.";
  private static final String CHECKIN_JOURNEY_NOT_AVAILABLE_MESSAGE =
      "Không thể làm thủ tục trực tuyến khi chuyến bay đã bắt đầu hoặc không còn hợp lệ.";
  private static final String CHECKIN_CANCELLED_MESSAGE =
      "Không thể làm thủ tục trực tuyến cho chuyến bay đã hủy.";
  private static final String CHECKIN_SEAT_INVALID_MESSAGE =
      "Ghế được chọn khi làm thủ tục không hợp lệ.";
  private static final String CHECKIN_SEAT_UNAVAILABLE_MESSAGE =
      "Ghế được chọn không còn trống cho thao tác này.";
  private static final String SEAT_ASSIGNMENT_FAILED_MESSAGE =
      "Không thể phân bổ ghế lên tàu bay vào lúc này.";
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

    if (!booking.isTicketed() || booking.getSegments().isEmpty()) {
      throw new BadRequestException(CHECKIN_STATUS_MESSAGE);
    }

    LinkedHashSet<String> normalizedTicketNumbers = new LinkedHashSet<>();
    for (String ticketNumber : request.ticketNumbers()) {
      String normalizedTicketNumber = ticketNumber == null ? "" : ticketNumber.trim().toUpperCase();
      if (normalizedTicketNumber.isBlank() || !normalizedTicketNumbers.add(normalizedTicketNumber)) {
        throw new BadRequestException(CHECKIN_TICKET_LIST_MESSAGE);
      }
    }
    if (normalizedTicketNumbers.isEmpty()) {
      throw new BadRequestException(CHECKIN_TICKET_LIST_MESSAGE);
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

    if (selectedTickets.stream().map(this::resolveFlightScopeKey).distinct().count() > 1) {
      throw new BadRequestException(CHECKIN_MULTI_FLIGHT_MESSAGE);
    }

    OffsetDateTime currentTime = OffsetDateTime.now();
    TicketEntity representativeTicket = selectedTickets.getFirst();
    BookingSegmentEntity representativeSegment = representativeTicket.getSegment();
    if (representativeSegment == null) {
      throw new BadRequestException(CHECKIN_STATUS_MESSAGE);
    }

    if (!BookingBusinessPolicy.coTheTuPhucVuLamThuTuc(representativeSegment, currentTime)) {
      if ("cancelled".equals(resolveFlightStatus(representativeSegment))) {
        throw new BadRequestException(CHECKIN_CANCELLED_MESSAGE);
      }
      throw new BadRequestException(CHECKIN_JOURNEY_NOT_AVAILABLE_MESSAGE);
    }

    String selectedFlightScopeKey = resolveFlightScopeKey(representativeTicket);
    Set<String> usedSeats = new LinkedHashSet<>();
    booking.getTickets().stream()
        .filter(ticket -> selectedFlightScopeKey.equals(resolveFlightScopeKey(ticket)))
        .map(TicketEntity::getBoardingPass)
        .filter(boardingPass -> boardingPass != null)
        .map(BoardingPassEntity::getSeatNumber)
        .forEach(usedSeats::add);

    FlightEntity flight = representativeSegment.getInventory() == null
        ? null
        : representativeSegment.getInventory().getFlight();
    OffsetDateTime boardingTime = representativeSegment.getDepartureAt().minusMinutes(45);
    String gate = resolveGate(flight);
    List<CheckinCompleteResponse.BoardingPassItem> boardingPasses = new ArrayList<>();
    Map<String, String> requestedSeatByTicketNumber = buildRequestedSeatMap(request, normalizedTicketNumbers);

    for (TicketEntity ticket : selectedTickets) {
      String seatNumber = resolveSeatNumber(
          booking,
          ticket,
          requestedSeatByTicketNumber,
          usedSeats
      );
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
          ticket.getSegment().getInventory().getId(),
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
      String normalizedTicketNumber = seatSelectionRequest.ticketNumber() == null
          ? ""
          : seatSelectionRequest.ticketNumber().trim().toUpperCase();
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
        .filter(seatSelection -> isSamePassenger(seatSelection, ticket))
        .filter(seatSelection -> isSeatSelectionBelongToSegment(seatSelection, ticket.getSegment()))
        .map(BookingSeatSelectionEntity::getSeatNumber)
        .filter(seatNumber -> !usedSeats.contains(seatNumber))
        .findFirst()
        .orElseGet(() -> generateSeatNumber(usedSeats));
  }

  private boolean isSamePassenger(BookingSeatSelectionEntity seatSelection, TicketEntity ticket) {
    BookingPassengerEntity seatPassenger = seatSelection.getPassenger();
    BookingPassengerEntity ticketPassenger = ticket.getPassenger();
    if (seatPassenger == null || ticketPassenger == null) {
      return false;
    }

    if (seatPassenger.getId() != null && ticketPassenger.getId() != null) {
      return seatPassenger.getId().equals(ticketPassenger.getId());
    }

    return seatPassenger == ticketPassenger;
  }

  private boolean isSeatSelectionBelongToSegment(
      BookingSeatSelectionEntity seatSelection,
      BookingSegmentEntity ticketSegment
  ) {
    if (ticketSegment == null) {
      return false;
    }

    BookingSegmentEntity segment = seatSelection.getSegment();
    if (segment == null) {
      return false;
    }

    if (segment.getId() != null && ticketSegment.getId() != null) {
      return segment.getId().equals(ticketSegment.getId());
    }

    return segment == ticketSegment;
  }

  private String resolveFlightScopeKey(TicketEntity ticket) {
    BookingSegmentEntity segment = ticket.getSegment();
    return segment.getFlightCode()
        + "|" + segment.getOriginCode()
        + "|" + segment.getDestinationCode()
        + "|" + segment.getDepartureAt();
  }

  private String resolveFlightStatus(BookingSegmentEntity segment) {
    if (segment == null || segment.getInventory() == null || segment.getInventory().getFlight() == null) {
      return null;
    }

    FlightEntity flight = segment.getInventory().getFlight();
    if (flight.getStatus() == null || flight.getStatus().isBlank()) {
      return null;
    }

    return flight.getStatus().trim().toLowerCase();
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
