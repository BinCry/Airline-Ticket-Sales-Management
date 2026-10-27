package com.qlvmb.airticket.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.config.CorsConfig;
import com.qlvmb.airticket.config.SecurityConfig;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.PermissionEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.ApiExceptionHandler;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.JwtAuthenticationFilter;
import com.qlvmb.airticket.security.JwtTokenService;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.AuditLogExportAuditService;
import com.qlvmb.airticket.service.AuditLogExportService;
import com.qlvmb.airticket.service.AuditLogQueryService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

@WebMvcTest(controllers = AuditLogController.class,
    excludeAutoConfiguration = {DataSourceAutoConfiguration.class, HibernateJpaAutoConfiguration.class,
        FlywayAutoConfiguration.class, MailSenderAutoConfiguration.class},
    properties = {"app.auth.jwt.issuer=audit-export-tests",
        "app.auth.jwt.secret=audit-export-only-signing-key-never-for-real-use",
        "app.auth.jwt.access-token-ttl-seconds=900", "app.auth.jwt.refresh-token-ttl-seconds=3600",
        "app.cors.allowed-origin-patterns=http://localhost:3000", "spring.flyway.enabled=false",
        "spring.main.banner-mode=off"})
// Service thật chỉ nhận repository, EntityManager và transaction manager giả; không nạp JPA hoặc scheduler.
@ContextConfiguration(classes = AuditLogController.class)
@Import({SecurityConfig.class, CorsConfig.class, JwtAuthenticationFilter.class, JwtTokenService.class,
    ApiExceptionHandler.class, AuditLogQueryService.class, AuditLogExportService.class,
    AuditLogExportAuditService.class})
class AuditLogExportControllerTest {

  @Autowired private MockMvc mvc;
  @Autowired private JwtTokenService tokens;
  @Autowired private ObjectMapper mapper;
  @Autowired private ApplicationContext context;
  @MockitoBean private AuditLogRepository audits;
  @MockitoBean private UserAccountRepository users;
  @MockitoBean private EntityManager entityManager;
  @MockitoBean private PlatformTransactionManager manager;

  @BeforeEach
  void transactionsAreOnlyMocks() {
    when(manager.getTransaction(any())).thenAnswer(invocation -> mock(TransactionStatus.class));
  }

  @Test
  void actionsAreDistinctSortedAndReturnedAsAJsonArray() throws Exception {
    when(audits.findDistinctActions()).thenReturn(List.of("z.new", "admin.audit.export", "z.new", "a.first"));
    mvc.perform(get("/api/admin/audit-logs/actions").header(HttpHeaders.AUTHORIZATION, admin()))
        .andExpect(status().isOk()).andExpect(content().json("[\"a.first\",\"admin.audit.export\",\"z.new\"]"));
    verify(audits).findDistinctActions();
  }

  @Test
  void emptyActionsAreAValidEmptyArray() throws Exception {
    when(audits.findDistinctActions()).thenReturn(List.of());
    mvc.perform(get("/api/admin/audit-logs/actions").header(HttpHeaders.AUTHORIZATION, admin()))
        .andExpect(status().isOk()).andExpect(content().json("[]"));
  }

