package com.qlvmb.airticket.service;

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
import com.qlvmb.airticket.domain.dto.MyProfileResponse;
import com.qlvmb.airticket.domain.entity.OtpChallengeEntity;
import com.qlvmb.airticket.domain.entity.RefreshSessionEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.ConflictException;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.repository.OtpChallengeRepository;
import com.qlvmb.airticket.repository.RefreshSessionRepository;
import com.qlvmb.airticket.repository.RoleRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.JwtTokenService;
import com.qlvmb.airticket.security.OtpChannelCode;
import com.qlvmb.airticket.security.OtpPurposeCode;
import com.qlvmb.airticket.security.RoleCode;
import io.jsonwebtoken.JwtException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private final UserAccountRepository userAccountRepository;
  private final RoleRepository roleRepository;
  private final OtpChallengeRepository otpChallengeRepository;
  private final RefreshSessionRepository refreshSessionRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenService jwtTokenService;
  private final OtpDeliveryService otpDeliveryService;
  private final long passwordResetOtpTtlSeconds;
  private final int otpMaxAttempts;
  private final SecureRandom secureRandom;

  public AuthService(
      UserAccountRepository userAccountRepository,
      RoleRepository roleRepository,
      OtpChallengeRepository otpChallengeRepository,
      RefreshSessionRepository refreshSessionRepository,
      PasswordEncoder passwordEncoder,
      JwtTokenService jwtTokenService,
      OtpDeliveryService otpDeliveryService,
      @Value("${app.auth.otp.password-reset-ttl-seconds}") long passwordResetOtpTtlSeconds,
      @Value("${app.auth.otp.max-attempts}") int otpMaxAttempts
  ) {
    this.userAccountRepository = userAccountRepository;
    this.roleRepository = roleRepository;
    this.otpChallengeRepository = otpChallengeRepository;
    this.refreshSessionRepository = refreshSessionRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtTokenService = jwtTokenService;
    this.otpDeliveryService = otpDeliveryService;
    this.passwordResetOtpTtlSeconds = passwordResetOtpTtlSeconds;
    this.otpMaxAttempts = otpMaxAttempts;
    this.secureRandom = new SecureRandom();
  }

  @Transactional
  public AuthSessionResponse register(AuthRegisterRequest request, String userAgent, String ipAddress) {
    String normalizedEmail = normalizeEmail(request.email());
    if (userAccountRepository.existsByEmailIgnoreCase(normalizedEmail)) {
      throw new ConflictException("Email da duoc su dung.");
    }

    RoleEntity customerRole = roleRepository.findByCode(RoleCode.CUSTOMER)
        .orElseThrow(() -> new IllegalStateException("Thieu du lieu role customer."));
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    UserAccountEntity userAccount = UserAccountEntity.register(
        normalizedEmail,
        passwordEncoder.encode(request.password()),
        normalizeDisplayName(request.displayName()),
        normalizePhone(request.phone()),
        "active",
        now
    );
    userAccount.getRoles().add(customerRole);
    UserAccountEntity savedUserAccount = userAccountRepository.save(userAccount);
    return createSession(savedUserAccount, userAgent, ipAddress);
  }

  @Transactional
  public AuthSessionResponse login(AuthLoginRequest request, String userAgent, String ipAddress) {
    UserAccountEntity userAccount = userAccountRepository.findOneWithRolesByEmailIgnoreCase(normalizeEmail(request.email()))
        .orElseThrow(() -> new UnauthorizedException("Thong tin dang nhap khong chinh xac."));
    if (!passwordEncoder.matches(request.password(), userAccount.getPasswordHash())) {
      throw new UnauthorizedException("Thong tin dang nhap khong chinh xac.");
    }
    validateUserState(userAccount);
    userAccount.markLoggedIn(OffsetDateTime.now(ZoneOffset.UTC));
    return createSession(userAccount, userAgent, ipAddress);
  }

  @Transactional
  public AuthSessionResponse refresh(AuthRefreshRequest request, String userAgent, String ipAddress) {
    JwtTokenService.RefreshTokenPayload payload = parseRefreshToken(request.refreshToken());
    RefreshSessionEntity refreshSession = refreshSessionRepository.findByTokenKeyAndRevokedAtIsNull(payload.tokenKey())
        .orElseThrow(() -> new UnauthorizedException("Phien lam moi khong hop le."));
    if (!refreshSession.getUserAccount().getId().equals(payload.userId())) {
      throw new UnauthorizedException("Phien lam moi khong hop le.");
    }

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    if (refreshSession.getExpiresAt().isBefore(now)) {
      refreshSession.revoke(now);
      throw new UnauthorizedException("Phien lam moi da het han.");
    }

    UserAccountEntity userAccount = userAccountRepository.findOneWithRolesById(payload.userId())
        .orElseThrow(() -> new UnauthorizedException("Tai khoan khong ton tai."));
    validateUserState(userAccount);
    refreshSession.revoke(now);
    return createSession(userAccount, userAgent, ipAddress);
  }

  @Transactional
  public void logout(AuthLogoutRequest request) {
    try {
      JwtTokenService.RefreshTokenPayload payload = parseRefreshToken(request.refreshToken());
      refreshSessionRepository.findByTokenKeyAndRevokedAtIsNull(payload.tokenKey())
          .filter(refreshSession -> refreshSession.getUserAccount().getId().equals(payload.userId()))
          .ifPresent(refreshSession -> refreshSession.revoke(OffsetDateTime.now(ZoneOffset.UTC)));
    } catch (UnauthorizedException exception) {
      // Giu dang xuat o dang idempotent.
    }
  }

  @Transactional
  public AuthOtpRequestResponse requestForgotPasswordOtp(AuthPasswordResetRequest request) {
    String normalizedEmail = normalizeEmail(request.email());
    userAccountRepository.findByEmailIgnoreCase(normalizedEmail).ifPresent(userAccount -> {
      OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
      String otp = generateOtp();
      OtpChallengeEntity otpChallenge = OtpChallengeEntity.issue(
          userAccount,
          OtpChannelCode.EMAIL,
          OtpPurposeCode.FORGOT_PASSWORD,
          normalizedEmail,
          passwordEncoder.encode(otp),
          now.plusSeconds(passwordResetOtpTtlSeconds),
          now
      );
      otpChallengeRepository.save(otpChallenge);
      otpDeliveryService.sendForgotPasswordOtp(normalizedEmail, otp);
    });

    return new AuthOtpRequestResponse(
        "accepted",
        "Neu email ton tai, ma OTP da duoc gui."
    );
  }

  @Transactional
  public AuthOtpVerifyResponse verifyForgotPasswordOtp(AuthPasswordResetVerifyRequest request) {
    OtpChallengeEntity otpChallenge = requireActivePasswordResetChallenge(request.email());
    validateOtpValue(otpChallenge, request.otp());
    if (otpChallenge.getVerifiedAt() == null) {
      otpChallenge.markVerified(OffsetDateTime.now(ZoneOffset.UTC));
    }
    return new AuthOtpVerifyResponse(true, "OTP hop le.");
  }

  @Transactional
  public void resetPassword(AuthResetPasswordRequest request) {
    String normalizedEmail = normalizeEmail(request.email());
    UserAccountEntity userAccount = userAccountRepository.findByEmailIgnoreCase(normalizedEmail)
        .orElseThrow(() -> new BadRequestException("OTP khong hop le hoac da het han."));
    OtpChallengeEntity otpChallenge = requireActivePasswordResetChallenge(normalizedEmail);
    validateOtpValue(otpChallenge, request.otp());

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    userAccount.updatePassword(passwordEncoder.encode(request.newPassword()), now);
    otpChallenge.markVerified(now);
    otpChallenge.consume(now);
    refreshSessionRepository.findAllByUserAccountIdAndRevokedAtIsNull(userAccount.getId())
        .forEach(refreshSession -> refreshSession.revoke(now));
  }

  @Transactional(readOnly = true)
  public MyProfileResponse getMyProfile(AuthenticatedUser authenticatedUser) {
    UserAccountEntity userAccount = userAccountRepository.findOneWithRolesById(authenticatedUser.userId())
        .orElseThrow(() -> new UnauthorizedException("Khong tim thay thong tin tai khoan."));
    return new MyProfileResponse(
        userAccount.getId(),
        userAccount.getEmail(),
        userAccount.getDisplayName(),
        userAccount.getPhone(),
        userAccount.isEmailVerified(),
        userAccount.getStatus(),
        extractRoleCodes(userAccount)
    );
  }

  private AuthSessionResponse createSession(UserAccountEntity userAccount, String userAgent, String ipAddress) {
    String tokenKey = UUID.randomUUID().toString();
    JwtTokenService.IssuedTokenPair tokenPair = jwtTokenService.issueTokenPair(userAccount, tokenKey);
    RefreshSessionEntity refreshSession = RefreshSessionEntity.create(
        userAccount,
        tokenKey,
        tokenPair.refreshTokenExpiresAt(),
        OffsetDateTime.now(ZoneOffset.UTC),
        userAgent,
        ipAddress
    );
    refreshSessionRepository.save(refreshSession);
    return new AuthSessionResponse(
        tokenPair.accessToken(),
        tokenPair.refreshToken(),
        "Bearer",
        tokenPair.accessTokenExpiresAt(),
        new AuthSessionResponse.UserSummary(
            userAccount.getId(),
            userAccount.getEmail(),
            userAccount.getDisplayName(),
            userAccount.getPhone(),
            userAccount.isEmailVerified(),
            extractRoleCodes(userAccount),
            extractPermissionCodes(userAccount)
        )
    );
  }

  private void validateUserState(UserAccountEntity userAccount) {
    if (userAccount.isLocked()) {
      throw new UnauthorizedException("Tai khoan hien dang bi khoa.");
    }
    if (!"active".equalsIgnoreCase(userAccount.getStatus())) {
      throw new UnauthorizedException("Tai khoan hien chua san sang dang nhap.");
    }
  }

  private JwtTokenService.RefreshTokenPayload parseRefreshToken(String refreshToken) {
    try {
      return jwtTokenService.parseRefreshToken(refreshToken);
    } catch (JwtException exception) {
      throw new UnauthorizedException("Refresh token khong hop le.");
    }
  }

  private List<String> extractRoleCodes(UserAccountEntity userAccount) {
    return userAccount.getRoles().stream()
        .map(role -> role.getCode())
        .sorted()
        .toList();
  }

  private List<String> extractPermissionCodes(UserAccountEntity userAccount) {
    return userAccount.getRoles().stream()
        .flatMap(role -> role.getPermissions().stream())
        .map(permission -> permission.getCode())
        .distinct()
        .sorted()
        .toList();
  }

  private OtpChallengeEntity requireActivePasswordResetChallenge(String email) {
    OtpChallengeEntity otpChallenge = otpChallengeRepository
        .findFirstByTargetValueAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
            normalizeEmail(email),
            OtpPurposeCode.FORGOT_PASSWORD
        )
        .orElseThrow(() -> new BadRequestException("OTP khong hop le hoac da het han."));
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    if (otpChallenge.isConsumed() || otpChallenge.isExpired(now)) {
      if (!otpChallenge.isConsumed()) {
        otpChallenge.consume(now);
      }
      throw new BadRequestException("OTP khong hop le hoac da het han.");
    }
    return otpChallenge;
  }

  private void validateOtpValue(OtpChallengeEntity otpChallenge, String otp) {
    if (!passwordEncoder.matches(otp, otpChallenge.getOtpHash())) {
      otpChallenge.incrementAttempt();
      if (otpChallenge.getAttemptCount() >= otpMaxAttempts) {
        otpChallenge.consume(OffsetDateTime.now(ZoneOffset.UTC));
      }
      throw new BadRequestException("OTP khong hop le hoac da het han.");
    }
  }

  private String generateOtp() {
    int rawValue = secureRandom.nextInt(1_000_000);
    return "%06d".formatted(rawValue);
  }

  private String normalizeEmail(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeDisplayName(String displayName) {
    String normalizedDisplayName = displayName.trim();
    if (normalizedDisplayName.isBlank()) {
      throw new BadRequestException("Ten hien thi khong duoc de trong.");
    }
    return normalizedDisplayName;
  }

  private String normalizePhone(String phone) {
    if (phone == null || phone.isBlank()) {
      return null;
    }
    return phone.trim();
  }
}
