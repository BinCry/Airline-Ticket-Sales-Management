package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.FlightSearchResponse;
import com.qlvmb.airticket.service.FlightSearchService;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class FlightSearchController {

  private final FlightSearchService flightSearchService;

  public FlightSearchController(FlightSearchService flightSearchService) {
    this.flightSearchService = flightSearchService;
  }

  @GetMapping("/flights/search")
  public FlightSearchResponse searchFlights(
      @RequestParam(defaultValue = "SGN") String from,
      @RequestParam(defaultValue = "HAN") String to,
      @RequestParam(defaultValue = "2026-05-23") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate departureDate,
      @RequestParam(defaultValue = "2026-05-26") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate returnDate,
      @RequestParam(defaultValue = "round_trip") String tripType,
      @RequestParam(required = false) String fareFamily,
      @RequestParam(defaultValue = "1") int adultCount,
      @RequestParam(defaultValue = "0") int childCount,
      @RequestParam(defaultValue = "0") int infantCount
  ) {
    return flightSearchService.searchFlights(
        from,
        to,
        departureDate,
        returnDate,
        tripType,
        fareFamily,
        adultCount,
        childCount,
        infantCount
    );
  }
}
