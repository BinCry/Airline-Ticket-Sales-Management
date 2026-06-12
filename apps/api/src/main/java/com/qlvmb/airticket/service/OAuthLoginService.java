package com.qlvmb.airticket.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.qlvmb.airticket.domain.dto.AuthSessionResponse;
import com.qlvmb.airticket.domain.entity.AuthProviderIdentityEntity;
import com.qlvmb.airticket.domain.entity.OAuthTemporaryCodeEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.repository.AuthProviderIdentityRepository;
import com.qlvmb.airticket.repository.OAuthTemporaryCodeRepository;
import com.qlvmb.airticket.repository.RoleRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.RoleCode;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

@Service
public class OAuthLoginService {

  private static final String GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
  private static final String GOOGLE_TOKEN_BASE_URL = "https://oauth2.googleapis.com";
  private static final String GOOGLE_USERINFO_BASE_URL = "https://www.googleapis.com/oauth2/v3";
  private static final String OAUTH_EMAIL_DOMAIN = "oauth.local";
  private static final int TOKEN_BYTE_LENGTH = 32;

  private final OAuthTemporaryCodeRepository temporaryCodeRepository;
  private final AuthProviderIdentityRepository providerIdentityRepository;
  private final UserAccountRepository userAccountRepository;
  private final RoleRepository roleRepository;
  private final PasswordEncoder passwordEncoder;
  private final AuthService authService;
  private final RestClient googleTokenClient;
  private final RestClient googleUserInfoClient;
  private final SecureRandom secureRandom;
  private final String googleClientId;
  private final String googleClientSecret;
  private final String googleRedirectUri;
  private final String frontendCallbackUrl;
  private final long stateTtlSeconds;
  private final long exchangeCodeTtlSeconds;

  public OAuthLoginService(
      OAuthTemporaryCodeRepository temporaryCodeRepository,
      AuthProviderIdentityRepository providerIdentityRepository,
      UserAccountRepository userAccountRepository,
      RoleRepository roleRepository,
      PasswordEncoder passwordEncoder,
      AuthService authService,
      @Value("${app.auth.oauth.google.client-id:}") String googleClientId,
      @Value("${app.auth.oauth.google.client-secret:}") String googleClientSecret,
      @Value("${app.auth.oauth.google.redirect-uri:}") String googleRedirectUri,
      @Value("${app.auth.oauth.frontend-callback-url:http://localhost:3000/oauth/callback}") String frontendCallbackUrl,
      @Value("${app.auth.oauth.state-ttl-seconds:300}") long stateTtlSeconds,
      @Value("${app.auth.oauth.exchange-code-ttl-seconds:180}") long exchangeCodeTtlSeconds
  ) {
    this.temporaryCodeRepository = temporaryCodeRepository;
    this.providerIdentityRepository = providerIdentityRepository;
    this.userAccountRepository = userAccountRepository;
    this.roleRepository = roleRepository;
    this.passwordEncoder = passwordEncoder;
    this.authService = authService;
    this.googleTokenClient = RestClient.builder().baseUrl(GOOGLE_TOKEN_BASE_URL).build();
    this.googleUserInfoClient = RestClient.builder().baseUrl(GOOGLE_USERINFO_BASE_URL).build();
    this.secureRandom = new SecureRandom();
    this.googleClientId = trimToNull(googleClientId);
    this.googleClientSecret = trimToNull(googleClientSecret);
    this.googleRedirectUri = trimToNull(googleRedirectUri);
    this.frontendCallbackUrl = trimToNull(frontendCallbackUrl);
    this.stateTtlSeconds = stateTtlSeconds;
    this.exchangeCodeTtlSeconds = exchangeCodeTtlSeconds;
  }

  @Transactional
  public URI createGoogleAuthorizationUri(String redirectTo) {
    requireGoogleConfigured();
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    temporaryCodeRepository.deleteByExpiresAtBefore(now);

    String state = generateToken();
    OAuthTemporaryCodeEntity temporaryCode = OAuthTemporaryCodeEntity.issueState(
        sha256(state),
        AuthProviderIdentityEntity.PROVIDER_GOOGLE,
        normalizeRedirectTo(redirectTo),
        now,
        now.plusSeconds(stateTtlSeconds)
    );
    temporaryCodeRepository.save(temporaryCode);

    String authorizationUrl = GOOGLE_AUTH_URL
        + "?client_id=" + encode(googleClientId)
        + "&redirect_uri=" + encode(googleRedirectUri)
        + "&response_type=code"
        + "&scope=" + encode("openid profile email")
        + "&state=" + encode(state);
    return URI.create(authorizationUrl);
  }

