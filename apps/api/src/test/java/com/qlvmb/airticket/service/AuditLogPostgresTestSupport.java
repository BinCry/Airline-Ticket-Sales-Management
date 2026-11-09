package com.qlvmb.airticket.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import java.util.function.Supplier;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactoryBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.AbstractDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

final class AuditLogPostgresTestSupport {
  static final String URL = "jdbc:postgresql://127.0.0.1:55432/airline_audit_test";
  static final String USER = "airline_audit_tester";
  static final String SCHEMA = "audit_it_20261025_01";
  static final Path PASSWORD_FILE = Path.of(
      "C:\\Users\\WIN10PRO\\AppData\\Local\\CodexTools\\AirlineAuditPostgres15\\postgres-password.txt");
  static final String RUNNER_USER = "airline_audit_runner";
  static final Path RUNNER_PASSWORD_FILE = PASSWORD_FILE.resolveSibling("airline-audit-runner-password.txt");

  private AuditLogPostgresTestSupport() {
  }

  record Target(String url, String user, Path passwordFile) {
  }

  static Target validateTarget(Map<String, String> environment) {
    return validateTarget(environment, USER, PASSWORD_FILE);
  }

  static Target validateRunnerTarget(Map<String, String> environment) {
    return validateTarget(environment, RUNNER_USER, RUNNER_PASSWORD_FILE);
  }

  // Tham số đường dẫn thay thế hằng Windows trong validation thuần; credentials vẫn giữ allowlist thật.
  static Target validateTarget(Map<String, String> environment, String user, Path passwordFile) {
    if (!URL.equals(environment.get("AUDIT_TEST_DB_URL"))) {
      throw new IllegalStateException("JDBC test chỉ được kết nối database Airline tại 127.0.0.1:55432.");
    }
    if (!user.equals(environment.get("AUDIT_TEST_DB_USER"))) {
      throw new IllegalStateException("JDBC test yêu cầu đúng tài khoản PostgreSQL Airline đã duyệt.");
    }
    String configuredPath = environment.get("AUDIT_TEST_DB_PASSWORD_FILE");
    if (configuredPath == null || configuredPath.isBlank()) {
      throw new IllegalStateException("Thiếu đường dẫn credential Airline đã duyệt.");
    }
    Path path = Path.of(configuredPath);
    if (!path.isAbsolute() || !path.normalize().equals(passwordFile)) {
      throw new IllegalStateException("Đường dẫn credential khác vị trí Airline đã duyệt.");
    }
    return new Target(URL, user, path.normalize());
  }

  static void requireFlag(String name) {
    requireFlag(System.getenv(), name);
  }

  static void requireFlag(Map<String, String> environment, String name) {
    if (!"true".equals(environment.get(name))) {
      throw new IllegalStateException("Chưa bật quyền kiểm thử riêng: " + name);
    }
  }

  static Connection openReadOnlyConnection() throws SQLException {
    requireFlag("AUDIT_TEST_JDBC_READ_ONLY");
    Target target = validateTarget(System.getenv());
    Properties properties = credentials(target);
    // Chặn ghi ngay từ cấu hình phiên, trước truy vấn đầu tiên của test.
    properties.setProperty("options", "-c default_transaction_read_only=on");
    properties.setProperty("readOnly", "true");
    properties.setProperty("readOnlyMode", "always");
    properties.setProperty("connectTimeout", "5");
    properties.setProperty("socketTimeout", "15");
    Connection connection = connect(target.url(), properties);
    try {
      connection.setReadOnly(true);
      connection.setAutoCommit(false);
      return connection;
    } catch (SQLException exception) {
      connection.close();
      throw safeSqlException(exception);
    } finally {
      properties.remove("password");
    }
  }

