package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.FlightBookingOptionsResponse;
import com.qlvmb.airticket.domain.dto.FlightSearchResponse;
import com.qlvmb.airticket.service.FlightSearchService;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class FlightSearchController {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");

  private final FlightSearchService flightSearchService;

  public FlightSearchController(FlightSearchService flightSearchService) {
    this.flightSearchService = flightSearchService;
  }

  @GetMapping("/flights/search")
  public FlightSearchResponse searchFlights(
      @RequestParam(defaultValue = "SGN") String from,
      @RequestParam(defaultValue = "HAN") String to,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate departureDate,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate returnDate,
      @RequestParam(defaultValue = "one_way") String tripType,
      @RequestParam(defaultValue = "1") int adultCount,
      @RequestParam(defaultValue = "0") int childCount,
      @RequestParam(defaultValue = "0") int infantCount
  ) {
    LocalDate resolvedDepartureDate = departureDate == null ? LocalDate.now(ZONE_ID) : departureDate;

    return flightSearchService.searchFlights(
        from,
        to,
        resolvedDepartureDate,
        returnDate,
        tripType,
        adultCount,
        childCount,
        infantCount
    );
  }

  @GetMapping("/flights/{flightId}/booking-options")
  public FlightBookingOptionsResponse getBookingOptions(@PathVariable Long flightId) {
    return flightSearchService.getBookingOptions(flightId);
  }
}
