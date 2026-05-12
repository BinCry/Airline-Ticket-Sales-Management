package com.qlvmb.airticket.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.qlvmb.airticket.config.SecurityConfig;
import com.qlvmb.airticket.domain.dto.MyProfileResponse;
import com.qlvmb.airticket.security.JwtAuthenticationFilter;
import com.qlvmb.airticket.security.JwtTokenService;
import com.qlvmb.airticket.service.AuthService;
import com.qlvmb.airticket.service.BookingService;
import com.qlvmb.airticket.service.CheckinService;
import com.qlvmb.airticket.service.DemoDataService;
import com.qlvmb.airticket.service.FinanceService;
import com.qlvmb.airticket.service.MyAccountService;
import com.qlvmb.airticket.service.PaymentService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
    controllers = {
        AuthController.class,
        MeController.class,
        CustomerController.class,
        BookingController.class,
        PaymentController.class,
        CheckinController.class,
        SupportController.class,
        BackofficeCmsController.class,
        FinanceController.class,
        AdminController.class,
        CmsController.class
    },
    properties = {
        "app.auth.jwt.issuer=airticket-api",
        "app.auth.jwt.secret=doi-secret-toi-thieu-32-ky-tu-cho-local-airticket",
        "app.auth.jwt.access-token-ttl-seconds=900",
        "app.auth.jwt.refresh-token-ttl-seconds=2592000",
        "spring.mvc.throw-exception-if-no-handler-found=true",
        "spring.web.resources.add-mappings=false"
    }
)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenService.class})
class ControllerSecurityTest {

  private static final String JWT_ISSUER = "airticket-api";
  private static final String JWT_SECRET = "doi-secret-toi-thieu-32-ky-tu-cho-local-airticket";

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private DemoDataService demoDataService;

  @MockitoBean
  private AuthService authService;

  @MockitoBean
  private MyAccountService myAccountService;

  @MockitoBean
  private BookingService bookingService;

  @MockitoBean
  private PaymentService paymentService;

  @MockitoBean
  private CheckinService checkinService;

  @MockitoBean
  private FinanceService financeService;

