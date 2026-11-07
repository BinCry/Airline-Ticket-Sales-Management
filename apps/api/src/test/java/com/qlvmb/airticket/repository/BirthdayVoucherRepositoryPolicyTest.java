package com.qlvmb.airticket.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.qlvmb.airticket.config.BirthdayVoucherPolicy;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.test.util.ReflectionTestUtils;

class BirthdayVoucherRepositoryPolicyTest {
  private final NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);
  private static final LocalDate BIRTHDAY = LocalDate.of(2026, 11, 4);
  private static final Instant NOW = Instant.parse("2026-11-04T00:00:00Z");

  private BirthdayVoucherRepository repository(long amount, int days) {
    var result = new BirthdayVoucherRepository(new JdbcTemplate(mock(DataSource.class)),
        new BirthdayVoucherPolicy(amount, days));
    ReflectionTestUtils.setField(result, "jdbc", jdbc);
    return result;
  }

  private void insertSucceeds() {
    when(jdbc.query(anyString(), any(SqlParameterSource.class),
        org.mockito.ArgumentMatchers.<RowMapper<Long>>any())).thenReturn(List.of(1L));
  }

  private SqlParameterSource insertedParameters() {
    var sql = ArgumentCaptor.forClass(String.class);
    var params = ArgumentCaptor.forClass(SqlParameterSource.class);
    verify(jdbc).query(sql.capture(), params.capture(),
        org.mockito.ArgumentMatchers.<RowMapper<Long>>any());
    assertThat(sql.getValue()).contains("on conflict (voucher_code) do nothing returning id",
        "u.status='active'", "u.locked_at is null", "and u.id=:userId",
        "and :expires>:now", "'BIRTHDAY'", "{\"minAmount\":200000}", ":discountAmount");
    return params.getValue();
  }

  @Test
  void configuredAmountAndExpiryReachTheAtomicInsert() {
    var repository = repository(50000, 14);
    insertSucceeds();
    assertThat(repository.issue(1, BIRTHDAY, NOW)).isEqualTo(BirthdayVoucherRepository.Outcome.ISSUED);
    var params = insertedParameters();
    assertThat(params.getValue("discountAmount")).isEqualTo(50000L);
    assertThat(params.getValue("expires")).isEqualTo(OffsetDateTime.parse("2026-11-18T00:00:00+07:00"));
    assertThat(params.getValue("code")).isEqualTo("BDAY-1-2026");
  }

  @Test
  void legacyConstructorKeepsApprovedDefaults() {
    var repository = new BirthdayVoucherRepository(new JdbcTemplate(mock(DataSource.class)));
    ReflectionTestUtils.setField(repository, "jdbc", jdbc);
    insertSucceeds();
    assertThat(repository.issue(1, BIRTHDAY, NOW)).isEqualTo(BirthdayVoucherRepository.Outcome.ISSUED);
    var params = insertedParameters();
    assertThat(params.getValue("discountAmount")).isEqualTo(100000L);
    assertThat(params.getValue("expires")).isEqualTo(BirthdayVoucherRepository.expiresAt(BIRTHDAY));
  }

  @Test
  void catchUpAcrossNewYearKeepsOccurrenceYearAndDoesNotExtendExpiry() {
    var repository = repository(50000, 14);
    insertSucceeds();
    assertThat(repository.issue(1, LocalDate.of(2026, 12, 31),
        Instant.parse("2027-01-02T00:00:00Z"))).isEqualTo(BirthdayVoucherRepository.Outcome.ISSUED);
    var params = insertedParameters();
    assertThat(params.getValue("code")).isEqualTo("BDAY-1-2026");
    assertThat(params.getValue("expires")).isEqualTo(OffsetDateTime.parse("2027-01-14T00:00:00+07:00"));
  }

  @Test
  void catchUpDoesNotInsertAnAlreadyExpiredShortValidityVoucher() {
    var repository = repository(50000, 1);
    assertThat(repository.issue(1, BIRTHDAY.minusDays(3), NOW))
        .isEqualTo(BirthdayVoucherRepository.Outcome.SKIPPED);
    verifyNoInteractions(jdbc);
  }

  @Test
  void expiryBoundaryIsExclusive() {
    var repository = repository(50000, 1);
    assertThat(repository.issue(1, BIRTHDAY, Instant.parse("2026-11-04T17:00:00Z")))
        .isEqualTo(BirthdayVoucherRepository.Outcome.SKIPPED);
    verifyNoInteractions(jdbc);
  }
}
