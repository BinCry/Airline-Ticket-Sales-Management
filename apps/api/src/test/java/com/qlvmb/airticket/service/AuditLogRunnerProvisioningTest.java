package com.qlvmb.airticket.service;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.postgresql.util.PasswordUtil;

@EnabledIfEnvironmentVariable(named = "AUDIT_TEST_PROVISION_RUNNER", matches = "true")
class AuditLogRunnerProvisioningTest {

  @Test
  void provisionsOnlyTheApprovedRunnerAndSchemaWithoutRunningMigrations() throws Exception {
    var bootstrap = AuditLogPostgresTestSupport.requireProvisioningApproval(System.getenv());
    if (Logger.getLogger("org.postgresql").isLoggable(Level.FINE)) {
      throw new IllegalStateException("Không provisioning khi JDBC bật logging chi tiết.");
    }
    var runner = new AuditLogPostgresTestSupport.Target(AuditLogPostgresTestSupport.URL,
        AuditLogPostgresTestSupport.RUNNER_USER, AuditLogPostgresTestSupport.RUNNER_PASSWORD_FILE);
    try (Connection connection = connect(bootstrap, false)) {
      connection.setAutoCommit(false);
      try {
        verifyBootstrapAndAbsence(connection);
        try (var statement = connection.createStatement()) {
          // Chỉ tắt log câu lệnh cho transaction provisioning; không sửa cấu hình server lâu dài.
          statement.execute("set local log_statement='none'");
          statement.execute("set local log_min_duration_statement=-1");
          statement.execute("set local log_min_duration_sample=-1");
          statement.execute("set local log_transaction_sample_rate=0");
          statement.execute("set local log_min_error_statement='panic'");
          statement.execute("""
              create role airline_audit_runner with login nosuperuser nocreatedb nocreaterole
                noreplication nobypassrls noinherit
              """);
          Properties credential = AuditLogPostgresTestSupport.credentials(runner);
          char[] password = credential.getProperty("password").toCharArray();
          credential.remove("password");
          try {
            // Driver tạo SCRAM verifier trong bộ nhớ; mật khẩu thô không xuất hiện trong SQL.
            statement.execute(PasswordUtil.genAlterUserPasswordSQL(
                AuditLogPostgresTestSupport.RUNNER_USER, password, "scram-sha-256"));
          } finally {
            Arrays.fill(password, '\0');
          }
          statement.execute("create schema audit_it_20261025_01 authorization airline_audit_runner");
          statement.execute("grant connect, temporary on database airline_audit_test to airline_audit_runner");
          statement.execute("grant usage, create on schema audit_it_20261025_01 to airline_audit_runner");
          statement.execute("grant usage on language plpgsql to airline_audit_runner");
          // Kiểm tra effective privileges, kể cả PUBLIC, trước commit role/schema mới.
          statement.execute("set local session authorization airline_audit_runner");
          AuditLogPostgresTestSupport.verifyRunnerPermissions(connection);
        }
        connection.commit();
      } catch (Exception exception) {
        connection.rollback();
        throw exception;
      }
    } catch (Exception exception) {
      throw sanitizedFailure(exception);
    }
    // Đây mới là xác thực bằng credential runner thật sau commit, không phải SET ROLE.
    try (Connection connection = connect(runner, true)) {
      AuditLogPostgresTestSupport.verifyRunnerPermissions(connection);
    } catch (Exception exception) {
      throw new IllegalStateException("Đã commit provisioning nhưng xác minh runner thất bại; giữ nguyên tài nguyên.");
    }
  }

  private static Connection connect(AuditLogPostgresTestSupport.Target target, boolean readOnly)
      throws SQLException {
    AuditLogPostgresTestSupport.requireProvisioningApproval(System.getenv());
    Properties properties = AuditLogPostgresTestSupport.credentials(target);
    properties.setProperty("connectTimeout", "5");
    properties.setProperty("socketTimeout", "15");
    if (readOnly) {
      properties.setProperty("options", "-c default_transaction_read_only=on");
      properties.setProperty("readOnly", "true");
      properties.setProperty("readOnlyMode", "always");
    }
    try {
      return DriverManager.getConnection(target.url(), properties);
    } catch (SQLException exception) {
      throw new SQLException("Không xác thực được PostgreSQL Airline; SQLState=" + exception.getSQLState(),
          exception.getSQLState());
    } finally {
      properties.remove("password");
    }
  }

  private static void verifyBootstrapAndAbsence(Connection connection) throws SQLException {
    try (var statement = connection.createStatement();
        var result = statement.executeQuery("""
            select current_database()='airline_audit_test'
               and current_user='airline_audit_tester' and session_user='airline_audit_tester'
               and current_setting('server_version_num')::integer / 10000=15
               and inet_client_addr() is not null
               and exists(select 1 from pg_catalog.pg_roles where rolname=current_user and rolsuper)
               and not exists(select 1 from pg_catalog.pg_roles where rolname='airline_audit_runner')
               and not exists(select 1 from pg_catalog.pg_namespace where nspname='audit_it_20261025_01')
               and not exists(select 1 from pg_catalog.pg_extension where extname <> 'plpgsql')
               and current_setting('shared_preload_libraries')=''
               and current_setting('session_preload_libraries')=''
               and current_setting('local_preload_libraries')='' as approved
            """)) {
      if (!result.next() || !result.getBoolean("approved")) {
        throw new IllegalStateException("Provisioning không đạt guard đích, xung đột tài nguyên hoặc logging extension.");
      }
    }
  }

  private static IllegalStateException sanitizedFailure(Exception exception) {
    String state = exception instanceof SQLException sqlException ? sqlException.getSQLState() : "not_sql";
    return new IllegalStateException("Provisioning thất bại; không tự thử lại hoặc xóa credential. SQLState=" + state);
  }
}
