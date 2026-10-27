package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

@EnabledIfEnvironmentVariable(named = "AUDIT_TEST_JDBC_READ_ONLY", matches = "true")
class AuditLogJdbcConnectionTest {

  @ParameterizedTest
  @MethodSource("unsafeTargets")
  void rejectsUnsafeConfigurationBeforeReadingCredentialOrConnecting(String url, String user,
      String passwordFile) {
    Map<String, String> environment = Map.of(
        "AUDIT_TEST_DB_URL", url,
        "AUDIT_TEST_DB_USER", user,
        "AUDIT_TEST_DB_PASSWORD_FILE", passwordFile);
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateTarget(environment))
        .isInstanceOf(IllegalStateException.class);
  }

  static Stream<Arguments> unsafeTargets() {
    String url = AuditLogPostgresTestSupport.URL;
    String user = AuditLogPostgresTestSupport.USER;
    String path = AuditLogPostgresTestSupport.PASSWORD_FILE.toString();
    return Stream.of(
        Arguments.of("", user, path),
        Arguments.of("jdbc:postgresql://localhost:5432/airticket", user, path),
        Arguments.of("jdbc:postgresql://localhost:55432/airline_audit_test", user, path),
        Arguments.of("jdbc:postgresql://127.0.0.1:5432/airline_audit_test", user, path),
        Arguments.of("jdbc:postgresql://127.0.0.1:55432/airline_local_demo", user, path),
        Arguments.of(url + "?currentSchema=public", user, path),
        Arguments.of(url, "postgres", path),
        Arguments.of(url, user, ""),
        Arguments.of(url, user, AuditLogPostgresTestSupport.PASSWORD_FILE.resolveSibling("other.txt").toString()));
  }

  @Test
  void authenticatesOverTcpInAReadOnlyTransactionWithoutCreatingSchemaOrData() throws Exception {
    try (Connection connection = AuditLogPostgresTestSupport.openReadOnlyConnection();
        var statement = connection.createStatement()) {
      assertThat(connection.isReadOnly()).isTrue();
      assertThat(connection.getAutoCommit()).isFalse();
      try (var result = statement.executeQuery("""
          select current_database() as database_name, current_user as user_name,
                 current_setting('server_version_num')::integer as version_num,
                 current_setting('server_version') as server_version,
                 current_setting('transaction_read_only') as read_only,
                 inet_client_addr()::text as client_address,
                 (select rolsuper from pg_catalog.pg_roles where rolname=current_user) as superuser,
                 (select count(*) from pg_catalog.pg_class c
                    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
                    where n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
                      and c.relkind in ('r','p','f','v','m')) as user_relations,
                 (select count(*) from pg_catalog.pg_class c
                    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
                    where n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
                      and c.relname='flyway_schema_history') as flyway_histories,
                 exists(select 1 from pg_catalog.pg_namespace
                        where nspname='audit_it_20261025_01') as proposed_schema_exists
          """)) {
        assertThat(result.next()).isTrue();
        assertThat(result.getString("database_name")).isEqualTo("airline_audit_test");
        assertThat(result.getString("user_name")).isEqualTo("airline_audit_tester");
        assertThat(result.getInt("version_num") / 10000).isEqualTo(15);
        assertThat(result.getString("read_only")).isEqualTo("on");
        assertThat(result.getString("client_address")).isNotBlank();
        assertThat(result.getLong("user_relations")).isZero();
        assertThat(result.getLong("flyway_histories")).isZero();
        assertThat(result.getBoolean("proposed_schema_exists")).isFalse();
        // Chỉ xuất metadata an toàn; quyền superuser được ghi nhận, không tự thay đổi.
        System.out.printf("AUDIT_JDBC database=%s user=%s server=%s versionNum=%d tcpClient=%s "
                + "readOnly=%s rolsuper=%s userRelations=%d flywayHistories=%d proposedSchemaExists=%s%n",
            result.getString("database_name"), result.getString("user_name"),
            result.getString("server_version"), result.getInt("version_num"),
            result.getString("client_address"), result.getString("read_only"),
            result.getBoolean("superuser"), result.getLong("user_relations"),
            result.getLong("flyway_histories"), result.getBoolean("proposed_schema_exists"));
      }
      try (var schemas = statement.executeQuery("""
          select nspname from pg_catalog.pg_namespace
          where nspname !~ '^pg_' and nspname <> 'information_schema' order by nspname
          """)) {
        while (schemas.next()) {
          System.out.println("AUDIT_JDBC schema=" + schemas.getString(1));
        }
      }
    }
  }
}
