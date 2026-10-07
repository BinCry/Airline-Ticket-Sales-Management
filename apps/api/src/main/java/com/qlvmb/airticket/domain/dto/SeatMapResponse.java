package com.qlvmb.airticket.domain.dto;

import java.util.List;

public record SeatMapResponse(
    long flightId, long aircraftId, String aircraftRegistration,
    String aircraftTypeCode, String aircraftTypeName, Layout layout, List<Seat> seats
) {
  public record Layout(List<String> columns, List<String> aislesAfter,
      List<Row> rows, List<String> disabledSeats) {}
  public record Row(int row, String fareFamily, List<String> seats) {}
  public record Seat(String seatNumber, String fareFamily, boolean occupied, boolean disabled) {}
}
