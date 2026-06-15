package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.BackofficeFlightCreateRequest;
import com.qlvmb.airticket.domain.dto.BackofficeFlightOperationUpdateRequest;
import com.qlvmb.airticket.domain.dto.BackofficeFlightOperationsResponse;
import com.qlvmb.airticket.domain.dto.RefundRequestCreateRequest;
import com.qlvmb.airticket.domain.entity.AirportEntity;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.domain.entity.FlightFareInventoryEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.AirportRepository;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.FlightRepository;
import com.qlvmb.airticket.repository.MemberVoucherRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BackofficeOperationsService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final int DEFAULT_LOOKAHEAD_DAYS = 30;
  private static final int DEFAULT_LIMIT = 50;

  private final FlightRepository flightRepository;
  private final AirportRepository airportRepository;
  private final BookingRepository bookingRepository;
  private final MemberVoucherRepository memberVoucherRepository;
  private final UserAccountRepository userAccountRepository;
  private final AuditLogRepository auditLogRepository;
  private final ProductCatalogService productCatalogService;
  private final NotificationOutboxService notificationOutboxService;
  private final BookingService bookingService;

  public BackofficeOperationsService(
      FlightRepository flightRepository,
      AirportRepository airportRepository,
      BookingRepository bookingRepository,
      MemberVoucherRepository memberVoucherRepository,
      UserAccountRepository userAccountRepository,
      AuditLogRepository auditLogRepository,
      ProductCatalogService productCatalogService,
      NotificationOutboxService notificationOutboxService,
      BookingService bookingService
  ) {
    this.flightRepository = flightRepository;
    this.airportRepository = airportRepository;
    this.bookingRepository = bookingRepository;
    this.memberVoucherRepository = memberVoucherRepository;
    this.userAccountRepository = userAccountRepository;
    this.auditLogRepository = auditLogRepository;
    this.productCatalogService = productCatalogService;
    this.notificationOutboxService = notificationOutboxService;
    this.bookingService = bookingService;
  }

  @Transactional(readOnly = true)
  public BackofficeFlightOperationsResponse getFlights(String code, LocalDate date) {
    String normalizedCode = code == null ? "" : code.trim().toUpperCase(Locale.ROOT);

    if (!normalizedCode.isBlank()) {
      FlightEntity flight = flightRepository.findStatusByCode(normalizedCode)
          .orElseThrow(() -> new NotFoundException("Không tìm thấy chuyến bay theo mã đã nhập."));

      if (date != null && !flight.getDepartureAt().atZoneSameInstant(ZONE_ID).toLocalDate().equals(date)) {
        return new BackofficeFlightOperationsResponse(normalizedCode, date.toString(), List.of());
      }

      return new BackofficeFlightOperationsResponse(
          normalizedCode,
          date == null ? null : date.toString(),
          List.of(mapFlight(flight))
      );
    }

    OffsetDateTime start = date == null
        ? OffsetDateTime.now(ZONE_ID).minusHours(2)
        : date.atStartOfDay(ZONE_ID).toOffsetDateTime();
    OffsetDateTime end = date == null
        ? start.plusDays(DEFAULT_LOOKAHEAD_DAYS)
        : date.plusDays(1).atStartOfDay(ZONE_ID).toOffsetDateTime();

    List<BackofficeFlightOperationsResponse.FlightItem> flights = flightRepository
        .findStatusesByDepartureWindow(start, end)
        .stream()
        .limit(DEFAULT_LIMIT)
        .map(this::mapFlight)
        .toList();

    return new BackofficeFlightOperationsResponse(null, date == null ? null : date.toString(), flights);
  }

  @Transactional
  public BackofficeFlightOperationsResponse.FlightItem createFlight(
      AuthenticatedUser actor,
      BackofficeFlightCreateRequest request
  ) {
    UserAccountEntity actorAccount = loadActorAccount(actor);
    String normalizedCode = normalizeFlightCode(request.code());
    String normalizedOriginCode = normalizeAirportCode(request.originCode());
    String normalizedDestinationCode = normalizeAirportCode(request.destinationCode());
    String normalizedGate = normalizeOptional(request.gate());
    String normalizedNote = normalizeOptional(request.note());

    if (flightRepository.existsByCodeIgnoreCase(normalizedCode)) {
      throw new BadRequestException("Mã chuyến bay đã tồn tại, vui lòng dùng mã khác.");
    }

    if (normalizedOriginCode.equals(normalizedDestinationCode)) {
      throw new BadRequestException("Sân bay đi và đến không được trùng nhau.");
    }

    if (!request.arrivalAt().isAfter(request.departureAt())) {
      throw new BadRequestException("Giờ hạ cánh phải sau giờ cất cánh.");
    }

    AirportEntity originAirport = airportRepository.findByCodeIgnoreCase(normalizedOriginCode)
        .orElseThrow(() -> new BadRequestException("Không tìm thấy sân bay đi theo mã đã nhập."));
    AirportEntity destinationAirport = airportRepository.findByCodeIgnoreCase(normalizedDestinationCode)
        .orElseThrow(() -> new BadRequestException("Không tìm thấy sân bay đến theo mã đã nhập."));

    FlightEntity flight = FlightEntity.create(
        normalizedCode,
        originAirport,
        destinationAirport,
        request.departureAt(),
        request.arrivalAt(),
        normalizedGate,
        normalizedNote,
        request.salesOpen()
    );
    syncFixedFareInventories(flight, request.baseFare());

    FlightEntity savedFlight = flightRepository.save(flight);
    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        "operations.flight.create",
        "flight",
        savedFlight.getCode(),
        "Tạo chuyến bay " + savedFlight.getCode() + " từ " + normalizedOriginCode + " đến "
            + normalizedDestinationCode + ", cất cánh " + savedFlight.getDepartureAt()
            + ", giá gốc " + request.baseFare(),
        OffsetDateTime.now()
    ));

    return mapFlight(savedFlight);
  }

  @Transactional
  public BackofficeFlightOperationsResponse.FlightItem updateFlight(
      AuthenticatedUser actor,
      Long flightId,
      BackofficeFlightOperationUpdateRequest request
  ) {
    FlightEntity flight = flightRepository.findDetailedById(flightId)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy chuyến bay cần cập nhật."));
    UserAccountEntity actorAccount = loadActorAccount(actor);

    String nextStatus = request.status().trim().toLowerCase(Locale.ROOT);
    String nextGate = normalizeOptional(request.gate());
    String nextNote = normalizeOptional(request.note());
    boolean nextSalesOpen = request.salesOpen();
    Long nextBaseFare = request.baseFare();
    String oldStatus = flight.getStatus();
    String oldGate = flight.getGate();
    String oldNote = flight.getOperationsNote();
    boolean oldSalesOpen = flight.isSalesOpen();
    long oldBaseFare = resolveBaseFareSafely(flight);

    if (!flight.isCancelled() && "cancelled".equals(nextStatus)) {
      throw new BadRequestException("Vui lòng dùng thao tác hủy chuyến riêng để đảm bảo đồng bộ booking và email.");
    }

    if (flight.isCancelled()) {
      if (!"cancelled".equals(nextStatus)) {
        throw new BadRequestException("Chuyến bay đã hủy chỉ có thể cập nhật lại ghi chú hoặc cổng phục vụ.");
      }
      if (nextSalesOpen) {
        throw new BadRequestException("Chuyến bay đã hủy không thể mở bán trở lại từ màn hình này.");
      }
      if (nextBaseFare != null) {
        throw new BadRequestException("Chuyến bay đã hủy không thể điều chỉnh giá gốc.");
      }
      nextSalesOpen = false;
    }

    flight.updateOperations(nextStatus, nextGate, nextNote, nextSalesOpen);
    if (nextBaseFare != null) {
      syncFixedFareInventories(flight, nextBaseFare);
    }

    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        "operations.flight.update",
        "flight",
        flight.getId().toString(),
        "Cập nhật chuyến bay " + flight.getCode()
            + " từ trạng thái " + oldStatus + " sang " + nextStatus
            + ", gate " + stringifyValue(oldGate) + " sang " + stringifyValue(nextGate)
            + ", ghi chú " + stringifyValue(oldNote) + " sang " + stringifyValue(nextNote)
            + ", mở bán " + oldSalesOpen + " sang " + nextSalesOpen
            + ", giá gốc " + oldBaseFare + " sang " + (nextBaseFare == null ? oldBaseFare : nextBaseFare),
        OffsetDateTime.now()
    ));

    return mapFlight(flight);
  }

  @Transactional
  public BackofficeFlightOperationsResponse.FlightItem cancelFlight(AuthenticatedUser actor, Long flightId) {
    FlightEntity flight = flightRepository.findDetailedIncludingHiddenById(flightId)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy chuyến bay cần hủy."));
    UserAccountEntity actorAccount = loadActorAccount(actor);

    if (flight.isHiddenFromUi()) {
      throw new NotFoundException("Không tìm thấy chuyến bay cần hủy.");
    }

    if (flight.isCancelled()) {
      return mapFlight(flight);
    }

    OffsetDateTime currentTime = OffsetDateTime.now();
    String cancellationNote = normalizeOptional(flight.getOperationsNote());
    if (cancellationNote == null) {
      cancellationNote = defaultStatusNote("cancelled");
    }

    flight.markCancelled(cancellationNote, currentTime);
    List<BookingEntity> affectedBookings = bookingRepository.findAllDetailedByFlightId(flightId);
    for (BookingEntity booking : affectedBookings) {
      cancelAffectedBooking(booking, flight, currentTime, cancellationNote);
    }

    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        "operations.flight.cancel",
        "flight",
        flight.getCode(),
        "Hủy chuyến bay " + flight.getCode() + " và đồng bộ booking, vé, email thông báo liên quan.",
        currentTime
    ));

    return mapFlight(flight);
  }

  @Transactional
  public void hideCancelledFlight(AuthenticatedUser actor, Long flightId) {
    FlightEntity flight = flightRepository.findDetailedIncludingHiddenById(flightId)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy chuyến bay cần ẩn."));
    UserAccountEntity actorAccount = loadActorAccount(actor);

    if (!flight.isCancelled()) {
      throw new BadRequestException("Chỉ có thể ẩn chuyến bay đã hủy khỏi giao diện vận hành.");
    }

    if (flight.isHiddenFromUi()) {
      return;
    }

    OffsetDateTime currentTime = OffsetDateTime.now();
    flight.hideFromUi(currentTime);

    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        "operations.flight.hide",
        "flight",
        flight.getCode(),
        "Ẩn chuyến bay đã hủy " + flight.getCode() + " khỏi giao diện công khai và giao diện vận hành.",
        currentTime
    ));
  }

  private void cancelAffectedBooking(
      BookingEntity booking,
      FlightEntity flight,
      OffsetDateTime currentTime,
      String cancellationNote
  ) {
    if (booking.isCancelled()) {
      return;
    }

    releaseSeatsForBooking(booking);

    if (booking.isHold()) {
      releaseReservedVoucherIfNeeded(booking, currentTime);
      booking.markExpired(currentTime);
    } else {
      booking.markCancelled(currentTime);
      for (TicketEntity ticket : booking.getTickets()) {
        if (!TicketEntity.STATUS_CANCELLED.equals(ticket.getStatus())) {
          ticket.markCancelled(currentTime);
        }
      }
      createAutomaticRefundRequestIfEligible(booking, flight);
    }

    notificationOutboxService.createAndSendFlightCancellationEmail(booking, flight, cancellationNote);
  }

  private void createAutomaticRefundRequestIfEligible(BookingEntity booking, FlightEntity cancelledFlight) {
    if (!BookingEntity.PAYMENT_STATUS_PAID.equals(booking.getPaymentStatus())) {
      return;
    }

    boolean hasPendingRefund = booking.getRefundRequests().stream().anyMatch(refundRequest -> refundRequest.isPending());
    if (hasPendingRefund || booking.isRefundPending()) {
      return;
    }

    List<String> affectedTicketNumbers = booking.getTickets().stream()
        .filter(ticket -> belongsToCancelledFlight(ticket, cancelledFlight))
        .map(TicketEntity::getTicketNumber)
        .toList();
    if (affectedTicketNumbers.isEmpty()) {
      return;
    }

    bookingService.requestRefund(
        booking.getBookingCode(),
        new RefundRequestCreateRequest(
            "Chuyen bay " + cancelledFlight.getCode() + " da bi huy boi dieu hanh.",
            affectedTicketNumbers
        )
    );
  }

  private boolean belongsToCancelledFlight(TicketEntity ticket, FlightEntity cancelledFlight) {
    BookingSegmentEntity segment = ticket.getSegment();
    if (segment == null || segment.getInventory() == null || segment.getInventory().getFlight() == null) {
      return false;
    }

    return cancelledFlight.getId().equals(segment.getInventory().getFlight().getId());
  }

  private void releaseSeatsForBooking(BookingEntity booking) {
    for (BookingSegmentEntity segment : booking.getSegments()) {
      segment.getInventory().releaseSeats(segment.getPassengerCount());
    }
  }

  private void releaseReservedVoucherIfNeeded(BookingEntity booking, OffsetDateTime currentTime) {
    String appliedVoucherCode = booking.getAppliedVoucherCode();
    if (appliedVoucherCode == null || appliedVoucherCode.isBlank()) {
      return;
    }

    memberVoucherRepository.findByVoucherCodeIgnoreCase(appliedVoucherCode)
        .filter(voucher -> voucher.isReservedForBooking(booking.getBookingCode()))
        .ifPresent(voucher -> {
          voucher.releaseReservation(currentTime);
          booking.clearAppliedVoucher(currentTime);
        });
  }

  private UserAccountEntity loadActorAccount(AuthenticatedUser actor) {
    return userAccountRepository.findOneWithRolesById(actor.userId())
        .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản nội bộ đang thao tác."));
  }

  private BackofficeFlightOperationsResponse.FlightItem mapFlight(FlightEntity flight) {
    long baseFare = resolveBaseFareSafely(flight);
    return new BackofficeFlightOperationsResponse.FlightItem(
        flight.getId(),
        flight.getCode(),
        flight.getOriginAirport().getCityName(),
        flight.getDestinationAirport().getCityName(),
        flight.getOriginAirport().getCode(),
        flight.getDestinationAirport().getCode(),
        flight.getDepartureAt(),
        flight.getArrivalAt(),
        flight.getStatus(),
        statusLabel(flight.getStatus()),
        resolveGate(flight),
        resolveNote(flight),
        flight.isSalesOpen(),
        baseFare,
        buildFareSummaries(baseFare)
    );
  }

  private void syncFixedFareInventories(FlightEntity flight, long baseFare) {
    productCatalogService.getFixedFareMetas().forEach(fareMeta -> {
      long price = productCatalogService.resolveFarePrice(fareMeta.fareFamily(), baseFare);
      flight.findFareInventory(fareMeta.fareFamily())
          .ifPresentOrElse(
              inventory -> inventory.syncConfiguration(fareMeta.totalSeats(), price),
              () -> flight.addFareInventory(FlightFareInventoryEntity.create(
                  flight,
                  fareMeta.fareFamily(),
                  fareMeta.totalSeats(),
                  price
              ))
          );
    });
  }

  private long resolveBaseFareSafely(FlightEntity flight) {
    return productCatalogService.resolveBaseFare(flight.getFareInventories());
  }

  private List<BackofficeFlightOperationsResponse.FareReadonlyItem> buildFareSummaries(long baseFare) {
    return productCatalogService.getFixedFareMetas().stream()
        .map(fareMeta -> new BackofficeFlightOperationsResponse.FareReadonlyItem(
            fareMeta.fareFamily(),
            fareMeta.title(),
            productCatalogService.resolveFarePrice(fareMeta.fareFamily(), baseFare),
            fareMeta.totalSeats(),
            fareMeta.rowStart(),
            fareMeta.rowEnd()
        ))
        .toList();
  }

  private String resolveGate(FlightEntity flight) {
    String gate = normalizeOptional(flight.getGate());
    if (gate != null) {
      return gate.toUpperCase(Locale.ROOT);
    }
    long flightId = flight.getId() == null ? 1L : flight.getId();
    return "G" + ((flightId % 8) + 1);
  }

  private String resolveNote(FlightEntity flight) {
    String operationsNote = normalizeOptional(flight.getOperationsNote());
    return operationsNote != null ? operationsNote : defaultStatusNote(flight.getStatus());
  }

  private String statusLabel(String status) {
    return switch (status) {
      case "on_time" -> "Đúng giờ";
      case "boarding" -> "Đang lên máy bay";
      case "delayed" -> "Trễ";
      case "departed" -> "Đã khởi hành";
      case "landed" -> "Đã hạ cánh";
      case "cancelled" -> "Đã hủy";
      default -> "Theo lịch";
    };
  }

  private String defaultStatusNote(String status) {
    return switch (status) {
      case "boarding" -> "Hành khách nên có mặt tại cửa ra tàu.";
      case "delayed" -> "Vui lòng theo dõi thông báo mới trước khi ra cửa tàu.";
      case "cancelled" -> "Liên hệ hỗ trợ để được xử lý đổi hoặc hoàn vé.";
      case "departed" -> "Chuyến bay đã rời sân bay.";
      case "landed" -> "Chuyến bay đã hoàn tất.";
      default -> "Lịch bay đang được khai thác theo kế hoạch.";
    };
  }

  private String normalizeOptional(String value) {
    if (value == null) {
      return null;
    }
    String normalizedValue = value.trim();
    return normalizedValue.isEmpty() ? null : normalizedValue;
  }

  private String normalizeFlightCode(String value) {
    String normalizedValue = normalizeOptional(value);
    if (normalizedValue == null) {
      throw new BadRequestException("Mã chuyến bay không được để trống.");
    }
    return normalizedValue.toUpperCase(Locale.ROOT);
  }

  private String normalizeAirportCode(String value) {
    String normalizedValue = normalizeOptional(value);
    if (normalizedValue == null) {
      throw new BadRequestException("Mã sân bay không được để trống.");
    }
    return normalizedValue.toUpperCase(Locale.ROOT);
  }

  private String stringifyValue(String value) {
    return value == null || value.isBlank() ? "trống" : value;
  }
}