  @Test
  void getMyProfile_shouldRequireAuthentication() throws Exception {
    mockMvc.perform(get("/api/me/profile"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.status").value(401))
        .andExpect(jsonPath("$.message").value("Bạn cần đăng nhập để tiếp tục."))
        .andExpect(jsonPath("$.errors").isMap())
        .andExpect(jsonPath("$.timestamp").exists());
  }

  @Test
  void getMyProfile_shouldReturnJsonUnauthorizedWhenTokenInvalid() throws Exception {
    mockMvc.perform(get("/api/me/profile")
            .header(HttpHeaders.AUTHORIZATION, "Bearer token-khong-hop-le"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.status").value(401))
        .andExpect(jsonPath("$.message").value("Phiên đăng nhập không hợp lệ hoặc đã hết hạn."))
        .andExpect(jsonPath("$.errors").isMap())
        .andExpect(jsonPath("$.timestamp").exists());
  }

  @Test
  void getMyProfile_shouldAllowAuthenticatedUser() throws Exception {
    org.mockito.Mockito.when(authService.getMyProfile(ArgumentMatchers.any()))
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
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.status").value(403))
        .andExpect(jsonPath("$.message").value("Bạn không có quyền thực hiện thao tác này."))
        .andExpect(jsonPath("$.errors").isMap())
        .andExpect(jsonPath("$.timestamp").exists());
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
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.status").value(403))
        .andExpect(jsonPath("$.message").value("Bạn không có quyền thực hiện thao tác này."));
  }

  @Test
  void getFinanceRefunds_shouldAllowCustomerSupportPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/finance/refunds")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.finance"))))
        .andExpect(status().isOk());
  }

  @Test
  void getFinanceRefunds_shouldRejectCustomerPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/finance/refunds")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.status").value(403))
        .andExpect(jsonPath("$.message").value("Bạn không có quyền thực hiện thao tác này."));
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
  void getBookingManage_shouldAllowPublicAccess() throws Exception {
    mockMvc.perform(get("/api/bookings/manage/A6C2P1"))
        .andExpect(status().isOk());
  }

  @Test
  void createBookingHold_shouldAllowPublicAccess() throws Exception {
    mockMvc.perform(post("/api/bookings/holds")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "tripType": "one_way",
                  "contact": {
                    "fullName": "Nguyen Van A",
                    "email": "a@example.com",
                    "phone": "0912345678"
                  },
                  "passengers": [
                    {
                      "fullName": "Nguyen Van A",
                      "passengerType": "adult",
                      "dateOfBirth": "1995-05-12",
                      "documentType": "CCCD",
                      "documentNumber": "079123456789"
                    }
                  ],
                  "segments": [
                    {
                      "inventoryId": 20101
                    }
                  ],
                  "ancillaries": []
                }
                """))
        .andExpect(status().isOk());
  }

  @Test
  void createPaymentSession_shouldAllowPublicAccess() throws Exception {
    mockMvc.perform(post("/api/bookings/A6C2P1/payments/session"))
        .andExpect(status().isOk());
  }

  @Test
  void paymentCallback_shouldAllowPublicAccess() throws Exception {
    mockMvc.perform(post("/api/payments/callback")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "bookingCode": "A6C2P1",
                  "result": "success"
                }
                """))
        .andExpect(status().isOk());
  }

  @Test
  void createRefundRequest_shouldAllowPublicAccess() throws Exception {
    mockMvc.perform(post("/api/bookings/A6C2P1/refund-request")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "reason": "Thay doi ke hoach"
                }
                """))
        .andExpect(status().isOk());
  }

  @Test
  void completeCheckin_shouldAllowPublicAccess() throws Exception {
    mockMvc.perform(post("/api/check-in/complete")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "bookingCode": "A6C2P1",
                  "ticketNumbers": ["7380000000001"]
                }
                """))
        .andExpect(status().isOk());
  }

  @Test
  void getCmsHomepage_shouldAllowPublicAccess() throws Exception {
    mockMvc.perform(get("/api/cms/homepage"))
        .andExpect(status().isOk());
  }

  @Test
  void register_shouldReturnJsonBadRequestForInvalidPayload() throws Exception {
    mockMvc.perform(post("/api/auth/register")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "displayName": "",
                  "email": "sai-email",
                  "phone": "abc",
                  "password": "123"
                }
                """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.status").value(400))
        .andExpect(jsonPath("$.message").value("Dữ liệu gửi lên không hợp lệ."))
        .andExpect(jsonPath("$.errors.displayName").isString())
        .andExpect(jsonPath("$.errors.email").isString())
        .andExpect(jsonPath("$.errors.phone").isString())
        .andExpect(jsonPath("$.errors.password").isString())
        .andExpect(jsonPath("$.timestamp").exists());
  }

  @Test
  void unknownApiRoute_shouldReturnJsonUnauthorizedWhenUnauthenticated() throws Exception {
    mockMvc.perform(get("/api/khong-ton-tai"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.status").value(401))
        .andExpect(jsonPath("$.message").value("Bạn cần đăng nhập để tiếp tục."))
        .andExpect(jsonPath("$.errors").isMap())
        .andExpect(jsonPath("$.timestamp").exists());
  }

  @Test
  void unknownApiRoute_shouldReturnJsonNotFoundWhenAuthenticated() throws Exception {
    mockMvc.perform(get("/api/khong-ton-tai")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.status").value(404))
        .andExpect(jsonPath("$.message").value("Không tìm thấy đường dẫn hoặc tài nguyên yêu cầu."))
        .andExpect(jsonPath("$.errors").isMap())
        .andExpect(jsonPath("$.timestamp").exists());
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
