package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.security.*;
import com.qlvmb.airticket.service.BaggageTrackingService;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/backoffice/operations/baggage")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_OPERATIONS + "')")
public class BackofficeBaggageController {
 private final BaggageTrackingService service;
 public BackofficeBaggageController(BaggageTrackingService service){this.service=service;}
 @GetMapping public List<BaggageTrackingService.BaggageItem> search(@RequestParam(required=false) String bookingCode,
   @RequestParam(required=false) String tagCode,@RequestParam(required=false) String flightCode,
   @RequestParam(required=false) String status){return service.search(bookingCode,tagCode,flightCode,status);}
 @PatchMapping("/{id}/status") public BaggageTrackingService.BaggageItem update(Authentication authentication,
   @PathVariable Long id,@RequestBody BaggageTrackingService.StatusRequest request){return service.changeStatus(user(authentication),id,request);}
 @PostMapping("/flights/{flightId}/load-all") public java.util.Map<String,Integer> loadAll(Authentication authentication,@PathVariable Long flightId){
   return java.util.Map.of("updated",service.loadAll(user(authentication),flightId));
 }
 private AuthenticatedUser user(Authentication auth){if(auth==null||!(auth.getPrincipal() instanceof AuthenticatedUser u))throw new UnauthorizedException("Cần đăng nhập.");return u;}
}
