package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record BackofficeFlightOperationsResponse(
    String queryCode,
    String queryDate,
    List<FlightItem> flights
) {

  public record FlightItem(
      long flightId,
      String code,
      String from,
      String to,
      String originCode,
      String destinationCode,
      OffsetDateTime departureAt,
      OffsetDateTime arrivalAt,
      String status,
      String statusLabel,
      String gate,
      String note,
      boolean salesOpen
  ) {
  }
}
