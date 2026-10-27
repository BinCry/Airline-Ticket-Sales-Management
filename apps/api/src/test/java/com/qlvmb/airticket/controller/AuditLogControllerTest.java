package com.qlvmb.airticket.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.config.SecurityConfig;
import com.qlvmb.airticket.domain.dto.AuditLogFilterRequest;
import com.qlvmb.airticket.domain.dto.AuditLogItemResponse;
import com.qlvmb.airticket.domain.dto.AuditLogPageResponse;
import com.qlvmb.airticket.domain.entity.PermissionEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.ApiExceptionHandler;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.JwtAuthenticationFilter;
import com.qlvmb.airticket.security.JwtTokenService;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.AdminDashboardService;
import com.qlvmb.airticket.service.AdminUserService;
import com.qlvmb.airticket.service.AuditLogQueryService;
import com.qlvmb.airticket.service.AuditLogExportService;
import jakarta.persistence.EntityManagerFactory;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.mail.MailSenderAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@WebMvcTest(
    controllers = {AuditLogController.class, AdminController.class},
    excludeAutoConfiguration = {DataSourceAutoConfiguration.class, HibernateJpaAutoConfiguration.class,
        FlywayAutoConfiguration.class, MailSenderAutoConfiguration.class},
    properties = {
        "app.auth.jwt.issuer=audit-log-tests",
        "app.auth.jwt.secret=audit-log-tests-only-signing-key-not-for-real-use",
        "app.auth.jwt.access-token-ttl-seconds=900",
        "app.auth.jwt.refresh-token-ttl-seconds=3600",
        "spring.flyway.enabled=false",
        "spring.main.banner-mode=off"
    }
)
// Chỉ nạp controller được kiểm thử để không quét scheduler và service nghiệp vụ.
@ContextConfiguration(classes = {AuditLogController.class, AdminController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtTokenService.class, ApiExceptionHandler.class})
class AuditLogControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private JwtTokenService jwtTokenService;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private ApplicationContext context;

  @MockitoBean private AuditLogQueryService queryService;
  @MockitoBean private AuditLogExportService exportService;
  @MockitoBean private UserAccountRepository users;
  @MockitoBean private AdminDashboardService dashboardService;
  @MockitoBean private AdminUserService adminUserService;

  @Test
  void binding_defaultsReturnAnEmptyPage() throws Exception {
    stubEmptyPage();
    mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, adminToken()))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.items").isEmpty())
        .andExpect(jsonPath("$.page").value(0))
        .andExpect(jsonPath("$.size").value(20))
        .andExpect(jsonPath("$.totalElements").value(0))
        .andExpect(jsonPath("$.totalPages").value(0));

    AuditLogFilterRequest filter = capturedFilter();
    assertThat(filter).isEqualTo(new AuditLogFilterRequest(null, null, null, null, null, null,
        null, null, null, null, null, null));
  }

  @Test
  void binding_passesAllFiltersAndIsoDatesWithoutTheCsvDayLimit() throws Exception {
    stubEmptyPage();
    mockMvc.perform(get("/api/admin/audit-logs")
            .header(HttpHeaders.AUTHORIZATION, adminToken())
            .param("page", "2").param("size", "25").param("actorId", " 0042 ")
            .param("actorKeyword", " Nguyễn An ").param("actionPrefix", " operations ")
            .param("action", "operations.flight.update").param("targetType", "flight")
            .param("targetId", " VN%_\\ ").param("keyword", " Đổi%_\\ ")
            .param("from", "2026-01-01").param("to", "2026-04-11")
            .param("includeHidden", "true"))
        .andExpect(status().isOk());

    assertThat(capturedFilter()).isEqualTo(new AuditLogFilterRequest(2, 25, "42", "Nguyễn An",
        "operations", "operations.flight.update", "flight", "VN%_\\", LocalDate.of(2026, 1, 1),
        LocalDate.of(2026, 4, 11), "Đổi%_\\", true));
  }

  @Test
  void binding_acceptsNoneAndIgnoresBlankText() throws Exception {
    stubEmptyPage();
    mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, adminToken())
            .param("actorId", " none ").param("actorKeyword", " ").param("keyword", " "))
        .andExpect(status().isOk());
    AuditLogFilterRequest filter = capturedFilter();
    assertThat(filter.actorId()).isEqualTo("none");
    assertThat(filter.actorKeyword()).isNull();
    assertThat(filter.keyword()).isNull();
  }

  @ParameterizedTest
  @ValueSource(ints = {101, Integer.MAX_VALUE})
  void binding_clampsSizeToOneHundred(int size) throws Exception {
    stubEmptyPage();
    mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, adminToken())
            .param("size", Integer.toString(size)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.size").value(100));
    assertThat(capturedFilter().size()).isEqualTo(100);
  }

  @ParameterizedTest
  @ValueSource(booleans = {true, false})
  void binding_acceptsBooleanIncludeHidden(boolean value) throws Exception {
    stubEmptyPage();
    mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, adminToken())
            .param("includeHidden", Boolean.toString(value)))
        .andExpect(status().isOk());
    assertThat(capturedFilter().includeHidden()).isEqualTo(value);
  }

  @ParameterizedTest
  @CsvSource({"from,23/10/2026", "to,not-a-date", "from,2026-02-30",
      "page,-1", "size,0", "size,-2", "page,abc", "size,abc", "page,2147483648",
      "includeHidden,maybe", "includeHidden,2"})
  void binding_invalidTypedParametersReturnJson400(String parameter, String value) throws Exception {
    expectError(mockMvc.perform(get("/api/admin/audit-logs")
        .header(HttpHeaders.AUTHORIZATION, adminToken()).param(parameter, value)), 400);
    verifyNoInteractions(queryService);
  }

  @ParameterizedTest
  @ValueSource(strings = {"0", "-1", "abc", "1.5", "9223372036854775808"})
  void binding_invalidActorIdReturnsJson400(String value) throws Exception {
    expectError(mockMvc.perform(get("/api/admin/audit-logs")
        .header(HttpHeaders.AUTHORIZATION, adminToken()).param("actorId", value)), 400);
    verifyNoInteractions(queryService);
  }

  @Test
  void binding_reversedDateRangeReturnsJson400() throws Exception {
    expectError(mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, adminToken())
        .param("from", "2026-10-24").param("to", "2026-10-23")), 400)
        .andExpect(jsonPath("$.message").value("Ngày bắt đầu không được sau ngày kết thúc."));
    verifyNoInteractions(queryService);
  }

  @Test
  void binding_excessiveOffsetReturnsJson400() throws Exception {
    expectError(mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, adminToken())
        .param("page", Integer.toString(Integer.MAX_VALUE)).param("size", "100")), 400);
    verifyNoInteractions(queryService);
  }

  static Stream<Arguments> oversizedFilters() {
    return Stream.of(Arguments.of("actorKeyword", 161), Arguments.of("actionPrefix", 121),
        Arguments.of("action", 121), Arguments.of("targetType", 81),
        Arguments.of("targetId", 121), Arguments.of("keyword", 1001));
  }

  @ParameterizedTest
  @MethodSource("oversizedFilters")
  void binding_oversizedTextReturnsJson400(String parameter, int length) throws Exception {
    expectError(mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, adminToken())
        .param(parameter, "ấ".repeat(length))), 400);
    verifyNoInteractions(queryService);
  }

  @Test
  void response_hasOnlyTheApprovedPageAndItemFieldsIncludingNullActors() throws Exception {
    OffsetDateTime time = OffsetDateTime.parse("2026-10-23T03:00:00Z");
    AuditLogItemResponse actor = new AuditLogItemResponse(9L, 42L, "admin@example.test", "Nguyễn An",
        "admin.user.roles.update", "user_account", "81", "Nội dung nguyên văn %_\\", time, false);
    AuditLogItemResponse system = new AuditLogItemResponse(8L, null, null, null,
        "member.loyalty.tier_upgrade", "member_loyalty_account", "91", "Tự động nâng hạng", time, true);
    when(queryService.getAuditLogs(any())).thenReturn(new AuditLogPageResponse(List.of(actor, system), 0, 20, 2, 1));

    byte[] json = mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, adminToken())
            .param("includeHidden", "true"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.page").value(0)).andExpect(jsonPath("$.size").value(20))
        .andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.totalPages").value(1))
        .andExpect(jsonPath("$.items[0].createdAt").value("2026-10-23T03:00:00Z"))
        .andReturn().getResponse().getContentAsByteArray();
    JsonNode page = objectMapper.readTree(json);
    assertThat(fieldNames(page)).containsExactlyInAnyOrder("items", "page", "size", "totalElements", "totalPages");
    assertThat(page.get("items").size()).isEqualTo(2);
    for (JsonNode item : page.get("items")) {
      assertThat(fieldNames(item)).containsExactlyInAnyOrder("id", "actorId", "actorEmail", "actorName",
          "action", "targetType", "targetId", "detail", "createdAt", "hidden");
    }
    assertThat(page.get("items").get(0).get("actorName").asText()).isEqualTo("Nguyễn An");
    assertThat(page.get("items").get(0).get("detail").asText()).isEqualTo("Nội dung nguyên văn %_\\");
    assertThat(page.get("items").get(1).get("actorId").isNull()).isTrue();
    assertThat(page.get("items").get(1).get("actorEmail").isNull()).isTrue();
    assertThat(page.get("items").get(1).get("actorName").isNull()).isTrue();
    assertThat(page.get("items").get(1).get("hidden").asBoolean()).isTrue();
    assertThat(capturedFilter().includeHidden()).isTrue();
  }

  @Test
  void security_unauthenticatedRequestReturns401WithoutQuerying() throws Exception {
    expectError(mockMvc.perform(get("/api/admin/audit-logs")), 401);
    verifyNoInteractions(queryService, users);
  }

  @Test
  void security_adminPermissionAllowsAccess() throws Exception {
    stubEmptyPage();
    mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, adminToken()))
        .andExpect(status().isOk());
    capturedFilter();
    verify(users).findOneWithRolesById(301L);
  }

  @ParameterizedTest
  @CsvSource({"operations_staff,backoffice.operations", "customer_support,backoffice.support",
      "customer,customer.self_service"})
  void security_nonAdminPermissionsReturn403WithoutQuerying(String role, String permission) throws Exception {
    String token = authorize(account(401L, role, List.of(permission)));
    expectError(mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, token)), 403);
    verifyNoInteractions(queryService);
  }

  @Test
  void security_adminClaimDoesNotOverrideCurrentAccountPermissions() throws Exception {
    String token = adminToken();
    when(users.findOneWithRolesById(301L)).thenReturn(Optional.of(
        account(301L, "operations_staff", List.of(PermissionCode.BACKOFFICE_OPERATIONS))));
    expectError(mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, token)), 403);
    verifyNoInteractions(queryService);
  }

  @Test
  void security_invalidJwtReturns401WithoutQuerying() throws Exception {
    expectError(mockMvc.perform(get("/api/admin/audit-logs")
        .header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt")), 401);
    verifyNoInteractions(queryService);
  }

  @ParameterizedTest
  @ValueSource(strings = {"locked", "suspended"})
  void security_inactiveAdminReturns401(String state) throws Exception {
    String token = adminToken();
    UserAccountEntity inactive = account(301L, "operations_staff", List.of(PermissionCode.BACKOFFICE_ADMIN));
    ReflectionTestUtils.setField(inactive, "status", state);
    when(users.findOneWithRolesById(301L)).thenReturn(Optional.of(inactive));
    expectError(mockMvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, token)), 401);
    verifyNoInteractions(queryService);
  }

  @Test
  void security_existingDeleteStillDelegatesToAdminDashboardService() throws Exception {
    mockMvc.perform(delete("/api/admin/audit-logs/9").header(HttpHeaders.AUTHORIZATION, adminToken()))
        .andExpect(status().isNoContent());
    verify(dashboardService).deleteAuditLog(9L);
    verifyNoInteractions(queryService);
  }

  @Test
  void security_existingDeleteRejectsOperationsWithoutAdmin() throws Exception {
    String token = authorize(account(401L, "operations_staff", List.of(PermissionCode.BACKOFFICE_OPERATIONS)));
    expectError(mockMvc.perform(delete("/api/admin/audit-logs/9")
        .header(HttpHeaders.AUTHORIZATION, token)), 403);
    verifyNoInteractions(queryService, dashboardService);
  }

  @Test
  void safety_contextHasNoDatabaseMailOrScheduler() {
    assertThat(context.getBeanNamesForType(DataSource.class)).isEmpty();
    assertThat(context.getBeanNamesForType(EntityManagerFactory.class)).isEmpty();
    assertThat(context.getBeanNamesForType(Flyway.class)).isEmpty();
    assertThat(context.getBeanNamesForType(AuditLogRepository.class)).isEmpty();
    assertThat(context.getBeanNamesForType(JavaMailSender.class)).isEmpty();
    assertThat(context.getBeanNamesForType(ScheduledAnnotationBeanPostProcessor.class)).isEmpty();
  }

  private void stubEmptyPage() {
    when(queryService.getAuditLogs(any())).thenAnswer(invocation -> {
      AuditLogFilterRequest filter = invocation.getArgument(0);
      return new AuditLogPageResponse(List.of(), filter.page(), filter.size(), 0, 0);
    });
  }

  private AuditLogFilterRequest capturedFilter() {
    ArgumentCaptor<AuditLogFilterRequest> captor = ArgumentCaptor.forClass(AuditLogFilterRequest.class);
    verify(queryService).getAuditLogs(captor.capture());
    verifyNoMoreInteractions(queryService);
    return captor.getValue();
  }

  private ResultActions expectError(ResultActions response, int code) throws Exception {
    return response.andExpect(status().is(code))
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.status").value(code))
        .andExpect(jsonPath("$.message").isNotEmpty())
        .andExpect(jsonPath("$.errors").isMap())
        .andExpect(jsonPath("$.timestamp").isString());
  }

  private String adminToken() {
    return authorize(account(301L, "operations_staff", List.of(PermissionCode.BACKOFFICE_ADMIN)));
  }

  private String authorize(UserAccountEntity account) {
    when(users.findOneWithRolesById(account.getId())).thenReturn(Optional.of(account));
    return "Bearer " + jwtTokenService.issueTokenPair(account, "local-test-session").accessToken();
  }

  private UserAccountEntity account(Long id, String roleCode, List<String> permissions) {
    UserAccountEntity account = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(account, "id", id);
    ReflectionTestUtils.setField(account, "email", "user" + id + "@example.test");
    ReflectionTestUtils.setField(account, "displayName", "Tài khoản kiểm thử");
    ReflectionTestUtils.setField(account, "status", "active");
    RoleEntity role = BeanUtils.instantiateClass(RoleEntity.class);
    ReflectionTestUtils.setField(role, "code", roleCode);
    Set<PermissionEntity> values = new LinkedHashSet<>();
    for (String code : permissions) {
      PermissionEntity permission = BeanUtils.instantiateClass(PermissionEntity.class);
      ReflectionTestUtils.setField(permission, "code", code);
      values.add(permission);
    }
    ReflectionTestUtils.setField(role, "permissions", values);
    ReflectionTestUtils.setField(account, "roles", new LinkedHashSet<>(List.of(role)));
    return account;
  }

  private Set<String> fieldNames(JsonNode node) {
    Set<String> names = new LinkedHashSet<>();
    node.fieldNames().forEachRemaining(names::add);
    return names;
  }
}
