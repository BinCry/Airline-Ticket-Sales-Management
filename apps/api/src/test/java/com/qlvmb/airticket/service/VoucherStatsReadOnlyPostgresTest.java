package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.qlvmb.airticket.repository.MemberVoucherRepository;
import com.qlvmb.airticket.repository.VoucherStatsRepository;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;

@EnabledIfEnvironmentVariable(named = "VOUCHER_STATS_TEST_ALLOW_READS", matches = "true")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Timeout(45)
class VoucherStatsReadOnlyPostgresTest {
  private static final String URL = System.getenv("VOUCHER_STATS_TEST_DB_URL");
  private static final String SCHEMA = System.getenv("VOUCHER_STATS_TEST_SCHEMA");
  private static final String RUNNER = System.getenv("VOUCHER_STATS_TEST_DB_USER");
  private static final OffsetDateTime AS_OF = OffsetDateTime.parse("2027-02-01T00:00:00+07:00");
  private static final String FIXTURE = """
      with member_voucher(id,status,source,created_at,expires_at,operations_hidden_at,booking_code,voucher_code) as (
        values
        (1::bigint,'USED','MANUAL','2026-09-30T17:00:00Z'::timestamptz,'2026-12-01'::timestamptz,null::timestamptz,'AA0001','V1'),
        (2,'USED','MANUAL','2026-10-31T16:59:59.999999Z'::timestamptz,'2026-12-01'::timestamptz,'2026-11-01'::timestamptz,'AA0002','V2'),
        (3,'USED','MANUAL','2026-10-15'::timestamptz,'2026-12-01'::timestamptz,null,null,'V3'),
        (4,'USED','MANUAL','2026-10-15'::timestamptz,'2026-12-01'::timestamptz,null,'AA0004','V4'),
        (5,'AVAILABLE','BIRTHDAY','2026-10-15'::timestamptz,'2026-11-01'::timestamptz,null,'AA0005','V5'),
        (6,'USED','MANUAL','2026-09-30T16:59:59.999999Z'::timestamptz,'2026-12-01'::timestamptz,null,'AA0006','V6'),
        (7,'USED','MANUAL','2026-10-31T17:00:00Z'::timestamptz,'2026-12-01'::timestamptz,null,'AA0007','V7'),
        (8,'USED','BIRTHDAY','2027-01-02T00:05:00+07:00'::timestamptz,'2027-01-30'::timestamptz,null,'AA0008','BDAY-8-2026')
      ), booking(id,booking_code,applied_voucher_code,discount_amount,currency) as (
        values (101::bigint,'AA0001','V1',80000::bigint,'VND'),
        (102,'AA0002','V2',12,'USD'),(104,'AA0004','OTHER',999999,'VND'),
        (105,'AA0005','V5',999999,'VND'),(106,'AA0006','V6',1,'VND'),
        (107,'AA0007','V7',1,'VND'),(108,'AA0008','BDAY-8-2026',100000,'VND')
      )
      """;
  private DriverManagerDataSource dataSource;
  private JdbcTemplate jdbc;
  private VoucherStatsRepository fixtureRepository;
  private LocalContainerEntityManagerFactoryBean factory;

  @BeforeAll void prepareReadOnlyConnections() throws Exception {
    String passwordPath = System.getenv("VOUCHER_STATS_TEST_PASSWORD_FILE");
    if (URL == null || SCHEMA == null || RUNNER == null
        || passwordPath == null || passwordPath.isBlank()) {
      throw new IllegalStateException("Thiếu cấu hình môi trường cho kiểm thử PostgreSQL read-only.");
    }
    // Thay cấu hình máy cá nhân bằng biến môi trường; giữ danh sách đích thử đã duyệt.
    var endpoint = Pattern.compile(
        "jdbc:postgresql://(?:127\\.0\\.0\\.1|\\[::1\\]):([0-9]{1,5})/airline_birthday_foundation_test")
        .matcher(URL);
    if (!endpoint.matches()) {
      throw new IllegalStateException("JDBC URL nằm ngoài allowlist PostgreSQL loopback thử nghiệm.");
    }
    int port = Integer.parseInt(endpoint.group(1));
    if (port < 1 || port > 65535 || !"birthday_issue_it_20261104_6b03f1".equals(SCHEMA)
        || !"airline_audit_runner".equals(RUNNER)) {
      throw new IllegalStateException("Port, schema hoặc role nằm ngoài allowlist thử nghiệm.");
    }
    Path passwordFile;
    try {
      passwordFile = Path.of(passwordPath);
    } catch (InvalidPathException exception) {
      throw new IllegalStateException("Đường dẫn password file không hợp lệ.");
    }
    if (!passwordFile.isAbsolute() || !passwordFile.normalize().equals(passwordFile)) {
      throw new IllegalStateException("Password file phải là đường dẫn tuyệt đối đã chuẩn hóa.");
    }
    assertThat(Files.isRegularFile(passwordFile,LinkOption.NOFOLLOW_LINKS)).isTrue();
    assertThat(passwordFile.toRealPath()).isEqualTo(passwordFile);
    dataSource = new DriverManagerDataSource(URL + "?currentSchema=" + SCHEMA,
        RUNNER,Files.readString(passwordFile).stripTrailing());
    var properties = new Properties();
    properties.setProperty("options",
        "-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=3000");
    dataSource.setConnectionProperties(properties);
    jdbc = new JdbcTemplate(dataSource);
    var identity = jdbc.queryForMap("select current_database() db,current_schema() schema,current_user role,"
        + "current_setting('transaction_read_only') readonly,"
        + "(select rolsuper from pg_roles where rolname=current_user) superuser");
    assertThat(identity.get("db")).isEqualTo("airline_birthday_foundation_test");
    assertThat(identity.get("schema")).isEqualTo(SCHEMA);
    assertThat(identity.get("role")).isEqualTo(RUNNER);
    assertThat(identity.get("readonly")).isEqualTo("on");
    assertThat(identity.get("superuser")).isEqualTo(false);
    assertThat(jdbc.queryForObject("select count(*) from member_voucher",Long.class)).isPositive();
    fixtureRepository = new VoucherStatsRepository(new NamedParameterJdbcTemplate(dataSource) {
      @Override public <T> List<T> query(String sql,SqlParameterSource params,RowMapper<T> mapper) {
        return super.query(FIXTURE + sql,params,mapper);
      }
    });
  }

