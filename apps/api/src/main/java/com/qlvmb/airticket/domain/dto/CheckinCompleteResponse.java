package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record CheckinCompleteResponse(
    String bookingCode,
    List<String> ticketNumbers,
    List<BoardingPassItem> boardingPasses
) {

  public record BoardingPassItem(
      long inventoryId,
      String ticketNumber,
      String passengerName,
      String seatNumber,
      String gate,
      OffsetDateTime boardingTime,
      String barcode
  ) {
  }
}
