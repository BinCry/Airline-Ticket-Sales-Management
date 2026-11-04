package com.qlvmb.airticket.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.qlvmb.airticket.config.SecurityConfig;
import com.qlvmb.airticket.domain.entity.PermissionEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.repository.VoucherStatsRepository;
import com.qlvmb.airticket.repository.VoucherStatsRepository.IssuedVoucher;
import com.qlvmb.airticket.security.JwtAuthenticationFilter;
import com.qlvmb.airticket.security.JwtTokenService;
import com.qlvmb.airticket.service.VoucherStatsService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = VoucherStatsController.class, properties = {
    "app.auth.jwt.issuer=voucher-stats-test",
    "app.auth.jwt.access-token-ttl-seconds=900",
    "app.auth.jwt.refresh-token-ttl-seconds=2592000"
})
@Import({SecurityConfig.class,JwtAuthenticationFilter.class,JwtTokenService.class,VoucherStatsService.class})
class VoucherStatsControllerTest {
  private static final String TEST_KEY = UUID.randomUUID().toString() + UUID.randomUUID();
  private static final String URL = "/api/backoffice/operations/vouchers/stats";
  @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
    registry.add("app.auth.jwt.secret",() -> TEST_KEY);
  }

  @Autowired private MockMvc mvc;
  @Autowired private JwtTokenService tokens;
  @MockitoBean private VoucherStatsRepository stats;
  @MockitoBean private UserAccountRepository users;

  @BeforeEach void prepare() {
    when(stats.findIssued(any(),any())).thenReturn(List.of());
  }

  private String token(boolean operations) {
    var user = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(user,"id",7L);
    ReflectionTestUtils.setField(user,"email","fixture@example.test");
    ReflectionTestUtils.setField(user,"displayName","Kiểm thử");
    ReflectionTestUtils.setField(user,"status","active");
    ReflectionTestUtils.setField(user,"emailVerified",true);
    var role = BeanUtils.instantiateClass(RoleEntity.class);
    ReflectionTestUtils.setField(role,"code",operations ? "operations_staff" : "member");
    var permission = BeanUtils.instantiateClass(PermissionEntity.class);
    ReflectionTestUtils.setField(permission,"code",operations ? "backoffice.operations" : "customer.self_service");
    ReflectionTestUtils.setField(role,"permissions",Set.of(permission));
    ReflectionTestUtils.setField(user,"roles",Set.of(role));
    when(users.findOneWithRolesById(7L)).thenReturn(Optional.of(user));
    return "Bearer " + tokens.issueTokenPair(user,"fixture").accessToken();
  }

  @Test void anonymousCannotReadStats() throws Exception {
    mvc.perform(get(URL)).andExpect(status().isUnauthorized());
    verifyNoInteractions(stats);
  }

  @Test void memberWithoutOperationsPermissionCannotReadStats() throws Exception {
    mvc.perform(get(URL).header("Authorization",token(false))).andExpect(status().isForbidden());
    verifyNoInteractions(stats);
  }

  @Test void operationsReceivesExplicitCohortMetadataAndUndefinedEmptyRate() throws Exception {
    mvc.perform(get(URL).header("Authorization",token(true)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.dateBasis").value("CREATED_AT"))
        .andExpect(jsonPath("$.timezone").value("Asia/Ho_Chi_Minh"))
        .andExpect(jsonPath("$.includesHidden").value(true))
        .andExpect(jsonPath("$.discountBasis").value("BOOKING_RECORDED_DISCOUNT"))
        .andExpect(jsonPath("$.summary.totalVouchers").value(0))
        .andExpect(jsonPath("$.summary.usageRate").value(org.hamcrest.Matchers.nullValue()))
        .andExpect(jsonPath("$.summary.actualDiscountComplete").value(true))
        .andExpect(jsonPath("$.memberEmail").doesNotExist());
  }

  @Test void endpointAppliesInclusiveVietnamDateBounds() throws Exception {
    mvc.perform(get(URL).param("fromDate","2026-10-01").param("toDate","2026-10-31")
        .header("Authorization",token(true))).andExpect(status().isOk());
    verify(stats).findIssued(OffsetDateTime.parse("2026-10-01T00:00:00+07:00"),
        OffsetDateTime.parse("2026-11-01T00:00:00+07:00"));
  }

  @Test void malformedDateIsBadRequestBeforeStatsQuery() throws Exception {
    mvc.perform(get(URL).param("fromDate","2026-02-30").header("Authorization",token(true)))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(stats);
  }

  @Test void reversedDatesAreBadRequestBeforeStatsQuery() throws Exception {
    mvc.perform(get(URL).param("fromDate","2026-11-02").param("toDate","2026-11-01")
        .header("Authorization",token(true))).andExpect(status().isBadRequest());
    verifyNoInteractions(stats);
  }

  @Test void historicalUsedVoucherWithoutBookingIsReportedAsIncomplete() throws Exception {
    when(stats.findIssued(any(),any())).thenReturn(List.of(new IssuedVoucher(1L,"USED","MANUAL",
        OffsetDateTime.parse("2026-03-25T09:45:00+07:00"),
        OffsetDateTime.parse("2026-04-10T23:59:00+07:00"),true,null,null,null)));
    mvc.perform(get(URL).header("Authorization",token(true)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.summary.statusCounts.USED").value(1))
        .andExpect(jsonPath("$.summary.unmatchedUsedCount").value(1))
        .andExpect(jsonPath("$.summary.actualDiscountComplete").value(false))
        .andExpect(jsonPath("$.summary.operationsHiddenCount").value(1))
        .andExpect(jsonPath("$.byMonth[0].month").value("2026-03"));
  }
}
