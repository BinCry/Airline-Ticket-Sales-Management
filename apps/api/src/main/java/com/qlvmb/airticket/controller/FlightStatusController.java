package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.FlightStatusResponse;
import com.qlvmb.airticket.service.FlightStatusService;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/flights")
public class FlightStatusController {

  private final FlightStatusService flightStatusService;

  public FlightStatusController(FlightStatusService flightStatusService) {
    this.flightStatusService = flightStatusService;
  }

  @GetMapping("/status")
  public FlightStatusResponse getFlightStatus(
      @RequestParam(required = false) String code,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
  ) {
    return flightStatusService.getFlightStatus(code, date);
  }
}
