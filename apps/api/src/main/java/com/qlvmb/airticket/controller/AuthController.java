package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.AuthLoginRequest;
import com.qlvmb.airticket.domain.dto.AuthLogoutRequest;
import com.qlvmb.airticket.domain.dto.AuthOtpRequestResponse;
import com.qlvmb.airticket.domain.dto.AuthOtpVerifyResponse;
import com.qlvmb.airticket.domain.dto.AuthPasswordResetRequest;
import com.qlvmb.airticket.domain.dto.AuthPasswordResetVerifyRequest;
import com.qlvmb.airticket.domain.dto.AuthResetPasswordRequest;
import com.qlvmb.airticket.domain.dto.AuthRefreshRequest;
import com.qlvmb.airticket.domain.dto.AuthRegisterRequest;
import com.qlvmb.airticket.domain.dto.AuthSessionResponse;
import com.qlvmb.airticket.domain.dto.AuthSummaryResponse;
import com.qlvmb.airticket.service.AuthService;
import com.qlvmb.airticket.service.AuthSummaryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;
  private final AuthSummaryService authSummaryService;

  public AuthController(AuthService authService, AuthSummaryService authSummaryService) {
    this.authService = authService;
    this.authSummaryService = authSummaryService;
  }

  @GetMapping("/roles")
  public AuthSummaryResponse getRoleSummary() {
    return authSummaryService.getSummary();
  }

  @PostMapping("/register")
  public ResponseEntity<AuthSessionResponse> register(
      @Valid @RequestBody AuthRegisterRequest request,
      @RequestHeader(value = "User-Agent", required = false) String userAgent,
      HttpServletRequest servletRequest
  ) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(authService.register(request, userAgent, resolveClientIp(servletRequest)));
  }

  @PostMapping("/login")
  public AuthSessionResponse login(
      @Valid @RequestBody AuthLoginRequest request,
      @RequestHeader(value = "User-Agent", required = false) String userAgent,
      HttpServletRequest servletRequest
  ) {
    return authService.login(request, userAgent, resolveClientIp(servletRequest));
  }

  @PostMapping("/refresh")
  public AuthSessionResponse refresh(
      @Valid @RequestBody AuthRefreshRequest request,
      @RequestHeader(value = "User-Agent", required = false) String userAgent,
      HttpServletRequest servletRequest
  ) {
    return authService.refresh(request, userAgent, resolveClientIp(servletRequest));
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(@Valid @RequestBody AuthLogoutRequest request) {
    authService.logout(request);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/forgot-password/request-otp")
  public ResponseEntity<AuthOtpRequestResponse> requestForgotPasswordOtp(
      @Valid @RequestBody AuthPasswordResetRequest request
  ) {
    return ResponseEntity.accepted().body(authService.requestForgotPasswordOtp(request));
  }

  @PostMapping("/forgot-password/verify-otp")
  public AuthOtpVerifyResponse verifyForgotPasswordOtp(
      @Valid @RequestBody AuthPasswordResetVerifyRequest request
  ) {
    return authService.verifyForgotPasswordOtp(request);
  }

  @PostMapping("/reset-password")
  public ResponseEntity<Void> resetPassword(
      @Valid @RequestBody AuthResetPasswordRequest request
  ) {
    authService.resetPassword(request);
    return ResponseEntity.noContent().build();
  }

  private String resolveClientIp(HttpServletRequest servletRequest) {
    String forwardedFor = servletRequest.getHeader("X-Forwarded-For");
    if (forwardedFor != null && !forwardedFor.isBlank()) {
      return forwardedFor.split(",")[0].trim();
    }
    return servletRequest.getRemoteAddr();
  }
}
