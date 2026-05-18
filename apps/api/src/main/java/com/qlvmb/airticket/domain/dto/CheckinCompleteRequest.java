package com.qlvmb.airticket.domain.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CheckinCompleteRequest(
    @NotBlank String bookingCode,
    @NotEmpty @Size(max = 9) List<@NotBlank String> ticketNumbers,
    List<@Valid SeatSelectionRequest> seatSelections
) {

  public CheckinCompleteRequest {
    ticketNumbers = List.copyOf(ticketNumbers);
    seatSelections = seatSelections == null ? List.of() : List.copyOf(seatSelections);
  }

  public record SeatSelectionRequest(
      @NotBlank String ticketNumber,
      @NotBlank String seatNumber
  ) {
  }
}
