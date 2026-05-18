package com.qlvmb.airticket.security;

import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.repository.UserAccountRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  public static final String JWT_AUTH_ERROR_ATTRIBUTE = "qlvmb.jwt_auth_error";
  private static final String INVALID_ACCESS_TOKEN_MESSAGE =
      "Phi\u00ean \u0111\u0103ng nh\u1eadp kh\u00f4ng h\u1ee3p l\u1ec7 ho\u1eb7c \u0111\u00e3 h\u1ebft h\u1ea1n.";
  private static final String INACTIVE_ACCOUNT_MESSAGE =
      "Tài khoản của bạn hiện không thể tiếp tục sử dụng.";

  private final JwtTokenService jwtTokenService;
  private final UserAccountRepository userAccountRepository;

  public JwtAuthenticationFilter(
      JwtTokenService jwtTokenService,
      UserAccountRepository userAccountRepository
  ) {
    this.jwtTokenService = jwtTokenService;
    this.userAccountRepository = userAccountRepository;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    String authorization = request.getHeader("Authorization");
    if (authorization == null || !authorization.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    String token = authorization.substring(7).trim();
    if (token.isEmpty()) {
      request.setAttribute(JWT_AUTH_ERROR_ATTRIBUTE, INVALID_ACCESS_TOKEN_MESSAGE);
      filterChain.doFilter(request, response);
      return;
    }

    try {
      JwtTokenService.AccessTokenPayload payload = jwtTokenService.parseAccessToken(token);
      UserAccountEntity userAccount = userAccountRepository.findOneWithRolesById(payload.userId())
          .orElseThrow(() -> new JwtException(INVALID_ACCESS_TOKEN_MESSAGE));
      if (userAccount.isLocked() || !"active".equalsIgnoreCase(userAccount.getStatus())) {
        throw new JwtException(INACTIVE_ACCOUNT_MESSAGE);
      }

      List<String> roles = userAccount.getRoles().stream()
          .map(role -> role.getCode())
          .sorted()
          .toList();
      List<String> permissions = userAccount.getRoles().stream()
          .flatMap(role -> role.getPermissions().stream())
          .map(permission -> permission.getCode())
          .distinct()
          .sorted()
          .toList();
      List<SimpleGrantedAuthority> authorities = Stream.concat(
              roles.stream().map(role -> "ROLE_" + role.toUpperCase(Locale.ROOT)),
              permissions.stream()
          )
          .distinct()
          .map(SimpleGrantedAuthority::new)
          .toList();
      AuthenticatedUser authenticatedUser = new AuthenticatedUser(
          userAccount.getId(),
          userAccount.getEmail(),
          userAccount.getDisplayName(),
          roles,
          permissions
      );
      UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
          authenticatedUser,
          null,
          authorities
      );
      SecurityContextHolder.getContext().setAuthentication(authentication);
    } catch (JwtException exception) {
      SecurityContextHolder.clearContext();
      String errorMessage = INACTIVE_ACCOUNT_MESSAGE.equals(exception.getMessage())
          ? INACTIVE_ACCOUNT_MESSAGE
          : INVALID_ACCESS_TOKEN_MESSAGE;
      request.setAttribute(JWT_AUTH_ERROR_ATTRIBUTE, errorMessage);
    }

    filterChain.doFilter(request, response);
  }
}
