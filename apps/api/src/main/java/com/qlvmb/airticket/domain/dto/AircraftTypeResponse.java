package com.qlvmb.airticket.domain.dto;

public record AircraftTypeResponse(long id, String code, String name, int totalRows,
    SeatMapResponse.Layout seatLayout) {}
