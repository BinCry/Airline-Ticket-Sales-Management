package com.qlvmb.airticket.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.qlvmb.airticket.config.SecurityConfig;
import com.qlvmb.airticket.domain.dto.FinanceRefundItem;
import com.qlvmb.airticket.security.JwtAuthenticationFilter;
import com.qlvmb.airticket.security.JwtTokenService;
import com.qlvmb.airticket.service.FinanceService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
    controllers = FinanceController.class,
    properties = {
        "app.auth.jwt.issuer=airticket-api",
        "app.auth.jwt.secret=doi-secret-toi-thieu-32-ky-tu-cho-local-airticket",
        "app.auth.jwt.access-token-ttl-seconds=900",
        "app.auth.jwt.refresh-token-ttl-seconds=2592000"
    }
)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenService.class})
class FinanceControllerTest {

  private static final String JWT_ISSUER = "airticket-api";
  private static final String JWT_SECRET = "doi-secret-toi-thieu-32-ky-tu-cho-local-airticket";

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private FinanceService financeService;

  @Test
  void getRefunds_shouldAllowCustomerSupportRole() throws Exception {
    Mockito.when(financeService.getRefunds()).thenReturn(List.of(
        new FinanceRefundItem(
            55L,
            "A6C2P1",
            "refund_pending",
            "Nguyen Van A",
            "Thay doi ke hoach",
            1490000L,
            "pending",
            OffsetDateTime.parse("2026-05-10T10:00:00+07:00")
        )
    ));

    mockMvc.perform(get("/api/backoffice/finance/refunds")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.finance"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].bookingCode").value("A6C2P1"))
        .andExpect(jsonPath("$[0].status").value("pending"));
  }

  @Test
  void getRefunds_shouldRejectCustomerRole() throws Exception {
    mockMvc.perform(get("/api/backoffice/finance/refunds")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.status").value(403))
        .andExpect(jsonPath("$.message").value("Bạn không có quyền thực hiện thao tác này."));
  }

  @Test
  void approveRefund_shouldReturnUpdatedRefund() throws Exception {
    Mockito.when(financeService.approveRefund(55L)).thenReturn(
        new FinanceRefundItem(
            55L,
            "A6C2P1",
            "cancelled",
            "Nguyen Van A",
            "Thay doi ke hoach",
            1490000L,
            "approved",
            OffsetDateTime.parse("2026-05-10T10:00:00+07:00")
        )
    );

    mockMvc.perform(post("/api/backoffice/finance/refunds/55/approve")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.finance"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("approved"))
        .andExpect(jsonPath("$.bookingStatus").value("cancelled"));
  }

  private String bearerToken(List<String> roles, List<String> permissions) {
    return "Bearer " + createAccessToken(roles, permissions);
  }

  private String createAccessToken(List<String> roles, List<String> permissions) {
    OffsetDateTime issuedAt = OffsetDateTime.now(ZoneOffset.UTC);
    SecretKey secretKey = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));
    return Jwts.builder()
        .issuer(JWT_ISSUER)
        .subject("101")
        .issuedAt(java.util.Date.from(issuedAt.toInstant()))
        .expiration(java.util.Date.from(issuedAt.plusMinutes(15).toInstant()))
        .claim("type", "access")
        .claim("email", "support@example.com")
        .claim("displayName", "Nhan Vien Ho Tro")
        .claim("roles", roles)
        .claim("permissions", permissions)
        .signWith(secretKey)
        .compact();
  }
}