  @Test
  void exportReturnsBomVietnameseCsvAndWritesOneAuditWithTheAuthenticatedActor() throws Exception {
    stubRows(List.of(row("Đổi, vé \"mới\"\nDòng hai")));
    var response = mvc.perform(get("/api/admin/audit-logs/export")
            .header(HttpHeaders.AUTHORIZATION, admin()).header(HttpHeaders.ORIGIN, "http://localhost:3000")
            .param("from", "2026-01-01").param("to", "2026-03-31")
            .param("actorId", "none").param("actorKeyword", " ")
            .param("actionPrefix", " operations ").param("action", "operations.flight.update")
            .param("targetType", "flight").param("targetId", " VN%_\\ ")
            .param("keyword", " Đổi, vé ").param("includeHidden", "true")
            .param("page", "99").param("size", "1"))
        .andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("text/csv"))
        .andExpect(header().string("X-Export-Truncated", "false"))
        .andExpect(header().doesNotExist("X-Export-Warning"))
        .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"))
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
        .andReturn().getResponse();
    byte[] bytes = response.getContentAsByteArray();
    assertThat(bytes).startsWith((byte) 0xef, (byte) 0xbb, (byte) 0xbf);
    assertThat(new String(bytes, StandardCharsets.UTF_8)).contains("\"Đổi, vé \"\"mới\"\"\nDòng hai\"")
        .contains("\"1\",\"\",\"\",\"\"");
    assertThat(response.getCharacterEncoding()).isEqualTo("UTF-8");
    assertThat(response.getHeader(HttpHeaders.CONTENT_DISPOSITION))
        .isEqualTo("attachment; filename=\"audit-logs-2026-01-01_2026-03-31.csv\"");
    assertThat(Long.parseLong(response.getHeader(HttpHeaders.CONTENT_LENGTH))).isEqualTo(bytes.length);
    assertThat(response.getHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS))
        .isEqualTo("Content-Disposition, X-Export-Truncated, X-Export-Warning");
    var event = capturedEvent();
    assertThat(event.getActorUserAccount().getId()).isEqualTo(301L);
    assertThat(event.getAction()).isEqualTo("admin.audit.export");
    var metadata = mapper.readTree(event.getDetail());
    assertThat(metadata.path("rowsPrepared").asInt()).isEqualTo(1);
    assertThat(metadata.path("status").asText()).isEqualTo("SERVER_WRITE_COMPLETED");
    var filters = metadata.path("filters");
    assertThat(filters.path("actorId").asText()).isEqualTo("none");
    assertThat(filters.has("actorKeyword")).isFalse();
    assertThat(filters.path("actionPrefix").asText()).isEqualTo("operations");
    assertThat(filters.path("action").asText()).isEqualTo("operations.flight.update");
    assertThat(filters.path("targetType").asText()).isEqualTo("flight");
    assertThat(filters.path("targetId").asText()).isEqualTo("VN%_\\");
    assertThat(filters.path("keyword").asText()).isEqualTo("Đổi, vé");
    assertThat(filters.path("includeHidden").asBoolean()).isTrue();
    assertThat(filters.has("page")).isFalse();
  }

  @Test
  void actorKeywordIsNormalizedAndPreservedInExportAuditMetadata() throws Exception {
    stubRows(List.of());
    mvc.perform(get("/api/admin/audit-logs/export").header(HttpHeaders.AUTHORIZATION, admin())
            .param("from", "2026-01-01").param("to", "2026-01-02").param("actorKeyword", " An%_\\ "))
        .andExpect(status().isOk());
    assertThat(mapper.readTree(capturedEvent().getDetail()).path("filters").path("actorKeyword").asText())
        .isEqualTo("An%_\\");
  }

  @ParameterizedTest
  @ValueSource(ints = {10000, 10001})
  void truncationHeaderDependsOnAnActualExtraRow(int count) throws Exception {
    when(audits.findAll(any(Specification.class), any(Pageable.class))).thenAnswer(invocation -> {
      Pageable page = invocation.getArgument(1);
      int remaining = Math.max(0, count - (int) page.getOffset());
      return new PageImpl<>(Collections.nCopies(Math.min(500, remaining), row("Dòng")), page, count);
    });
    var response = mvc.perform(get("/api/admin/audit-logs/export").header(HttpHeaders.AUTHORIZATION, admin())
            .param("from", "2026-01-01").param("to", "2026-01-02"))
        .andExpect(status().isOk()).andExpect(header().string("X-Export-Truncated", Boolean.toString(count > 10000)))
        .andReturn().getResponse();
    assertThat(response.getContentAsString(StandardCharsets.UTF_8).lines().count()).isEqualTo(10001);
    assertThat(response.getHeader("X-Export-Warning"))
        .isEqualTo(count > 10000 ? "truncated-at-10000-rows" : null);
    assertThat(mapper.readTree(capturedEvent().getDetail()).path("rowsPrepared").asInt()).isEqualTo(10000);
  }

  @Test
  void auditPersistenceFailureDoesNotCorruptTheCsv() throws Exception {
    stubRows(List.of(row("Nội dung")));
    when(audits.save(any())).thenThrow(new IllegalStateException("Audit failed"));
    var response = mvc.perform(get("/api/admin/audit-logs/export").header(HttpHeaders.AUTHORIZATION, admin())
            .param("from", "2026-01-01").param("to", "2026-01-02"))
        .andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("text/csv"))
        .andReturn().getResponse();
    assertThat(response.getContentAsString(StandardCharsets.UTF_8)).startsWith("\ufeff").contains("Nội dung");
    verify(audits).save(any());
  }

  @Test
  void queryFailureIsJson500BeforeCsvHeadersAndDoesNotWriteAnExportEvent() throws Exception {
    when(audits.findAll(any(Specification.class), any(Pageable.class)))
        .thenThrow(new IllegalStateException("Query failed"));
    expectError(mvc.perform(get("/api/admin/audit-logs/export").header(HttpHeaders.AUTHORIZATION, admin())
        .param("from", "2026-01-01").param("to", "2026-01-02")), 500)
        .andExpect(header().doesNotExist(HttpHeaders.CONTENT_DISPOSITION));
    org.mockito.Mockito.verify(audits, org.mockito.Mockito.never()).save(any());
  }

  @Test
  void emptyExportStillHasTheHeaderAndOneZeroRowAudit() throws Exception {
    stubRows(List.of());
    var response = mvc.perform(get("/api/admin/audit-logs/export").header(HttpHeaders.AUTHORIZATION, admin())
            .param("from", "2026-01-01").param("to", "2026-01-01"))
        .andExpect(status().isOk()).andReturn().getResponse();
    assertThat(response.getContentAsString(StandardCharsets.UTF_8).lines().count()).isEqualTo(1);
    assertThat(mapper.readTree(capturedEvent().getDetail()).path("rowsPrepared").asInt()).isZero();
  }

  @ParameterizedTest
  @CsvSource({"from,2026-01-01", "to,2026-01-01"})
  void aSingleDateBoundIsRejected(String parameter, String date) throws Exception {
    expectError(mvc.perform(get("/api/admin/audit-logs/export").header(HttpHeaders.AUTHORIZATION, admin())
        .param(parameter, date)), 400);
    verifyNoInteractions(audits, entityManager, manager);
  }

  @Test
  void bothMissingDateBoundsAreRejected() throws Exception {
    expectError(mvc.perform(get("/api/admin/audit-logs/export").header(HttpHeaders.AUTHORIZATION, admin())), 400);
    verifyNoInteractions(audits, entityManager, manager);
  }

  @ParameterizedTest
  @CsvSource({"2026-01-01,2026-04-01", "2026-01-03,2026-01-01", "01/01/2026,2026-01-02",
      "2026-01-01,not-a-date", "2026-02-30,2026-03-01"})
  void invalidDateRangesAreJson400(String from, String to) throws Exception {
    expectError(mvc.perform(get("/api/admin/audit-logs/export").header(HttpHeaders.AUTHORIZATION, admin())
        .param("from", from).param("to", to)), 400);
    verifyNoInteractions(audits, entityManager, manager);
  }

  @ParameterizedTest
  @CsvSource({"actorId,invalid", "includeHidden,maybe"})
  void invalidFiltersAreJson400(String key, String value) throws Exception {
    expectError(mvc.perform(get("/api/admin/audit-logs/export").header(HttpHeaders.AUTHORIZATION, admin())
        .param("from", "2026-01-01").param("to", "2026-01-02").param(key, value)), 400);
    verifyNoInteractions(audits, entityManager, manager);
  }

  @Test
  void unrecordableFilterMetadataIsRejectedBeforeQueryOrResponseCommit() throws Exception {
    expectError(mvc.perform(get("/api/admin/audit-logs/export").header(HttpHeaders.AUTHORIZATION, admin())
        .param("from", "2026-01-01").param("to", "2026-01-02").param("keyword", "x".repeat(1000))), 400)
        .andExpect(header().doesNotExist(HttpHeaders.CONTENT_DISPOSITION));
    verifyNoInteractions(audits, entityManager, manager);
  }

  @ParameterizedTest
  @ValueSource(strings = {"actions", "export"})
  void anonymousRequestsAre401AndNeverQuery(String endpoint) throws Exception {
    expectError(mvc.perform(get("/api/admin/audit-logs/" + endpoint)), 401);
    verifyNoInteractions(audits, entityManager, manager);
  }

  @ParameterizedTest
  @ValueSource(strings = {"actions", "export"})
  void invalidJwtIs401AndNeverQueries(String endpoint) throws Exception {
    expectError(mvc.perform(get("/api/admin/audit-logs/" + endpoint)
        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-jwt")), 401);
    verifyNoInteractions(audits, entityManager, manager);
  }

  static Stream<Arguments> deniedPermissions() {
    return Stream.of("actions", "export").flatMap(endpoint -> Stream.of(
        PermissionCode.BACKOFFICE_OPERATIONS, "backoffice.support", "customer.self_service")
        .map(permission -> Arguments.of(endpoint, permission)));
  }

  @ParameterizedTest
  @MethodSource("deniedPermissions")
  void nonAdminPermissionsAre403AndNeverQuery(String endpoint, String permission) throws Exception {
    expectError(mvc.perform(get("/api/admin/audit-logs/" + endpoint)
        .header(HttpHeaders.AUTHORIZATION, authorize(permission))), 403);
    verifyNoInteractions(audits, entityManager, manager);
  }

  @Test
  void corsPreflightAllowsTheExistingOriginAndAuthorizationHeader() throws Exception {
    mvc.perform(options("/api/admin/audit-logs/export").header(HttpHeaders.ORIGIN, "http://localhost:3000")
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
            .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"));
    verifyNoInteractions(audits, entityManager, manager);
  }

  @Test
  void corsDoesNotAllowANewOrigin() throws Exception {
    mvc.perform(get("/api/admin/audit-logs/export").header(HttpHeaders.ORIGIN, "https://unapproved.example")
            .header(HttpHeaders.AUTHORIZATION, admin()))
        .andExpect(status().isForbidden());
    verifyNoInteractions(audits, entityManager, manager);
  }

  @Test
  void exposureIsNotAddedToTheListEndpoint() throws Exception {
    stubRows(List.of());
    mvc.perform(get("/api/admin/audit-logs").header(HttpHeaders.AUTHORIZATION, admin())
            .header(HttpHeaders.ORIGIN, "http://localhost:3000"))
        .andExpect(status().isOk()).andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS));
  }

  @Test
  void contextHasNoRealDatabaseFlywayOrScheduler() {
    assertThat(context.getBeanNamesForType(DataSource.class)).isEmpty();
    assertThat(context.getBeanNamesForType(EntityManagerFactory.class)).isEmpty();
    assertThat(context.getBeanNamesForType(Flyway.class)).isEmpty();
    assertThat(context.getBeanNamesForType(ScheduledAnnotationBeanPostProcessor.class)).isEmpty();
    assertThat(org.mockito.Mockito.mockingDetails(entityManager).isMock()).isTrue();
    assertThat(org.mockito.Mockito.mockingDetails(manager).isMock()).isTrue();
  }

  private void stubRows(List<AuditLogEntity> rows) {
    when(audits.findAll(any(Specification.class), any(Pageable.class)))
        .thenAnswer(invocation -> new PageImpl<>(rows, invocation.getArgument(1), rows.size()));
  }

  private AuditLogEntity row(String detail) {
    AuditLogEntity row = AuditLogEntity.create(null, "operations.flight.update", "flight", "VN%_\\1", detail,
        OffsetDateTime.parse("2026-01-01T00:00:00Z"));
    ReflectionTestUtils.setField(row, "id", 1L);
    return row;
  }

  private AuditLogEntity capturedEvent() {
    ArgumentCaptor<AuditLogEntity> event = ArgumentCaptor.forClass(AuditLogEntity.class);
    verify(audits).save(event.capture());
    return event.getValue();
  }

  private ResultActions expectError(ResultActions response, int code) throws Exception {
    return response.andExpect(status().is(code)).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.status").value(code)).andExpect(jsonPath("$.message").isNotEmpty())
        .andExpect(jsonPath("$.errors").isMap()).andExpect(jsonPath("$.timestamp").isString());
  }

  private String admin() {
    return authorize(PermissionCode.BACKOFFICE_ADMIN);
  }

  private String authorize(String permissionCode) {
    UserAccountEntity user = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(user, "id", 301L);
    ReflectionTestUtils.setField(user, "email", "preview-admin@example.test");
    ReflectionTestUtils.setField(user, "displayName", "Người kiểm thử");
    ReflectionTestUtils.setField(user, "status", "active");
    RoleEntity role = BeanUtils.instantiateClass(RoleEntity.class);
    ReflectionTestUtils.setField(role, "code", "operations_staff");
    PermissionEntity permission = BeanUtils.instantiateClass(PermissionEntity.class);
    ReflectionTestUtils.setField(permission, "code", permissionCode);
    ReflectionTestUtils.setField(role, "permissions", new LinkedHashSet<>(List.of(permission)));
    ReflectionTestUtils.setField(user, "roles", new LinkedHashSet<>(List.of(role)));
    when(users.findOneWithRolesById(301L)).thenReturn(Optional.of(user));
    when(users.findById(301L)).thenReturn(Optional.of(user));
    return "Bearer " + tokens.issueTokenPair(user, "test-export-session").accessToken();
  }
}
