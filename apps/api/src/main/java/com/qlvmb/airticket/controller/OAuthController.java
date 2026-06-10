package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.AuthSessionResponse;
import com.qlvmb.airticket.domain.dto.OAuthExchangeRequest;
import com.qlvmb.airticket.service.OAuthLoginService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/oauth")
public class OAuthController {

  private final OAuthLoginService oAuthLoginService;

  public OAuthController(OAuthLoginService oAuthLoginService) {
    this.oAuthLoginService = oAuthLoginService;
  }

  @GetMapping("/google/start")
  public ResponseEntity<Void> startGoogleLogin(
      @RequestParam(value = "redirectTo", required = false) String redirectTo
  ) {
    URI authorizationUri = oAuthLoginService.createGoogleAuthorizationUri(redirectTo);
    return ResponseEntity.status(302).location(authorizationUri).build();
  }

  @GetMapping("/google/callback")
  public ResponseEntity<Void> handleGoogleCallback(
      @RequestParam("code") String code,
      @RequestParam("state") String state
  ) {
    URI frontendCallbackUri = oAuthLoginService.handleGoogleCallback(code, state);
    return ResponseEntity.status(302).location(frontendCallbackUri).build();
  }

  @PostMapping("/exchange")
  public AuthSessionResponse exchangeTemporaryCode(
      @Valid @RequestBody OAuthExchangeRequest request,
      @RequestHeader(value = "User-Agent", required = false) String userAgent,
      HttpServletRequest servletRequest
  ) {
    return oAuthLoginService.exchangeTemporaryCode(request.code(), userAgent, resolveClientIp(servletRequest));
  }

  private String resolveClientIp(HttpServletRequest servletRequest) {
    String forwardedFor = servletRequest.getHeader("X-Forwarded-For");
    if (forwardedFor != null && !forwardedFor.isBlank()) {
      return forwardedFor.split(",")[0].trim();
    }
    return servletRequest.getRemoteAddr();
  }
}
