package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.qlvmb.airticket.domain.dto.AuditLogFilterRequest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

@EnabledIfEnvironmentVariable(named = "AUDIT_TEST_ALLOW_WRITES", matches = "true")
class AuditLogPostgresIntegrationTest {
  private static AuditLogPostgresTestSupport.IntegrationSession session;
  private static final OffsetDateTime TIME = OffsetDateTime.parse("2026-10-25T05:00:00Z");

  @BeforeAll
  static void openApprovedContext() throws Exception {
    // Guard và kiểm tra schema có sẵn hoàn tất trước context tối thiểu.
    session = AuditLogPostgresTestSupport.openIntegration();
  }

  @AfterAll
  static void closeContextWithoutDeletingData() {
    if (session != null) {
      session.close();
    }
  }

  @Test
  void verifiesPreviouslyAppliedV1ToV35() {
    List<String> versions = session.jdbc().queryForList("""
        select version from flyway_schema_history
        where success and version is not null order by installed_rank
        """, String.class);
    assertThat(versions).hasSize(36);
    assertThat(versions.subList(0, 35)).containsExactlyElementsOf(IntStream.rangeClosed(1, 35)
        .mapToObj(Integer::toString).toList());
    assertThat(versions.getLast()).isEqualTo("36");
    assertThat(session.jdbc().queryForObject("""
        select character_maximum_length from information_schema.columns
        where table_schema=? and table_name='audit_log' and column_name='detail'
        """, Integer.class, AuditLogPostgresTestSupport.SCHEMA)).isEqualTo(1000);
    assertThat(session.jdbc().queryForList("""
        select column_name from information_schema.columns
        where table_schema=? and table_name='audit_log' and data_type='timestamp with time zone'
        """, String.class, AuditLogPostgresTestSupport.SCHEMA))
        .contains("created_at", "hidden_at");
  }

  @Test
  void verifiesTheV36FilterIndexesWithoutReplacingExistingIndexes() throws Exception {
    try (var connection = session.jdbc().getDataSource().getConnection()) {
      AuditLogPostgresTestSupport.verifyAuditFilterIndexes(connection);
    }
    assertThat(session.jdbc().queryForList("""
        select indexname from pg_catalog.pg_indexes where schemaname=? and tablename='audit_log'
        """, String.class, AuditLogPostgresTestSupport.SCHEMA))
        .contains("audit_log_pkey", "idx_audit_log_created_at", "idx_audit_log_actor_user_id",
            "idx_audit_log_action", "idx_audit_log_target");
  }

  @Test
  void preservesNullActorsAndAppliesVisibilityOnlyToTheNewQuery() {
    String scope = scope();
    long actor = session.actor("Người kiểm thử");
    long member = session.log(actor, "test.audit.created", scope, "có actor", TIME, false);
    long system = session.log(null, "test.audit.created", scope, "hệ thống", TIME, false);
    long hidden = session.log(null, "test.audit.created", scope, "đã ẩn", TIME, true);

    var visible = session.queries().getAuditLogs(filter(scope, null, false, null, null, 0, 20));
    assertThat(visible.items()).extracting(item -> item.id()).containsExactly(system, member);
    assertThat(visible.items().getFirst().actorId()).isNull();
    assertThat(visible.items().get(1).actorName()).isEqualTo("Người kiểm thử");
    var all = session.queries().getAuditLogs(filter(scope, "none", true, null, null, 0, 20));
    assertThat(all.items()).extracting(item -> item.id()).containsExactly(hidden, system);
    assertThat(all.items().getFirst().hidden()).isTrue();
    assertThat(session.read(() -> session.repository().existsByIdAndHiddenAtIsNull(hidden))).isFalse();
    assertThat(session.read(() -> session.repository().findByIdAndHiddenAtIsNull(hidden))).isEmpty();
    assertThat(session.read(() -> session.repository().existsByTargetTypeAndTargetIdAndActionAndDetail(
        "audit_test", scope, "test.audit.created", "đã ẩn"))).isTrue();
  }

  @Test
  void combinesFiltersWithAndAndActorFieldsWithOrUsingLiteralWildcards() {
    String scope = scope();
    String target = scope + ":%_\\";
    String literal = "%_\\";
    long actor = session.actor("Người thao tác %_\\");
    long expected = session.log(actor, "test.%_\\.created", target,
        "Chi tiết %_\\ bằng tiếng Việt", TIME, false);
    session.log(actor, "test.%_\\Extra.created", target, "Chi tiết %_\\", TIME, false);
    session.log(null, "test.%_\\.created", target, "Chi tiết %_\\", TIME, false);
    session.log(actor, "test.%_\\.created", scope + ":ABC", "Chi tiết %_\\", TIME, false);
    session.log(actor, "test.%_\\.created", target, "Không có mẫu cần tìm", TIME, false);
    var request = new AuditLogFilterRequest(0, 20, Long.toString(actor), literal,
        "test.%_\\", "test.%_\\.created", "audit_test", target,
        LocalDate.of(2026, 10, 25), LocalDate.of(2026, 10, 25), literal, false);
    assertThat(session.queries().getAuditLogs(request).items())
        .extracting(item -> item.id()).containsExactly(expected);
    var prefixOnly = new AuditLogFilterRequest(0, 20, Long.toString(actor), literal,
        "test.%_\\", null, "audit_test", target, null, null, literal, false);
    assertThat(session.queries().getAuditLogs(prefixOnly).items())
        .extracting(item -> item.id()).containsExactly(expected);

    String email = session.jdbc().queryForObject("select email from user_account where id=?", String.class, actor);
    var emailRequest = new AuditLogFilterRequest(0, 20, null, email.toUpperCase(java.util.Locale.ROOT),
        null, null, null, target, null, null, null, false);
    assertThat(session.queries().getAuditLogs(emailRequest).items())
        .allSatisfy(item -> assertThat(item.actorId()).isEqualTo(actor));
    assertThat(session.queries().getAuditLogs(emailRequest).totalElements()).isEqualTo(3);
  }

