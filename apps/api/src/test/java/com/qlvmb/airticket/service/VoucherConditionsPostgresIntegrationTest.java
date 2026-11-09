package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AirportRepository;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.MemberVoucherRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.sql.Connection;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

@EnabledIfEnvironmentVariable(named = "VOUCHER_TEST_ALLOW_WRITES", matches = "true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Timeout(60)
class VoucherConditionsPostgresIntegrationTest {
  private static final String SCHEMA = "voucher_it_20261103_6b03d";
  private static final String URL = "jdbc:postgresql://127.0.0.1:55432/airline_birthday_foundation_test";
  private static final String RUNNER = "airline_audit_runner";
  private static final Path PASSWORD = Path.of(
      "C:\\Users\\WIN10PRO\\AppData\\Local\\CodexTools\\AirlineAuditPostgres15\\airline-audit-runner-password.txt");
  private static DriverManagerDataSource dataSource;
  private AnnotationConfigApplicationContext context;
  private JdbcTemplate jdbc;
  private TransactionTemplate transaction;
  private EntityManager em;
  private MemberVoucherService members;
  private BackofficeVoucherService operations;
  private BookingRepository bookings;
  private long memberId;
  private long operatorId;
  private Map<String, Object> legacyBefore;
  private final OffsetDateTime now = OffsetDateTime.now().withNano(0);

  @BeforeAll
  void prepare() throws Exception {
    if (!URL.equals(System.getenv("VOUCHER_TEST_DB_URL"))
        || !SCHEMA.equals(System.getenv("VOUCHER_TEST_SCHEMA"))
        || !RUNNER.equals(System.getenv("VOUCHER_TEST_DB_USER"))
        || !PASSWORD.toString().equals(System.getenv("VOUCHER_TEST_PASSWORD_FILE"))) {
      throw new IllegalStateException("Đích PostgreSQL Voucher khác allowlist test cô lập.");
    }
    if (!Files.isRegularFile(PASSWORD, LinkOption.NOFOLLOW_LINKS) || !PASSWORD.equals(PASSWORD.toRealPath())) {
      throw new IllegalStateException("Credential runner không đúng file local đã duyệt.");
    }
    String password = Files.readString(PASSWORD).stripTrailing();
    dataSource = new DriverManagerDataSource(URL + "?currentSchema=" + SCHEMA, RUNNER, password);
    java.util.Properties properties = new java.util.Properties();
    properties.setProperty("options", "-c statement_timeout=15000 -c lock_timeout=5000");
    dataSource.setConnectionProperties(properties);
    jdbc = new JdbcTemplate(dataSource);
    try (Connection connection = dataSource.getConnection()) {
      connection.setReadOnly(true);
      try (var statement = connection.createStatement();
          var rows = statement.executeQuery(
              "select current_database(), current_schema(), current_user, "
                  + "(select rolsuper from pg_roles where rolname=current_user), "
                  + "(select pg_get_userbyid(nspowner) from pg_namespace where nspname=current_schema())")) {
        assertThat(rows.next()).isTrue();
        assertThat(rows.getString(1)).isEqualTo("airline_birthday_foundation_test");
        assertThat(rows.getString(2)).isEqualTo(SCHEMA);
        assertThat(rows.getString(3)).isEqualTo(RUNNER);
        assertThat(rows.getBoolean(4)).isFalse();
        assertThat(rows.getString(5)).isEqualTo(RUNNER);
      }
    }
    assertThat(jdbc.queryForObject("select count(*) from information_schema.tables where table_schema=?",
        Long.class, SCHEMA)).isZero();
    Path migrations = Path.of("target/birthday-pg-migrations-6b03d").toAbsolutePath().normalize();
    assertThat(Files.isRegularFile(migrations.resolve("V36__add_audit_log_filter_indexes.sql"))).isTrue();
    assertThat(Files.isRegularFile(migrations.resolve("V37__add_voucher_conditions.sql"))).isTrue();
    Flyway.configure().dataSource(dataSource).schemas(SCHEMA).defaultSchema(SCHEMA).createSchemas(false)
        .cleanDisabled(true).locations("filesystem:" + migrations).target("36").load().migrate();
    memberId = createUser("voucher-6b01-member@example.test", "member");
    operatorId = createUser("voucher-6b01-operator@example.test", "operations_staff");
    jdbc.update("insert into member_voucher(user_id,voucher_code,title,description,discount_amount,currency,"
        + "status,expires_at) values(?, 'V6LEGACY','Voucher cũ','Kiểm thử migration',500,'VND','AVAILABLE',?)",
        memberId, now.plusDays(30));
    legacyBefore = jdbc.queryForMap("select * from member_voucher where voucher_code='V6LEGACY'");
    Flyway.configure().dataSource(dataSource).schemas(SCHEMA).defaultSchema(SCHEMA).createSchemas(false)
        .cleanDisabled(true).locations("filesystem:" + migrations).target("37").load().migrate();
    verifyLegacyDataAndHistoryV1ThroughV37();
    assertThat(Files.isRegularFile(migrations.resolve("V38__add_member_voucher_source.sql"))).isTrue();
    Flyway.configure().dataSource(dataSource).schemas(SCHEMA).defaultSchema(SCHEMA).createSchemas(false)
        .cleanDisabled(true).locations("filesystem:" + migrations).target("38").load().migrate();
    context = new AnnotationConfigApplicationContext(Config.class);
    em = context.getBean(EntityManager.class);
    transaction = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
    members = context.getBean(MemberVoucherService.class);
    operations = context.getBean(BackofficeVoucherService.class);
    bookings = context.getBean(BookingRepository.class);
  }

  @AfterAll
  void close() {
    if (context != null) {
      context.close();
    }
    // Giữ schema fixture mới để đối chiếu; không clean/drop hoặc sửa schema Audit.
  }

  private void verifyLegacyDataAndHistoryV1ThroughV37() {
    Map<String, Object> after = jdbc.queryForMap("select * from member_voucher where voucher_code='V6LEGACY'");
    for (var entry : legacyBefore.entrySet()) {
      assertThat(after.get(entry.getKey())).isEqualTo(entry.getValue());
    }
    assertThat(after.get("condition_json")).isNull();
    assertThat(jdbc.queryForObject("select count(*) from flyway_schema_history where success and version is not null",
        Long.class)).isEqualTo(37);
    assertThat(jdbc.queryForObject("select version from flyway_schema_history where success "
        + "order by installed_rank desc limit 1", String.class)).isEqualTo("37");
    assertThat(jdbc.queryForObject("select count(*) from pg_indexes where schemaname=? and tablename='audit_log' "
        + "and indexname in ('idx_audit_log_action','idx_audit_log_target')", Long.class, SCHEMA)).isEqualTo(2);
  }

  @Test
  void upgradeToV38PreservesLegacyAndDefaultsSource() {
    var after = jdbc.queryForMap("select * from member_voucher where voucher_code='V6LEGACY'");
    legacyBefore.forEach((key, value) -> assertThat(after.get(key)).isEqualTo(value));
    assertThat(after.get("condition_json")).isNull();
    assertThat(after.get("source")).isEqualTo("MANUAL");
    assertThat(jdbc.queryForObject("select count(*) from flyway_schema_history "
        + "where success and version is not null", Long.class)).isEqualTo(38);
    transaction.executeWithoutResult(status -> {
      em.clear();
      var voucher = em.createQuery("select v from MemberVoucherEntity v where v.voucherCode = :code",
          MemberVoucherEntity.class).setParameter("code", "V6LEGACY").getSingleResult();
      assertThat(voucher.getSource()).isEqualTo("MANUAL");
    });
  }

  @Test
  void sourceConstraintAndBirthdayMappingAreReal() {
    Long id = jdbc.queryForObject("insert into member_voucher(user_id,voucher_code,title,description,"
        + "discount_amount,currency,status,expires_at,source,condition_json) values "
        + "(?,'V6SOURCE','Quà sinh nhật','Kiểm thử nguồn',100000,'VND','AVAILABLE',?,'BIRTHDAY',"
        + "'{\"minAmount\":200000}'::jsonb) returning id", Long.class, memberId, now.plusDays(30));
    assertThatThrownBy(() -> jdbc.update("update member_voucher set source='OTHER' where id=?", id))
        .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    assertThatThrownBy(() -> jdbc.update("update member_voucher set source=null where id=?", id))
        .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    transaction.executeWithoutResult(status -> {
      em.clear();
      assertThat(em.find(MemberVoucherEntity.class, id).isBirthday()).isTrue();
    });
  }

  @Test
  void jsonbRoundTripAndObjectConstraintAreReal() {
    jdbc.update("update member_voucher set condition_json='{\"minAmount\":1200}'::jsonb where voucher_code='V6LEGACY'");
    transaction.executeWithoutResult(status -> {
      var voucher = context.getBean(MemberVoucherRepository.class).findByVoucherCodeIgnoreCase("V6LEGACY").orElseThrow();
      assertThat(context.getBean(VoucherConditionService.class)
          .present(voucher.getConditionJson(), voucher.getCurrency()).conditions().minAmount()).isEqualTo(1200);
    });
    jdbc.update("update member_voucher set condition_json=null where voucher_code='V6LEGACY'");
    assertThatThrownBy(() -> jdbc.update("update member_voucher set condition_json='[]'::jsonb "
        + "where voucher_code='V6LEGACY'")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  }

  @Test
  void failedReplacementAndForcedRollbackPreserveReservationsAndTotals() {
    Fixture fixture = fixture("V61101", "V61102", "V6OLD", null);
    long candidate = voucher("V6BAD", "{\"minAmount\":1201}");
    transaction.executeWithoutResult(status -> members.applyVoucherToBooking(member(),
        bookings.lockVoucherBookingByCode(fixture.first()).orElseThrow(), "V6OLD", now));
    assertThatThrownBy(() -> transaction.executeWithoutResult(status ->
        members.applyVoucherToBooking(member(), bookings.lockVoucherBookingByCode(fixture.first()).orElseThrow(),
            "V6BAD", now))).isInstanceOf(BadRequestException.class);
    assertBooking(fixture.first(), "V6OLD", 500);
    assertThat(jdbc.queryForObject("select status from member_voucher where id=?", String.class, candidate))
        .isEqualTo("AVAILABLE");
    voucher("V6GOOD", "{\"minAmount\":1200}");
    assertThatThrownBy(() -> transaction.executeWithoutResult(status -> {
      members.applyVoucherToBooking(member(), bookings.lockVoucherBookingByCode(fixture.first()).orElseThrow(),
          "V6GOOD", now);
      em.flush();
      throw new IllegalStateException("Kiểm thử rollback sau khi đã ghi.");
    })).isInstanceOf(IllegalStateException.class);
    assertBooking(fixture.first(), "V6OLD", 500);
    assertThat(jdbc.queryForObject("select status from member_voucher where voucher_code='V6GOOD'", String.class))
        .isEqualTo("AVAILABLE");
  }

  @Test
  void twoBookingsCannotReserveTheSameVoucher() throws Exception {
    Fixture fixture = fixture("V61201", "V61202", "V6RACE", "{\"minAmount\":1200}");
    CountDownLatch reserved = new CountDownLatch(1), release = new CountDownLatch(1), secondStarted = new CountDownLatch(1);
    try (var executor = Executors.newFixedThreadPool(2)) {
      var first = executor.submit(() -> transaction.executeWithoutResult(status -> {
        members.applyVoucherToBooking(member(), bookings.lockVoucherBookingByCode(fixture.first()).orElseThrow(),
            fixture.code(), now);
        em.flush();
        reserved.countDown();
        await(release);
      }));
      try {
        if (!reserved.await(10, TimeUnit.SECONDS)) { first.get(1, TimeUnit.SECONDS); throw new IllegalStateException("Chưa giữ được voucher trong test."); }
        var second = executor.submit(() -> transaction.executeWithoutResult(status -> {
          BookingEntity booking = bookings.lockVoucherBookingByCode(fixture.second()).orElseThrow();
          secondStarted.countDown();
          members.applyVoucherToBooking(member(), booking, fixture.code(), now);
        }));
        assertThat(secondStarted.await(10, TimeUnit.SECONDS)).isTrue();
        assertThatThrownBy(() -> second.get(250, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
        release.countDown();
        first.get(10, TimeUnit.SECONDS);
        assertThatThrownBy(() -> second.get(10, TimeUnit.SECONDS))
            .hasCauseInstanceOf(BadRequestException.class);
      } finally {
        release.countDown();
      }
    }
    assertBooking(fixture.first(), fixture.code(), 500);
    assertBooking(fixture.second(), null, 0);
    assertThat(jdbc.queryForObject("select booking_code from member_voucher where id=?", String.class, fixture.voucherId()))
        .isEqualTo(fixture.first());
  }

  @Test
  void reservedRevocationRestoresBookingAndDoesNotChangeOtherBooking() {
    Fixture fixture = fixture("V61301", "V61302", "V6REVOKE", null);
    transaction.executeWithoutResult(status -> members.applyVoucherToBooking(member(),
        bookings.lockVoucherBookingByCode(fixture.first()).orElseThrow(), fixture.code(), now));
    operations.revokeVoucher(operator(), fixture.voucherId());
    assertBooking(fixture.first(), null, 0);
    assertBooking(fixture.second(), null, 0);
    assertThat(jdbc.queryForObject("select status from member_voucher where id=?", String.class, fixture.voucherId()))
        .isEqualTo("REVOKED");
  }

  @Test
  void paymentFinalizationWinsAgainstWaitingRevocationWithoutDeadlock() throws Exception {
    Fixture fixture = fixture("V61401", "V61402", "V6PAY", null);
    transaction.executeWithoutResult(status -> members.applyVoucherToBooking(member(),
        bookings.lockVoucherBookingByCode(fixture.first()).orElseThrow(), fixture.code(), now));
    CountDownLatch finalized = new CountDownLatch(1), release = new CountDownLatch(1), revokeStarted = new CountDownLatch(1);
    try (var executor = Executors.newFixedThreadPool(2)) {
      var payment = executor.submit(() -> transaction.executeWithoutResult(status -> {
        BookingEntity booking = bookings.lockVoucherBookingByCode(fixture.first()).orElseThrow();
        members.finalizeVoucherForBooking(booking, now);
        em.flush();
        finalized.countDown();
        await(release);
      }));
      try {
        if (!finalized.await(10, TimeUnit.SECONDS)) { payment.get(1, TimeUnit.SECONDS); throw new IllegalStateException("Chưa hoàn tất voucher trong test."); }
        var revocation = executor.submit(() -> {
          revokeStarted.countDown();
          operations.revokeVoucher(operator(), fixture.voucherId());
        });
        assertThat(revokeStarted.await(10, TimeUnit.SECONDS)).isTrue();
        assertThatThrownBy(() -> revocation.get(250, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
        release.countDown();
        payment.get(10, TimeUnit.SECONDS);
        assertThatThrownBy(() -> revocation.get(10, TimeUnit.SECONDS)).hasCauseInstanceOf(BadRequestException.class);
      } finally {
        release.countDown();
      }
    }
    assertThat(jdbc.queryForObject("select status from member_voucher where id=?", String.class, fixture.voucherId()))
        .isEqualTo("USED");
    assertBooking(fixture.first(), fixture.code(), 500);
  }

  private long createUser(String email, String role) {
    Long id = jdbc.queryForObject("insert into user_account(email,password_hash,display_name,status,email_verified) "
        + "values(?,'fixture-not-a-login-hash','Kiểm thử Voucher','active',false) returning id", Long.class, email);
    jdbc.update("insert into user_role(user_id,role_id) select ?,id from auth_role where code=?", id, role);
    return id;
  }

  private long voucher(String code, String json) {
    return jdbc.queryForObject("insert into member_voucher(user_id,voucher_code,title,description,discount_amount,"
        + "currency,status,expires_at,condition_json) values(?,?,'Voucher','Kiểm thử',500,'VND','AVAILABLE',?,?::jsonb) "
        + "returning id", Long.class, memberId, code, now.plusDays(30), json);
  }

  private Fixture fixture(String first, String second, String code, String json) {
    transaction.executeWithoutResult(status -> {
      for (String pnr : List.of(first, second)) {
        BookingEntity booking = BookingEntity.createHold(pnr, "round_trip", 1000, 200, 1200, "VND", now, now.plusMinutes(15));
        booking.assignContact(BookingContactEntity.create(booking, "Hội viên kiểm thử",
            "voucher-6b01-member@example.test", "0000000000"));
        bookings.saveAndFlush(booking);
      }
    });
    return new Fixture(first, second, code, voucher(code, json));
  }

  private void assertBooking(String pnr, String code, long discount) {
    Map<String, Object> row = jdbc.queryForMap("select applied_voucher_code,discount_amount,total_amount "
        + "from booking where booking_code=?", pnr);
    assertThat(row.get("applied_voucher_code")).isEqualTo(code);
    assertThat(((Number) row.get("discount_amount")).longValue()).isEqualTo(discount);
    assertThat(((Number) row.get("total_amount")).longValue()).isEqualTo(1200 - discount);
  }

  private AuthenticatedUser member() {
    return new AuthenticatedUser(memberId, "voucher-6b01-member@example.test", "Hội viên",
        List.of("member"), List.of("member.loyalty"));
  }

  private AuthenticatedUser operator() {
    return new AuthenticatedUser(operatorId, "voucher-6b01-operator@example.test", "Vận hành",
        List.of("operations_staff"), List.of("backoffice.operations"));
  }

  private static void await(CountDownLatch latch) {
    try {
      if (!latch.await(10, TimeUnit.SECONDS)) {
        throw new IllegalStateException("Quá thời gian đồng bộ test transaction.");
      }
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Transaction test bị ngắt.");
    }
  }

  record Fixture(String first, String second, String code, long voucherId) {
  }

  @Configuration
  @EnableTransactionManagement
  static class Config {
    @Bean DataSource dataSource() { return dataSource; }
    @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
      var factory = new LocalContainerEntityManagerFactoryBean();
      factory.setDataSource(source);
      factory.setPackagesToScan("com.qlvmb.airticket.domain.entity");
      factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
      factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "validate", "hibernate.default_schema", SCHEMA));
      return factory;
    }
    @Bean PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
      return new JpaTransactionManager(factory);
    }
    @Bean EntityManager entityManager(EntityManagerFactory factory) {
      return SharedEntityManagerCreator.createSharedEntityManager(factory);
    }
    @Bean MemberVoucherRepository vouchers(EntityManager em) { return repository(MemberVoucherRepository.class, em); }
    @Bean BookingRepository bookings(EntityManager em) { return repository(BookingRepository.class, em); }
    @Bean UserAccountRepository users(EntityManager em) { return repository(UserAccountRepository.class, em); }
    @Bean AuditLogRepository audits(EntityManager em) { return repository(AuditLogRepository.class, em); }
    @Bean AirportRepository airports(EntityManager em) { return repository(AirportRepository.class, em); }
    @Bean VoucherConditionService conditions(AirportRepository airports) {
      return new VoucherConditionService(new ObjectMapper().findAndRegisterModules(), airports, new ProductCatalogService());
    }
    @Bean VoucherLockService locks(MemberVoucherRepository vouchers, BookingRepository bookings, EntityManager em) {
      return new VoucherLockService(vouchers, bookings, em);
    }
    @Bean MemberVoucherService members(UserAccountRepository users, MemberVoucherRepository vouchers,
        VoucherConditionService conditions, VoucherLockService locks) {
      return new MemberVoucherService(users, vouchers, conditions, locks);
    }
    @Bean BackofficeVoucherService operations(MemberVoucherRepository vouchers, UserAccountRepository users,
        BookingRepository bookings, AuditLogRepository audits, VoucherConditionService conditions, VoucherLockService locks) {
      return new BackofficeVoucherService(vouchers, users, bookings, audits, conditions, locks);
    }
    private <T> T repository(Class<T> type, EntityManager em) {
      return new JpaRepositoryFactory(em).getRepository(type);
    }
  }
}
