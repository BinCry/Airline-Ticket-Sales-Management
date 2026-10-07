package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.*;

public record AircraftRequest(@NotNull @Positive Long aircraftTypeId,
    @NotBlank @Size(max = 20) String registrationCode,
    @NotBlank @Pattern(regexp = "ACTIVE|MAINTENANCE|INACTIVE") String status) {}
