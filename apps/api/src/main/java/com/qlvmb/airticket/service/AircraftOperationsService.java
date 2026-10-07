package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.*;
import com.qlvmb.airticket.domain.entity.*;
import com.qlvmb.airticket.exception.*;
import com.qlvmb.airticket.repository.*;
import jakarta.persistence.EntityManager;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AircraftOperationsService {
  private final AircraftTypeRepository types;
  private final AircraftRepository aircraft;
  private final FlightRepository flights;
  private final SeatMapService seats;
  private final JdbcTemplate jdbc;
  private final EntityManager em;

  public AircraftOperationsService(AircraftTypeRepository types, AircraftRepository aircraft,
      FlightRepository flights, SeatMapService seats, JdbcTemplate jdbc, EntityManager em) {
    this.types = types; this.aircraft = aircraft; this.flights = flights;
    this.seats = seats; this.jdbc = jdbc; this.em = em;
  }

  @Transactional(readOnly = true)
  public List<AircraftTypeResponse> getTypes() {
    return types.findAllByOrderByCodeAsc().stream().map(this::typeResponse).toList();
  }

  @Transactional(readOnly = true)
  public List<AircraftResponse> getAircraft() {
    return aircraft.findAllByOrderByRegistrationCodeAsc().stream().map(this::aircraftResponse).toList();
  }

  @Transactional
  public AircraftTypeResponse saveType(Long id, AircraftTypeRequest request) {
    seats.lockConfiguration(true);
    String code = normalizedCode(request.code(), 16);
    if (types.existsByCodeIgnoreCaseAndIdNot(code, id == null ? -1L : id)) {
      throw new ConflictException("Mã loại tàu bay đã tồn tại.");
    }
    var layout = seats.validateLayout(request.seatLayout(), request.totalRows());
    String name = request.name() == null ? "" : request.name().trim();
    if (name.isBlank() || name.length() > 120) throw new BadRequestException("Tên loại tàu bay không hợp lệ.");
    AircraftTypeEntity type;
    List<Long> affected = List.of();
    if (id == null) type = AircraftTypeEntity.create(code, name, request.totalRows(), request.seatLayout().toString());
    else {
      type = types.findById(id).orElseThrow(() -> new NotFoundException("Không tìm thấy loại tàu bay."));
      em.refresh(type);
      affected = jdbc.queryForList("""
          select f.id from flight f join aircraft a on a.id=f.aircraft_id
          where a.aircraft_type_id=? order by f.id
          """, Long.class, id);
      seats.lockFlights(affected);
      affected.forEach(flightId -> seats.validateCompatibility(flightId, layout));
      type.update(code, name, request.totalRows(), request.seatLayout().toString());
    }
    types.saveAndFlush(type);
    for (Long flightId : affected) syncInventory(flightId, layout);
    return typeResponse(type);
  }

  @Transactional
  public AircraftResponse saveAircraft(Long id, AircraftRequest request) {
    seats.lockConfiguration(true);
    String registration = normalizedCode(request.registrationCode(), 20);
    if (!Set.of("ACTIVE", "MAINTENANCE", "INACTIVE").contains(request.status())) {
      throw new BadRequestException("Trạng thái tàu bay không hợp lệ.");
    }
    if (aircraft.existsByRegistrationCodeIgnoreCaseAndIdNot(registration, id == null ? -1L : id)) {
      throw new ConflictException("Số đăng ký tàu bay đã tồn tại.");
    }
    if (request.aircraftTypeId() == null) throw new BadRequestException("Vui lòng chọn loại tàu bay.");
    AircraftTypeEntity type = types.findById(request.aircraftTypeId())
        .orElseThrow(() -> new BadRequestException("Không tìm thấy loại tàu bay."));
    em.refresh(type);
    var layout = seats.parseLayout(type.getSeatLayoutJson(), type.getTotalRows());
    AircraftEntity plane;
    List<Long> affected = List.of();
    if (id == null) plane = AircraftEntity.create(type, registration, request.status());
    else {
      plane = aircraft.findById(id).orElseThrow(() -> new NotFoundException("Không tìm thấy tàu bay."));
      em.refresh(plane);
      affected = jdbc.queryForList("select id from flight where aircraft_id=? order by id", Long.class, id);
      seats.lockFlights(affected);
      affected.forEach(flightId -> seats.validateCompatibility(flightId, layout));
      plane.update(type, registration, request.status());
    }
    aircraft.saveAndFlush(plane);
    for (Long flightId : affected) syncInventory(flightId, layout);
    return aircraftResponse(plane);
  }

  public void syncInventory(long flightId, SeatMapResponse.Layout layout) {
    FlightEntity flight = flights.findById(flightId).orElseThrow();
    em.refresh(flight);
    flight.getFareInventories().forEach(inventory -> {
      em.refresh(inventory);
      inventory.syncConfiguration(seats.capacity(layout, inventory.getFareFamily()), inventory.getPrice());
    });
  }

  private AircraftTypeResponse typeResponse(AircraftTypeEntity type) {
    return new AircraftTypeResponse(type.getId(), type.getCode(), type.getName(), type.getTotalRows(),
        seats.parseLayout(type.getSeatLayoutJson(), type.getTotalRows()));
  }

  private AircraftResponse aircraftResponse(AircraftEntity plane) {
    return new AircraftResponse(plane.getId(), plane.getAircraftType().getId(), plane.getRegistrationCode(),
        plane.getStatus(), plane.getAircraftType().getCode(), plane.getAircraftType().getName());
  }

  private String normalizedCode(String value, int max) {
    String result = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    if (result.isBlank() || result.length() > max || !result.matches("[A-Z0-9][A-Z0-9-]*")) {
      throw new BadRequestException("Mã loại tàu hoặc số đăng ký không hợp lệ.");
    }
    return result;
  }
}
