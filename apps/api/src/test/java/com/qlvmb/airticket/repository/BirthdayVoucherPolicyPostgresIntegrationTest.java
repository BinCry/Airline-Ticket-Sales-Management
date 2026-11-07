package com.qlvmb.airticket.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.config.BirthdayVoucherPolicy;
import com.qlvmb.airticket.repository.BirthdayVoucherRepository.Outcome;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.HexFormat;
import java.util.List;
import java.util.Properties;
import java.util.UUID;
import java.util.stream.IntStream;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@EnabledIfEnvironmentVariable(named = "BIRTHDAY_POLICY_TEST_ALLOW_WRITES", matches = "true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Execution(ExecutionMode.SAME_THREAD)
@Timeout(60)
class BirthdayVoucherPolicyPostgresIntegrationTest {
  private static final String URL =
      "jdbc:postgresql://127.0.0.1:55432/airline_birthday_foundation_test";
  private static final String DATABASE = "airline_birthday_foundation_test";
  private static final String SCHEMA = "birthday_policy_it_20261107_closeout";
  private static final String ROLE = "airline_audit_runner";
  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final LocalDate BIRTHDAY = LocalDate.of(2026, 12, 31);
  private static final Instant NOW = Instant.parse("2027-01-02T17:05:00Z");
  private static final ObjectMapper JSON = new ObjectMapper();

  private DriverManagerDataSource source;
  private DriverManagerDataSource readerSource;
  private JdbcTemplate jdbc;

  @BeforeAll
  void prepareApprovedSchema() throws Exception {
    assertThat(required("BIRTHDAY_POLICY_TEST_DB_URL")).isEqualTo(URL);
    assertThat(required("BIRTHDAY_POLICY_TEST_DB_USER")).isEqualTo(ROLE);
    assertThat(required("BIRTHDAY_POLICY_TEST_SCHEMA")).isEqualTo(SCHEMA);
    Path migrations = verifyMigrations();
    Path passwordFile = Path.of(required("BIRTHDAY_POLICY_TEST_PASSWORD_FILE"));
    assertThat(passwordFile.isAbsolute()).isTrue();
    assertThat(Files.isRegularFile(passwordFile, LinkOption.NOFOLLOW_LINKS)).isTrue();
    assertThat(passwordFile.toRealPath()).isEqualTo(passwordFile.toAbsolutePath().normalize());
    assertThat(Files.size(passwordFile)).isBetween(1L, 4096L);
    String password = Files.readString(passwordFile).stripTrailing();
    if (password.isEmpty()) {
      throw new IllegalStateException("Tệp mật khẩu thử nghiệm rỗng.");
    }

    // Xác minh TCP bằng phiên chỉ đọc trước khi mở kết nối được phép ghi.
    var metadataSource = dataSource(password, "pg_catalog", true);
    try (Connection connection = metadataSource.getConnection()) {
      assertThat(connection.getMetaData().getDatabaseProductName()).isEqualTo("PostgreSQL");
      assertThat(connection.getMetaData().getDatabaseMajorVersion()).isEqualTo(15);
      try (var statement = connection.createStatement();
          var rows = statement.executeQuery("""
              select current_database(),current_user,session_user,
                current_setting('transaction_read_only'),current_schema(),
                pg_get_userbyid(d.datdba),r.rolsuper,r.rolcreatedb,
                has_database_privilege(current_user,current_database(),'CONNECT'),
                has_database_privilege(current_user,current_database(),'CREATE'),
                (select pg_get_userbyid(nspowner) from pg_namespace where nspname='birthday_policy_it_20261107_closeout'),
                has_schema_privilege(current_user,'birthday_policy_it_20261107_closeout','USAGE'),
                has_schema_privilege(current_user,'birthday_policy_it_20261107_closeout','CREATE'),
                (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
                  where n.nspname='birthday_policy_it_20261107_closeout'),
                (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='birthday_policy_it_20261107_closeout'),
                (select count(*) from pg_type t join pg_namespace n on n.oid=t.typnamespace
                  where n.nspname='birthday_policy_it_20261107_closeout')
              from pg_database d join pg_roles r on r.rolname=current_user
              where d.datname=current_database()
              """)) {
        assertThat(rows.next()).isTrue();
        assertThat(rows.getString(1)).isEqualTo(DATABASE);
        assertThat(rows.getString(2)).isEqualTo(ROLE);
        assertThat(rows.getString(3)).isEqualTo(ROLE);
        assertThat(rows.getString(4)).isEqualTo("on");
        assertThat(rows.getString(5)).isEqualTo("pg_catalog");
        assertThat(rows.getString(6)).isEqualTo(ROLE);
        assertThat(rows.getBoolean(7)).isFalse();
        assertThat(rows.getBoolean(8)).isFalse();
        assertThat(rows.getBoolean(9)).isTrue();
        assertThat(rows.getBoolean(10)).isTrue();
        assertThat(rows.getString(11)).isEqualTo(ROLE);
        assertThat(rows.getBoolean(12)).isTrue();
        assertThat(rows.getBoolean(13)).isTrue();
        assertThat(rows.getLong(14)).isZero();
        assertThat(rows.getLong(15)).isZero();
        assertThat(rows.getLong(16)).isZero();
        assertThat(rows.next()).isFalse();
      }
    }

    source = dataSource(password, SCHEMA + ",pg_catalog", false);
    readerSource = dataSource(password, SCHEMA + ",pg_catalog", true);
    jdbc = new JdbcTemplate(source);
    // Chỉ migrate schema mới đã được cấp quyền; không tự tạo hoặc dọn schema.
    Flyway flyway = Flyway.configure().dataSource(source).schemas(SCHEMA).defaultSchema(SCHEMA)
        .createSchemas(false).cleanDisabled(true).locations("filesystem:" + migrations)
        .target("38").load();
    flyway.migrate();
    var versions = jdbc.query("select version from " + SCHEMA
        + ".flyway_schema_history where version is not null and success order by installed_rank",
        (rows, index) -> rows.getString(1));
    assertThat(versions).containsExactlyElementsOf(
        IntStream.rangeClosed(1, 38).mapToObj(Integer::toString).toList());
  }

  @Test
  void defaultPolicyIsInjectedAndCommittedAs100000For30Days() throws Exception {
    long userId = createMember();
    context().run(context -> {
      assertThat(context).hasNotFailed().hasSingleBean(BirthdayVoucherRepository.class);
      assertThat(context.getEnvironment().getProperty("app.voucher.birthday.discount-amount")).isNull();
      assertThat(context.getEnvironment().getProperty("app.voucher.birthday.valid-days")).isNull();
      var repository = context.getBean(BirthdayVoucherRepository.class);
      assertThat(ReflectionTestUtils.getField(repository, "policy"))
          .isSameAs(context.getBean(BirthdayVoucherPolicy.class));
      SavedVoucher saved = issueAndRead(repository, userId, Outcome.ISSUED);
      assertPolicy(saved, userId, 100000, 30);
    });
  }

  @Test
  void overrideIsCommittedAs50000For14DaysWithoutChangingOldVoucher() throws Exception {
    long oldUserId = createMember();
    long newUserId = createMember();
    SavedVoucher[] original = new SavedVoucher[1];
    context().run(context -> {
      assertThat(context).hasNotFailed();
      assertThat(context.getEnvironment().getProperty("app.voucher.birthday.discount-amount")).isNull();
      assertThat(context.getEnvironment().getProperty("app.voucher.birthday.valid-days")).isNull();
      original[0] = issueAndRead(context.getBean(BirthdayVoucherRepository.class),
          oldUserId, Outcome.ISSUED);
      assertPolicy(original[0], oldUserId, 100000, 30);
    });

    context().withPropertyValues("app.voucher.birthday.discount-amount=50000",
        "app.voucher.birthday.valid-days=14").run(context -> {
          assertThat(context).hasNotFailed().hasSingleBean(BirthdayVoucherRepository.class);
          var repository = context.getBean(BirthdayVoucherRepository.class);
          assertThat(ReflectionTestUtils.getField(repository, "policy"))
              .isSameAs(context.getBean(BirthdayVoucherPolicy.class));
          SavedVoucher fresh = issueAndRead(repository, newUserId, Outcome.ISSUED);
          assertPolicy(fresh, newUserId, 50000, 14);
          SavedVoucher unchanged = issueAndRead(repository, oldUserId, Outcome.ALREADY_ISSUED);
          assertPolicy(unchanged, oldUserId, 100000, 30);
          assertThat(unchanged.row()).isEqualTo(original[0].row());
        });
  }

  private ApplicationContextRunner context() {
    return new ApplicationContextRunner()
        .withUserConfiguration(BirthdayVoucherPolicy.class)
        .withBean(JdbcTemplate.class, () -> jdbc)
        .withBean(BirthdayVoucherRepository.class);
  }

  private TransactionTemplate transaction() {
    var transaction = new TransactionTemplate(new DataSourceTransactionManager(source));
    transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    return transaction;
  }

  private long createMember() {
    Long id = transaction().execute(status -> {
      Long userId = jdbc.queryForObject("insert into " + SCHEMA
          + ".user_account(email,password_hash,display_name,status) "
          + "values(?,'fixture-not-a-login-hash','Hội viên kiểm thử','active') returning id",
          Long.class, "birthday-policy-" + UUID.randomUUID() + "@example.test");
      assertThat(userId).isNotNull();
      assertThat(jdbc.update("insert into " + SCHEMA
          + ".user_role(user_id,role_id) select ?,id from " + SCHEMA
          + ".auth_role where code='member'", userId)).isEqualTo(1);
      jdbc.update("insert into " + SCHEMA
          + ".saved_passenger(user_id,full_name,passenger_type,date_of_birth,"
          + "document_type,document_number,is_primary) "
          + "values(?,'Hành khách kiểm thử','adult',?,'CCCD','FIXTURE',true)",
          userId, LocalDate.of(1990, 12, 31));
      return userId;
    });
    assertThat(id).isNotNull();
    return id;
  }

  private SavedVoucher issueAndRead(BirthdayVoucherRepository repository, long userId,
      Outcome expected) throws Exception {
    // Giữ connection đọc mở trước transaction ghi để chứng minh hai phiên độc lập.
    try (Connection reader = readerSource.getConnection()) {
      reader.setReadOnly(true);
      assertThat(reader.getAutoCommit()).isTrue();
      long readerPid;
      try (var statement = reader.createStatement();
          var rows = statement.executeQuery("select pg_backend_pid(),current_database(),"
              + "current_user,current_schema(),current_setting('transaction_read_only')")) {
        assertThat(rows.next()).isTrue();
        readerPid = rows.getLong(1);
        assertThat(rows.getString(2)).isEqualTo(DATABASE);
        assertThat(rows.getString(3)).isEqualTo(ROLE);
        assertThat(rows.getString(4)).isEqualTo(SCHEMA);
        assertThat(rows.getString(5)).isEqualTo("on");
      }
      Long writerPid = transaction().execute(status -> {
        Long pid = jdbc.queryForObject("select pg_backend_pid()", Long.class);
        assertThat(repository.issue(userId, BIRTHDAY, NOW)).isEqualTo(expected);
        return pid;
      });
      assertThat(writerPid).isNotNull().isNotEqualTo(readerPid);
      // execute đã commit; connection khác mới đọc dữ liệu đã lưu.
      try (PreparedStatement statement = reader.prepareStatement(
          "select row_to_json(v)::text from " + SCHEMA + ".member_voucher v where user_id=?")) {
        statement.setLong(1, userId);
        try (var rows = statement.executeQuery()) {
          assertThat(rows.next()).isTrue();
          JsonNode row = JSON.readTree(rows.getString(1));
          assertThat(rows.next()).isFalse();
          return new SavedVoucher(row);
        }
      }
    }
  }

  private void assertPolicy(SavedVoucher saved, long userId, long amount, int days) {
    JsonNode row = saved.row();
    assertThat(row.path("id").asLong()).isPositive();
    assertThat(row.path("user_id").asLong()).isEqualTo(userId);
    assertThat(row.path("voucher_code").asText()).isEqualTo("BDAY-" + userId + "-2026");
    assertThat(row.path("source").asText()).isEqualTo("BIRTHDAY");
    assertThat(row.path("status").asText()).isEqualTo("AVAILABLE");
    assertThat(row.path("currency").asText()).isEqualTo("VND");
    assertThat(row.path("discount_amount").asLong()).isEqualTo(amount);
    assertThat(row.path("condition_json")).isEqualTo(
        JSON.createObjectNode().put("minAmount", 200000));
    Instant expiry = OffsetDateTime.parse(row.path("expires_at").asText()).toInstant();
    assertThat(expiry).isEqualTo(BIRTHDAY.plusDays(days).atStartOfDay(ZONE).toInstant());
    assertThat(expiry.atZone(ZONE).toLocalTime()).isEqualTo(java.time.LocalTime.MIDNIGHT);
    assertThat(OffsetDateTime.parse(row.path("created_at").asText()).toInstant()).isEqualTo(NOW);
    assertThat(OffsetDateTime.parse(row.path("updated_at").asText()).toInstant()).isEqualTo(NOW);
  }

  private DriverManagerDataSource dataSource(String password, String searchPath, boolean readOnly) {
    var dataSource = new DriverManagerDataSource(URL + "?currentSchema=" + searchPath, ROLE, password);
    var properties = new Properties();
    properties.setProperty("options", "-c statement_timeout=15000 -c lock_timeout=5000 "
        + "-c timezone=UTC -c default_transaction_read_only=" + (readOnly ? "on" : "off"));
    properties.setProperty("connectTimeout", "5");
    properties.setProperty("socketTimeout", "30");
    dataSource.setConnectionProperties(properties);
    return dataSource;
  }

  private Path verifyMigrations() throws Exception {
    Path directory = Path.of("target/birthday-pg-migrations-6b03d").toAbsolutePath().normalize();
    assertThat(directory.toRealPath()).isEqualTo(directory);
    var manifest = JSON.readTree(Files.readString(
        Path.of("target/6b03e2a-preparation-20261104/fixture-manifest.json")));
    assertThat(manifest.isArray()).isTrue();
    assertThat(manifest.size()).isEqualTo(38);
    List<Path> files;
    try (var paths = Files.list(directory)) {
      files = paths.filter(path -> path.getFileName().toString().matches("V\\d+__.*\\.sql")).toList();
    }
    assertThat(files).hasSize(38);
    var versions = files.stream().map(path -> Integer.parseInt(
        path.getFileName().toString().substring(1).split("__")[0])).sorted().toList();
    assertThat(versions).containsExactlyElementsOf(IntStream.rangeClosed(1, 38).boxed().toList());
    for (Path file : files) {
      assertThat(Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)).isTrue();
      assertThat(file.toRealPath()).isEqualTo(file);
      var entries = java.util.stream.StreamSupport.stream(manifest.spliterator(), false)
          .filter(entry -> entry.path("name").asText().equals(file.getFileName().toString())).toList();
      assertThat(entries).hasSize(1);
      byte[] bytes = Files.readAllBytes(file);
      String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
      assertThat(hash).isEqualTo(entries.get(0).path("sha256").asText());
      if (file.getFileName().toString().startsWith("V36__")) {
        assertThat(hash).isEqualTo("58d986ec070b309b26b6cb383cde12ac6052a44d14dc6e40d564da1cb7fc133a");
      } else {
        assertThat(bytes).isEqualTo(Files.readAllBytes(
            Path.of("src/main/resources/db/migration").resolve(file.getFileName())));
      }
    }
    return directory;
  }

  private static String required(String name) {
    String value = System.getenv(name);
    if (value == null || value.isBlank()) {
      throw new IllegalStateException("Thiếu biến môi trường thử nghiệm: " + name);
    }
    return value;
  }

  private record SavedVoucher(JsonNode row) {}
}