  @Transactional
  public URI handleGoogleCallback(String code, String state) {
    requireGoogleConfigured();
    OAuthTemporaryCodeEntity temporaryCode = requireActiveState(state);
    GoogleTokenResponse tokenResponse = exchangeGoogleCode(code);
    GoogleUserInfoResponse userInfo = fetchGoogleUserInfo(tokenResponse.accessToken());
    UserAccountEntity userAccount = findOrCreateGoogleUser(userInfo);

    String exchangeCode = generateToken();
    temporaryCode.attachExchangeCode(
        sha256(exchangeCode),
        userInfo.sub(),
        userAccount,
        OffsetDateTime.now(ZoneOffset.UTC).plusSeconds(exchangeCodeTtlSeconds)
    );

    return buildFrontendCallbackUri(exchangeCode, temporaryCode.getRedirectTo());
  }

  @Transactional
  public AuthSessionResponse exchangeTemporaryCode(String code, String userAgent, String ipAddress) {
    OAuthTemporaryCodeEntity temporaryCode = temporaryCodeRepository
        .findByExchangeCodeHashAndConsumedAtIsNull(sha256(code))
        .orElseThrow(() -> new UnauthorizedException("Mã đăng nhập OAuth không hợp lệ hoặc đã hết hạn."));
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    if (temporaryCode.isExpired(now) || temporaryCode.getUserAccount() == null) {
      temporaryCode.consume(now);
      throw new UnauthorizedException("Mã đăng nhập OAuth không hợp lệ hoặc đã hết hạn.");
    }

    temporaryCode.consume(now);
    return authService.createOAuthSession(temporaryCode.getUserAccount(), userAgent, ipAddress);
  }

  private OAuthTemporaryCodeEntity requireActiveState(String state) {
    OAuthTemporaryCodeEntity temporaryCode = temporaryCodeRepository
        .findByStateHashAndConsumedAtIsNull(sha256(state))
        .orElseThrow(() -> new UnauthorizedException("Phiên OAuth không hợp lệ hoặc đã hết hạn."));
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    if (temporaryCode.isExpired(now)) {
      temporaryCode.consume(now);
      throw new UnauthorizedException("Phiên OAuth không hợp lệ hoặc đã hết hạn.");
    }
    if (temporaryCode.getExchangeCodeHash() != null) {
      throw new UnauthorizedException("Phiên OAuth đã được xử lý.");
    }
    return temporaryCode;
  }

  private GoogleTokenResponse exchangeGoogleCode(String code) {
    try {
      LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
      form.add("code", code);
      form.add("client_id", googleClientId);
      form.add("client_secret", googleClientSecret);
      form.add("redirect_uri", googleRedirectUri);
      form.add("grant_type", "authorization_code");

      GoogleTokenResponse response = googleTokenClient.post()
          .uri("/token")
          .contentType(MediaType.APPLICATION_FORM_URLENCODED)
          .body(form)
          .retrieve()
          .body(GoogleTokenResponse.class);
      if (response == null || trimToNull(response.accessToken()) == null) {
        throw new BadRequestException("Google OAuth không trả access token hợp lệ.");
      }
      return response;
    } catch (RuntimeException exception) {
      throw new BadRequestException("Không thể xác thực với Google OAuth.");
    }
  }

  private GoogleUserInfoResponse fetchGoogleUserInfo(String accessToken) {
    try {
      GoogleUserInfoResponse response = googleUserInfoClient.get()
          .uri("/userinfo")
          .header("Authorization", "Bearer " + accessToken)
          .retrieve()
          .body(GoogleUserInfoResponse.class);
      if (response == null || trimToNull(response.sub()) == null || trimToNull(response.email()) == null) {
        throw new BadRequestException("Google OAuth không trả đủ thông tin tài khoản.");
      }
      return response;
    } catch (RuntimeException exception) {
      throw new BadRequestException("Không thể lấy thông tin tài khoản Google.");
    }
  }

  private UserAccountEntity findOrCreateGoogleUser(GoogleUserInfoResponse userInfo) {
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    return providerIdentityRepository
        .findOneWithUserAccountByProviderAndProviderSubject(
            AuthProviderIdentityEntity.PROVIDER_GOOGLE,
            userInfo.sub()
        )
        .map(identity -> {
          identity.updateFromGoogle(normalizeEmail(userInfo.email()), trimToNull(userInfo.picture()), now);
          UserAccountEntity userAccount = identity.getUserAccount();
          userAccount.markLoggedIn(now);
          return userAccount;
        })
        .orElseGet(() -> findVerifiedLocalUserOrCreateGoogleUser(userInfo, now));
  }

  private UserAccountEntity findVerifiedLocalUserOrCreateGoogleUser(
      GoogleUserInfoResponse userInfo,
      OffsetDateTime now
  ) {
    String normalizedEmail = normalizeEmail(userInfo.email());
    if (isGoogleEmailVerified(userInfo)) {
      return userAccountRepository.findByEmailIgnoreCase(normalizedEmail)
          .map(userAccount -> linkGoogleIdentity(userAccount, userInfo, normalizedEmail, now))
          .orElseGet(() -> createGoogleUser(userInfo, now));
    }
    return createGoogleUser(userInfo, now);
  }

