package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.FlightStatusResponse;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.FlightRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FlightStatusService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
  private static final int DEFAULT_LOOKAHEAD_DAYS = 30;
  private static final int DEFAULT_LIMIT = 20;

  private final FlightRepository flightRepository;

  public FlightStatusService(FlightRepository flightRepository) {
    this.flightRepository = flightRepository;
  }

  @Transactional(readOnly = true)
  public FlightStatusResponse getFlightStatus(String code, LocalDate date) {
    String normalizedCode = code == null ? "" : code.trim().toUpperCase();

    if (!normalizedCode.isBlank()) {
      FlightEntity flight = flightRepository.findStatusByCode(normalizedCode)
          .orElseThrow(() -> new NotFoundException("Không tìm thấy chuyến bay theo mã đã nhập."));

      if (date != null && !flight.getDepartureAt().atZoneSameInstant(ZONE_ID).toLocalDate().equals(date)) {
        return new FlightStatusResponse(normalizedCode, date.toString(), List.of());
      }

      return new FlightStatusResponse(
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

    List<FlightStatusResponse.FlightStatusItem> flights = flightRepository
        .findStatusesByDepartureWindow(start, end)
        .stream()
        .limit(DEFAULT_LIMIT)
        .map(this::mapFlight)
        .toList();

    return new FlightStatusResponse(null, date == null ? null : date.toString(), flights);
  }

  private FlightStatusResponse.FlightStatusItem mapFlight(FlightEntity flight) {
    OffsetDateTime departureAt = flight.getDepartureAt().atZoneSameInstant(ZONE_ID).toOffsetDateTime();
    OffsetDateTime arrivalAt = flight.getArrivalAt().atZoneSameInstant(ZONE_ID).toOffsetDateTime();

    return new FlightStatusResponse.FlightStatusItem(
        flight.getId(),
        flight.getCode(),
        flight.getOriginAirport().getCityName(),
        flight.getDestinationAirport().getCityName(),
        flight.getOriginAirport().getCode(),
        flight.getDestinationAirport().getCode(),
        departureAt,
        arrivalAt,
        departureAt.format(TIME_FORMATTER),
        arrivalAt.format(TIME_FORMATTER),
        flight.getStatus(),
        statusLabel(flight.getStatus()),
        resolveGate(flight),
        resolveNote(flight)
    );
  }

  private String resolveGate(FlightEntity flight) {
    if (flight.getGate() != null && !flight.getGate().isBlank()) {
      return flight.getGate().trim().toUpperCase();
    }
    long flightId = flight.getId() == null ? 1L : flight.getId();
    return "G" + ((flightId % 8) + 1);
  }

  private String resolveNote(FlightEntity flight) {
    if (flight.getOperationsNote() != null && !flight.getOperationsNote().isBlank()) {
      return flight.getOperationsNote().trim();
    }
    return defaultStatusNote(flight.getStatus());
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
}