  @Test
  void countsAndPaginatesStablyWithoutFetchingActorsOneByOne() {
    String scope = scope();
    List<Long> ids = new ArrayList<>();
    for (int index = 0; index < 5; index++) {
      long actor = session.actor("Actor " + index);
      ids.add(session.log(actor, "test.audit.created", scope, "dòng " + index, TIME, false));
    }
    Collections.reverse(ids);
    var statistics = session.entityManagerFactory().unwrap(SessionFactory.class).getStatistics();
    statistics.clear();
    var first = session.queries().getAuditLogs(filter(scope, null, false, null, null, 0, 2));
    assertThat(first.totalElements()).isEqualTo(5);
    assertThat(first.totalPages()).isEqualTo(3);
    assertThat(first.items()).extracting(item -> item.id()).containsExactlyElementsOf(ids.subList(0, 2));
    assertThat(first.items()).allSatisfy(item -> assertThat(item.actorName()).startsWith("Actor "));
    assertThat(statistics.getEntityFetchCount()).isZero();
    // Thống kê Hibernate chỉ đếm SQL của ORM, không tính SELECT guard của datasource.
    assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(2);
    var second = session.queries().getAuditLogs(filter(scope, null, false, null, null, 1, 2));
    var third = session.queries().getAuditLogs(filter(scope, null, false, null, null, 2, 2));
    assertThat(second.items()).extracting(item -> item.id()).containsExactlyElementsOf(ids.subList(2, 4));
    assertThat(third.items()).extracting(item -> item.id()).containsExactly(ids.getLast());
  }

  @Test
  void usesVietnamDayBoundariesIndependentlyOfStoredOffsets() {
    String scope = scope();
    OffsetDateTime start = OffsetDateTime.parse("2026-10-24T17:00:00Z");
    session.log(null, "test.audit.created", scope, "trước ngày", start.minusNanos(1000), false);
    long lower = session.log(null, "test.audit.created", scope, "đầu ngày", start, false);
    long upper = session.log(null, "test.audit.created", scope, "cuối ngày",
        start.plusDays(1).minusNanos(1000), false);
    session.log(null, "test.audit.created", scope, "ngày kế tiếp", start.plusDays(1), false);
    var result = session.queries().getAuditLogs(filter(scope, null, false,
        LocalDate.of(2026, 10, 25), LocalDate.of(2026, 10, 25), 0, 20));
    assertThat(result.items()).extracting(item -> item.id()).containsExactly(upper, lower);
  }

  @Test
  void keepsDashboardTopEightAndActionListSemantics() {
    String scope = scope();
    List<Long> ids = new ArrayList<>();
    OffsetDateTime future = session.jdbc().queryForObject(
        "select coalesce(max(created_at),now()) + interval '1 day' from audit_log", OffsetDateTime.class);
    for (int index = 0; index < 9; index++) {
      ids.add(session.log(null, "test.audit.dashboard", scope, "dashboard", future.plusMinutes(index), false));
    }
    session.log(null, "test.audit.dashboard", scope, "ẩn mới nhất", future.plusDays(1), true);
    Collections.reverse(ids);
    var cards = session.read(() -> session.repository().findTop8ByHiddenAtIsNullOrderByCreatedAtDesc());
    assertThat(cards).extracting(item -> item.getId()).containsExactlyElementsOf(ids.subList(0, 8));
    var actions = session.queries().getActions();
    assertThat(actions).isSorted().doesNotHaveDuplicates().contains("test.audit.dashboard");
    var databaseActions = session.read(() -> session.repository().findDistinctActions());
    assertThat(databaseActions).isSorted().doesNotHaveDuplicates().containsExactlyElementsOf(actions);
  }

  private static String scope() {
    return "audit-it-" + UUID.randomUUID();
  }

  private static AuditLogFilterRequest filter(String target, String actor, boolean hidden,
      LocalDate from, LocalDate to, int page, int size) {
    return new AuditLogFilterRequest(page, size, actor, null, null, null, null, target,
        from, to, null, hidden);
  }
}
