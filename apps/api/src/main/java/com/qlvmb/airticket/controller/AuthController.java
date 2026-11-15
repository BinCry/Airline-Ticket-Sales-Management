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
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.security.ClientIpResolver;
import com.qlvmb.airticket.security.RequestRateLimiter;
import com.qlvmb.airticket.service.AuthService;
import com.qlvmb.airticket.service.AuthSummaryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
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

  private static final String LOGIN_LIMIT_MESSAGE =
      "Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ít phút.";
  private static final String OTP_REQUEST_LIMIT_MESSAGE =
      "Bạn đã yêu cầu mã OTP quá nhiều lần. Vui lòng thử lại sau ít phút.";

  private final AuthService authService;
  private final AuthSummaryService authSummaryService;
  private final RequestRateLimiter requestRateLimiter;
  private final Duration rateLimitWindow;
  private final int loginFailureLimitPerEmail;
  private final int loginFailureLimitPerIp;
  private final int otpRequestLimitPerEmail;
  private final int otpRequestLimitPerIp;

  public AuthController(
      AuthService authService,
      AuthSummaryService authSummaryService,
      RequestRateLimiter requestRateLimiter,
      @Value("${app.auth.rate-limit.window-seconds:900}") long rateLimitWindowSeconds,
      @Value("${app.auth.rate-limit.login-failures-per-email:5}") int loginFailureLimitPerEmail,
      @Value("${app.auth.rate-limit.login-failures-per-ip:20}") int loginFailureLimitPerIp,
      @Value("${app.auth.rate-limit.otp-requests-per-email:3}") int otpRequestLimitPerEmail,
      @Value("${app.auth.rate-limit.otp-requests-per-ip:10}") int otpRequestLimitPerIp
  ) {
    this.authService = authService;
    this.authSummaryService = authSummaryService;
    this.requestRateLimiter = requestRateLimiter;
    this.rateLimitWindow = Duration.ofSeconds(rateLimitWindowSeconds);
    this.loginFailureLimitPerEmail = loginFailureLimitPerEmail;
    this.loginFailureLimitPerIp = loginFailureLimitPerIp;
    this.otpRequestLimitPerEmail = otpRequestLimitPerEmail;
    this.otpRequestLimitPerIp = otpRequestLimitPerIp;
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
    // Bổ sung: chặn dò mật khẩu bằng cách giới hạn số lần đăng nhập sai theo email và theo IP.
    String clientIp = resolveClientIp(servletRequest);
    String emailKey = "login-email:" + normalizeKey(request.email());
    String ipKey = "login-ip:" + clientIp;
    requestRateLimiter.assertAllowed(emailKey, loginFailureLimitPerEmail, rateLimitWindow, LOGIN_LIMIT_MESSAGE);
    requestRateLimiter.assertAllowed(ipKey, loginFailureLimitPerIp, rateLimitWindow, LOGIN_LIMIT_MESSAGE);
    try {
      AuthSessionResponse response = authService.login(request, userAgent, clientIp);
      requestRateLimiter.reset(emailKey);
      return response;
    } catch (UnauthorizedException exception) {
      requestRateLimiter.record(emailKey, rateLimitWindow);
      requestRateLimiter.record(ipKey, rateLimitWindow);
      throw exception;
    }
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
      @Valid @RequestBody AuthPasswordResetRequest request,
      HttpServletRequest servletRequest
  ) {
    // Bổ sung: giới hạn số lần xin OTP quên mật khẩu theo email và theo IP để tránh spam email.
    requestRateLimiter.consume(
        "forgot-otp-ip:" + resolveClientIp(servletRequest), otpRequestLimitPerIp, rateLimitWindow, OTP_REQUEST_LIMIT_MESSAGE);
    requestRateLimiter.consume(
        "forgot-otp-email:" + normalizeKey(request.email()), otpRequestLimitPerEmail, rateLimitWindow, OTP_REQUEST_LIMIT_MESSAGE);
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

  // Thay thế: dùng ClientIpResolver dùng chung thay cho đoạn đọc X-Forwarded-For viết riêng ở đây.
  private String resolveClientIp(HttpServletRequest servletRequest) {
    return ClientIpResolver.resolve(servletRequest);
  }

  private String normalizeKey(String email) {
    return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
  }

}
