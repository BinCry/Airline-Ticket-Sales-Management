package com.qlvmb.airticket.domain.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;

public record BackofficeFlightCreateRequest(
    @NotBlank
    @Size(max = 16)
    String code,
    @NotBlank
    @Size(max = 8)
    String originCode,
    @NotBlank
    @Size(max = 8)
    String destinationCode,
    @NotNull
    OffsetDateTime departureAt,
    @NotNull
    OffsetDateTime arrivalAt,
    @Size(max = 12)
    String gate,
    @Size(max = 255)
    String note,
    boolean salesOpen,
    @Valid
    @NotEmpty
    List<FareInventoryItem> fareInventories
) {

  public record FareInventoryItem(
      @NotBlank
      @Size(max = 64)
      String fareFamily,
      @Min(1)
      int totalSeats,
      @Min(1)
      long price
  ) {
  }
}
