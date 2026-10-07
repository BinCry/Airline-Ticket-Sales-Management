package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

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
    @Min(1)
    long baseFare,
    @Min(1) Long aircraftId
) {
  public BackofficeFlightCreateRequest(String code, String originCode, String destinationCode,
      OffsetDateTime departureAt, OffsetDateTime arrivalAt, String gate, String note,
      boolean salesOpen, long baseFare) {
    this(code, originCode, destinationCode, departureAt, arrivalAt, gate, note, salesOpen, baseFare, null);
  }
}