  static Properties credentials(Target target) {
    // Kiểm tra lại đích trước khi đọc file; không ghi credential vào environment hay log.
    boolean bootstrap = USER.equals(target.user()) && PASSWORD_FILE.equals(target.passwordFile());
    boolean runner = RUNNER_USER.equals(target.user()) && RUNNER_PASSWORD_FILE.equals(target.passwordFile());
    if (!URL.equals(target.url()) || (!bootstrap && !runner)) {
      throw new IllegalStateException("Đích JDBC không còn khớp cấu hình đã duyệt.");
    }
    byte[] bytes = null;
    try {
      Path path = target.passwordFile();
      if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)
          || !path.toRealPath().equals(target.passwordFile())) {
        throw new IllegalStateException("Credential không phải file thường tại vị trí đã duyệt.");
      }
      try (var input = Files.newInputStream(path, StandardOpenOption.READ, LinkOption.NOFOLLOW_LINKS)) {
        bytes = input.readNBytes(1025);
      }
      if (bytes.length == 0 || bytes.length > 1024) {
        throw new IllegalStateException("Kích thước credential không hợp lệ.");
      }
      String password = new String(bytes, StandardCharsets.UTF_8).replaceFirst("\\r?\\n\\z", "");
      if (password.isEmpty() || password.indexOf('\n') >= 0 || password.indexOf('\r') >= 0) {
        throw new IllegalStateException("Định dạng credential không hợp lệ.");
      }
      Properties properties = new Properties();
      properties.setProperty("user", target.user());
      properties.setProperty("password", password);
      return properties;
    } catch (IOException exception) {
      throw new IllegalStateException("Không đọc được credential Airline; không xuất nội dung file.");
    } finally {
      if (bytes != null) {
        Arrays.fill(bytes, (byte) 0);
      }
    }
  }

  private static Connection connect(String url, Properties properties) throws SQLException {
    try {
      return DriverManager.getConnection(url, properties);
    } catch (SQLException exception) {
      // Không chuyển tiếp thông tin kết nối hoặc thông báo có thể chứa credential.
      throw safeSqlException(exception);
    }
  }

  private static SQLException safeSqlException(SQLException exception) {
    return new SQLException("Kết nối JDBC Airline thất bại; SQLState=" + exception.getSQLState(),
        exception.getSQLState());
  }

  static Target requireIntegrationApproval() {
    return requireIntegrationApproval(System.getenv());
  }

  static Target requireIntegrationApproval(Map<String, String> environment) {
    return requireIntegrationApproval(environment, RUNNER_PASSWORD_FILE);
  }

  static Target requireIntegrationApproval(Map<String, String> environment, Path passwordFile) {
    requireFlag(environment, "AUDIT_TEST_ALLOW_WRITES");
    if ("true".equals(environment.get("AUDIT_TEST_ALLOW_MIGRATIONS"))
        || "true".equals(environment.get("AUDIT_TEST_PROVISION_RUNNER"))) {
      throw new IllegalStateException("Không bật migration cùng lượt chạy integration test.");
    }
    return approvedSchemaTarget(environment, passwordFile);
  }

  static Target requireMigrationApproval(Map<String, String> environment) {
    return requireMigrationApproval(environment, RUNNER_PASSWORD_FILE);
  }

  static Target requireMigrationApproval(Map<String, String> environment, Path passwordFile) {
    requireFlag(environment, "AUDIT_TEST_ALLOW_MIGRATIONS");
    if ("true".equals(environment.get("AUDIT_TEST_ALLOW_WRITES"))
        || "true".equals(environment.get("AUDIT_TEST_PROVISION_RUNNER"))) {
      throw new IllegalStateException("Migration phải chạy riêng, không kèm integration test ghi dữ liệu.");
    }
    return approvedSchemaTarget(environment, passwordFile);
  }

  private static Target approvedSchemaTarget(Map<String, String> environment, Path passwordFile) {
    if (!SCHEMA.equals(environment.get("AUDIT_TEST_SCHEMA"))) {
      throw new IllegalStateException("Schema test chưa khớp tên được đề xuất để duyệt.");
    }
    return validateTarget(environment, RUNNER_USER, passwordFile);
  }

  static Target requireProvisioningApproval(Map<String, String> environment) {
    return requireProvisioningApproval(environment, PASSWORD_FILE);
  }

  static Target requireProvisioningApproval(Map<String, String> environment, Path passwordFile) {
    requireFlag(environment, "AUDIT_TEST_PROVISION_RUNNER");
    for (String forbidden : List.of("AUDIT_TEST_ALLOW_WRITES", "AUDIT_TEST_ALLOW_MIGRATIONS",
        "AUDIT_TEST_JDBC_READ_ONLY")) {
      if ("true".equals(environment.get(forbidden))) {
        throw new IllegalStateException("Provisioning phải chạy riêng: " + forbidden);
      }
    }
    if (!SCHEMA.equals(environment.get("AUDIT_TEST_SCHEMA"))) {
      throw new IllegalStateException("Provisioning chỉ dành cho schema Audit Log đã duyệt.");
    }
    return validateTarget(environment, USER, passwordFile);
  }

  private static Flyway flyway(DataSource dataSource) {
    return Flyway.configure().dataSource(dataSource).schemas(SCHEMA).defaultSchema(SCHEMA)
        .locations("classpath:db/migration").target("36").createSchemas(false)
        .baselineOnMigrate(false).cleanDisabled(true).validateMigrationNaming(true).load();
  }

  static Connection openMigrationReadOnlyConnection() throws SQLException {
    return new GuardedDataSource(true, true).getConnection();
  }

  static void verifyAuditFilterIndexes(Connection connection) throws SQLException {
    try (var query = connection.prepareStatement("""
        select ix.relname as index_name, tbl.relname as table_name, ns.nspname as schema_name,
               am.amname as method, i.indisvalid, i.indisready, i.indisunique,
               i.indpred is null and i.indexprs is null as plain_index,
               array(select a.attname::text from unnest(i.indkey) with ordinality k(attnum, pos)
                     join pg_catalog.pg_attribute a
                       on a.attrelid=i.indrelid and a.attnum=k.attnum order by k.pos) as column_names,
               array(select op.opcname::text from unnest(i.indclass) with ordinality c(oid, pos)
                     join pg_catalog.pg_opclass op on op.oid=c.oid order by c.pos) as operator_classes
        from pg_catalog.pg_index i
        join pg_catalog.pg_class ix on ix.oid=i.indexrelid
        join pg_catalog.pg_class tbl on tbl.oid=i.indrelid
        join pg_catalog.pg_namespace ns on ns.oid=tbl.relnamespace
        join pg_catalog.pg_am am on am.oid=ix.relam
        where ns.nspname=? and ix.relname in ('idx_audit_log_action', 'idx_audit_log_target')
        order by ix.relname
        """)) {
      query.setString(1, SCHEMA);
      int found = 0;
      try (var result = query.executeQuery()) {
        while (result.next()) {
          String name = result.getString("index_name");
          boolean action = "idx_audit_log_action".equals(name);
          List<String> columns = action ? List.of("action") : List.of("target_type", "target_id");
          List<String> operators = action ? List.of("varchar_pattern_ops") : List.of("text_ops", "text_ops");
          java.sql.Array actualColumns = result.getArray("column_names");
          java.sql.Array actualOperators = result.getArray("operator_classes");
          try {
            if (!SCHEMA.equals(result.getString("schema_name"))
                || !"audit_log".equals(result.getString("table_name"))
                || !"btree".equals(result.getString("method"))
                || !result.getBoolean("indisvalid") || !result.getBoolean("indisready")
                || result.getBoolean("indisunique") || !result.getBoolean("plain_index")
                || !columns.equals(Arrays.asList((String[]) actualColumns.getArray()))
                || !operators.equals(Arrays.asList((String[]) actualOperators.getArray()))) {
              throw new IllegalStateException("Index Audit không khớp định nghĩa V36: " + name);
            }
          } finally {
            actualColumns.free();
            actualOperators.free();
          }
          found++;
        }
      }
      if (found != 2) {
        throw new IllegalStateException("Chưa có đủ hai index Audit của V36.");
      }
    }
  }

  static void migrateApprovedSchema() throws SQLException {
    requireMigrationApproval(System.getenv());
    DataSource validationSource = new GuardedDataSource(true, true);
    try (Connection connection = validationSource.getConnection()) {
      if (verifySchema(connection, false)) {
        verifyHistory(connection, false);
      }
    }
    // Chỉ điểm vào migration riêng được ghi DDL/DML; không tự tạo schema.
    flyway(new GuardedDataSource(true, false)).migrate();
    verifyPreparedSchema(validationSource);
  }

  private static void verifyPreparedSchema(DataSource dataSource) throws SQLException {
    try (Connection connection = dataSource.getConnection()) {
      verifySchema(connection, true);
      verifyHistory(connection, true);
    }
    // Thay migrate ngầm bằng validate checksum trên datasource chỉ đọc.
    flyway(dataSource).validate();
  }

  static boolean verifySchema(Connection connection, boolean requireHistory) throws SQLException {
    try (var query = connection.prepareStatement("""
        select pg_get_userbyid(nspowner) as owner,
               to_regclass('audit_it_20261025_01.flyway_schema_history') as history,
               (select count(*) from pg_catalog.pg_class c
                where c.relnamespace=n.oid) as relations
        from pg_catalog.pg_namespace n where nspname=?
        """)) {
      query.setString(1, SCHEMA);
      try (var result = query.executeQuery()) {
        if (!result.next() || !RUNNER_USER.equals(result.getString("owner"))) {
          throw new IllegalStateException("Schema test chưa tồn tại hoặc khác chủ sở hữu đã duyệt.");
        }
        boolean hasHistory = result.getString("history") != null;
        if (!hasHistory && (requireHistory || result.getLong("relations") != 0)) {
          throw new IllegalStateException("Schema thiếu lịch sử Flyway; không tự nhận dữ liệu có sẵn.");
        }
        return hasHistory;
      }
    }
  }

  record MigrationRow(String version, String type, boolean success) {
  }

  private static void verifyHistory(Connection connection, boolean requireComplete) throws SQLException {
    List<MigrationRow> rows = new ArrayList<>();
    try (var query = connection.createStatement();
        var result = query.executeQuery("""
            select version, type, success
            from audit_it_20261025_01.flyway_schema_history order by installed_rank
            """)) {
      while (result.next()) {
        rows.add(new MigrationRow(result.getString("version"), result.getString("type"),
            result.getBoolean("success")));
      }
    }
    validateHistory(rows, requireComplete);
  }

  static void validateHistory(List<MigrationRow> rows, boolean requireComplete) {
    int nextVersion = 1;
    for (MigrationRow row : rows) {
      if (row.success() && row.version() == null && "SCHEMA".equals(row.type())) {
        continue;
      }
      if (!row.success() || !"SQL".equals(row.type()) || nextVersion > 36
          || !Integer.toString(nextVersion).equals(row.version())) {
        throw new IllegalStateException("Lịch sử Flyway không phải chuỗi V1–V36 thành công theo thứ tự.");
      }
      nextVersion++;
    }
    if (requireComplete && nextVersion != 37) {
      throw new IllegalStateException("Schema chưa được migrate đầy đủ V1–V36 ở bước riêng đã duyệt.");
    }
  }

  static IntegrationSession openIntegration() throws SQLException {
    // JUnit gọi hàm này sau opt-in; chưa tạo datasource hoặc context trước guard.
    requireIntegrationApproval();
    verifyPreparedSchema(new GuardedDataSource(false, true));
    requireIntegrationApproval();
    DataSource dataSource = new GuardedDataSource(false, false);
    AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
    try {
      context.registerBean(DataSource.class, () -> dataSource);
      context.register(PersistenceConfiguration.class);
      context.refresh();
      return new IntegrationSession(context, dataSource);
    } catch (RuntimeException exception) {
      context.close();
      throw exception;
    }
  }

  static void verifyRunnerPermissions(Connection connection) throws SQLException {
    try (var query = connection.createStatement();
        var result = query.executeQuery("""
            select current_database() as database_name, current_user as user_name,
                   session_user as session_user_name,
                   current_setting('server_version_num')::integer / 10000 as major_version,
                   inet_client_addr() is not null as tcp,
                   r.rolcanlogin as login, r.rolsuper as superuser,
                   r.rolcreatedb as create_database, r.rolcreaterole as create_role,
                   r.rolreplication as replication, r.rolbypassrls as bypass_rls,
                   r.rolinherit as inherit,
                   exists(select 1 from pg_catalog.pg_auth_members where member=r.oid) as membership,
                   exists(select 1 from pg_catalog.pg_database where datdba=r.oid) as database_owner,
                   has_database_privilege(r.oid, current_database(), 'CONNECT') as connect,
                   has_database_privilege(r.oid, current_database(), 'TEMP') as temporary,
                   has_database_privilege(r.oid, current_database(), 'CREATE') as database_create,
                   n.nspowner=r.oid as schema_owner,
                   has_schema_privilege(r.oid, n.oid, 'USAGE') as schema_usage,
                   has_schema_privilege(r.oid, n.oid, 'CREATE') as schema_create,
                   has_language_privilege(r.oid, 'plpgsql', 'USAGE') as plpgsql_usage,
                   exists(select 1 from pg_catalog.pg_namespace other
                     where other.nspname <> 'audit_it_20261025_01'
                       and other.nspname !~ '^pg_(toast_)?temp_[0-9]+$'
                       and (other.nspowner=r.oid
                            or has_schema_privilege(r.oid, other.oid, 'CREATE'))) as outside_schema_create,
                   exists(select 1 from pg_catalog.pg_class c
                     join pg_catalog.pg_namespace ns on ns.oid=c.relnamespace
                     where ns.nspname <> 'audit_it_20261025_01'
                       and ns.nspname !~ '^pg_' and ns.nspname <> 'information_schema'
                       and (c.relowner=r.oid
                         or case when c.relkind in ('r','p','v','f')
                             then has_table_privilege(r.oid, c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
                             when c.relkind='S' then has_sequence_privilege(r.oid, c.oid, 'USAGE,UPDATE')
                             else false end))
                     as outside_schema_write
            from pg_catalog.pg_roles r
            join pg_catalog.pg_namespace n on n.nspname='audit_it_20261025_01'
            where r.rolname=current_user
            """)) {
      validateRunnerPermissions(result);
    }
  }

  static void validateRunnerPermissions(java.sql.ResultSet result) throws SQLException {
    if (!result.next() || !"airline_audit_test".equals(result.getString("database_name"))
        || !RUNNER_USER.equals(result.getString("user_name"))
        || !RUNNER_USER.equals(result.getString("session_user_name"))
        || result.getInt("major_version") != 15) {
      throw new IllegalStateException("Danh tính PostgreSQL không phải runner Airline đã duyệt.");
    }
    for (String required : List.of("tcp", "login", "connect", "temporary", "schema_owner",
        "schema_usage", "schema_create", "plpgsql_usage")) {
      if (!result.getBoolean(required) || result.wasNull()) {
        throw new IllegalStateException("Runner thiếu điều kiện bắt buộc: " + required);
      }
    }
    for (String forbidden : List.of("superuser", "create_database", "create_role", "replication",
        "bypass_rls", "inherit", "membership", "database_owner", "database_create",
        "outside_schema_create", "outside_schema_write")) {
      if (result.getBoolean(forbidden) || result.wasNull()) {
        throw new IllegalStateException("Runner có quyền ngoài phạm vi hoặc metadata không hợp lệ: " + forbidden);
      }
    }
  }

  private static final class GuardedDataSource extends AbstractDataSource {
    private final boolean migration;
    private final boolean readOnly;

    private GuardedDataSource(boolean migration, boolean readOnly) {
      this.migration = migration;
      this.readOnly = readOnly;
      approval();
    }

    private Target approval() {
      return migration ? requireMigrationApproval(System.getenv()) : requireIntegrationApproval();
    }

    @Override
    public Connection getConnection() throws SQLException {
      Target target = approval();
      Properties properties = credentials(target);
      properties.setProperty("currentSchema", SCHEMA);
      properties.setProperty("connectTimeout", "5");
      properties.setProperty("socketTimeout", "30");
      if (readOnly) {
        properties.setProperty("options", "-c default_transaction_read_only=on");
        properties.setProperty("readOnly", "true");
        properties.setProperty("readOnlyMode", "always");
      }
      Connection connection = null;
      try {
        connection = connect(target.url(), properties);
        // Thay kiểm tra danh tính đơn thuần bằng kiểm tra quyền trước khi giao connection ghi.
        verifyRunnerPermissions(connection);
        return connection;
      } catch (SQLException | RuntimeException exception) {
        if (connection != null) {
          connection.close();
        }
        if (exception instanceof SQLException sqlException) {
          throw safeSqlException(sqlException);
        }
        throw exception;
      } finally {
        properties.remove("password");
      }
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
      throw new SQLFeatureNotSupportedException("Không cho thay credential ngoài guard của Audit test.");
    }
  }

  @TestConfiguration(proxyBeanMethods = false)
  @EnableTransactionManagement
  static class PersistenceConfiguration {
    @Bean
    LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
      requireIntegrationApproval();
      var factory = new LocalContainerEntityManagerFactoryBean();
      factory.setDataSource(dataSource);
      factory.setPackagesToScan("com.qlvmb.airticket.domain.entity");
      factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
      factory.setJpaPropertyMap(Map.of(
          "hibernate.hbm2ddl.auto", "validate",
          "hibernate.default_schema", SCHEMA,
          "hibernate.jdbc.time_zone", "Asia/Ho_Chi_Minh",
          "hibernate.generate_statistics", "true",
          "hibernate.show_sql", "false"));
      return factory;
    }

    @Bean
    PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
      return new JpaTransactionManager(factory);
    }

    @Bean
    EntityManager entityManager(EntityManagerFactory factory) {
      return SharedEntityManagerCreator.createSharedEntityManager(factory);
    }

    @Bean
    JpaRepositoryFactoryBean<AuditLogRepository, AuditLogEntity, Long> auditLogRepository(
        EntityManager entityManager) {
      var factory = new JpaRepositoryFactoryBean<AuditLogRepository, AuditLogEntity, Long>(AuditLogRepository.class);
      factory.setEntityManager(entityManager);
      return factory;
    }

    @Bean
    JpaRepositoryFactoryBean<UserAccountRepository, UserAccountEntity, Long> userAccountRepository(
        EntityManager entityManager) {
      var factory = new JpaRepositoryFactoryBean<UserAccountRepository, UserAccountEntity, Long>(UserAccountRepository.class);
      factory.setEntityManager(entityManager);
      return factory;
    }

    @Bean
    AuditLogQueryService auditLogQueryService(AuditLogRepository repository) {
      return new AuditLogQueryService(repository);
    }

    @Bean
    AuditLogExportAuditService auditLogExportAuditService(AuditLogRepository audits,
        UserAccountRepository users, PlatformTransactionManager manager) {
      return new AuditLogExportAuditService(audits, users, manager);
    }

    @Bean
    ObjectMapper objectMapper() {
      return new ObjectMapper();
    }

    @Bean
    AuditLogExportService auditLogExportService(AuditLogQueryService queries,
        AuditLogExportAuditService auditWriter, EntityManager entityManager,
        ObjectMapper mapper, PlatformTransactionManager manager) {
      return new AuditLogExportService(queries, auditWriter, entityManager, mapper, manager);
    }
  }

  static final class IntegrationSession implements AutoCloseable {
    private final AnnotationConfigApplicationContext context;
    private final JdbcTemplate jdbc;

    private IntegrationSession(AnnotationConfigApplicationContext context, DataSource dataSource) {
      this.context = context;
      this.jdbc = new JdbcTemplate(dataSource);
    }

    <T> T write(Supplier<T> operation) {
      requireIntegrationApproval();
      var transaction = new TransactionTemplate(manager());
      transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
      return transaction.execute(status -> operation.get());
    }

    <T> T read(Supplier<T> operation) {
      requireIntegrationApproval();
      var transaction = new TransactionTemplate(manager());
      transaction.setReadOnly(true);
      return transaction.execute(status -> operation.get());
    }

    JdbcTemplate jdbc() {
      requireIntegrationApproval();
      return jdbc;
    }

    PlatformTransactionManager manager() {
      return context.getBean(PlatformTransactionManager.class);
    }

    EntityManager entityManager() {
      return context.getBean(EntityManager.class);
    }

    EntityManagerFactory entityManagerFactory() {
      return context.getBean(EntityManagerFactory.class);
    }

    AuditLogRepository repository() {
      return context.getBean(AuditLogRepository.class);
    }

    AuditLogQueryService queries() {
      return context.getBean(AuditLogQueryService.class);
    }

    AuditLogExportAuditService auditWriter() {
      return context.getBean(AuditLogExportAuditService.class);
    }

    AuditLogExportService exports() {
      return context.getBean(AuditLogExportService.class);
    }

    long actor(String displayName) {
      return write(() -> jdbc.queryForObject("""
          insert into user_account(email,password_hash,display_name,status,email_verified,created_at,updated_at)
          values (?, 'TEST_ONLY_NOT_A_LOGIN_HASH', ?, 'active', false, now(), now()) returning id
          """, Long.class, UUID.randomUUID() + "@example.test", displayName));
    }

    long log(Long actorId, String action, String targetId, String detail, OffsetDateTime time,
        boolean hidden) {
      return write(() -> {
        UserAccountEntity actor = actorId == null ? null
            : entityManager().getReference(UserAccountEntity.class, actorId);
        AuditLogEntity log = AuditLogEntity.create(actor, action, "audit_test", targetId, detail, time);
        if (hidden) {
          log.hideFromUi(time.plusHours(1));
        }
        return repository().saveAndFlush(log).getId();
      });
    }

    void bulkLogs(String targetId, int count, String detail) {
      write(() -> jdbc.update("""
          insert into audit_log(actor_user_id,action,target_type,target_id,detail,created_at)
          select null, 'test.audit.created', 'audit_test', ?, ?, ?::timestamptz
          from generate_series(1, ?)
          """, targetId, detail, "2026-10-25T05:00:00Z", count));
    }

    @Override
    public void close() {
      // Chỉ đóng tài nguyên Java; giữ nguyên schema và dữ liệu để review.
      context.close();
    }
  }
}
