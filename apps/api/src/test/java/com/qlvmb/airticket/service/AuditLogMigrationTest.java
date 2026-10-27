package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

@EnabledIfEnvironmentVariable(named = "AUDIT_TEST_ALLOW_MIGRATIONS", matches = "true")
class AuditLogMigrationTest {

  @Test
  void verifiesApprovedTargetReadOnly() throws Exception {
    MigrationSnapshot snapshot = readSnapshot();
    System.out.printf("AUDIT_READ_ONLY: latest=V%s rows=%d%n",
        snapshot.history().getLast().version(), snapshot.rows());
  }

  @Test
  void migratesOnlyTheSeparatelyApprovedExistingSchema() throws Exception {
    // Thay migrate đơn thuần bằng kiểm chứng nâng cấp và bảo toàn dữ liệu đã có.
    MigrationSnapshot before = readSnapshot();
    AuditLogPostgresTestSupport.migrateApprovedSchema();
    MigrationSnapshot after = readSnapshot();
    assertThat(after.history()).hasSize(36);
    assertThat(after.history().getLast().version()).isEqualTo("36");
    assertThat(after.history().subList(0, before.history().size())).isEqualTo(before.history());
    assertThat(after.rows()).isEqualTo(before.rows());
    assertThat(after.sha256()).isEqualTo(before.sha256());
    try (Connection connection = AuditLogPostgresTestSupport.openMigrationReadOnlyConnection()) {
      AuditLogPostgresTestSupport.verifyAuditFilterIndexes(connection);
    }
    System.out.printf("AUDIT_MIGRATION: before=V%s after=V36 preservedRows=%d sha256Unchanged=true%n",
        before.history().getLast().version(), after.rows());
  }

  private static MigrationSnapshot readSnapshot() throws Exception {
    try (Connection connection = AuditLogPostgresTestSupport.openMigrationReadOnlyConnection()) {
      connection.setAutoCommit(false);
      assertThat(connection.isReadOnly()).isTrue();
      try (var query = connection.createStatement();
          var result = query.executeQuery("""
              select current_database() as database_name, current_user as role_name,
                     current_schema() as schema_name, current_setting('server_version') as version,
                     current_setting('transaction_read_only') as read_only,
                     inet_client_addr() is not null as tcp
              """)) {
        assertThat(result.next()).isTrue();
        assertThat(result.getString("database_name")).isEqualTo("airline_audit_test");
        assertThat(result.getString("role_name")).isEqualTo(AuditLogPostgresTestSupport.RUNNER_USER);
        assertThat(result.getString("schema_name")).isEqualTo(AuditLogPostgresTestSupport.SCHEMA);
        assertThat(result.getString("version")).startsWith("15.");
        assertThat(result.getString("read_only")).isEqualTo("on");
        assertThat(result.getBoolean("tcp")).isTrue();
        System.out.printf("AUDIT_TARGET: database=%s role=%s schema=%s PostgreSQL=%s readOnly=true tcp=true%n",
            result.getString("database_name"), result.getString("role_name"),
            result.getString("schema_name"), result.getString("version"));
      }
      AuditLogPostgresTestSupport.verifySchema(connection, true);
      List<HistoryEntry> history = new ArrayList<>();
      try (var query = connection.createStatement();
          var result = query.executeQuery("""
              select version, type, script, checksum, success, installed_rank
              from audit_it_20261025_01.flyway_schema_history
              where version is not null order by installed_rank
              """)) {
        while (result.next()) {
          history.add(new HistoryEntry(result.getString("version"), result.getString("type"),
              result.getString("script"), result.getObject("checksum", Integer.class),
              result.getBoolean("success"), result.getInt("installed_rank")));
        }
      }
      AuditLogPostgresTestSupport.validateHistory(history.stream().map(row ->
          new AuditLogPostgresTestSupport.MigrationRow(row.version(), row.type(), row.success())).toList(), false);
      // Chỉ nâng cấp V35 đã có hoặc kiểm tra lại V36; không seed lại schema trống.
      assertThat(history.size()).isIn(35, 36);
      assertThat(history).extracting(HistoryEntry::version).containsExactlyElementsOf(
          IntStream.rangeClosed(1, history.size()).mapToObj(Integer::toString).toList());
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      long rows = 0;
      try (var query = connection.createStatement()) {
        query.setFetchSize(500);
        try (var result = query.executeQuery("""
            select row_to_json(a)::text from audit_it_20261025_01.audit_log a order by a.id
            """)) {
          while (result.next()) {
            digest.update(result.getString(1).getBytes(StandardCharsets.UTF_8));
            digest.update((byte) 0);
            rows++;
          }
        }
      }
      return new MigrationSnapshot(List.copyOf(history), rows, HexFormat.of().formatHex(digest.digest()));
    }
  }

  private record HistoryEntry(String version, String type, String script, Integer checksum,
      boolean success, int installedRank) {
  }

  private record MigrationSnapshot(List<HistoryEntry> history, long rows, String sha256) {
  }
}
