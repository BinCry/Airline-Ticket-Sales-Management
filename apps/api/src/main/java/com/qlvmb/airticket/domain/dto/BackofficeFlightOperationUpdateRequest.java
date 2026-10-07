package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BackofficeFlightOperationUpdateRequest(
    @NotBlank
    @Pattern(regexp = "scheduled|on_time|boarding|delayed|departed|landed|cancelled")
    String status,
    @Size(max = 12)
    String gate,
    @Size(max = 255)
    String note,
    boolean salesOpen,
    @Min(1)
    Long baseFare,
    @Min(1) Long aircraftId
) {
  public BackofficeFlightOperationUpdateRequest(String status, String gate, String note, boolean salesOpen, Long baseFare) {
    this(status, gate, note, salesOpen, baseFare, null);
  }
}
