package com.qlvmb.airticket.domain.dto;

public record AircraftResponse(long id, long aircraftTypeId, String registrationCode,
    String status, String aircraftTypeCode, String aircraftTypeName) {}
