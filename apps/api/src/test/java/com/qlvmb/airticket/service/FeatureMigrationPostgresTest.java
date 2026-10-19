package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

/**
 * Runs Flyway V1 through V35 against an isolated schema on a disposable PostgreSQL database.
 * NEVER point LOYALTY_TEST_DB_URL at production. The CI job supplies its own local database.
 */
@EnabledIfEnvironmentVariable(named = "LOYALTY_TEST_DB_URL", matches = ".+")
class FeatureMigrationPostgresTest {
  @Test
  void installsLoyaltySeatMapsBaggageAndFlightNotifications() {
    String schema = "feature_migration_" + UUID.randomUUID().toString().replace("-", "");
    String url = System.getenv("LOYALTY_TEST_DB_URL");
    String withSchema = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;
    DriverManagerDataSource dataSource = new DriverManagerDataSource(
        withSchema,
        System.getenv().getOrDefault("LOYALTY_TEST_DB_USER", "loyalty_test"),
        System.getenv().getOrDefault("LOYALTY_TEST_DB_PASSWORD", ""));
    JdbcTemplate jdbc = new JdbcTemplate(dataSource);

    try {
      Flyway.configure().dataSource(dataSource).schemas(schema).load().migrate();

      Set<String> installed = Set.copyOf(jdbc.queryForList(
          "select version from flyway_schema_history where success and version in ('31','32','33','34','35')",
          String.class));
      assertThat(installed).containsExactlyInAnyOrder("31", "32", "33", "34", "35");

      assertThat(jdbc.queryForObject(
          "select count(*) from information_schema.tables where table_schema=? and table_name in " +
              "('loyalty_tier_rule','aircraft_type','aircraft','baggage_tracking','flight_change_event')",
          Integer.class, schema)).isEqualTo(5);

      assertThat(jdbc.queryForObject(
          "select count(*) from information_schema.columns where table_schema=? and " +
              "((table_name='booking' and column_name='member_user_id') or " +
              "(table_name='flight' and column_name='aircraft_id') or " +
              "(table_name='booking_ancillary' and column_name='booking_segment_id') or " +
              "(table_name='notification_outbox' and column_name='read_at'))",
          Integer.class, schema)).isEqualTo(4);

      assertThat(jdbc.queryForObject(
          "select count(*) from pg_indexes where schemaname=? and indexname in " +
              "('uk_loyalty_flight_earn_segment','uk_baggage_scope','uk_notification_outbox_dedup')",
          Integer.class, schema)).isEqualTo(3);

      assertThat(jdbc.queryForObject(
          "select count(*) from loyalty_tier_rule where active=true and min_lifetime_points in (0,10000,20000,40000)",
          Integer.class)).isEqualTo(4);
    } finally {
      // Schema name is generated in this test, never user-supplied.
      jdbc.execute("drop schema if exists " + schema + " cascade");
    }
  }

  @Test
  void upgradesV33WithoutLosingExistingNotificationData() {
    String schema = "feature_upgrade_" + UUID.randomUUID().toString().replace("-", "");
    String url = System.getenv("LOYALTY_TEST_DB_URL");
    String withSchema = url + (url.contains("?") ? "&" : "?") + "currentSchema=" + schema;
    DriverManagerDataSource dataSource = new DriverManagerDataSource(
        withSchema,
        System.getenv().getOrDefault("LOYALTY_TEST_DB_USER", "loyalty_test"),
        System.getenv().getOrDefault("LOYALTY_TEST_DB_PASSWORD", ""));
    JdbcTemplate jdbc = new JdbcTemplate(dataSource);

    try {
      Flyway.configure().dataSource(dataSource).schemas(schema).target("33").load().migrate();
      jdbc.update("""
          insert into notification_outbox
              (type, booking_code, recipient_email, subject, body, status, retry_count, created_at, updated_at)
          values ('TICKET_EMAIL', null, 'upgrade@example.test', 'Giữ dữ liệu', 'Nội dung kiểm thử',
              'SENT', 2, now(), now())
          """);

      Flyway.configure().dataSource(dataSource).schemas(schema).load().migrate();

      assertThat(jdbc.queryForMap("""
          select type, recipient_email, subject, body, status, retry_count, read_at, flight_code, dedup_key
          from notification_outbox
          where recipient_email='upgrade@example.test'
          """)).containsEntry("type", "TICKET_EMAIL")
          .containsEntry("recipient_email", "upgrade@example.test")
          .containsEntry("subject", "Giữ dữ liệu")
          .containsEntry("body", "Nội dung kiểm thử")
          .containsEntry("status", "SENT")
          .containsEntry("retry_count", 2)
          .containsEntry("read_at", null)
          .containsEntry("flight_code", null)
          .containsEntry("dedup_key", null);
      assertThat(jdbc.queryForObject(
          "select version from flyway_schema_history where success order by installed_rank desc limit 1", String.class))
          .isEqualTo("35");
    } finally {
      // Schema name is generated in this test, never user-supplied.
      jdbc.execute("drop schema if exists " + schema + " cascade");
    }
  }
}