  private UserAccountEntity linkGoogleIdentity(
      UserAccountEntity userAccount,
      GoogleUserInfoResponse userInfo,
      String normalizedEmail,
      OffsetDateTime now
  ) {
    String avatarUrl = trimToNull(userInfo.picture());
    if (!userAccount.isEmailVerified()) {
      userAccount.markEmailVerified(now);
    }
    if (userAccount.getAvatarUrl() == null && avatarUrl != null) {
      userAccount.updateAvatar(avatarUrl, now);
    }
    userAccount.markLoggedIn(now);
    providerIdentityRepository.save(AuthProviderIdentityEntity.createGoogle(
        userAccount,
        userInfo.sub(),
        normalizedEmail,
        avatarUrl,
        now
    ));
    return userAccount;
  }

  private UserAccountEntity createGoogleUser(GoogleUserInfoResponse userInfo, OffsetDateTime now) {
    RoleEntity customerRole = roleRepository.findByCode(RoleCode.CUSTOMER)
        .orElseThrow(() -> new IllegalStateException("Thiếu dữ liệu vai trò khách hàng."));
    String oauthEmail = resolveGoogleUserAccountEmail(userInfo);
    UserAccountEntity userAccount = UserAccountEntity.register(
        oauthEmail,
        passwordEncoder.encode(generateToken()),
        normalizeDisplayName(userInfo.name(), userInfo.email()),
        null,
        "active",
        now
    );
    if (isGoogleEmailVerified(userInfo)) {
      userAccount.markEmailVerified(now);
    }
    String avatarUrl = trimToNull(userInfo.picture());
    if (avatarUrl != null) {
      userAccount.updateAvatar(avatarUrl, now);
    }
    userAccount.getRoles().add(customerRole);
    UserAccountEntity savedUserAccount = userAccountRepository.save(userAccount);
    providerIdentityRepository.save(AuthProviderIdentityEntity.createGoogle(
        savedUserAccount,
        userInfo.sub(),
        normalizeEmail(userInfo.email()),
        avatarUrl,
        now
    ));
    return savedUserAccount;
  }

  private URI buildFrontendCallbackUri(String exchangeCode, String redirectTo) {
    String callbackUrl = frontendCallbackUrl == null ? "http://localhost:3000/oauth/callback" : frontendCallbackUrl;
    String separator = callbackUrl.contains("?") ? "&" : "?";
    String url = callbackUrl + separator + "code=" + encode(exchangeCode);
    if (redirectTo != null) {
      url += "&redirectTo=" + encode(redirectTo);
    }
    return URI.create(url);
  }

  private void requireGoogleConfigured() {
    if (googleClientId == null || googleClientSecret == null || googleRedirectUri == null) {
      throw new BadRequestException("Cấu hình Google OAuth chưa đầy đủ.");
    }
  }

  private String normalizeRedirectTo(String redirectTo) {
    String trimmedRedirectTo = trimToNull(redirectTo);
    if (trimmedRedirectTo == null || !trimmedRedirectTo.startsWith("/") || trimmedRedirectTo.startsWith("//")) {
      return null;
    }
    return trimmedRedirectTo.length() > 500 ? trimmedRedirectTo.substring(0, 500) : trimmedRedirectTo;
  }

  private String buildInternalOAuthEmail(String providerSubject) {
    String subjectHash = sha256(providerSubject).substring(0, 32);
    return "google-" + subjectHash + "@" + OAUTH_EMAIL_DOMAIN;
  }

  private String resolveGoogleUserAccountEmail(GoogleUserInfoResponse userInfo) {
    if (isGoogleEmailVerified(userInfo)) {
      return normalizeEmail(userInfo.email());
    }
    return buildInternalOAuthEmail(userInfo.sub());
  }

  private String normalizeEmail(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeDisplayName(String name, String email) {
    String displayName = trimToNull(name);
    if (displayName != null) {
      return displayName.length() > 160 ? displayName.substring(0, 160) : displayName;
    }
    return normalizeEmail(email);
  }

  private boolean isGoogleEmailVerified(GoogleUserInfoResponse userInfo) {
    return Boolean.TRUE.equals(userInfo.emailVerified());
  }

  private String generateToken() {
    byte[] bytes = new byte[TOKEN_BYTE_LENGTH];
    secureRandom.nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }

  private String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("Không thể tạo mã băm OAuth.", exception);
    }
  }

  private String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  @JsonIgnoreProperties(ignoreUnknown = true)
  private record GoogleTokenResponse(
      @JsonProperty("access_token") String accessToken
  ) {
  }

  @JsonIgnoreProperties(ignoreUnknown = true)
  private record GoogleUserInfoResponse(
      String sub,
      String email,
      String name,
      String picture,
      @JsonProperty("email_verified") Boolean emailVerified
  ) {
  }
}
