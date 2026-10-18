package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.repository.FlightRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.service.RealtimeFlightStreamService;
import com.qlvmb.airticket.service.FlightStatusService;
import java.util.Locale;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class RealtimeFlightController {
 private final RealtimeFlightStreamService stream;
 private final FlightRepository flights;
 private final FlightStatusService statusService;
 public RealtimeFlightController(RealtimeFlightStreamService stream,FlightRepository flights,FlightStatusService statusService){this.stream=stream;this.flights=flights;this.statusService=statusService;}
 @GetMapping(value="/api/notifications/stream",produces=MediaType.TEXT_EVENT_STREAM_VALUE)
 public SseEmitter me(Authentication authentication){
  if(authentication==null||!(authentication.getPrincipal() instanceof AuthenticatedUser user))
   throw new UnauthorizedException("Cần đăng nhập.");
  return stream.privateStream(user.email());
 }
 @GetMapping(value="/api/flights/{code}/stream",produces=MediaType.TEXT_EVENT_STREAM_VALUE)
 public SseEmitter publicFlight(@PathVariable String code){
  var flight=flights.findStatusByCode(code.trim().toUpperCase(Locale.ROOT))
   .orElseThrow(()->new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND));
  if(statusService.getFlightStatus(flight.getCode(),null).flights().isEmpty())
   throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
  return stream.publicStream(flight.getCode());
 }
}
