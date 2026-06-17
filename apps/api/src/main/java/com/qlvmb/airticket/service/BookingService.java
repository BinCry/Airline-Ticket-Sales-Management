package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.BookingHoldRequest;
import com.qlvmb.airticket.domain.dto.BookingHoldResponse;
import com.qlvmb.airticket.domain.dto.BookingOverviewResponse;
import com.qlvmb.airticket.domain.dto.ApplyVoucherRequest;
import com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest;
import com.qlvmb.airticket.domain.entity.BoardingPassEntity;
import com.qlvmb.airticket.domain.entity.BookingAncillaryEntity;
import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingPassengerEntity;
import com.qlvmb.airticket.domain.entity.BookingSeatSelectionEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.BookingSeatSelectionRepository;
import com.qlvmb.airticket.repository.FlightFareInventoryRepository;
import com.qlvmb.airticket.repository.TicketRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

  public static final int HOLD_MINUTES = 15;

  private static final String CURRENCY = "VND";
  private static final String PUBLIC_BOOKING_CLOSED_MESSAGE =
      "Chuy\u1ebfn bay hi\u1ec7n kh\u00f4ng c\u00f2n m\u1edf b\u00e1n c\u00f4ng khai.";
  private static final String BOOKING_NOT_FOUND_MESSAGE = "Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u1eb7t ch\u1ed7 t\u01b0\u01a1ng \u1ee9ng v\u1edbi m\u00e3 \u0111\u00e3 nh\u1eadp.";
  private static final String BOOKING_EXPIRED_MESSAGE = "M\u00e3 \u0111\u1eb7t ch\u1ed7 kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c \u0111\u00e3 h\u1ebft h\u1ea1n gi\u1eef ch\u1ed7.";
  private static final String WAITING_PAYMENT_MESSAGE = "\u0110\u1eb7t ch\u1ed7 kh\u00f4ng \u1edf tr\u1ea1ng th\u00e1i ch\u1edd thanh to\u00e1n.";
  private static final String SOLD_OUT_MESSAGE = "Chuy\u1ebfn bay \u0111\u00e3 h\u1ebft gh\u1ebf tr\u1ed1ng cho h\u1ea1ng v\u00e9 n\u00e0y.";
  private static final String INVENTORY_NOT_FOUND_MESSAGE = "Kh\u00f4ng t\u00ecm th\u1ea5y th\u00f4ng tin gh\u1ebf cho l\u1ef1a ch\u1ecdn \u0111\u00e3 ch\u1ecdn.";
  private static final String SEAT_SELECTION_INVALID_MESSAGE = "Th\u00f4ng tin gh\u1ebf \u0111\u00e3 ch\u1ecdn kh\u00f4ng h\u1ee3p l\u1ec7.";
  private static final String SEAT_SELECTION_DUPLICATE_MESSAGE = "Kh\u00f4ng \u0111\u01b0\u1ee3c ch\u1ecdn tr\u00f9ng gh\u1ebf cho c\u00f9ng m\u1ed9t ch\u1eb7ng bay.";
  private static final String SEAT_SELECTION_MISMATCH_MESSAGE = "Mỗi hành khách cần chọn đúng một ghế cho từng chặng bay.";
  private static final String REFUND_NOT_AVAILABLE_MESSAGE = "\u0110\u1eb7t ch\u1ed7 hi\u1ec7n kh\u00f4ng th\u1ec3 g\u1eedi y\u00eau c\u1ea7u ho\u00e0n v\u00e9.";
  private static final String REFUND_AFTER_CHECKIN_MESSAGE = "Kh\u00f4ng th\u1ec3 g\u1eedi y\u00eau c\u1ea7u ho\u00e0n v\u00e9 sau khi \u0111\u00e3 l\u00e0m th\u1ee7 t\u1ee5c tr\u1ef1c tuy\u1ebfn.";
  private static final String REFUND_PENDING_MESSAGE = "Y\u00eau c\u1ea7u ho\u00e0n v\u00e9 cho m\u00e3 \u0111\u1eb7t ch\u1ed7 n\u00e0y \u0111ang ch\u1edd x\u1eed l\u00fd.";
  private static final String REFUND_TICKET_LIST_MESSAGE =
      "Danh s\u00e1ch v\u00e9 c\u1ea7n ho\u00e0n cho m\u00e3 \u0111\u1eb7t ch\u1ed7 n\u00e0y kh\u00f4ng h\u1ee3p l\u1ec7.";
  private static final String REFUND_TICKET_NOT_FOUND_MESSAGE =
      "Kh\u00f4ng t\u00ecm th\u1ea5y v\u00e9 ph\u00f9 h\u1ee3p v\u1edbi m\u00e3 \u0111\u1eb7t ch\u1ed7 \u0111\u00e3 nh\u1eadp.";
  private static final String REFUND_MULTI_FLIGHT_MESSAGE =
      "M\u1ed7i y\u00eau c\u1ea7u ho\u00e0n v\u00e9 ch\u1ec9 \u00e1p d\u1ee5ng cho m\u1ed9t chi\u1ec1u bay.";
  private static final String VOUCHER_NOT_AVAILABLE_MESSAGE = "Booking hiện không ở trạng thái phù hợp để áp voucher.";
  private static final String REFUND_AFTER_DEPARTURE_MESSAGE =
      "Kh\u00f4ng th\u1ec3 g\u1eedi y\u00eau c\u1ea7u ho\u00e0n v\u00e9 khi h\u00e0nh tr\u00ecnh \u0111\u00e3 b\u1eaft \u0111\u1ea7u.";
  private static final String ADULT_AGE_MISMATCH_MESSAGE =
      "H\u00e0nh kh\u00e1ch ng\u01b0\u1eddi l\u1edbn ph\u1ea3i t\u1eeb \u0111\u1ee7 12 tu\u1ed5i t\u1ea1i ng\u00e0y kh\u1edfi h\u00e0nh \u0111\u1ea7u ti\u00ean.";
  private static final String CHILD_AGE_MISMATCH_MESSAGE =
      "H\u00e0nh kh\u00e1ch tr\u1ebb em ph\u1ea3i t\u1eeb 2 \u0111\u1ebfn d\u01b0\u1edbi 12 tu\u1ed5i t\u1ea1i ng\u00e0y kh\u1edfi h\u00e0nh \u0111\u1ea7u ti\u00ean.";
  private static final String INFANT_AGE_MISMATCH_MESSAGE =
      "H\u00e0nh kh\u00e1ch em b\u00e9 ph\u1ea3i d\u01b0\u1edbi 2 tu\u1ed5i t\u1ea1i ng\u00e0y kh\u1edfi h\u00e0nh \u0111\u1ea7u ti\u00ean.";
  private static final List<String> PAYMENT_METHODS = List.of("Chuy\u1ec3n kho\u1ea3n SePay");
  private static final Set<String> SUPPORTED_TRIP_TYPES = Set.of("one_way", "round_trip");
  private static final Set<String> SUPPORTED_PASSENGER_TYPES = Set.of("adult", "child", "infant");
  private static final char[] BOOKING_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

  private final FlightFareInventoryRepository flightFareInventoryRepository;
  private final BookingRepository bookingRepository;
  private final BookingSeatSelectionRepository bookingSeatSelectionRepository;
  private final TicketRepository ticketRepository;
  private final ProductCatalogService productCatalogService;
  private final MemberVoucherService memberVoucherService;
  private final SecureRandom secureRandom = new SecureRandom();

  public BookingService(
      FlightFareInventoryRepository flightFareInventoryRepository,
      BookingRepository bookingRepository,
      BookingSeatSelectionRepository bookingSeatSelectionRepository,
      TicketRepository ticketRepository,
      ProductCatalogService productCatalogService,
      MemberVoucherService memberVoucherService
  ) {
    this.flightFareInventoryRepository = flightFareInventoryRepository;
    this.bookingRepository = bookingRepository;
    this.bookingSeatSelectionRepository = bookingSeatSelectionRepository;
    this.ticketRepository = ticketRepository;
    this.productCatalogService = productCatalogService;
    this.memberVoucherService = memberVoucherService;
  }

  @Transactional
  public BookingHoldResponse createHold(BookingHoldRequest request) {
    String tripType = normalizeTripType(request.tripType());
    validateRequestShape(tripType, request);

    int passengerCount = request.passengers().size();
    OffsetDateTime currentTime = PublicFlightWindowPolicy.currentTime();
    List<Long> inventoryIds = collectReferencedInventoryIds(request);

    List<FlightFareInventoryEntity> lockedInventories =
        new ArrayList<>(flightFareInventoryRepository.lockByIds(inventoryIds));

    if (lockedInventories.size() != inventoryIds.size()) {
      throw new BadRequestException(INVENTORY_NOT_FOUND_MESSAGE);
    }

    Map<Long, FlightFareInventoryEntity> inventoryById = reconcileExpiredHolds(currentTime, lockedInventories);
    List<PreparedTripSegment> preparedTripSegments =
        buildPreparedTripSegments(request.segments(), inventoryById, currentTime);
    validatePassengerAges(request.passengers(), preparedTripSegments);

    List<PreparedAncillary> preparedAncillaries = request.ancillaries().stream()
        .map(this::buildPreparedAncillary)
        .toList();
    PreparedSeatSelectionContext preparedSeatSelectionContext = buildPreparedSeatSelections(
        request.seatSelections(),
        inventoryById,
        preparedTripSegments,
        request.passengers(),
        currentTime
    );
    List<PreparedSegment> preparedSegments = buildPreparedSegments(
        preparedSeatSelectionContext.passengerCountByInventoryId(),
        inventoryById,
        preparedTripSegments
    );
    List<PreparedSeatSelection> preparedSeatSelections = preparedSeatSelectionContext.selections();

    preparedSegments.forEach(segment -> segment.inventory().reserveSeats(segment.passengerCount()));

    long baseAmount = preparedSegments.stream().mapToLong(PreparedSegment::subtotalAmount).sum();
    long ancillaryAmount = preparedAncillaries.stream().mapToLong(PreparedAncillary::subtotalAmount).sum();
    long totalAmount = baseAmount + ancillaryAmount;
    String bookingCode = generateUniqueBookingCode();
    OffsetDateTime expiresAt = currentTime.plusMinutes(HOLD_MINUTES);

    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        tripType,
        baseAmount,
        ancillaryAmount,
        totalAmount,
        CURRENCY,
        currentTime,
        expiresAt
    );

    booking.assignContact(
        BookingContactEntity.create(
            booking,
            request.contact().fullName().trim(),
            request.contact().email().trim().toLowerCase(),
            request.contact().phone().trim()
        )
    );

    List<BookingPassengerEntity> bookingPassengers = new ArrayList<>();
    request.passengers().forEach(passengerRequest -> {
      BookingPassengerEntity passenger = BookingPassengerEntity.create(
          booking,
          passengerRequest.fullName().trim(),
          normalizePassengerType(passengerRequest.passengerType()),
          passengerRequest.dateOfBirth(),
          passengerRequest.documentType().trim().toUpperCase(),
          passengerRequest.documentNumber().trim(),
          currentTime
      );
      booking.addPassenger(passenger);
      bookingPassengers.add(passenger);
    });

    List<BookingSegmentEntity> bookingSegments = new ArrayList<>();
    preparedSegments.forEach(segment -> {
      BookingSegmentEntity bookingSegment = BookingSegmentEntity.create(
          booking,
          segment.inventory(),
          segment.code(),
          segment.fromCity(),
          segment.toCity(),
          segment.originCode(),
          segment.destinationCode(),
          segment.departureAt(),
          segment.arrivalAt(),
          segment.fareFamily(),
          segment.fareTitle(),
          segment.pricePerPassenger(),
          segment.passengerCount(),
          segment.subtotalAmount(),
          currentTime
      );
      booking.addSegment(bookingSegment);
      bookingSegments.add(bookingSegment);
    });

    preparedAncillaries.forEach(ancillary -> booking.addAncillary(
        BookingAncillaryEntity.create(
            booking,
            ancillary.code(),
            ancillary.name(),
            ancillary.description(),
            ancillary.unitPrice(),
            ancillary.quantity(),
            ancillary.subtotalAmount(),
            currentTime
        )
    ));

    Map<Long, BookingSegmentEntity> segmentByInventoryId = bookingSegments.stream()
        .collect(Collectors.toMap(
            segment -> segment.getInventory().getId(),
            segment -> segment,
            (left, right) -> left,
            LinkedHashMap::new
        ));

    preparedSeatSelections.forEach(seatSelection -> booking.addSeatSelection(
        BookingSeatSelectionEntity.create(
            booking,
            bookingPassengers.get(seatSelection.passengerIndex()),
            segmentByInventoryId.get(seatSelection.inventoryId()),
            seatSelection.seatNumber(),
            seatSelection.unitPrice(),
            currentTime
        )
    ));

    BookingEntity savedBooking = bookingRepository.save(booking);
    return mapHoldResponse(savedBooking);
  }

  @Transactional
  public void reconcileExpiredHoldsForInventories(
      Collection<Long> inventoryIds,
      OffsetDateTime currentTime
  ) {
    if (inventoryIds == null || inventoryIds.isEmpty()) {
      return;
    }

    List<FlightFareInventoryEntity> lockedInventories =
        new ArrayList<>(flightFareInventoryRepository.lockByIds(inventoryIds));
    reconcileExpiredHolds(currentTime, lockedInventories);
  }

  @Transactional
  public BookingOverviewResponse getBookingOverview(String bookingCode) {
    BookingEntity booking = findDetailedBooking(bookingCode, BOOKING_NOT_FOUND_MESSAGE);
    reconcileBookingExpiration(booking, OffsetDateTime.now());
    return mapOverviewResponse(booking);
  }

  @Transactional(readOnly = true)
  public void assertOwnedByAuthenticatedUser(String bookingCode, AuthenticatedUser authenticatedUser) {
    if (authenticatedUser == null || authenticatedUser.email() == null || authenticatedUser.email().isBlank()) {
      throw new NotFoundException(BOOKING_NOT_FOUND_MESSAGE);
    }

    String normalizedBookingCode = normalizeBookingCode(bookingCode, BOOKING_NOT_FOUND_MESSAGE);
    String normalizedEmail = authenticatedUser.email().trim().toLowerCase(Locale.ROOT);
    boolean ownedByAuthenticatedUser = bookingRepository.existsOwnedByContactEmail(normalizedBookingCode, normalizedEmail);
    if (!ownedByAuthenticatedUser) {
      throw new NotFoundException(BOOKING_NOT_FOUND_MESSAGE);
    }
  }

  @Transactional
  public BookingOverviewResponse requestRefund(String bookingCode, RefundRequestCreateRequest request) {
    BookingEntity booking = lockDetailedBooking(bookingCode, BOOKING_NOT_FOUND_MESSAGE);
    OffsetDateTime currentTime = OffsetDateTime.now();

    boolean cancelledByOperations = booking.isCancelled()
        && BookingEntity.PAYMENT_STATUS_PAID.equals(booking.getPaymentStatus());
    if (!booking.isTicketed() && !cancelledByOperations) {
      throw new BadRequestException(REFUND_NOT_AVAILABLE_MESSAGE);
    }

    boolean hasPendingRefund = booking.getRefundRequests().stream().anyMatch(RefundRequestEntity::isPending);
    if (hasPendingRefund || booking.isRefundPending()) {
      throw new BadRequestException(REFUND_PENDING_MESSAGE);
    }

    List<TicketEntity> requestedTickets = resolveRequestedRefundTickets(booking, request, cancelledByOperations);
    if (requestedTickets.isEmpty()) {
      throw new BadRequestException(REFUND_NOT_AVAILABLE_MESSAGE);
    }

    if (!cancelledByOperations
        && requestedTickets.stream().anyMatch(ticket -> TicketEntity.STATUS_CHECKED_IN.equals(ticket.getStatus()))) {
      throw new BadRequestException(REFUND_AFTER_CHECKIN_MESSAGE);
    }

    if (!cancelledByOperations
        && requestedTickets.stream()
            .map(TicketEntity::getSegment)
            .anyMatch(segment -> !BookingBusinessPolicy.coTheTuPhucVuHoanVe(segment, currentTime))) {
      throw new BadRequestException(REFUND_AFTER_DEPARTURE_MESSAGE);
    }

    RefundRequestEntity refundRequest = RefundRequestEntity.createPending(
        booking,
        request.reason().trim(),
        resolveRefundAmount(booking, requestedTickets),
        currentTime,
        requestedTickets
    );
    booking.addRefundRequest(refundRequest);
    if (!booking.isCancelled()) {
      booking.markRefundPending(currentTime);
    }

    return mapOverviewResponse(booking);
  }

  @Transactional
  public BookingOverviewResponse applyVoucher(
      String bookingCode,
      AuthenticatedUser authenticatedUser,
      ApplyVoucherRequest request
  ) {
    BookingEntity booking = lockDetailedBooking(bookingCode, BOOKING_NOT_FOUND_MESSAGE);
    OffsetDateTime currentTime = OffsetDateTime.now();
    reconcileBookingExpiration(booking, currentTime);

    if (!booking.isHold()) {
      throw new BadRequestException(VOUCHER_NOT_AVAILABLE_MESSAGE);
    }

    memberVoucherService.applyVoucherToBooking(
        authenticatedUser,
        booking,
        request.voucherCode(),
        currentTime
    );
    return mapOverviewResponse(booking);
  }

  @Transactional
  public BookingOverviewResponse cancelAppliedVoucher(String bookingCode, AuthenticatedUser authenticatedUser) {
    BookingEntity booking = lockDetailedBooking(bookingCode, BOOKING_NOT_FOUND_MESSAGE);
    OffsetDateTime currentTime = OffsetDateTime.now();
    reconcileBookingExpiration(booking, currentTime);

    if (!booking.isHold()) {
      throw new BadRequestException(VOUCHER_NOT_AVAILABLE_MESSAGE);
    }

    memberVoucherService.cancelVoucherForBooking(authenticatedUser, booking, currentTime);
    return mapOverviewResponse(booking);
  }

  @Transactional
  public BookingEntity findBookingForPayment(String bookingCode) {
    BookingEntity booking = lockDetailedBooking(bookingCode, BOOKING_EXPIRED_MESSAGE);
    reconcileBookingExpiration(booking, OffsetDateTime.now());
    if (BookingEntity.STATUS_CANCELLED.equals(booking.getStatus())
        && BookingEntity.PAYMENT_STATUS_EXPIRED.equals(booking.getPaymentStatus())) {
      throw new NotFoundException(BOOKING_EXPIRED_MESSAGE);
    }
    return booking;
  }

  @Transactional
  public BookingEntity lockDetailedBooking(String bookingCode, String notFoundMessage) {
    String normalizedBookingCode = normalizeBookingCode(bookingCode, notFoundMessage);
    return bookingRepository.lockDetailedByBookingCode(normalizedBookingCode)
        .orElseThrow(() -> new NotFoundException(notFoundMessage));
  }

  private BookingEntity findDetailedBooking(String bookingCode, String notFoundMessage) {
    String normalizedBookingCode = normalizeBookingCode(bookingCode, notFoundMessage);
    return bookingRepository.findDetailedByBookingCode(normalizedBookingCode)
        .orElseThrow(() -> new NotFoundException(notFoundMessage));
  }

  public BookingOverviewResponse mapOverviewResponse(BookingEntity booking) {
    List<BookingOverviewResponse.SegmentItem> segments = booking.getSegments().stream()
        .map(this::mapSegment)
        .toList();

    BookingContactEntity contact = booking.getContact();
    BookingOverviewResponse.ContactItem contactItem = contact == null
        ? null
        : new BookingOverviewResponse.ContactItem(
            contact.getFullName(),
            contact.getEmail(),
            contact.getPhone()
        );

    List<BookingOverviewResponse.PassengerItem> passengers = booking.getPassengers().stream()
        .map(passenger -> new BookingOverviewResponse.PassengerItem(
            passenger.getFullName(),
            passenger.getPassengerType(),
            passenger.getDateOfBirth(),
            passenger.getDocumentType(),
            passenger.getDocumentNumber()
        ))
        .toList();

    List<BookingOverviewResponse.AncillaryItem> ancillaries = booking.getAncillaries().stream()
        .map(ancillary -> new BookingOverviewResponse.AncillaryItem(
            ancillary.getCode(),
            ancillary.getName(),
            ancillary.getDescription(),
            ancillary.getUnitPrice(),
            ancillary.getQuantity(),
            ancillary.getSubtotalAmount()
        ))
        .toList();

    List<BookingOverviewResponse.SeatSelectionItem> seatSelections = booking.getSeatSelections().stream()
        .map(seatSelection -> new BookingOverviewResponse.SeatSelectionItem(
            seatSelection.getSegment().getInventory().getId(),
            seatSelection.getSegment().getFlightCode(),
            seatSelection.getPassenger().getFullName(),
            seatSelection.getSeatNumber(),
            seatSelection.getUnitPrice()
        ))
        .toList();

    List<BookingOverviewResponse.TicketItem> tickets = booking.getTickets().stream()
        .map(ticket -> new BookingOverviewResponse.TicketItem(
            ticket.getSegment().getInventory().getId(),
            ticket.getTicketNumber(),
            ticket.getPassenger().getFullName(),
            mapTicketStatus(ticket.getStatus()),
            ticket.getIssuedAt()
        ))
        .toList();

    List<BookingOverviewResponse.BoardingPassItem> boardingPasses = booking.getTickets().stream()
        .map(TicketEntity::getBoardingPass)
        .filter(Objects::nonNull)
        .map(boardingPass -> mapBoardingPass(boardingPass, boardingPass.getTicket()))
        .toList();

    RefundRequestEntity latestRefundRequest = booking.getRefundRequests().stream()
        .max(Comparator.comparing(RefundRequestEntity::getCreatedAt))
        .orElse(null);

    BookingOverviewResponse.RefundRequestItem refundRequestItem = latestRefundRequest == null
        ? null
        : new BookingOverviewResponse.RefundRequestItem(
            latestRefundRequest.getReason(),
            latestRefundRequest.getRefundAmount(),
            mapRefundStatus(latestRefundRequest.getStatus()),
            latestRefundRequest.getCreatedAt()
        );

    return new BookingOverviewResponse(
        booking.getBookingCode(),
        mapBookingStatus(booking.getStatus()),
        mapPaymentStatus(booking.getPaymentStatus()),
        booking.getExpiresAt(),
        booking.getTicketedAt(),
        booking.getTripType(),
        buildSteps(booking),
        segments,
        contactItem,
        passengers,
        ancillaries,
        seatSelections,
        tickets,
        boardingPasses,
        refundRequestItem,
        PAYMENT_METHODS,
        new BookingOverviewResponse.PriceSummaryItem(
            booking.getBaseAmount(),
            booking.getAncillaryAmount(),
            booking.getDiscountAmount(),
            booking.getTotalAmount(),
            booking.getCurrency(),
            booking.getAppliedVoucherCode()
        )
    );
  }

  public void reconcileBookingExpiration(BookingEntity booking, OffsetDateTime currentTime) {
    if (!booking.isHold() || !booking.isExpired(currentTime)) {
      return;
    }

    List<Long> inventoryIds = booking.getSegments().stream()
        .map(segment -> segment.getInventory().getId())
        .distinct()
        .toList();

    Map<Long, FlightFareInventoryEntity> inventoryById = flightFareInventoryRepository.lockByIds(inventoryIds).stream()
        .collect(Collectors.toMap(
            FlightFareInventoryEntity::getId,
            inventory -> inventory,
            (left, right) -> left,
            LinkedHashMap::new
        ));

    cancelExpiredBooking(booking, inventoryById, currentTime);
  }

  public String mapBookingStatus(String status) {
    return switch (status) {
      case BookingEntity.STATUS_HOLD -> "held";
      case BookingEntity.STATUS_TICKETED -> "ticketed";
      case BookingEntity.STATUS_REFUND_PENDING -> "refund_pending";
      case BookingEntity.STATUS_CANCELLED -> "cancelled";
      default -> status == null ? "held" : status.toLowerCase();
    };
  }

  public String mapPaymentStatus(String paymentStatus) {
    return switch (paymentStatus) {
      case BookingEntity.PAYMENT_STATUS_PENDING -> "pending";
      case BookingEntity.PAYMENT_STATUS_PAID -> "paid";
      case BookingEntity.PAYMENT_STATUS_FAILED -> "failed";
      case BookingEntity.PAYMENT_STATUS_EXPIRED -> "expired";
      default -> paymentStatus == null ? "pending" : paymentStatus.toLowerCase();
    };
  }

  public String mapTicketStatus(String status) {
    return switch (status) {
      case TicketEntity.STATUS_ISSUED -> "issued";
      case TicketEntity.STATUS_CHECKED_IN -> "checked_in";
      case TicketEntity.STATUS_CANCELLED -> "cancelled";
      default -> status == null ? "issued" : status.toLowerCase();
    };
  }

  public String mapRefundStatus(String status) {
    return switch (status) {
      case RefundRequestEntity.STATUS_PENDING -> "pending";
      case RefundRequestEntity.STATUS_APPROVED -> "approved";
      case RefundRequestEntity.STATUS_REJECTED -> "rejected";
      default -> status == null ? "pending" : status.toLowerCase();
    };
  }

  public String getBookingExpiredMessage() {
    return BOOKING_EXPIRED_MESSAGE;
  }

  public String getWaitingPaymentMessage() {
    return WAITING_PAYMENT_MESSAGE;
  }

  public String getBookingNotFoundMessage() {
    return BOOKING_NOT_FOUND_MESSAGE;
  }

  public String generateUniqueTicketNumber() {
    for (int attempt = 0; attempt < 20; attempt++) {
      String ticketNumber = "738" + randomNumericCode(10);
      if (!ticketRepository.existsByTicketNumberIgnoreCase(ticketNumber)) {
        return ticketNumber;
      }
    }
    throw new IllegalStateException("Kh\u00f4ng th\u1ec3 ph\u00e1t h\u00e0nh v\u00e9 m\u1edbi v\u00e0o l\u00fac n\u00e0y.");
  }
  public String generatePaymentReference() {
    return "SEPAY-" + randomNumericCode(12);
  }

  private Map<Long, FlightFareInventoryEntity> reconcileExpiredHolds(
      OffsetDateTime currentTime,
      List<FlightFareInventoryEntity> lockedInventories
  ) {
    Map<Long, FlightFareInventoryEntity> inventoryById = lockedInventories.stream()
        .collect(Collectors.toMap(
            FlightFareInventoryEntity::getId,
            inventory -> inventory,
            (left, right) -> left,
            LinkedHashMap::new
        ));

    List<BookingEntity> expiredBookings = bookingRepository.lockExpiredHoldsByInventoryIds(
        BookingEntity.STATUS_HOLD,
        currentTime,
        inventoryById.keySet()
    );

    if (expiredBookings.isEmpty()) {
      return inventoryById;
    }

    Set<Long> additionalInventoryIds = expiredBookings.stream()
        .flatMap(booking -> booking.getSegments().stream())
        .map(segment -> segment.getInventory().getId())
        .filter(inventoryId -> !inventoryById.containsKey(inventoryId))
        .collect(Collectors.toCollection(LinkedHashSet::new));

    if (!additionalInventoryIds.isEmpty()) {
      flightFareInventoryRepository.lockByIds(additionalInventoryIds).forEach(inventory ->
          inventoryById.putIfAbsent(inventory.getId(), inventory)
      );
    }

    expiredBookings.forEach(booking -> cancelExpiredBooking(booking, inventoryById, currentTime));
    return inventoryById;
  }

  private void cancelExpiredBooking(
      BookingEntity booking,
      Map<Long, FlightFareInventoryEntity> inventoryById,
      OffsetDateTime currentTime
  ) {
    if (!booking.isHold() || !booking.isExpired(currentTime)) {
      return;
    }

    booking.getSegments().forEach(segment -> {
      FlightFareInventoryEntity inventory = inventoryById.get(segment.getInventory().getId());
      if (inventory != null) {
        inventory.releaseSeats(segment.getPassengerCount());
      }
    });
    memberVoucherService.releaseVoucherForBooking(booking, currentTime);
    booking.markExpired(currentTime);
  }

  private List<Long> collectReferencedInventoryIds(BookingHoldRequest request) {
    LinkedHashSet<Long> inventoryIds = new LinkedHashSet<>();
    request.segments().stream()
        .map(BookingHoldRequest.SegmentRequest::inventoryId)
        .filter(Objects::nonNull)
        .forEach(inventoryIds::add);
    request.seatSelections().stream()
        .map(BookingHoldRequest.SeatSelectionRequest::inventoryId)
        .forEach(inventoryIds::add);
    return List.copyOf(inventoryIds);
  }

  private List<PreparedTripSegment> buildPreparedTripSegments(
      List<BookingHoldRequest.SegmentRequest> segmentRequests,
      Map<Long, FlightFareInventoryEntity> inventoryById,
      OffsetDateTime currentTime
  ) {
    List<PreparedTripSegment> preparedTripSegments = new ArrayList<>();
    Set<Long> selectedFlightIds = new LinkedHashSet<>();

    for (int index = 0; index < segmentRequests.size(); index++) {
      BookingHoldRequest.SegmentRequest segmentRequest = segmentRequests.get(index);
      FlightFareInventoryEntity representativeInventory = segmentRequest.inventoryId() == null
          ? null
          : inventoryById.get(segmentRequest.inventoryId());
      if (segmentRequest.inventoryId() != null && representativeInventory == null) {
        throw new BadRequestException(INVENTORY_NOT_FOUND_MESSAGE);
      }

      Long resolvedFlightId = segmentRequest.flightId();
      if (representativeInventory != null) {
        Long flightIdFromInventory = representativeInventory.getFlight().getId();
        if (resolvedFlightId != null && !resolvedFlightId.equals(flightIdFromInventory)) {
          throw new BadRequestException(INVENTORY_NOT_FOUND_MESSAGE);
        }
        resolvedFlightId = flightIdFromInventory;
      }

      if (resolvedFlightId == null) {
        throw new BadRequestException(INVENTORY_NOT_FOUND_MESSAGE);
      }
      if (!selectedFlightIds.add(resolvedFlightId)) {
        throw new BadRequestException("Không được chọn trùng chặng bay trong cùng một đặt chỗ.");
      }

      Long flightId = resolvedFlightId;
      FlightEntity flight = representativeInventory == null
          ? inventoryById.values().stream()
              .map(FlightFareInventoryEntity::getFlight)
              .filter(Objects::nonNull)
              .filter(candidate -> flightId.equals(candidate.getId()))
              .findFirst()
              .orElseThrow(() -> new BadRequestException(INVENTORY_NOT_FOUND_MESSAGE))
          : representativeInventory.getFlight();

      if (!PublicFlightWindowPolicy.isPublicBookingOpen(flight, currentTime)) {
        throw new BadRequestException(PUBLIC_BOOKING_CLOSED_MESSAGE);
      }

      preparedTripSegments.add(new PreparedTripSegment(
          index,
          flightId,
          flight.getCode(),
          flight.getOriginAirport().getCityName(),
          flight.getDestinationAirport().getCityName(),
          flight.getOriginAirport().getCode(),
          flight.getDestinationAirport().getCode(),
          flight.getDepartureAt(),
          flight.getArrivalAt()
      ));
    }

    return List.copyOf(preparedTripSegments);
  }

  private List<PreparedSegment> buildPreparedSegments(
      Map<Long, Integer> passengerCountByInventoryId,
      Map<Long, FlightFareInventoryEntity> inventoryById,
      List<PreparedTripSegment> preparedTripSegments
  ) {
    Map<Long, PreparedTripSegment> tripSegmentByFlightId = preparedTripSegments.stream()
        .collect(Collectors.toMap(
            PreparedTripSegment::flightId,
            tripSegment -> tripSegment,
            (left, right) -> left,
            LinkedHashMap::new
        ));

    return passengerCountByInventoryId.entrySet().stream()
        .map(entry -> {
          FlightFareInventoryEntity inventory = inventoryById.get(entry.getKey());
          if (inventory == null) {
            throw new BadRequestException(INVENTORY_NOT_FOUND_MESSAGE);
          }

          int passengerCount = entry.getValue();
          if (inventory.getAvailableSeats() < passengerCount) {
            throw new BadRequestException(SOLD_OUT_MESSAGE);
          }

          PreparedTripSegment tripSegment = tripSegmentByFlightId.get(inventory.getFlight().getId());
          if (tripSegment == null) {
            throw new BadRequestException(INVENTORY_NOT_FOUND_MESSAGE);
          }

          return buildPreparedSegment(inventory, passengerCount, tripSegment.segmentIndex());
        })
        .sorted(Comparator
            .comparingInt(PreparedSegment::segmentIndex)
            .thenComparingInt(segment -> productCatalogService.requireFareMeta(segment.fareFamily()).rowStart()))
        .toList();
  }

  private PreparedSegment buildPreparedSegment(
      FlightFareInventoryEntity inventory,
      int passengerCount,
      int segmentIndex
  ) {
    FlightEntity flight = inventory.getFlight();
    ProductCatalogService.FareMeta fareMeta = productCatalogService.requireFareMeta(inventory.getFareFamily());
    long subtotalAmount = inventory.getPrice() * passengerCount;

    return new PreparedSegment(
        segmentIndex,
        inventory,
        flight.getCode(),
        flight.getOriginAirport().getCityName(),
        flight.getDestinationAirport().getCityName(),
        flight.getOriginAirport().getCode(),
        flight.getDestinationAirport().getCode(),
        flight.getDepartureAt(),
        flight.getArrivalAt(),
        inventory.getFareFamily(),
        fareMeta.title(),
        inventory.getPrice(),
        passengerCount,
        subtotalAmount
    );
  }

  private PreparedAncillary buildPreparedAncillary(BookingHoldRequest.AncillaryRequest ancillaryRequest) {
    ProductCatalogService.AncillaryMeta ancillaryMeta = productCatalogService.requireAncillary(ancillaryRequest.code());
    int quantity = ancillaryRequest.quantity() == null ? 1 : ancillaryRequest.quantity();

    if (quantity < 1 || quantity > 9) {
      throw new BadRequestException("S\u1ed1 l\u01b0\u1ee3ng d\u1ecbch v\u1ee5 b\u1ed5 tr\u1ee3 kh\u00f4ng h\u1ee3p l\u1ec7.");
    }

    return new PreparedAncillary(
        ancillaryMeta.code(),
        ancillaryMeta.name(),
        ancillaryMeta.description(),
        ancillaryMeta.price(),
        quantity,
        ancillaryMeta.price() * quantity
    );
  }

  private PreparedSeatSelectionContext buildPreparedSeatSelections(
      List<BookingHoldRequest.SeatSelectionRequest> seatSelectionRequests,
      Map<Long, FlightFareInventoryEntity> inventoryById,
      List<PreparedTripSegment> preparedTripSegments,
      List<BookingHoldRequest.PassengerRequest> passengers,
      OffsetDateTime currentTime
  ) {
    int passengerCount = passengers.size();
    int segmentCount = preparedTripSegments.size();
    int expectedSeatSelectionCount = passengerCount * segmentCount;
    if (seatSelectionRequests.size() != expectedSeatSelectionCount) {
      throw new BadRequestException(SEAT_SELECTION_MISMATCH_MESSAGE);
    }

    Map<Long, PreparedTripSegment> tripSegmentByFlightId = preparedTripSegments.stream()
        .collect(Collectors.toMap(
            PreparedTripSegment::flightId,
            tripSegment -> tripSegment,
            (left, right) -> left,
            LinkedHashMap::new
        ));
    Map<Long, Set<String>> occupiedSeatsByFlightId = new LinkedHashMap<>();
    Set<String> passengerSegmentKeys = new LinkedHashSet<>();
    Set<String> seatSegmentKeys = new LinkedHashSet<>();
    List<PreparedSeatSelection> preparedSeatSelections = new ArrayList<>();
    Map<Long, Integer> passengerCountByInventoryId = new LinkedHashMap<>();

    for (BookingHoldRequest.SeatSelectionRequest seatSelectionRequest : seatSelectionRequests) {
      FlightFareInventoryEntity inventory = inventoryById.get(seatSelectionRequest.inventoryId());
      if (inventory == null) {
        throw new BadRequestException(SEAT_SELECTION_INVALID_MESSAGE);
      }

      int passengerIndex = seatSelectionRequest.passengerIndex();
      if (passengerIndex < 0 || passengerIndex >= passengerCount) {
        throw new BadRequestException(SEAT_SELECTION_INVALID_MESSAGE);
      }

      long flightId = inventory.getFlight().getId();
      PreparedTripSegment tripSegment = resolveTripSegment(
          seatSelectionRequest.segmentIndex(),
          flightId,
          preparedTripSegments,
          tripSegmentByFlightId
      );
      String seatNumber = normalizeSeatNumber(seatSelectionRequest.seatNumber());
      String passengerSegmentKey = tripSegment.segmentIndex() + ":" + passengerIndex;
      String seatSegmentKey = flightId + ":" + seatNumber;

      if (!passengerSegmentKeys.add(passengerSegmentKey) || !seatSegmentKeys.add(seatSegmentKey)) {
        throw new BadRequestException(SEAT_SELECTION_DUPLICATE_MESSAGE);
      }
      if (!productCatalogService.isSeatNumberAllowed(inventory.getFareFamily(), seatNumber)) {
        throw new BadRequestException(SEAT_SELECTION_INVALID_MESSAGE);
      }

      Set<String> occupiedSeats = occupiedSeatsByFlightId.computeIfAbsent(
          flightId,
          ignored -> new LinkedHashSet<>(
              bookingSeatSelectionRepository.findOccupiedSeatNumbersByFlightId(flightId, currentTime)
          )
      );
      if (occupiedSeats.contains(seatNumber)) {
        throw new BadRequestException(SEAT_SELECTION_DUPLICATE_MESSAGE);
      }
      occupiedSeats.add(seatNumber);
      passengerCountByInventoryId.merge(seatSelectionRequest.inventoryId(), 1, Integer::sum);

      preparedSeatSelections.add(new PreparedSeatSelection(
          seatSelectionRequest.inventoryId(),
          passengerIndex,
          tripSegment.segmentIndex(),
          seatNumber,
          0L
      ));
    }

    return new PreparedSeatSelectionContext(
        List.copyOf(preparedSeatSelections),
        Map.copyOf(passengerCountByInventoryId)
    );
  }

  private PreparedTripSegment resolveTripSegment(
      Integer requestedSegmentIndex,
      long flightId,
      List<PreparedTripSegment> preparedTripSegments,
      Map<Long, PreparedTripSegment> tripSegmentByFlightId
  ) {
    if (requestedSegmentIndex != null) {
      if (requestedSegmentIndex < 0 || requestedSegmentIndex >= preparedTripSegments.size()) {
        throw new BadRequestException(SEAT_SELECTION_INVALID_MESSAGE);
      }

      PreparedTripSegment tripSegment = preparedTripSegments.get(requestedSegmentIndex);
      if (tripSegment.flightId() != flightId) {
        throw new BadRequestException(SEAT_SELECTION_INVALID_MESSAGE);
      }
      return tripSegment;
    }

    PreparedTripSegment tripSegment = tripSegmentByFlightId.get(flightId);
    if (tripSegment == null) {
      throw new BadRequestException(SEAT_SELECTION_INVALID_MESSAGE);
    }
    return tripSegment;
  }

  private BookingHoldResponse mapHoldResponse(BookingEntity booking) {
    List<BookingHoldResponse.PassengerResponse> passengers = booking.getPassengers().stream()
        .map(passenger -> new BookingHoldResponse.PassengerResponse(
            passenger.getFullName(),
            passenger.getPassengerType(),
            passenger.getDateOfBirth(),
            passenger.getDocumentType(),
            passenger.getDocumentNumber()
        ))
        .toList();

    List<BookingHoldResponse.SelectedSegmentResponse> selectedSegments = booking.getSegments().stream()
        .map(segment -> new BookingHoldResponse.SelectedSegmentResponse(
            segment.getInventory().getId(),
            segment.getFlightCode(),
            segment.getFromCity(),
            segment.getToCity(),
            segment.getOriginCode(),
            segment.getDestinationCode(),
            segment.getDepartureAt(),
            segment.getArrivalAt(),
            segment.getFareFamily(),
            segment.getFareTitle(),
            segment.getPricePerPassenger(),
            segment.getPassengerCount(),
            segment.getSubtotalAmount()
        ))
        .toList();

    List<BookingHoldResponse.SelectedAncillaryResponse> selectedAncillaries = booking.getAncillaries().stream()
        .map(ancillary -> new BookingHoldResponse.SelectedAncillaryResponse(
            ancillary.getCode(),
            ancillary.getName(),
            ancillary.getDescription(),
            ancillary.getUnitPrice(),
            ancillary.getQuantity(),
            ancillary.getSubtotalAmount()
        ))
        .toList();

    BookingContactEntity contact = booking.getContact();
    return new BookingHoldResponse(
        booking.getBookingCode(),
        mapBookingStatus(booking.getStatus()),
        booking.getExpiresAt(),
        booking.getCreatedAt(),
        booking.getTripType(),
        new BookingHoldResponse.ContactResponse(
            contact.getFullName(),
            contact.getEmail(),
            contact.getPhone()
        ),
        passengers,
        selectedSegments,
        selectedAncillaries,
        new BookingHoldResponse.PriceSummaryResponse(
            booking.getBaseAmount(),
            booking.getAncillaryAmount(),
            booking.getDiscountAmount(),
            booking.getTotalAmount(),
            booking.getCurrency(),
            booking.getAppliedVoucherCode()
        )
    );
  }

  private BookingOverviewResponse.BoardingPassItem mapBoardingPass(BoardingPassEntity boardingPass, TicketEntity ticket) {
    return new BookingOverviewResponse.BoardingPassItem(
        ticket.getSegment().getInventory().getId(),
        ticket.getTicketNumber(),
        ticket.getPassenger().getFullName(),
        boardingPass.getSeatNumber(),
        boardingPass.getGate(),
        boardingPass.getBoardingTime(),
        boardingPass.getBarcode()
    );
  }

  private List<TicketEntity> resolveRequestedRefundTickets(
      BookingEntity booking,
      RefundRequestCreateRequest request,
      boolean cancelledByOperations
  ) {
    Map<String, TicketEntity> ticketByNumber = booking.getTickets().stream()
        .collect(Collectors.toMap(
            ticket -> ticket.getTicketNumber().trim().toUpperCase(Locale.ROOT),
            ticket -> ticket,
            (left, right) -> left,
            LinkedHashMap::new
        ));

    if (request.ticketNumbers().isEmpty()) {
      return booking.getTickets().stream()
          .filter(ticket -> cancelledByOperations || !TicketEntity.STATUS_CANCELLED.equals(ticket.getStatus()))
          .toList();
    }

    LinkedHashSet<String> normalizedTicketNumbers = new LinkedHashSet<>();
    for (String ticketNumber : request.ticketNumbers()) {
      String normalizedTicketNumber = ticketNumber == null ? "" : ticketNumber.trim().toUpperCase(Locale.ROOT);
      if (normalizedTicketNumber.isBlank() || !normalizedTicketNumbers.add(normalizedTicketNumber)) {
        throw new BadRequestException(REFUND_TICKET_LIST_MESSAGE);
      }
    }

    List<TicketEntity> selectedTickets = new ArrayList<>();
    for (String ticketNumber : normalizedTicketNumbers) {
      TicketEntity ticket = ticketByNumber.get(ticketNumber);
      if (ticket == null) {
        throw new BadRequestException(REFUND_TICKET_NOT_FOUND_MESSAGE);
      }
      if (!cancelledByOperations && TicketEntity.STATUS_CANCELLED.equals(ticket.getStatus())) {
        throw new BadRequestException(REFUND_NOT_AVAILABLE_MESSAGE);
      }
      selectedTickets.add(ticket);
    }

    if (!cancelledByOperations && selectedTickets.stream()
        .map(this::resolveFlightScopeKey)
        .distinct()
        .count() > 1) {
      throw new BadRequestException(REFUND_MULTI_FLIGHT_MESSAGE);
    }

    return selectedTickets;
  }

  private long resolveRefundAmount(BookingEntity booking, List<TicketEntity> requestedTickets) {
    if (!booking.getTickets().isEmpty() && requestedTickets.size() == booking.getTickets().size()) {
      return booking.getTotalAmount();
    }

    long requestedBaseAmount = requestedTickets.stream()
        .mapToLong(this::resolveTicketBaseAmount)
        .sum();
    long requestedDiscountAmount = resolveRequestedTicketDiscountAmount(booking, requestedTickets);
    return Math.max(0L, requestedBaseAmount - requestedDiscountAmount);
  }

  private long resolveRequestedTicketDiscountAmount(BookingEntity booking, List<TicketEntity> requestedTickets) {
    long bookingBaseAmount = booking.getBaseAmount();
    long discountPool = Math.min(booking.getDiscountAmount(), bookingBaseAmount);
    if (bookingBaseAmount <= 0L || discountPool <= 0L) {
      return 0L;
    }

    List<TicketEntity> orderedTickets = booking.getTickets().stream().toList();
    Set<TicketEntity> requestedTicketSet = new LinkedHashSet<>(requestedTickets);
    long remainingBaseAmount = bookingBaseAmount;
    long remainingDiscount = discountPool;
    long requestedDiscountAmount = 0L;

    for (int index = 0; index < orderedTickets.size(); index++) {
      TicketEntity ticket = orderedTickets.get(index);
      long ticketBaseAmount = resolveTicketBaseAmount(ticket);
      long allocatedDiscount = index == orderedTickets.size() - 1 || remainingBaseAmount <= ticketBaseAmount
          ? Math.min(ticketBaseAmount, remainingDiscount)
          : Math.min(
              ticketBaseAmount,
              Math.floorDiv(ticketBaseAmount * remainingDiscount, remainingBaseAmount)
          );

      if (requestedTicketSet.contains(ticket)) {
        requestedDiscountAmount += allocatedDiscount;
      }

      remainingBaseAmount -= ticketBaseAmount;
      remainingDiscount -= allocatedDiscount;
    }

    return requestedDiscountAmount;
  }

  private long resolveTicketBaseAmount(TicketEntity ticket) {
    return ticket.getSegment().getPricePerPassenger();
  }

  private String resolveFlightScopeKey(TicketEntity ticket) {
    BookingSegmentEntity segment = ticket.getSegment();
    return segment.getFlightCode()
        + "|" + segment.getOriginCode()
        + "|" + segment.getDestinationCode()
        + "|" + segment.getDepartureAt();
  }

  private BookingOverviewResponse.SegmentItem mapSegment(BookingSegmentEntity segment) {
    FlightEntity flight = segment.getInventory().getFlight();
    String status = normalizeFlightStatus(flight == null ? null : flight.getStatus());
    return new BookingOverviewResponse.SegmentItem(
        segment.getInventory().getId(),
        segment.getFlightCode(),
        segment.getFromCity(),
        segment.getToCity(),
        segment.getOriginCode(),
        segment.getDestinationCode(),
        segment.getDepartureAt(),
        segment.getArrivalAt(),
        segment.getFareFamily(),
        segment.getFareTitle(),
        segment.getPricePerPassenger(),
        segment.getPassengerCount(),
        segment.getSubtotalAmount(),
        status,
        mapFlightStatusLabel(status),
        resolveFlightGate(flight),
        resolveFlightNote(flight)
    );
  }

  private String resolveFlightGate(FlightEntity flight) {
    if (flight == null) {
      return "Chờ cập nhật";
    }
    if (flight.getGate() != null && !flight.getGate().isBlank()) {
      return flight.getGate().trim().toUpperCase();
    }
    long flightId = flight.getId() == null ? 1L : flight.getId();
    return "G" + ((flightId % 8) + 1);
  }

  private String resolveFlightNote(FlightEntity flight) {
    if (flight == null) {
      return "Lịch bay đang được khai thác theo kế hoạch.";
    }
    if (flight.getOperationsNote() != null && !flight.getOperationsNote().isBlank()) {
      return flight.getOperationsNote().trim();
    }
    return switch (normalizeFlightStatus(flight.getStatus())) {
      case "boarding" -> "Hành khách nên có mặt tại cửa ra tàu.";
      case "delayed" -> "Vui lòng theo dõi thông báo mới trước khi ra cửa tàu.";
      case "cancelled" -> "Liên hệ hỗ trợ để được xử lý đổi hoặc hoàn vé.";
      case "departed" -> "Chuyến bay đã rời sân bay.";
      case "landed" -> "Chuyến bay đã hoàn tất.";
      default -> "Lịch bay đang được khai thác theo kế hoạch.";
    };
  }

  private String mapFlightStatusLabel(String status) {
    return switch (normalizeFlightStatus(status)) {
      case "on_time" -> "Đúng giờ";
      case "boarding" -> "Đang lên máy bay";
      case "delayed" -> "Trễ";
      case "departed" -> "Đã khởi hành";
      case "landed" -> "Đã hạ cánh";
      case "cancelled" -> "Đã hủy";
      default -> "Theo lịch";
    };
  }

  private String normalizeFlightStatus(String status) {
    if (status == null || status.isBlank()) {
      return "scheduled";
    }
    return status;
  }

  private List<String> buildSteps(BookingEntity booking) {
    List<String> steps = new ArrayList<>(List.of(
        "Ch\u1ecdn chuy\u1ebfn bay",
        "Nh\u1eadp th\u00f4ng tin h\u00e0nh kh\u00e1ch",
        "Gi\u1eef ch\u1ed7 th\u00e0nh c\u00f4ng"
    ));

    if (booking.isHold()) {
      steps.add("Ch\u1edd thanh to\u00e1n");
      return steps;
    }

    if (BookingEntity.STATUS_CANCELLED.equals(booking.getStatus())) {
      steps.add("Gi\u1eef ch\u1ed7 \u0111\u00e3 h\u1ebft h\u1ea1n ho\u1eb7c b\u1ecb h\u1ee7y");
      return steps;
    }

    steps.add("Thanh to\u00e1n th\u00e0nh c\u00f4ng");
    steps.add("Xu\u1ea5t v\u00e9 th\u00e0nh c\u00f4ng");

    if (booking.getTickets().stream().anyMatch(ticket -> TicketEntity.STATUS_CHECKED_IN.equals(ticket.getStatus()))) {
      steps.add("Ho\u00e0n t\u1ea5t l\u00e0m th\u1ee7 t\u1ee5c tr\u1ef1c tuy\u1ebfn");
    }

    if (booking.isRefundPending()) {
      steps.add("\u0110ang ch\u1edd duy\u1ec7t ho\u00e0n v\u00e9");
    }

    return steps;
  }

  private void validateRequestShape(String tripType, BookingHoldRequest request) {
    if ("one_way".equals(tripType) && request.segments().size() != 1) {
      throw new BadRequestException("H\u00e0nh tr\u00ecnh m\u1ed9t chi\u1ec1u ch\u1ec9 \u0111\u01b0\u1ee3c ch\u1ecdn 1 ch\u1eb7ng.");
    }

    if ("round_trip".equals(tripType) && request.segments().size() != 2) {
      throw new BadRequestException("H\u00e0nh tr\u00ecnh kh\u1ee9 h\u1ed3i c\u1ea7n ch\u1ecdn \u0111\u1ee7 chi\u1ec1u \u0111i v\u00e0 chi\u1ec1u v\u1ec1.");
    }

    long adultCount = request.passengers().stream()
        .map(BookingHoldRequest.PassengerRequest::passengerType)
        .map(this::normalizePassengerType)
        .filter("adult"::equals)
        .count();

    long infantCount = request.passengers().stream()
        .map(BookingHoldRequest.PassengerRequest::passengerType)
        .map(this::normalizePassengerType)
        .filter("infant"::equals)
        .count();

    if (adultCount < 1) {
      throw new BadRequestException("Ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t 1 ng\u01b0\u1eddi l\u1edbn trong \u0111\u1eb7t ch\u1ed7.");
    }

    if (infantCount > adultCount) {
      throw new BadRequestException("S\u1ed1 l\u01b0\u1ee3ng em b\u00e9 kh\u00f4ng \u0111\u01b0\u1ee3c v\u01b0\u1ee3t qu\u00e1 s\u1ed1 ng\u01b0\u1eddi l\u1edbn.");
    }

    request.passengers().forEach(passengerRequest -> {
      if (passengerRequest.dateOfBirth().isAfter(LocalDate.now())) {
        throw new BadRequestException("Ng\u00e0y sinh h\u00e0nh kh\u00e1ch kh\u00f4ng h\u1ee3p l\u1ec7.");
      }
    });

    boolean containsSeatPlus = request.ancillaries().stream()
        .anyMatch(ancillary -> "SEAT_PLUS".equals(productCatalogService.normalizeAncillaryCode(ancillary.code())));
    if (containsSeatPlus) {
      throw new BadRequestException("Ghế ưu tiên không còn được bán riêng trong luồng đặt vé này.");
    }

    int seatSelectionCount = request.seatSelections().size();
    int expectedSeatSelectionCount = request.passengers().size() * request.segments().size();
    if (seatSelectionCount != expectedSeatSelectionCount) {
      throw new BadRequestException(SEAT_SELECTION_MISMATCH_MESSAGE);
    }
  }

  private void validatePassengerAges(
      List<BookingHoldRequest.PassengerRequest> passengers,
      List<PreparedTripSegment> preparedTripSegments
  ) {
    if (preparedTripSegments.isEmpty()) {
      return;
    }

    LocalDate departureDate = preparedTripSegments.stream()
        .map(PreparedTripSegment::departureAt)
        .min(Comparator.naturalOrder())
        .orElseThrow()
        .toLocalDate();

    passengers.forEach(passengerRequest -> {
      String passengerType = normalizePassengerType(passengerRequest.passengerType());
      if (!BookingBusinessPolicy.dungNhomHanhKhachTheoNgayKhoiHanh(
          passengerType,
          passengerRequest.dateOfBirth(),
          departureDate
      )) {
        throw new BadRequestException(resolvePassengerAgeMismatchMessage(passengerType));
      }
    });
  }

  private String resolvePassengerAgeMismatchMessage(String passengerType) {
    return switch (passengerType) {
      case "adult" -> ADULT_AGE_MISMATCH_MESSAGE;
      case "child" -> CHILD_AGE_MISMATCH_MESSAGE;
      case "infant" -> INFANT_AGE_MISMATCH_MESSAGE;
      default -> "Lo\u1ea1i h\u00e0nh kh\u00e1ch kh\u00f4ng h\u1ee3p l\u1ec7.";
    };
  }

  private String normalizeTripType(String tripType) {
    if (tripType == null || tripType.isBlank()) {
      throw new BadRequestException("Lo\u1ea1i h\u00e0nh tr\u00ecnh kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng.");
    }

    String normalizedTripType = tripType.trim().toLowerCase();
    if (!SUPPORTED_TRIP_TYPES.contains(normalizedTripType)) {
      throw new BadRequestException("Lo\u1ea1i h\u00e0nh tr\u00ecnh kh\u00f4ng h\u1ee3p l\u1ec7.");
    }
    return normalizedTripType;
  }

  private String normalizePassengerType(String passengerType) {
    if (passengerType == null || passengerType.isBlank()) {
      throw new BadRequestException("Lo\u1ea1i h\u00e0nh kh\u00e1ch kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng.");
    }

    String normalizedPassengerType = passengerType.trim().toLowerCase();
    if (!SUPPORTED_PASSENGER_TYPES.contains(normalizedPassengerType)) {
      throw new BadRequestException("Lo\u1ea1i h\u00e0nh kh\u00e1ch kh\u00f4ng h\u1ee3p l\u1ec7.");
    }
    return normalizedPassengerType;
  }

  private String normalizeSeatNumber(String seatNumber) {
    if (seatNumber == null) {
      throw new BadRequestException(SEAT_SELECTION_INVALID_MESSAGE);
    }

    String normalizedSeatNumber = seatNumber.trim().toUpperCase();
    if (!normalizedSeatNumber.matches("^[1-9][0-9]?[A-F]$")) {
      throw new BadRequestException(SEAT_SELECTION_INVALID_MESSAGE);
    }
    return normalizedSeatNumber;
  }

  private String normalizeBookingCode(String bookingCode, String notFoundMessage) {
    if (bookingCode == null || bookingCode.isBlank()) {
      throw new NotFoundException(notFoundMessage);
    }
    return bookingCode.trim().toUpperCase();
  }

  private String generateUniqueBookingCode() {
    for (int attempt = 0; attempt < 20; attempt++) {
      String bookingCode = randomAlphaNumericCode(6);
      if (!bookingRepository.existsByBookingCodeIgnoreCase(bookingCode)) {
        return bookingCode;
      }
    }
    throw new IllegalStateException("Kh\u00f4ng th\u1ec3 t\u1ea1o m\u00e3 \u0111\u1eb7t ch\u1ed7 m\u1edbi v\u00e0o l\u00fac n\u00e0y.");
  }
  private String randomAlphaNumericCode(int length) {
    StringBuilder builder = new StringBuilder(length);
    for (int index = 0; index < length; index++) {
      builder.append(BOOKING_CODE_ALPHABET[secureRandom.nextInt(BOOKING_CODE_ALPHABET.length)]);
    }
    return builder.toString();
  }

  private String randomNumericCode(int length) {
    StringBuilder builder = new StringBuilder(length);
    for (int index = 0; index < length; index++) {
      builder.append(secureRandom.nextInt(10));
    }
    return builder.toString();
  }

  private record PreparedSegment(
      int segmentIndex,
      FlightFareInventoryEntity inventory,
      String code,
      String fromCity,
      String toCity,
      String originCode,
      String destinationCode,
      OffsetDateTime departureAt,
      OffsetDateTime arrivalAt,
      String fareFamily,
      String fareTitle,
      long pricePerPassenger,
      int passengerCount,
      long subtotalAmount
  ) {
  }

  private record PreparedAncillary(
      String code,
      String name,
      String description,
      long unitPrice,
      int quantity,
      long subtotalAmount
  ) {
  }

  private record PreparedSeatSelection(
      long inventoryId,
      int passengerIndex,
      int segmentIndex,
      String seatNumber,
      long unitPrice
  ) {
  }

  private record PreparedTripSegment(
      int segmentIndex,
      long flightId,
      String code,
      String fromCity,
      String toCity,
      String originCode,
      String destinationCode,
      OffsetDateTime departureAt,
      OffsetDateTime arrivalAt
  ) {
  }

  private record PreparedSeatSelectionContext(
      List<PreparedSeatSelection> selections,
      Map<Long, Integer> passengerCountByInventoryId
  ) {
  }
}