  @AfterAll void closeFactory() {
    if (factory != null) {
      factory.destroy();
    }
  }

  @Test void nativeQueryUsesHalfOpenBoundsAndExactBookingVoucherPair() {
    var rows = fixtureRepository.findIssued(OffsetDateTime.parse("2026-10-01T00:00:00+07:00"),
        OffsetDateTime.parse("2026-11-01T00:00:00+07:00"));
    assertThat(rows).extracting(r -> r.id()).containsExactly(1L,2L,3L,4L,5L);
    assertThat(rows.get(0).actualDiscount()).isEqualTo(80000L);
    assertThat(rows.get(1).bookingCurrency()).isEqualTo("USD");
    assertThat(rows.get(1).operationsHidden()).isTrue();
    assertThat(rows.get(2).bookingId()).isNull();
    assertThat(rows.get(3).bookingId()).isNull();
    assertThat(rows.get(4).bookingId()).isNull();
  }

  @Test void realSqlFeedsCohortMoneyAndIncompleteLinkageWithoutDoubleCount() {
    var result = new VoucherStatsService(fixtureRepository).getStats("2026-10-01","2026-10-31",AS_OF);
    assertThat(result.summary().totalVouchers()).isEqualTo(5);
    assertThat(result.summary().statusCounts()).containsEntry("USED",4L).containsEntry("EXPIRED",1L);
    assertThat(result.summary().usageRate()).isEqualByComparingTo("0.8");
    assertThat(result.summary().actualDiscountByCurrency())
        .containsExactlyInAnyOrderEntriesOf(Map.of("VND",80000L,"USD",12L));
    assertThat(result.summary().unmatchedUsedCount()).isEqualTo(2);
    assertThat(result.summary().actualDiscountComplete()).isFalse();
    assertThat(result.summary().operationsHiddenCount()).isEqualTo(1);
  }

  @Test void birthdayCatchUpGroupsByActualJanuaryCreationInsteadOfCodeYear() {
    var result = new VoucherStatsService(fixtureRepository).getStats(null,null,AS_OF);
    assertThat(result.byMonth()).extracting(m -> m.month())
        .containsExactly("2026-09","2026-10","2026-11","2027-01");
    assertThat(result.byMonth().getLast().summary().actualDiscountByCurrency())
        .containsEntry("VND",100000L);
  }

  @Test void operationsJpqlExecutesEffectiveFiltersOnExistingIsolatedDataWithoutMutation() {
    factory = new LocalContainerEntityManagerFactoryBean();
    factory.setDataSource(dataSource);
    factory.setPackagesToScan("com.qlvmb.airticket.domain.entity");
    factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
    factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto","validate",
        "hibernate.default_schema",SCHEMA));
    factory.afterPropertiesSet();
    var em = java.util.Objects.requireNonNull(factory.getObject()).createEntityManager();
    try {
      var repository = new JpaRepositoryFactory(em).getRepository(MemberVoucherRepository.class);
      for (String status : List.of("AVAILABLE","EXPIRED","USED","RESERVED","REVOKED")) {
        var actual = repository.findOperationsVouchers(null,null,status,AS_OF);
        var expected = jdbc.queryForList("""
            select id from member_voucher where operations_hidden_at is null and
              case when status='AVAILABLE' and expires_at<=? then 'EXPIRED' else status end=?
            """,Long.class,AS_OF,status);
        assertThat(actual).extracting(v -> v.getId()).containsExactlyInAnyOrderElementsOf(expected);
      }
      assertThat(repository.findOperationsVouchers(null,"%_",null,AS_OF))
          .extracting(v -> v.getId()).containsExactlyInAnyOrderElementsOf(jdbc.queryForList("""
              select id from member_voucher where operations_hidden_at is null
                and position('%_' in lower(voucher_code))>0
              """,Long.class));
    } finally {
      em.close();
    }
  }
}
