package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.postgresql.util.PasswordUtil;

class AuditLogPostgresGuardTest {
  // Chỉ tạo Path giả theo hệ điều hành, không tạo hoặc đọc file credential.
  private static final Path BOOTSTRAP_PASSWORD_FILE = Path.of("audit-guard-fixtures", "postgres-password.txt")
      .toAbsolutePath().normalize();
  private static final Path RUNNER_PASSWORD_FILE = BOOTSTRAP_PASSWORD_FILE
      .resolveSibling("airline-audit-runner-password.txt");

  @Test
  void integrationApprovalDoesNotRequireMigrationPermission() {
    Map<String, String> environment = target();
    environment.put("AUDIT_TEST_ALLOW_WRITES", "true");
    assertThat(AuditLogPostgresTestSupport.requireIntegrationApproval(environment, RUNNER_PASSWORD_FILE).url())
        .isEqualTo(AuditLogPostgresTestSupport.URL);
  }

  @Test
  void migrationApprovalDoesNotEnableIntegrationFixtures() {
    Map<String, String> environment = target();
    environment.put("AUDIT_TEST_ALLOW_MIGRATIONS", "true");
    assertThat(AuditLogPostgresTestSupport.requireMigrationApproval(environment, RUNNER_PASSWORD_FILE).url())
        .isEqualTo(AuditLogPostgresTestSupport.URL);
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.requireIntegrationApproval(environment, RUNNER_PASSWORD_FILE))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void keepsBootstrapAndRunnerCredentialsInSeparateAllowlists() {
    Map<String, String> bootstrap = target();
    bootstrap.put("AUDIT_TEST_DB_USER", AuditLogPostgresTestSupport.USER);
    bootstrap.put("AUDIT_TEST_DB_PASSWORD_FILE", BOOTSTRAP_PASSWORD_FILE.toString());
    assertThat(AuditLogPostgresTestSupport.validateTarget(bootstrap,
        AuditLogPostgresTestSupport.USER, BOOTSTRAP_PASSWORD_FILE).user())
        .isEqualTo(AuditLogPostgresTestSupport.USER);
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateTarget(bootstrap,
        AuditLogPostgresTestSupport.RUNNER_USER, RUNNER_PASSWORD_FILE))
        .isInstanceOf(IllegalStateException.class);
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateTarget(target(),
        AuditLogPostgresTestSupport.USER, BOOTSTRAP_PASSWORD_FILE))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void provisioningRequiresItsOwnBootstrapOptInAndExcludesAllOtherDatabaseModes() {
    Map<String, String> environment = target();
    environment.put("AUDIT_TEST_DB_USER", AuditLogPostgresTestSupport.USER);
    environment.put("AUDIT_TEST_DB_PASSWORD_FILE", BOOTSTRAP_PASSWORD_FILE.toString());
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.requireProvisioningApproval(environment, BOOTSTRAP_PASSWORD_FILE))
        .isInstanceOf(IllegalStateException.class);
    environment.put("AUDIT_TEST_PROVISION_RUNNER", "true");
    assertThat(AuditLogPostgresTestSupport.requireProvisioningApproval(environment, BOOTSTRAP_PASSWORD_FILE).user())
        .isEqualTo(AuditLogPostgresTestSupport.USER);
    for (String flag : List.of("AUDIT_TEST_ALLOW_MIGRATIONS", "AUDIT_TEST_ALLOW_WRITES",
        "AUDIT_TEST_JDBC_READ_ONLY")) {
      environment.put(flag, "true");
      assertThatThrownBy(() -> AuditLogPostgresTestSupport.requireProvisioningApproval(environment, BOOTSTRAP_PASSWORD_FILE))
          .isInstanceOf(IllegalStateException.class);
      environment.remove(flag);
    }
    environment.put("AUDIT_TEST_DB_USER", AuditLogPostgresTestSupport.RUNNER_USER);
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.requireProvisioningApproval(environment, BOOTSTRAP_PASSWORD_FILE))
        .isInstanceOf(IllegalStateException.class);
  }

  @ParameterizedTest
  @ValueSource(strings = {"AUDIT_TEST_JDBC_READ_ONLY", "AUDIT_TEST_ALLOW_WRITES",
      "AUDIT_TEST_ALLOW_MIGRATIONS", "AUDIT_TEST_PROVISION_RUNNER"})
  void requiresExplicitTrueForEveryDatabaseOptIn(String flag) {
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.requireFlag(Map.of(), flag))
        .isInstanceOf(IllegalStateException.class);
    for (String value : List.of("", "false", "TRUE")) {
      assertThatThrownBy(() -> AuditLogPostgresTestSupport.requireFlag(Map.of(flag, value), flag))
          .isInstanceOf(IllegalStateException.class);
    }
    assertThatCode(() -> AuditLogPostgresTestSupport.requireFlag(Map.of(flag, "true"), flag))
        .doesNotThrowAnyException();
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  void rejectsRelativeCredentialPathsWithoutConvertingThemToAbsolute(boolean migration) {
    Map<String, String> environment = target();
    environment.put(migration ? "AUDIT_TEST_ALLOW_MIGRATIONS" : "AUDIT_TEST_ALLOW_WRITES", "true");
    environment.put("AUDIT_TEST_DB_PASSWORD_FILE", RUNNER_PASSWORD_FILE.getFileName().toString());
    assertThatThrownBy(() -> approval(environment, migration))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Đường dẫn credential");
  }

  @Test
  void realEntryPointsKeepTheirFixedCredentialAllowlists() {
    Map<String, String> environment = target();
    environment.put("AUDIT_TEST_ALLOW_WRITES", "true");
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.requireIntegrationApproval(environment))
        .isInstanceOf(IllegalStateException.class).hasMessageContaining("Đường dẫn credential");
    environment.remove("AUDIT_TEST_ALLOW_WRITES");
    environment.put("AUDIT_TEST_ALLOW_MIGRATIONS", "true");
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.requireMigrationApproval(environment))
        .isInstanceOf(IllegalStateException.class).hasMessageContaining("Đường dẫn credential");
    environment.remove("AUDIT_TEST_ALLOW_MIGRATIONS");
    environment.put("AUDIT_TEST_PROVISION_RUNNER", "true");
    environment.put("AUDIT_TEST_DB_USER", AuditLogPostgresTestSupport.USER);
    environment.put("AUDIT_TEST_DB_PASSWORD_FILE", BOOTSTRAP_PASSWORD_FILE.toString());
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.requireProvisioningApproval(environment))
        .isInstanceOf(IllegalStateException.class).hasMessageContaining("Đường dẫn credential");
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateTarget(environment))
        .isInstanceOf(IllegalStateException.class).hasMessageContaining("Đường dẫn credential");
    environment.put("AUDIT_TEST_DB_USER", AuditLogPostgresTestSupport.RUNNER_USER);
    environment.put("AUDIT_TEST_DB_PASSWORD_FILE", RUNNER_PASSWORD_FILE.toString());
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateRunnerTarget(environment))
        .isInstanceOf(IllegalStateException.class).hasMessageContaining("Đường dẫn credential");
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  void fixtureTargetsCannotReadRealCredentials(boolean runner) {
    String user = runner ? AuditLogPostgresTestSupport.RUNNER_USER : AuditLogPostgresTestSupport.USER;
    Path path = runner ? RUNNER_PASSWORD_FILE : BOOTSTRAP_PASSWORD_FILE;
    var target = new AuditLogPostgresTestSupport.Target(AuditLogPostgresTestSupport.URL, user, path);
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.credentials(target))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Đích JDBC không còn khớp");
  }

  @Test
  void acceptsOnlyTheRestrictedRunnerPermissionSet() throws Exception {
    assertThatCode(() -> AuditLogPostgresTestSupport.validateRunnerPermissions(runnerPermissions()))
        .doesNotThrowAnyException();
  }

  @Test
  void buildsPasswordSqlWithAScramVerifierInsteadOfTheRawTestPassword() throws Exception {
    String dummy = "DUMMY_ONLY_NOT_A_REAL_CREDENTIAL_0123456789";
    String sql = PasswordUtil.genAlterUserPasswordSQL(AuditLogPostgresTestSupport.RUNNER_USER,
        dummy.toCharArray(), "scram-sha-256");
    assertThat(sql).contains("SCRAM-SHA-256$").doesNotContain(dummy);
  }

  @ParameterizedTest
  @MethodSource("unsafePermissions")
  void rejectsMissingPrivilegesAndExcessPrivilegesBeforeHandingOutConnection(String permission,
      boolean unsafeValue) throws Exception {
    ResultSet result = runnerPermissions();
    when(result.getBoolean(permission)).thenReturn(unsafeValue);
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateRunnerPermissions(result))
        .isInstanceOf(IllegalStateException.class);
  }

  static Stream<Arguments> unsafePermissions() {
    return Stream.concat(
        Stream.of("tcp", "login", "connect", "temporary", "schema_owner", "schema_usage",
            "schema_create", "plpgsql_usage").map(name -> Arguments.of(name, false)),
        Stream.of("superuser", "create_database", "create_role", "replication", "bypass_rls",
            "inherit", "membership", "database_owner", "database_create", "outside_schema_create",
            "outside_schema_write").map(name -> Arguments.of(name, true)));
  }

  @Test
  void rejectsNullOrMissingPermissionMetadata() throws Exception {
    ResultSet result = runnerPermissions();
    when(result.wasNull()).thenReturn(true);
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateRunnerPermissions(result))
        .isInstanceOf(IllegalStateException.class);
    when(result.next()).thenReturn(false);
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateRunnerPermissions(result))
        .isInstanceOf(IllegalStateException.class);
  }

  @ParameterizedTest
  @ValueSource(strings = {"database_name", "user_name", "session_user_name", "major_version"})
  void rejectsWrongRuntimeIdentity(String field) throws Exception {
    ResultSet result = runnerPermissions();
    if ("major_version".equals(field)) {
      when(result.getInt(field)).thenReturn(16);
    } else {
      when(result.getString(field)).thenReturn("wrong_identity");
    }
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateRunnerPermissions(result))
        .isInstanceOf(IllegalStateException.class);
  }

  private static ResultSet runnerPermissions() throws Exception {
    ResultSet result = mock(ResultSet.class);
    when(result.next()).thenReturn(true);
    when(result.getString("database_name")).thenReturn("airline_audit_test");
    when(result.getString("user_name")).thenReturn(AuditLogPostgresTestSupport.RUNNER_USER);
    when(result.getString("session_user_name")).thenReturn(AuditLogPostgresTestSupport.RUNNER_USER);
    when(result.getInt("major_version")).thenReturn(15);
    for (String required : List.of("tcp", "login", "connect", "temporary", "schema_owner",
        "schema_usage", "schema_create", "plpgsql_usage")) {
      when(result.getBoolean(required)).thenReturn(true);
    }
    return result;
  }

  @ParameterizedTest
  @ValueSource(booleans = {false, true})
  void rejectsCombinedPermissionsAndMissingOptIn(boolean migration) {
    Map<String, String> environment = target();
    assertThatThrownBy(() -> approval(environment, migration))
        .isInstanceOf(IllegalStateException.class);
    environment.put("AUDIT_TEST_ALLOW_WRITES", "true");
    environment.put("AUDIT_TEST_ALLOW_MIGRATIONS", "true");
    assertThatThrownBy(() -> approval(environment, migration))
        .isInstanceOf(IllegalStateException.class);
  }

  @ParameterizedTest
  @MethodSource("unsafeTargets")
  void rejectsWrongTargetBeforeReadingCredentialOrCreatingDataSource(boolean migration,
      String key, String value) {
    Map<String, String> environment = target();
    environment.put(migration ? "AUDIT_TEST_ALLOW_MIGRATIONS" : "AUDIT_TEST_ALLOW_WRITES", "true");
    environment.put(key, value);
    assertThatThrownBy(() -> approval(environment, migration))
        .isInstanceOf(IllegalStateException.class);
  }

  static Stream<Arguments> unsafeTargets() {
    return Stream.of(false, true).flatMap(migration -> Stream.of(
        Arguments.of(migration, "AUDIT_TEST_SCHEMA", "public"),
        Arguments.of(migration, "AUDIT_TEST_SCHEMA", ""),
        Arguments.of(migration, "AUDIT_TEST_DB_URL", "jdbc:postgresql://127.0.0.1:5432/airline_audit_test"),
        Arguments.of(migration, "AUDIT_TEST_DB_URL", AuditLogPostgresTestSupport.URL + "?currentSchema=public"),
        Arguments.of(migration, "AUDIT_TEST_DB_USER", "postgres"),
        Arguments.of(migration, "AUDIT_TEST_DB_USER", AuditLogPostgresTestSupport.USER),
        Arguments.of(migration, "AUDIT_TEST_DB_PASSWORD_FILE", BOOTSTRAP_PASSWORD_FILE.toString()),
        Arguments.of(migration, "AUDIT_TEST_DB_PASSWORD_FILE", "")));
  }

  @Test
  void acceptsExactlyThirtyFiveSuccessfulSqlMigrations() {
    // Thay V35 đầy đủ bằng tiền tố hợp lệ trước nâng cấp V36.
    assertThatCode(() -> AuditLogPostgresTestSupport.validateHistory(history(35), false))
        .doesNotThrowAnyException();
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateHistory(history(35), true))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test
  void acceptsExactlyThirtySixSuccessfulSqlMigrations() {
    assertThatCode(() -> AuditLogPostgresTestSupport.validateHistory(history(36), true))
        .doesNotThrowAnyException();
  }

  @Test
  void rejectsMissingPendingFailedFutureDuplicateAndBaselineHistory() {
    List<List<AuditLogPostgresTestSupport.MigrationRow>> invalid = new ArrayList<>();
    invalid.add(List.of());
    invalid.add(history(34));
    invalid.add(history(35));
    invalid.add(history(37));
    List<AuditLogPostgresTestSupport.MigrationRow> failed = history(36);
    failed.set(10, row("11", "SQL", false));
    invalid.add(failed);
    List<AuditLogPostgresTestSupport.MigrationRow> duplicate = history(36);
    duplicate.set(10, row("10", "SQL", true));
    invalid.add(duplicate);
    List<AuditLogPostgresTestSupport.MigrationRow> baseline = history(36);
    baseline.set(0, row("1", "BASELINE", true));
    invalid.add(baseline);
    for (var rows : invalid) {
      assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateHistory(rows, true))
          .isInstanceOf(IllegalStateException.class);
    }
  }

  @Test
  void permitsAnUnfinishedValidPrefixOnlyForTheSeparateMigrationStep() {
    assertThatCode(() -> AuditLogPostgresTestSupport.validateHistory(history(12), false))
        .doesNotThrowAnyException();
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateHistory(history(12), true))
        .isInstanceOf(IllegalStateException.class);
    List<AuditLogPostgresTestSupport.MigrationRow> skipped = history(12);
    skipped.remove(4);
    assertThatThrownBy(() -> AuditLogPostgresTestSupport.validateHistory(skipped, false))
        .isInstanceOf(IllegalStateException.class);
  }

  @ParameterizedTest
  @MethodSource("schemaStates")
  void checksSchemaExistenceOwnershipAndHistoryUsingOnlySelect(boolean present, String owner,
      boolean hasHistory, long relations, boolean requireHistory, boolean accepted) throws Exception {
    Connection connection = mock(Connection.class);
    PreparedStatement query = mock(PreparedStatement.class);
    ResultSet result = mock(ResultSet.class);
    when(connection.prepareStatement(anyString())).thenReturn(query);
    when(query.executeQuery()).thenReturn(result);
    when(result.next()).thenReturn(present);
    when(result.getString("owner")).thenReturn(owner);
    when(result.getString("history")).thenReturn(hasHistory ? "flyway_schema_history" : null);
    when(result.getLong("relations")).thenReturn(relations);
    if (accepted) {
      assertThat(AuditLogPostgresTestSupport.verifySchema(connection, requireHistory))
          .isEqualTo(hasHistory);
    } else {
      assertThatThrownBy(() -> AuditLogPostgresTestSupport.verifySchema(connection, requireHistory))
          .isInstanceOf(IllegalStateException.class);
    }
    verify(query).setString(1, AuditLogPostgresTestSupport.SCHEMA);
    verify(query).executeQuery();
  }

  static Stream<Arguments> schemaStates() {
    String owner = AuditLogPostgresTestSupport.RUNNER_USER;
    return Stream.of(
        Arguments.of(false, null, false, 0L, true, false),
        Arguments.of(false, null, false, 0L, false, false),
        Arguments.of(true, "other_owner", true, 1L, true, false),
        Arguments.of(true, AuditLogPostgresTestSupport.USER, true, 1L, true, false),
        Arguments.of(true, owner, false, 0L, true, false),
        Arguments.of(true, owner, false, 1L, false, false),
        Arguments.of(true, owner, false, 0L, false, true),
        Arguments.of(true, owner, true, 1L, true, true));
  }

  private static void approval(Map<String, String> environment, boolean migration) {
    if (migration) {
      AuditLogPostgresTestSupport.requireMigrationApproval(environment, RUNNER_PASSWORD_FILE);
    } else {
      AuditLogPostgresTestSupport.requireIntegrationApproval(environment, RUNNER_PASSWORD_FILE);
    }
  }

  private static Map<String, String> target() {
    return new HashMap<>(Map.of(
        "AUDIT_TEST_DB_URL", AuditLogPostgresTestSupport.URL,
        "AUDIT_TEST_DB_USER", AuditLogPostgresTestSupport.RUNNER_USER,
        "AUDIT_TEST_DB_PASSWORD_FILE", RUNNER_PASSWORD_FILE.toString(),
        "AUDIT_TEST_SCHEMA", AuditLogPostgresTestSupport.SCHEMA));
  }

  private static List<AuditLogPostgresTestSupport.MigrationRow> history(int count) {
    return IntStream.rangeClosed(1, count)
        .mapToObj(version -> row(Integer.toString(version), "SQL", true))
        .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
  }

  private static AuditLogPostgresTestSupport.MigrationRow row(String version, String type, boolean success) {
    return new AuditLogPostgresTestSupport.MigrationRow(version, type, success);
  }
}
