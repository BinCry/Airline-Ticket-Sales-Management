package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.SeatMapResponse;
import com.qlvmb.airticket.service.SeatMapService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/flights")
public class SeatMapController {
  private final SeatMapService service;
  public SeatMapController(SeatMapService service) { this.service = service; }
  @GetMapping("/{flightId}/seat-map")
  public SeatMapResponse getSeatMap(@PathVariable long flightId) { return service.getSeatMap(flightId); }
}
