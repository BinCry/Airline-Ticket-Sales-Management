package com.qlvmb.airticket.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.qlvmb.airticket.config.SecurityConfig;
import com.qlvmb.airticket.domain.entity.PermissionEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.domain.dto.MyNotificationResponse;
import com.qlvmb.airticket.domain.dto.MyProfileResponse;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.JwtAuthenticationFilter;
import com.qlvmb.airticket.security.JwtTokenService;
import com.qlvmb.airticket.service.AdminDashboardService;
import com.qlvmb.airticket.service.AuthService;
import com.qlvmb.airticket.service.AuthSummaryService;
import com.qlvmb.airticket.service.AdminUserService;
import com.qlvmb.airticket.service.BackofficeOperationsService;
import com.qlvmb.airticket.service.BackofficeRevenueService;
import com.qlvmb.airticket.service.BackofficeSalesService;
import com.qlvmb.airticket.service.BackofficeVoucherService;
import com.qlvmb.airticket.service.BookingLookupSessionService;
import com.qlvmb.airticket.service.BookingService;
import com.qlvmb.airticket.service.CheckinService;
import com.qlvmb.airticket.service.CmsHomepageService;
import com.qlvmb.airticket.service.FinanceService;
import com.qlvmb.airticket.service.MemberLoyaltyService;
import com.qlvmb.airticket.service.MemberVoucherService;
import com.qlvmb.airticket.service.MyAccountService;
import com.qlvmb.airticket.service.NotificationOutboxService;
import com.qlvmb.airticket.service.PaymentService;
import com.qlvmb.airticket.service.CustomerOverviewService;
import com.qlvmb.airticket.service.SupportOverviewService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
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
        BackofficeSalesController.class,
        FinanceController.class,
        AdminController.class,
        SupportNotificationController.class,
        CmsController.class,
        ApiMetaController.class,
        BackofficeOperationsController.class,
        BackofficeVoucherController.class,
        BackofficeRevenueController.class
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
  private AuthService authService;

  @MockitoBean
  private AuthSummaryService authSummaryService;

  @MockitoBean
  private AdminUserService adminUserService;

  @MockitoBean
  private AdminDashboardService adminDashboardService;

  @MockitoBean
  private MyAccountService myAccountService;

  @MockitoBean
  private MemberLoyaltyService memberLoyaltyService;

  @MockitoBean
  private MemberVoucherService memberVoucherService;

  @MockitoBean
  private CustomerOverviewService customerOverviewService;

  @MockitoBean
  private BookingService bookingService;

  @MockitoBean
  private BookingLookupSessionService bookingLookupSessionService;

  @MockitoBean
  private PaymentService paymentService;

  @MockitoBean
  private CheckinService checkinService;

  @MockitoBean
  private FinanceService financeService;

  @MockitoBean
  private NotificationOutboxService notificationOutboxService;

  @MockitoBean
  private SupportOverviewService supportOverviewService;

  @MockitoBean
  private CmsHomepageService cmsHomepageService;

  @MockitoBean
  private BackofficeOperationsService backofficeOperationsService;

  @MockitoBean
  private BackofficeSalesService backofficeSalesService;

  @MockitoBean
  private BackofficeVoucherService backofficeVoucherService;

  @MockitoBean
  private BackofficeRevenueService backofficeRevenueService;

  @MockitoBean
  private UserAccountRepository userAccountRepository;

  @BeforeEach
  void setUpAuthenticatedUsers() {
    org.mockito.Mockito.when(userAccountRepository.findOneWithRolesById(101L))
        .thenReturn(java.util.Optional.of(createUserAccount(
            101L,
            "khach@example.com",
            "Khach Hang",
            "active",
            List.of("customer"),
            List.of("customer.self_service")
        )));
    org.mockito.Mockito.when(userAccountRepository.findOneWithRolesById(151L))
        .thenReturn(java.util.Optional.of(createUserAccount(
            151L,
            "hoivien@example.com",
            "Hoi Vien",
            "active",
            List.of("member"),
            List.of("customer.self_service", "member.loyalty")
        )));
    org.mockito.Mockito.when(userAccountRepository.findOneWithRolesById(201L))
        .thenReturn(java.util.Optional.of(createUserAccount(
            201L,
            "support@example.com",
            "Support",
            "active",
            List.of("customer_support"),
            List.of("backoffice.sales", "backoffice.support", "backoffice.finance", "backoffice.cms")
        )));
    org.mockito.Mockito.when(userAccountRepository.findOneWithRolesById(301L))
        .thenReturn(java.util.Optional.of(createUserAccount(
            301L,
            "ops@example.com",
            "Operations",
            "active",
            List.of("operations_staff"),
            List.of("backoffice.operations", "backoffice.admin")
        )));
    org.mockito.Mockito.doAnswer(invocation -> {
          String lookupToken = invocation.getArgument(1, String.class);
          if (lookupToken == null || lookupToken.isBlank()) {
            throw new UnauthorizedException("Thiáº¿u phiÃªn tra cá»©u OTP.");
          }
          return null;
        })
        .when(bookingLookupSessionService)
        .assertLookupSessionAllowed(ArgumentMatchers.anyString(), ArgumentMatchers.any());
  }

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
  void getMyNotifications_shouldRequireAuthentication() throws Exception {
    mockMvc.perform(get("/api/me/notifications"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void getMyNotifications_shouldAllowAuthenticatedUser() throws Exception {
    org.mockito.Mockito.when(notificationOutboxService.getMyNotifications(ArgumentMatchers.any()))
        .thenReturn(List.of(new MyNotificationResponse(
            7L,
            "TICKET_EMAIL",
            "QC5004",
            "Thông báo vé điện tử",
            "Nội dung thông báo",
            "SENT",
            OffsetDateTime.parse("2026-05-17T14:30:00Z"),
            OffsetDateTime.parse("2026-05-17T14:31:00Z")
        )));

    mockMvc.perform(get("/api/me/notifications")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(7))
        .andExpect(jsonPath("$[0].bookingCode").value("QC5004"))
        .andExpect(jsonPath("$[0].subject").value("Thông báo vé điện tử"))
        .andExpect(jsonPath("$[0].recipientEmail").doesNotExist());
  }

  @Test
  void getMyProfile_shouldAllowAuthenticatedUser() throws Exception {
    org.mockito.Mockito.when(authService.getMyProfile(ArgumentMatchers.any()))
        .thenReturn(new MyProfileResponse(
            101L,
            "khach@example.com",
            "Khach Hang",
            "0909123456",
            null,
            true,
            "active",
            List.of("customer")
        ));

    mockMvc.perform(get("/api/me/profile")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isOk());
  }

  @Test
  void getMyProfile_shouldAllowOperationsStaff() throws Exception {
    org.mockito.Mockito.when(authService.getMyProfile(ArgumentMatchers.any()))
        .thenReturn(new MyProfileResponse(
            301L,
            "ops@example.com",
            "Operations",
            "0909000000",
            null,
            true,
            "active",
            List.of("operations_staff")
        ));

    mockMvc.perform(get("/api/me/profile")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("operations_staff"), List.of("backoffice.operations", "backoffice.admin"))
            ))
        .andExpect(status().isOk());
  }

  @Test
  void getMyPassengers_shouldRejectSupportRole() throws Exception {
    mockMvc.perform(get("/api/me/passengers")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("customer_support"), List.of("backoffice.sales", "backoffice.support"))
            ))
        .andExpect(status().isForbidden());
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
  void getMyLoyalty_shouldAllowMemberRole() throws Exception {
    mockMvc.perform(get("/api/me/loyalty")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("member"), List.of("customer.self_service", "member.loyalty"))
            ))
        .andExpect(status().isOk());
  }

  @Test
  void getMyLoyalty_shouldRejectCustomerRole() throws Exception {
    mockMvc.perform(get("/api/me/loyalty")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getMyVouchers_shouldAllowMemberRole() throws Exception {
    mockMvc.perform(get("/api/me/vouchers")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("member"), List.of("customer.self_service", "member.loyalty"))
            ))
        .andExpect(status().isOk());
  }

  @Test
  void getMyVouchers_shouldRejectCustomerRole() throws Exception {
    mockMvc.perform(get("/api/me/vouchers")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void hideMyVoucherHistory_shouldAllowMemberRole() throws Exception {
    mockMvc.perform(delete("/api/me/vouchers/MEM52026/history")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("member"), List.of("customer.self_service", "member.loyalty"))
            ))
        .andExpect(status().isNoContent());
  }

  @Test
  void hideMyVoucherHistory_shouldRejectCustomerRole() throws Exception {
    mockMvc.perform(delete("/api/me/vouchers/MEM52026/history")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("customer"), List.of("customer.self_service"))
            ))
        .andExpect(status().isForbidden());
  }

  @Test
  void applyVoucher_shouldAllowMemberRole() throws Exception {
    mockMvc.perform(post("/api/bookings/A6C2P1/apply-voucher")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "voucherCode": "MEM52026"
                }
                """)
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("member"), List.of("customer.self_service", "member.loyalty"))
            ))
        .andExpect(status().isOk());
  }

  @Test
  void applyVoucher_shouldRejectCustomerRole() throws Exception {
    mockMvc.perform(post("/api/bookings/A6C2P1/apply-voucher")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "voucherCode": "MEM52026"
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void removeVoucher_shouldAllowMemberRole() throws Exception {
    mockMvc.perform(delete("/api/bookings/A6C2P1/apply-voucher")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("member"), List.of("customer.self_service", "member.loyalty"))
            ))
        .andExpect(status().isOk());
  }

  @Test
  void removeVoucher_shouldRejectCustomerRole() throws Exception {
    mockMvc.perform(delete("/api/bookings/A6C2P1/apply-voucher")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
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
  void createBackofficeCmsHomepage_shouldAllowCustomerSupportPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/cms/homepage")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "section": "banner",
                  "title": "Khởi động mùa hè",
                  "subtitle": "Ưu đãi nội địa",
                  "cta": "Đặt vé ngay",
                  "category": "Khuyến mãi",
                  "summary": "Ưu đãi cho các đường bay nội địa.",
                  "locale": "vi",
                  "sortOrder": 10,
                  "published": false
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.cms"))))
        .andExpect(status().isOk());
  }

  @Test
  void createBackofficeCmsHomepage_shouldRejectOperationsPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/cms/homepage")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "section": "banner",
                  "title": "Khởi động mùa hè",
                  "locale": "vi",
                  "sortOrder": 10,
                  "published": false
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void publishBackofficeCmsHomepage_shouldAllowCustomerSupportPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/cms/homepage/1/publish")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.cms"))))
        .andExpect(status().isOk());
  }

  @Test
  void archiveBackofficeCmsHomepage_shouldAllowCustomerSupportPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/cms/homepage/1/archive")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.cms"))))
        .andExpect(status().isOk());
  }

  @Test
  void getBackofficeSalesBookings_shouldAllowCustomerSupportPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/sales/bookings")
            .param("bookingCode", "QC5001")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.sales"))))
        .andExpect(status().isOk());
  }

  @Test
  void getBackofficeSalesBookings_shouldRejectOperationsPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/sales/bookings")
            .param("bookingCode", "QC5001")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void createBackofficeSalesBooking_shouldAllowCustomerSupportPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/sales/bookings")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "tripType": "one_way",
                  "contact": {
                    "fullName": "Tran Van B",
                    "email": "khach.hang@gmail.com",
                    "phone": "0911222333"
                  },
                  "passengers": [
                    {
                      "fullName": "Tran Van B",
                      "passengerType": "adult",
                      "dateOfBirth": "1990-02-10",
                      "documentType": "CCCD",
                      "documentNumber": "079123456789"
                    }
                  ],
                  "segments": [
                    {
                      "inventoryId": 20101
                    }
                  ],
                  "ancillaries": [],
                  "seatSelections": []
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.sales"))))
        .andExpect(status().isCreated());
  }

  @Test
  void createBackofficeSalesBooking_shouldRejectOperationsPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/sales/bookings")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "tripType": "one_way",
                  "contact": {
                    "fullName": "Tran Van B",
                    "email": "khach.hang@gmail.com",
                    "phone": "0911222333"
                  },
                  "passengers": [
                    {
                      "fullName": "Tran Van B",
                      "passengerType": "adult",
                      "dateOfBirth": "1990-02-10",
                      "documentType": "CCCD",
                      "documentNumber": "079123456789"
                    }
                  ],
                  "segments": [
                    {
                      "inventoryId": 20101
                    }
                  ],
                  "ancillaries": [],
                  "seatSelections": []
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void issueBackofficeSalesTicket_shouldAllowCustomerSupportPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/sales/bookings/QC5001/issue-ticket")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.sales"))))
        .andExpect(status().isOk());
  }

  @Test
  void issueBackofficeSalesTicket_shouldRejectOperationsPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/sales/bookings/QC5001/issue-ticket")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getBackofficeOperationsFlights_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/operations/flights")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isOk());
  }

  @Test
  void getBackofficeOperationsFlights_shouldRejectCustomerSupportPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/operations/flights")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support", "backoffice.cms"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void updateBackofficeOperationsFlight_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(patch("/api/backoffice/operations/flights/18")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "status": "delayed",
                  "gate": "G8",
                  "note": "Trễ do điều phối tàu bay.",
                  "salesOpen": false
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isOk());
  }

  @Test
  void updateBackofficeOperationsFlight_shouldRejectCustomerSupportPermission() throws Exception {
    mockMvc.perform(patch("/api/backoffice/operations/flights/18")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "status": "delayed",
                  "gate": "G8",
                  "note": "Trễ do điều phối tàu bay.",
                  "salesOpen": false
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support", "backoffice.finance"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void createBackofficeOperationsFlight_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/operations/flights")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "code": "VN6201",
                  "originCode": "SGN",
                  "destinationCode": "HAN",
                  "departureAt": "2026-06-01T01:00:00Z",
                  "arrivalAt": "2026-06-01T03:00:00Z",
                  "gate": "G8",
                  "note": "Chuyến bổ sung cuối tuần.",
                  "salesOpen": true,
                  "baseFare": 1200000
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isCreated());
  }

  @Test
  void createBackofficeOperationsFlight_shouldRejectCustomerSupportPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/operations/flights")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "code": "VN6201",
                  "originCode": "SGN",
                  "destinationCode": "HAN",
                  "departureAt": "2026-06-01T01:00:00Z",
                  "arrivalAt": "2026-06-01T03:00:00Z",
                  "gate": "G8",
                  "note": "Chuyến bổ sung cuối tuần.",
                  "salesOpen": true,
                  "baseFare": 1200000
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support", "backoffice.finance"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void cancelBackofficeOperationsFlight_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/operations/flights/18/cancel")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isOk());
  }

  @Test
  void cancelBackofficeOperationsFlight_shouldRejectCustomerSupportPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/operations/flights/18/cancel")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support", "backoffice.finance"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void hideCancelledBackofficeOperationsFlight_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(delete("/api/backoffice/operations/flights/18")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isNoContent());
  }

  @Test
  void hideCancelledBackofficeOperationsFlight_shouldRejectCustomerSupportPermission() throws Exception {
    mockMvc.perform(delete("/api/backoffice/operations/flights/18")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support", "backoffice.finance"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getBackofficeOperationsVouchers_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/operations/vouchers")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isOk());
  }

  @Test
  void getBackofficeOperationsVouchers_shouldRejectCustomerSupportPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/operations/vouchers")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support", "backoffice.finance"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getBackofficeRevenueDashboard_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/operations/revenue")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isOk());
  }

  @Test
  void getBackofficeRevenueDashboard_shouldRejectCustomerSupportPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/operations/revenue")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support", "backoffice.finance"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void createBackofficeOperationsVoucher_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/operations/vouchers")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "memberEmail": "nnn045856@gmail.com",
                  "voucherCode": "OPS52026",
                  "title": "Bù chậm chuyến",
                  "description": "Giảm giá cho hội viên bị ảnh hưởng chuyến bay.",
                  "discountAmount": 180000,
                  "currency": "VND",
                  "expiresAt": "2026-06-01T03:00:00Z"
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isOk());
  }

  @Test
  void createBackofficeOperationsVoucher_shouldRejectCustomerSupportPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/operations/vouchers")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "memberEmail": "nnn045856@gmail.com",
                  "voucherCode": "OPS52026",
                  "title": "Bù chậm chuyến",
                  "description": "Giảm giá cho hội viên bị ảnh hưởng chuyến bay.",
                  "discountAmount": 180000,
                  "currency": "VND",
                  "expiresAt": "2026-06-01T03:00:00Z"
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support", "backoffice.finance"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void updateBackofficeOperationsVoucher_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(patch("/api/backoffice/operations/vouchers/5")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "title": "Bù chậm chuyến đã cập nhật",
                  "description": "Gia hạn hỗ trợ cho hội viên bị ảnh hưởng.",
                  "discountAmount": 220000,
                  "currency": "VND",
                  "status": "available",
                  "expiresAt": "2026-06-03T03:00:00Z"
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isOk());
  }

  @Test
  void revokeBackofficeOperationsVoucher_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(post("/api/backoffice/operations/vouchers/5/revoke")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isOk());
  }

  @Test
  void deleteBackofficeOperationsVoucher_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(delete("/api/backoffice/operations/vouchers/5")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("operations_staff"), List.of("backoffice.operations"))))
        .andExpect(status().isNoContent());
  }

  @Test
  void deleteBackofficeOperationsVoucher_shouldRejectCustomerSupportPermission() throws Exception {
    mockMvc.perform(delete("/api/backoffice/operations/vouchers/5")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support", "backoffice.finance"))))
        .andExpect(status().isForbidden());
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
  void getAdminUsers_shouldRejectSupportPermission() throws Exception {
    mockMvc.perform(get("/api/admin/users")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getAdminUsers_shouldAllowAdminPermission() throws Exception {
    mockMvc.perform(get("/api/admin/users")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("operations_staff"), List.of("backoffice.operations", "backoffice.admin"))
            ))
        .andExpect(status().isOk());
  }

  @Test
  void deleteAuditLog_shouldAllowOperationsPermission() throws Exception {
    mockMvc.perform(delete("/api/admin/audit-logs/9")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("operations_staff"), List.of("backoffice.operations", "backoffice.admin"))
            ))
        .andExpect(status().isNoContent());
  }

  @Test
  void deleteAuditLog_shouldRejectCustomerSupportPermission() throws Exception {
    mockMvc.perform(delete("/api/admin/audit-logs/9")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getSupportNotifications_shouldAllowSupportPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/support/notifications")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.support"))))
        .andExpect(status().isOk());
  }

  @Test
  void getSupportNotifications_shouldRejectCustomerPermission() throws Exception {
    mockMvc.perform(get("/api/backoffice/support/notifications")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void getBookingManage_shouldRejectPublicAccessWhenLookupTokenMissing() throws Exception {
    mockMvc.perform(get("/api/bookings/manage/A6C2P1"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void getBookingManage_shouldAllowPublicAccessWhenLookupTokenProvided() throws Exception {
    mockMvc.perform(get("/api/bookings/manage/A6C2P1")
            .header("X-Booking-Lookup-Token", "lookup-token-hop-le"))
        .andExpect(status().isOk());
  }

  @Test
  void getBookingManage_shouldAllowCustomerOwnedBookingWithoutLookupToken() throws Exception {
    mockMvc.perform(get("/api/bookings/manage/A6C2P1")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isOk());
  }

  @Test
  void getBookingManage_shouldAllowMemberOwnedBookingWithoutLookupToken() throws Exception {
    mockMvc.perform(get("/api/bookings/manage/A6C2P1")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("member"), List.of("customer.self_service", "member.loyalty"))
            ))
        .andExpect(status().isOk());
  }

  @Test
  void getBookingManage_shouldReturnNotFoundForCustomerWhenBookingNotOwned() throws Exception {
    org.mockito.Mockito.doThrow(new NotFoundException("Khong tim thay dat cho."))
        .when(bookingService)
        .assertOwnedByAuthenticatedUser(ArgumentMatchers.eq("A6C2P1"), ArgumentMatchers.any());

    mockMvc.perform(get("/api/bookings/manage/A6C2P1")
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer"), List.of("customer.self_service"))))
        .andExpect(status().isNotFound());
  }

  @Test
  void getBookingManage_shouldReturnNotFoundForMemberWhenBookingNotOwned() throws Exception {
    org.mockito.Mockito.doThrow(new NotFoundException("Khong tim thay dat cho."))
        .when(bookingService)
        .assertOwnedByAuthenticatedUser(ArgumentMatchers.eq("A6C2P1"), ArgumentMatchers.any());

    mockMvc.perform(get("/api/bookings/manage/A6C2P1")
            .header(
                HttpHeaders.AUTHORIZATION,
                bearerToken(List.of("member"), List.of("customer.self_service", "member.loyalty"))
            ))
        .andExpect(status().isNotFound());
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
  void paymentCallback_shouldRejectPublicAccess() throws Exception {
    mockMvc.perform(post("/api/payments/callback")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "bookingCode": "A6C2P1",
                  "result": "success"
                }
                """))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void paymentCallback_shouldAllowBackofficeSalesAccess() throws Exception {
    mockMvc.perform(post("/api/payments/callback")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "bookingCode": "A6C2P1",
                  "result": "success"
                }
                """)
            .header(HttpHeaders.AUTHORIZATION, bearerToken(List.of("customer_support"), List.of("backoffice.sales"))))
        .andExpect(status().isOk());
  }

  @Test
  void sePayWebhook_shouldAllowPublicAccess() throws Exception {
    mockMvc.perform(post("/api/payments/webhooks/sepay")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "id": 123456,
                  "gateway": "BIDV",
                  "transactionDate": "2026-05-17 10:30:00",
                  "accountNumber": "1234567890",
                  "code": "SEPAY-000000000001",
                  "transferType": "in",
                  "transferAmount": 2310000,
                  "referenceCode": "FT123456789"
                }
                """))
        .andExpect(status().isOk());
  }

  @Test
  void createRefundRequest_shouldRejectPublicAccessWhenLookupTokenMissing() throws Exception {
    mockMvc.perform(post("/api/bookings/A6C2P1/refund-request")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "reason": "Thay doi ke hoach"
                }
                """))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void createRefundRequest_shouldAllowPublicAccessWhenLookupTokenProvided() throws Exception {
    mockMvc.perform(post("/api/bookings/A6C2P1/refund-request")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "reason": "Thay doi ke hoach"
                }
                """)
            .header("X-Booking-Lookup-Token", "lookup-token-hop-le"))
        .andExpect(status().isOk());
  }

  @Test
  void completeCheckin_shouldRejectPublicAccessWhenLookupTokenMissing() throws Exception {
    mockMvc.perform(post("/api/check-in/complete")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "bookingCode": "A6C2P1",
                  "ticketNumbers": ["7380000000001"]
                }
                """))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void completeCheckin_shouldAllowPublicAccessWhenLookupTokenProvided() throws Exception {
    mockMvc.perform(post("/api/check-in/complete")
            .contentType(APPLICATION_JSON)
            .content("""
                {
                  "bookingCode": "A6C2P1",
                  "ticketNumbers": ["7380000000001"]
                }
                """)
            .header("X-Booking-Lookup-Token", "lookup-token-hop-le"))
        .andExpect(status().isOk());
  }

  @Test
  void getCmsHomepage_shouldAllowPublicAccess() throws Exception {
    mockMvc.perform(get("/api/cms/homepage"))
        .andExpect(status().isOk());
  }

  @Test
  void getApiHealth_shouldAllowPublicAccess() throws Exception {
    mockMvc.perform(get("/api/meta/health"))
        .andExpect(status().isOk());
  }

  @Test
  void getAvatarUpload_shouldNotRequireAuthentication() throws Exception {
    mockMvc.perform(get("/uploads/avatars/khong-ton-tai.jpg"))
        .andExpect(status().isNotFound());
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
    return "Bearer " + createAccessToken(resolveUserId(roles), roles, permissions);
  }

  private String createAccessToken(Long userId, List<String> roles, List<String> permissions) {
    OffsetDateTime issuedAt = OffsetDateTime.now(ZoneOffset.UTC);
    SecretKey secretKey = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));
    return Jwts.builder()
        .issuer(JWT_ISSUER)
        .subject(userId.toString())
        .issuedAt(java.util.Date.from(issuedAt.toInstant()))
        .expiration(java.util.Date.from(issuedAt.plusMinutes(15).toInstant()))
        .claim("type", "access")
        .claim("email", "stub@example.com")
        .claim("displayName", "Stub User")
        .claim("roles", roles)
        .claim("permissions", permissions)
        .signWith(secretKey)
        .compact();
  }

  private Long resolveUserId(List<String> roles) {
    if (roles.contains("operations_staff")) {
      return 301L;
    }
    if (roles.contains("customer_support")) {
      return 201L;
    }
    if (roles.contains("member")) {
      return 151L;
    }
    return 101L;
  }

  private UserAccountEntity createUserAccount(
      Long userId,
      String email,
      String displayName,
      String status,
      List<String> roles,
      List<String> permissions
  ) {
    UserAccountEntity userAccount = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(userAccount, "id", userId);
    ReflectionTestUtils.setField(userAccount, "email", email);
    ReflectionTestUtils.setField(userAccount, "displayName", displayName);
    ReflectionTestUtils.setField(userAccount, "status", status);
    ReflectionTestUtils.setField(userAccount, "emailVerified", true);
    ReflectionTestUtils.setField(userAccount, "roles", createRoles(roles, permissions));
    return userAccount;
  }

  private Set<RoleEntity> createRoles(List<String> roles, List<String> permissions) {
    Set<RoleEntity> values = new LinkedHashSet<>();

    for (String roleCode : roles) {
      RoleEntity role = BeanUtils.instantiateClass(RoleEntity.class);
      ReflectionTestUtils.setField(role, "code", roleCode);
      ReflectionTestUtils.setField(role, "name", roleCode);
      ReflectionTestUtils.setField(role, "permissions", createPermissions(permissions));
      values.add(role);
    }

    return values;
  }

  private Set<PermissionEntity> createPermissions(List<String> permissions) {
    Set<PermissionEntity> values = new LinkedHashSet<>();

    for (String permissionCode : permissions) {
      PermissionEntity permission = BeanUtils.instantiateClass(PermissionEntity.class);
      ReflectionTestUtils.setField(permission, "code", permissionCode);
      ReflectionTestUtils.setField(permission, "description", permissionCode);
      values.add(permission);
    }

    return values;
  }
}
