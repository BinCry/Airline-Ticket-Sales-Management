package com.qlvmb.airticket.domain.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.*;

public record AircraftTypeRequest(@NotBlank @Size(max = 16) String code,
    @NotBlank @Size(max = 120) String name, @Min(1) @Max(200) int totalRows,
    @NotNull JsonNode seatLayout) {}
