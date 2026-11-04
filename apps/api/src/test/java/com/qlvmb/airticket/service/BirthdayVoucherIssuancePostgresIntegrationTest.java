package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.repository.BirthdayVoucherRepository;
import com.qlvmb.airticket.repository.BirthdayVoucherRepository.Outcome;
import jakarta.persistence.EntityManagerFactory;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@EnabledIfEnvironmentVariable(named="BIRTHDAY_TEST_ALLOW_WRITES", matches="true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Timeout(60)
class BirthdayVoucherIssuancePostgresIntegrationTest {
  private static final String SCHEMA = "birthday_issue_it_20261104_6b03f1";
  private static final String URL = "jdbc:postgresql://127.0.0.1:55432/airline_birthday_foundation_test";
  private static final String RUNNER = "airline_audit_runner";
  private static final Path PASSWORD = Path.of(
      "C:\\Users\\WIN10PRO\\AppData\\Local\\CodexTools\\AirlineAuditPostgres15\\airline-audit-runner-password.txt");
  private static final LocalDate TODAY = LocalDate.of(2026,11,4);
  private static final Instant NOW = Instant.parse("2026-11-03T17:05:00Z");
  private static final AtomicLong SEQUENCE = new AtomicLong();
  private static DriverManagerDataSource dataSource;
  private AnnotationConfigApplicationContext context;
  private JdbcTemplate jdbc;
  private TransactionTemplate transaction;
  private BirthdayVoucherRepository vouchers;
  private BirthdayVoucherIssuanceService service;

  @BeforeAll void prepare() throws Exception {
    if (!URL.equals(System.getenv("BIRTHDAY_TEST_DB_URL"))
        || !SCHEMA.equals(System.getenv("BIRTHDAY_TEST_SCHEMA"))
        || !RUNNER.equals(System.getenv("BIRTHDAY_TEST_DB_USER"))
        || !PASSWORD.toString().equals(System.getenv("BIRTHDAY_TEST_PASSWORD_FILE"))) {
      throw new IllegalStateException("Đích Birthday issuance khác allowlist thử nghiệm.");
    }
    assertThat(Files.isRegularFile(PASSWORD, LinkOption.NOFOLLOW_LINKS)).isTrue();
    assertThat(PASSWORD.toRealPath()).isEqualTo(PASSWORD);
    Path migrations = Path.of("target/birthday-pg-migrations-6b03d").toAbsolutePath().normalize();
    assertThat(migrations.toRealPath()).isEqualTo(migrations);
    try (var paths = Files.list(migrations)) {
      var files = paths.filter(p -> p.getFileName().toString().matches("V\\d+__.*\\.sql")).toList();
      assertThat(files).hasSize(38);
      assertThat(files.stream().map(p -> Integer.parseInt(p.getFileName().toString()
          .substring(1).split("__")[0])).sorted().toList())
          .containsExactlyElementsOf(java.util.stream.IntStream.rangeClosed(1,38).boxed().toList());
      for (Path file : files) {
        assertThat(Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)).isTrue();
        byte[] content = Files.readAllBytes(file);
        if (file.getFileName().toString().startsWith("V36__")) {
          assertThat(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content)))
              .isEqualTo("58d986ec070b309b26b6cb383cde12ac6052a44d14dc6e40d564da1cb7fc133a");
        } else {
          assertThat(content).isEqualTo(Files.readAllBytes(
              Path.of("src/main/resources/db/migration").resolve(file.getFileName())));
        }
      }
    }
    dataSource = new DriverManagerDataSource(URL+"?currentSchema="+SCHEMA,
        RUNNER, Files.readString(PASSWORD).stripTrailing());
    var properties = new java.util.Properties();
    properties.setProperty("options","-c statement_timeout=15000 -c lock_timeout=5000");
    dataSource.setConnectionProperties(properties);
    jdbc = new JdbcTemplate(dataSource);
    try (var connection = dataSource.getConnection()) {
      connection.setReadOnly(true);
      try (var statement = connection.createStatement(); var rows = statement.executeQuery(
          "select current_database(),current_schema(),current_user,"
          +"(select rolsuper from pg_roles where rolname=current_user),"
          +"(select rolcreatedb from pg_roles where rolname=current_user),"
          +"(select pg_get_userbyid(nspowner) from pg_namespace where nspname=current_schema())")) {
        assertThat(rows.next()).isTrue();
        assertThat(rows.getString(1)).isEqualTo("airline_birthday_foundation_test");
        assertThat(rows.getString(2)).isEqualTo(SCHEMA);
        assertThat(rows.getString(3)).isEqualTo(RUNNER);
        assertThat(rows.getBoolean(4)).isFalse();
        assertThat(rows.getBoolean(5)).isFalse();
        assertThat(rows.getString(6)).isEqualTo(RUNNER);
      }
    }
    assertThat(jdbc.queryForObject("select count(*) from information_schema.tables where table_schema=?",
        Long.class,SCHEMA)).isZero();
    Flyway.configure().dataSource(dataSource).schemas(SCHEMA).defaultSchema(SCHEMA)
        .createSchemas(false).cleanDisabled(true).locations("filesystem:"+migrations)
        .target("38").load().migrate();
    context = new AnnotationConfigApplicationContext(Config.class);
    var manager = context.getBean(PlatformTransactionManager.class);
    transaction = new TransactionTemplate(manager);
    transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    vouchers = new BirthdayVoucherRepository(jdbc);
    service = new BirthdayVoucherIssuanceService(vouchers,manager);
  }

  @AfterAll void close() {
    if (context != null) context.close();
    // Giữ schema mới để đối chiếu; không clean/drop schema Foundation hoặc Audit.
  }

  private long user(String role, String status, boolean locked, LocalDate dob, int primaries) {
    Long id = jdbc.queryForObject("insert into user_account(email,password_hash,display_name,status,locked_at)"
        +" values(?,'fixture-not-a-login-hash','Hội viên kiểm thử',?,?) returning id",
        Long.class,"birthday-issue-"+SEQUENCE.incrementAndGet()+"@example.test",status,
        locked ? OffsetDateTime.parse("2026-11-04T00:00:00+07:00") : null);
    jdbc.update("insert into user_role(user_id,role_id) select ?,id from auth_role where code=?",id,role);
    for (int i=0;i<primaries;i++) passenger(id,dob,true);
    return id;
  }

  private void passenger(long id, LocalDate dob, boolean primary) {
    jdbc.update("insert into saved_passenger(user_id,full_name,passenger_type,date_of_birth,"
        +"document_type,document_number,is_primary) values(?,'Hành khách kiểm thử','adult',?,'CCCD','FIXTURE',?)",
        id,dob,primary);
  }

  private Outcome issue(long id, LocalDate birthday, Instant now) {
    return transaction.execute(tx -> vouchers.issue(id,birthday,now));
  }

  private String code(long id, int year) { return "BDAY-"+id+"-"+year; }

  private long count(long id) {
    return jdbc.queryForObject("select count(*) from member_voucher where user_id=?",Long.class,id);
  }

  @Test void atomicInsertStoresExactPolicyAndJpaMapping() {
    long id = user("member","active",false,LocalDate.of(1990,11,4),1);
    assertThat(vouchers.findCandidates(id-1,TODAY,200)).anyMatch(c -> c.userId()==id);
    assertThat(issue(id,TODAY,NOW)).isEqualTo(Outcome.ISSUED);
    var row = jdbc.queryForMap("select *,condition_json->>'minAmount' minimum from member_voucher where user_id=?",id);
    assertThat(row.get("source")).isEqualTo("BIRTHDAY");
    assertThat(row.get("status")).isEqualTo("AVAILABLE");
    assertThat(((Number)row.get("discount_amount")).longValue()).isEqualTo(100000);
    assertThat(row.get("currency")).isEqualTo("VND");
    assertThat(row.get("minimum")).isEqualTo("200000");
    var em = context.getBean(EntityManagerFactory.class).createEntityManager();
    try {
      var voucher = em.find(MemberVoucherEntity.class,((Number)row.get("id")).longValue());
      assertThat(voucher.isBirthday()).isTrue();
      assertThat(voucher.getVoucherCode()).isEqualTo(code(id,2026));
      assertThat(voucher.getExpiresAt().isEqual(OffsetDateTime.parse("2026-12-04T00:00:00+07:00"))).isTrue();
    } finally { em.close(); }
  }

  @ParameterizedTest
  @CsvSource({"customer,active,false,1","member,inactive,false,1","member,active,true,1",
      "member,active,false,0","member,active,false,2"})
  void eligibilityRejectsWrongRoleStatusLockOrPrimaryCount(String role,String status,boolean locked,int primaries) {
    long id = user(role,status,locked,LocalDate.of(1990,11,4),primaries);
    assertThat(vouchers.findCandidates(id-1,TODAY,200)).noneMatch(c -> c.userId()==id);
    assertThat(issue(id,TODAY,NOW)).isEqualTo(Outcome.SKIPPED);
    assertThat(count(id)).isZero();
  }

  @ParameterizedTest @ValueSource(strings={"2027-11-04","infinity","-infinity","0001-11-04 BC"})
  void invalidDatabaseDobDoesNotBreakCandidateScan(String dob) {
    long id = user("member","active",false,TODAY,1);
    jdbc.update("update saved_passenger set date_of_birth=cast(? as date) where user_id=?",dob,id);
    assertThat(vouchers.findCandidates(id-1,TODAY,200)).noneMatch(c -> c.userId()==id);
    assertThat(issue(id,TODAY,NOW)).isEqualTo(Outcome.SKIPPED);
  }

  @Test void secondaryBirthdayCannotReplacePrimaryBirthday() {
    long id = user("member","active",false,LocalDate.of(1990,11,10),1);
    passenger(id,LocalDate.of(1990,11,4),false);
    assertThat(vouchers.findCandidates(id-1,TODAY,200)).noneMatch(c -> c.userId()==id);
    assertThat(issue(id,TODAY,NOW)).isEqualTo(Outcome.SKIPPED);
  }

  @ParameterizedTest @ValueSource(strings={"lock","role","dob","primary"})
  void insertRechecksEligibilityAfterCandidateScan(String change) {
    long id = user("member","active",false,LocalDate.of(1990,11,4),1);
    assertThat(vouchers.findCandidates(id-1,TODAY,200)).anyMatch(c -> c.userId()==id);
    switch (change) {
      case "lock" -> jdbc.update("update user_account set locked_at=now() where id=?",id);
      case "role" -> jdbc.update("delete from user_role where user_id=?",id);
      case "dob" -> jdbc.update("update saved_passenger set date_of_birth=date '1990-11-10' where user_id=?",id);
      case "primary" -> passenger(id,LocalDate.of(1990,11,4),true);
      default -> throw new IllegalArgumentException("Fixture không hợp lệ.");
    }
    assertThat(issue(id,TODAY,NOW)).isEqualTo(Outcome.SKIPPED);
    assertThat(count(id)).isZero();
  }

  @ParameterizedTest @ValueSource(strings={"AVAILABLE","RESERVED","USED","REVOKED","EXPIRED","HIDDEN"})
  void existingVoucherIsNeverReissuedOrExtended(String status) {
    long id = user("member","active",false,LocalDate.of(1990,11,4),1);
    assertThat(issue(id,TODAY,NOW)).isEqualTo(Outcome.ISSUED);
    jdbc.update("update member_voucher set status=?,expires_at=?,operations_hidden_at=?,member_hidden_at=? where user_id=?",
        "HIDDEN".equals(status)?"AVAILABLE":status,OffsetDateTime.parse("2026-11-03T00:00:00+07:00"),
        "HIDDEN".equals(status)?OffsetDateTime.parse("2026-11-04T00:00:00+07:00"):null,
        "HIDDEN".equals(status)?OffsetDateTime.parse("2026-11-04T00:00:00+07:00"):null,id);
    var before = jdbc.queryForMap("select * from member_voucher where user_id=?",id);
    jdbc.update("update saved_passenger set date_of_birth=date '1980-11-03' where user_id=?",id);
    assertThat(issue(id,TODAY.minusDays(1),NOW)).isEqualTo(Outcome.ALREADY_ISSUED);
    assertThat(jdbc.queryForMap("select * from member_voucher where user_id=?",id)).isEqualTo(before);
    assertThat(count(id)).isEqualTo(1);
  }

  @ParameterizedTest @CsvSource({"MANUAL,false,false","BIRTHDAY,true,false","MANUAL,false,true"})
  void unexpectedOwnerSourceOrCaseIsAnomalyWithoutOverwrite(String source,boolean otherOwner,boolean lowerCase) {
    long id = user("member","active",false,LocalDate.of(1990,11,4),1);
    long owner = otherOwner?user("member","active",false,LocalDate.of(1990,10,1),1):id;
    String existingCode = lowerCase?code(id,2026).toLowerCase(java.util.Locale.ROOT):code(id,2026);
    Long voucherId = jdbc.queryForObject("insert into member_voucher(user_id,voucher_code,title,description,"
        +"discount_amount,currency,status,expires_at,source) values(?,?,'Có sẵn','Fixture',123,'VND','AVAILABLE',?,?) returning id",
        Long.class,owner,existingCode,OffsetDateTime.parse("2026-12-01T00:00:00+07:00"),source);
    var before = jdbc.queryForMap("select * from member_voucher where id=?",voucherId);
    assertThat(issue(id,TODAY,NOW)).isEqualTo(Outcome.ANOMALY);
    assertThat(jdbc.queryForMap("select * from member_voucher where id=?",voucherId)).isEqualTo(before);
    assertThat(jdbc.queryForObject("select count(*) from member_voucher where lower(voucher_code)=lower(?)",
        Long.class,code(id,2026))).isEqualTo(1);
  }

  @Test void twoRealTransactionsIssueExactlyOnce() throws Exception {
    long id = user("member","active",false,LocalDate.of(1990,11,4),1);
    var ready = new CountDownLatch(2);
    var start = new CountDownLatch(1);
    Set<Integer> connections = ConcurrentHashMap.newKeySet();
    var pool = Executors.newFixedThreadPool(2);
    try {
      java.util.concurrent.Callable<Outcome> task = () -> transaction.execute(tx -> {
        connections.add(jdbc.queryForObject("select pg_backend_pid()",Integer.class));
        ready.countDown();
        await(start);
        return vouchers.issue(id,TODAY,NOW);
      });
      var first = pool.submit(task);
      var second = pool.submit(task);
      await(ready);
      start.countDown();
      assertThat(List.of(first.get(30,TimeUnit.SECONDS),second.get(30,TimeUnit.SECONDS)))
          .containsExactlyInAnyOrder(Outcome.ISSUED,Outcome.ALREADY_ISSUED);
      assertThat(connections).hasSize(2);
      assertThat(count(id)).isEqualTo(1);
    } finally {
      start.countDown();
      pool.shutdownNow();
      assertThat(pool.awaitTermination(20,TimeUnit.SECONDS)).isTrue();
    }
  }

  @Test void failingMemberRollsBackOnlyItsOwnInsert() {
    long failed = user("member","active",false,TODAY,1);
    long good = user("member","active",false,TODAY,1);
    var repository = new BirthdayVoucherRepository(jdbc) {
      @Override public Outcome issue(long id,LocalDate birthday,Instant now) {
        Outcome result = super.issue(id,birthday,now);
        if (id==failed) throw new IllegalStateException("Lỗi sau insert fixture.");
        return result;
      }
    };
    var batch = new BirthdayVoucherIssuanceService(repository,context.getBean(PlatformTransactionManager.class));
    var result = batch.issueDue(NOW);
    assertThat(result.failed()).isEqualTo(1);
    assertThat(count(failed)).isZero();
    assertThat(count(good)).isEqualTo(1);
  }

  @Test void outerRollbackCannotUndoMemberCommit() {
    long id = user("member","active",false,TODAY,1);
    transaction.executeWithoutResult(outer -> {
      service.issueDue(NOW);
      outer.setRollbackOnly();
    });
    assertThat(count(id)).isEqualTo(1);
  }

  @ParameterizedTest @CsvSource({
      "2000-02-29,2027-02-28T00:05:00+07:00,2027-02-28",
      "2000-02-29,2028-02-29T00:05:00+07:00,2028-02-29",
      "1990-12-31,2027-01-02T00:05:00+07:00,2026-12-31"})
  void leapDayAndCrossYearCatchUpKeepOriginalBirthdayExpiry(String dob,String now,String birthday) {
    long id = user("member","active",false,LocalDate.parse(dob),1);
    LocalDate occurrence = LocalDate.parse(birthday);
    service.issueDue(OffsetDateTime.parse(now).toInstant());
    var row = jdbc.queryForMap("select voucher_code,expires_at from member_voucher where user_id=?",id);
    assertThat(row.get("voucher_code")).isEqualTo(code(id,occurrence.getYear()));
    Instant expiry = jdbc.queryForObject("select expires_at from member_voucher where user_id=?",
        (rows,index) -> rows.getObject(1,OffsetDateTime.class).toInstant(),id);
    assertThat(expiry).isEqualTo(BirthdayVoucherRepository.expiresAt(occurrence).toInstant());
  }

  @Test void expiredOrOutsideWindowIssuanceIsSkipped() {
    long id = user("member","active",false,LocalDate.of(1990,11,4),1);
    assertThat(issue(id,TODAY,Instant.parse("2026-12-03T17:00:00Z"))).isEqualTo(Outcome.SKIPPED);
    assertThat(count(id)).isZero();
  }

  private static void await(CountDownLatch latch) {
    try {
      if (!latch.await(10,TimeUnit.SECONDS)) throw new IllegalStateException("Quá thời gian đồng bộ fixture.");
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Fixture bị ngắt.",exception);
    }
  }

  @Configuration static class Config {
    @Bean DataSource source() { return dataSource; }
    @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
      var factory = new LocalContainerEntityManagerFactoryBean();
      factory.setDataSource(source);
      factory.setPackagesToScan("com.qlvmb.airticket.domain.entity");
      factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
      factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto","validate","hibernate.default_schema",SCHEMA));
      return factory;
    }
    @Bean PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
      return new JpaTransactionManager(factory);
    }
  }
}
