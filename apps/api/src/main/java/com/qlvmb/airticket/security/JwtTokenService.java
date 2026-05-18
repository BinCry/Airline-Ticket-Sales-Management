package com.qlvmb.airticket.security;

import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.List;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {

  private final String issuer;
  private final long accessTokenTtlSeconds;
  private final long refreshTokenTtlSeconds;
  private final SecretKey signingKey;

  public JwtTokenService(
      @Value("${app.auth.jwt.issuer}") String issuer,
      @Value("${app.auth.jwt.secret}") String secret,
      @Value("${app.auth.jwt.access-token-ttl-seconds}") long accessTokenTtlSeconds,
      @Value("${app.auth.jwt.refresh-token-ttl-seconds}") long refreshTokenTtlSeconds
  ) {
    this.issuer = issuer;
    this.accessTokenTtlSeconds = accessTokenTtlSeconds;
    this.refreshTokenTtlSeconds = refreshTokenTtlSeconds;
    this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }

  public IssuedTokenPair issueTokenPair(UserAccountEntity userAccount, String tokenKey) {
    OffsetDateTime issuedAt = OffsetDateTime.now(ZoneOffset.UTC);
    OffsetDateTime accessTokenExpiresAt = issuedAt.plusSeconds(accessTokenTtlSeconds);
    OffsetDateTime refreshTokenExpiresAt = issuedAt.plusSeconds(refreshTokenTtlSeconds);
    List<String> roleCodes = userAccount.getRoles().stream()
        .map(role -> role.getCode())
        .sorted()
        .toList();
    List<String> permissionCodes = userAccount.getRoles().stream()
        .flatMap(role -> role.getPermissions().stream())
        .map(permission -> permission.getCode())
        .distinct()
        .sorted()
        .toList();

    String accessToken = Jwts.builder()
        .issuer(issuer)
        .subject(userAccount.getId().toString())
        .issuedAt(toDate(issuedAt))
        .expiration(toDate(accessTokenExpiresAt))
        .claim("type", "access")
        .claim("email", userAccount.getEmail())
        .claim("displayName", userAccount.getDisplayName())
        .claim("roles", roleCodes)
        .claim("permissions", permissionCodes)
        .signWith(signingKey)
        .compact();

    String refreshToken = Jwts.builder()
        .issuer(issuer)
        .subject(userAccount.getId().toString())
        .issuedAt(toDate(issuedAt))
        .expiration(toDate(refreshTokenExpiresAt))
        .claim("type", "refresh")
        .claim("tokenKey", tokenKey)
        .signWith(signingKey)
        .compact();

    return new IssuedTokenPair(accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt);
  }

  public AccessTokenPayload parseAccessToken(String token) {
    Claims claims = parseClaims(token);
    requireTokenType(claims, "access");
    @SuppressWarnings("unchecked")
    List<String> roles = claims.get("roles", List.class);
    @SuppressWarnings("unchecked")
    List<String> permissions = claims.get("permissions", List.class);
    return new AccessTokenPayload(
        Long.parseLong(claims.getSubject()),
        claims.get("email", String.class),
        claims.get("displayName", String.class),
        roles == null ? List.of() : List.copyOf(roles),
        permissions == null ? List.of() : List.copyOf(permissions)
    );
  }

  public RefreshTokenPayload parseRefreshToken(String token) {
    Claims claims = parseClaims(token);
    requireTokenType(claims, "refresh");
    return new RefreshTokenPayload(
        Long.parseLong(claims.getSubject()),
        claims.get("tokenKey", String.class)
    );
  }

  private Claims parseClaims(String token) {
    return Jwts.parser()
        .verifyWith(signingKey)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }

  private void requireTokenType(Claims claims, String expectedType) {
    String tokenType = claims.get("type", String.class);
    if (!expectedType.equals(tokenType)) {
      throw new JwtException("Loại token không hợp lệ.");
    }
  }

  private Date toDate(OffsetDateTime value) {
    return Date.from(value.toInstant());
  }

  public record IssuedTokenPair(
      String accessToken,
      String refreshToken,
      OffsetDateTime accessTokenExpiresAt,
      OffsetDateTime refreshTokenExpiresAt
  ) {
  }

  public record AccessTokenPayload(
      Long userId,
      String email,
      String displayName,
      List<String> roles,
      List<String> permissions
  ) {
  }

  public record RefreshTokenPayload(
      Long userId,
      String tokenKey
  ) {
  }
}
