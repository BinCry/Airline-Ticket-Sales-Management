package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record FlightStatusResponse(
    String queryCode,
    String queryDate,
    List<FlightStatusItem> flights
) {

  public record FlightStatusItem(
      long flightId,
      String code,
      String from,
      String to,
      String originCode,
      String destinationCode,
      OffsetDateTime departureAt,
      OffsetDateTime arrivalAt,
      String departureTime,
      String arrivalTime,
      String status,
      String statusLabel,
      String gate,
      String note
  ) {
  }
}
