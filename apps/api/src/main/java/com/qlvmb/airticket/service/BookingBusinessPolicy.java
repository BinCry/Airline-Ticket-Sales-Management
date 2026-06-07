package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.FlightEntity;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Period;
import java.util.Locale;
import java.util.Set;

final class BookingBusinessPolicy {

  private static final Set<String> REFUND_BLOCKING_STATUSES = Set.of("boarding", "departed", "landed");
  private static final Set<String> CHECKIN_BLOCKING_STATUSES =
      Set.of("boarding", "departed", "landed", "cancelled");

  private BookingBusinessPolicy() {
  }

  static boolean coTheTuPhucVuHoanVe(
      Iterable<BookingSegmentEntity> segments,
      OffsetDateTime currentTime
  ) {
    return coTatCaPhanDoanHopLe(segments, currentTime, REFUND_BLOCKING_STATUSES);
  }

  static boolean coTheTuPhucVuLamThuTuc(
      Iterable<BookingSegmentEntity> segments,
      OffsetDateTime currentTime
  ) {
    return coTatCaPhanDoanHopLe(segments, currentTime, CHECKIN_BLOCKING_STATUSES);
  }

  static boolean coPhanDoanBiHuy(Iterable<BookingSegmentEntity> segments) {
    for (BookingSegmentEntity segment : segments) {
      if ("cancelled".equals(layTrangThaiChuyenBay(segment))) {
        return true;
      }
    }
    return false;
  }

  static boolean dungNhomHanhKhachTheoNgayKhoiHanh(
      String passengerType,
      LocalDate dateOfBirth,
      LocalDate departureDate
  ) {
    if (passengerType == null || dateOfBirth == null || departureDate == null) {
      return false;
    }

    if (dateOfBirth.isAfter(departureDate)) {
      return false;
    }

    int age = Period.between(dateOfBirth, departureDate).getYears();
    String normalizedPassengerType = passengerType.trim().toLowerCase(Locale.ROOT);

    return switch (normalizedPassengerType) {
      case "adult" -> age >= 12;
      case "child" -> age >= 2 && age < 12;
      case "infant" -> age < 2;
      default -> false;
    };
  }

  private static boolean coTatCaPhanDoanHopLe(
      Iterable<BookingSegmentEntity> segments,
      OffsetDateTime currentTime,
      Set<String> blockingStatuses
  ) {
    boolean coPhanDoan = false;
    for (BookingSegmentEntity segment : segments) {
      coPhanDoan = true;
      if (biChanTuPhucVu(segment, currentTime, blockingStatuses)) {
        return false;
      }
    }
    return coPhanDoan;
  }

  private static boolean biChanTuPhucVu(
      BookingSegmentEntity segment,
      OffsetDateTime currentTime,
      Set<String> blockingStatuses
  ) {
    if (segment.getDepartureAt() != null && !segment.getDepartureAt().isAfter(currentTime)) {
      return true;
    }

    String flightStatus = layTrangThaiChuyenBay(segment);
    return flightStatus != null && blockingStatuses.contains(flightStatus);
  }

  private static String layTrangThaiChuyenBay(BookingSegmentEntity segment) {
    if (segment == null || segment.getInventory() == null) {
      return null;
    }

    FlightEntity flight = segment.getInventory().getFlight();
    if (flight == null || flight.getStatus() == null || flight.getStatus().isBlank()) {
      return null;
    }

    return flight.getStatus().trim().toLowerCase(Locale.ROOT);
  }
}
