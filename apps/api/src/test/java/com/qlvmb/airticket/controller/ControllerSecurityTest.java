package com.qlvmb.airticket.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.qlvmb.airticket.config.SecurityConfig;
import com.qlvmb.airticket.domain.dto.MyProfileResponse;
import com.qlvmb.airticket.security.JwtAuthenticationFilter;
import com.qlvmb.airticket.security.JwtTokenService;
import com.qlvmb.airticket.service.AuthService;
import com.qlvmb.airticket.service.DemoDataService;
import com.qlvmb.airticket.service.MyAccountService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
    controllers = {
        MeController.class,
        CustomerController.class,
        BookingController.class,
        SupportController.class,
        BackofficeCmsController.class,
        AdminController.class
    },
    properties = {
        "app.auth.jwt.issuer=airticket-api",
        "app.auth.jwt.secret=doi-secret-toi-thieu-32-ky-tu-cho-local-airticket",
        "app.auth.jwt.access-token-ttl-seconds=900",
        "app.auth.jwt.refresh-token-ttl-seconds=2592000"
    }
)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenService.class})
class ControllerSecurityTest {

  private static final String JWT_ISSUER = "airticket-api";
  private static final String JWT_SECRET = "doi-secret-toi-thieu-32-ky-tu-cho-local-airticket";

  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private DemoDataService demoDataService;

  @MockBean
  private AuthService authService;

  @MockBean
  private MyAccountService myAccountService;

  @Test
  void getMyProfile_shouldRequireAuthentication() throws Exception {
    mockMvc.perform(get("/api/me/profile"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void getMyProfile_shouldAllowAuthenticatedUser() throws Exception {
    when(authService.getMyProfile(org.mockito.ArgumentMatchers.any()))
        .thenReturn(new MyProfileResponse(
            101L,
            "khach@example.com",
            "Khach Hang",
            "0909123456",
            true,
            "active",
            List.of("customer")
        ));

    mockMvc.perform(get("/api/me/profile")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isOk());
  }

  @Test
  void getCustomerOverview_shouldAllowCustomerRole() throws Exception {
    mockMvc.perform(get("/api/customers/me/overview")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isOk());
  }

  @Test
  void getCustomerOverview_shouldRejectSupportRole() throws Exception {
    mockMvc.perform(get("/api/customers/me/overview")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getSupportOverview_shouldRejectCustomerPermission() throws Exception {
    mockMvc.perform(get("/api/support/overview")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getSupportOverview_shouldAllowSupportPermission() throws Exception {
    mockMvc.perform(get("/api/support/overview")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support"))))
        .andExpect(status().isOk());
  }

  @Test
  void getSupportOverview_shouldRejectOperationsAdminPermission() throws Exception {
    mockMvc.perform(get("/api/support/overview")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.admin"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getBackofficeCmsHomepage_shouldAllowCustomerSupportPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/cms/homepage")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support", "backoffice.cms"))))
        .andExpect(status().isOk());
  }

  @Test
  void getBackofficeCmsHomepage_shouldRejectOperationsAdminPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/cms/homepage")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.admin"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getAdminDashboard_shouldRejectCustomerSupportPermission() throws Exception {
    mockMvc.perform(get("/api/admin/dashboard")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support", "backoffice.cms"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getAdminDashboard_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(get("/api/admin/dashboard")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("operations_staff"), List.of("backoffice.operations", "backoffice.admin"))
            ))
        .andExpect(status().isOk());
  }

  @Test
  void getBookingManage_shouldAllowGuestLookupPermission() throws Exception {
    mockMvc.perform(get("/api/bookings/manage/A6C2P1")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("guest"), List.of("public.booking_lookup"))))
        .andExpect(status().isOk());
  }

  @Test
  void getBookingCheckoutPreview_shouldRejectGuestLookupPermission() throws Exception {
    mockMvc.perform(get("/api/bookings/checkout-preview")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("guest"), List.of("public.booking_lookup"))))
        .andExpect(status().isForbidden());
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
        .claim("email", "khach@example.com")
        .claim("displayName", "Khach Hang")
        .claim("roles", roles)
        .claim("permissions", permissions)
        .signWith(secretKey)
        .compact();
  }
}
