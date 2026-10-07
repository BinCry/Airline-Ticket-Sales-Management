package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.*;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.AircraftOperationsService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/backoffice/operations")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_OPERATIONS + "')")
public class AircraftOperationsController {
  private final AircraftOperationsService service;
  public AircraftOperationsController(AircraftOperationsService service) { this.service = service; }

  @GetMapping("/aircraft-types") public List<AircraftTypeResponse> getTypes() { return service.getTypes(); }
  @GetMapping("/aircraft") public List<AircraftResponse> getAircraft() { return service.getAircraft(); }
  @PostMapping("/aircraft-types") @ResponseStatus(HttpStatus.CREATED)
  public AircraftTypeResponse createType(@Valid @RequestBody AircraftTypeRequest request) { return service.saveType(null, request); }
  @PatchMapping("/aircraft-types/{id}")
  public AircraftTypeResponse updateType(@PathVariable Long id, @Valid @RequestBody AircraftTypeRequest request) { return service.saveType(id, request); }
  @PostMapping("/aircraft") @ResponseStatus(HttpStatus.CREATED)
  public AircraftResponse createAircraft(@Valid @RequestBody AircraftRequest request) { return service.saveAircraft(null, request); }
  @PatchMapping("/aircraft/{id}")
  public AircraftResponse updateAircraft(@PathVariable Long id, @Valid @RequestBody AircraftRequest request) { return service.saveAircraft(id, request); }
}
