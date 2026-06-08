package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.entity.FlightEntity;
import java.time.OffsetDateTime;
import java.time.ZoneId;

final class PublicFlightWindowPolicy {

  static final ZoneId PUBLIC_ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
  static final int PUBLIC_BOOKING_CUTOFF_MINUTES = 30;

  private PublicFlightWindowPolicy() {
  }

  static OffsetDateTime currentTime() {
    return OffsetDateTime.now(PUBLIC_ZONE_ID);
  }

  static boolean isPublicBookingOpen(FlightEntity flight, OffsetDateTime currentTime) {
    return flight != null
        && flight.isSalesOpen()
        && !flight.isCancelled()
        && isVisibleOnPublicSurfaces(flight, currentTime);
  }

  static boolean isVisibleOnPublicSurfaces(FlightEntity flight, OffsetDateTime currentTime) {
    return flight != null && !isPastPublicCutoff(flight.getDepartureAt(), currentTime);
  }

  static boolean isPastPublicCutoff(OffsetDateTime departureAt, OffsetDateTime currentTime) {
    if (departureAt == null) {
      return true;
    }

    return !departureAt.isAfter(currentTime.plusMinutes(PUBLIC_BOOKING_CUTOFF_MINUTES));
  }
}
