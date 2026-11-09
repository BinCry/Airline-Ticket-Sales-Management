package com.qlvmb.airticket.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.qlvmb.airticket.config.SecurityConfig;
import com.qlvmb.airticket.domain.entity.*;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.JwtAuthenticationFilter;
import com.qlvmb.airticket.security.JwtTokenService;
import com.qlvmb.airticket.service.BackofficeVoucherService;
import com.qlvmb.airticket.service.VoucherStatsService;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@WebMvcTest(controllers = {BackofficeVoucherController.class, VoucherStatsController.class}, properties = {
    "app.auth.jwt.issuer=feature6-uat-test",
    "app.auth.jwt.access-token-ttl-seconds=900",
    "app.auth.jwt.refresh-token-ttl-seconds=2592000"
})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenService.class})
class Feature6AuthorizationUatTest {
  private static final String KEY = UUID.randomUUID().toString() + UUID.randomUUID();
  private static final String URL = "/api/backoffice/operations/vouchers";
  private static final String BODY = """
      {"memberEmail":"member@example.test","voucherCode":"TC03TEST","title":"Kiểm thử TC03",
       "description":"Dữ liệu kiểm thử quyền","discountAmount":100000,"currency":"VND",
       "status":"AVAILABLE","expiresAt":"2027-01-01T00:00:00Z"}
      """;

  @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
    r.add("app.auth.jwt.secret", () -> KEY);
  }
  @Autowired MockMvc mvc;
  @Autowired JwtTokenService tokens;
  @MockitoBean UserAccountRepository users;
  @MockitoBean BackofficeVoucherService vouchers;
  @MockitoBean VoucherStatsService stats;

  private String token(boolean operations) {
    var user = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(user, "id", 7L);
    ReflectionTestUtils.setField(user, "email", "fixture@example.test");
    ReflectionTestUtils.setField(user, "displayName", "Kiểm thử TC03");
    ReflectionTestUtils.setField(user, "status", "active");
    var permission = BeanUtils.instantiateClass(PermissionEntity.class);
    ReflectionTestUtils.setField(permission, "code", operations ? "backoffice.operations" : "customer.self_service");
    var role = BeanUtils.instantiateClass(RoleEntity.class);
    ReflectionTestUtils.setField(role, "code", operations ? "operations_staff" : "customer");
    ReflectionTestUtils.setField(role, "permissions", Set.of(permission));
    ReflectionTestUtils.setField(user, "roles", Set.of(role));
    when(users.findOneWithRolesById(7L)).thenReturn(Optional.of(user));
    return "Bearer " + tokens.issueTokenPair(user, "fixture").accessToken();
  }

  @ParameterizedTest
  @ValueSource(strings = {"list", "create", "update", "revoke", "hide", "stats"})
  void tc03CustomerCannotReachOperationsService(String action) throws Exception {
    MockHttpServletRequestBuilder request = switch (action) {
      case "create" -> post(URL).contentType(MediaType.APPLICATION_JSON).content(BODY);
      case "update" -> patch(URL + "/5").contentType(MediaType.APPLICATION_JSON).content(BODY);
      case "revoke" -> post(URL + "/5/revoke");
      case "hide" -> delete(URL + "/5");
      case "stats" -> get(URL + "/stats");
      default -> get(URL);
    };
    mvc.perform(request.header("Authorization", token(false))).andExpect(status().isForbidden());
    verifyNoInteractions(vouchers, stats);
  }

  @Test
  void tc03OperationsPositiveControlReachesService() throws Exception {
    when(vouchers.getVouchers(null, null, null)).thenReturn(
        new com.qlvmb.airticket.domain.dto.BackofficeVoucherResponse(null, null, null, List.of()));
    mvc.perform(get(URL).header("Authorization", token(true))).andExpect(status().isOk());
    org.mockito.Mockito.verify(vouchers).getVouchers(null, null, null);
  }
}
