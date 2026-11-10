package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.qlvmb.airticket.repository.BirthdayVoucherRepository;
import com.qlvmb.airticket.repository.BirthdayVoucherRepository.Candidate;
import com.qlvmb.airticket.repository.BirthdayVoucherRepository.Outcome;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Stream;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

class BirthdayVoucherIssuanceServiceTest {
  private final BirthdayVoucherRepository vouchers = mock(BirthdayVoucherRepository.class);
  private final PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
  private static final Instant NOW = Instant.parse("2026-11-03T17:05:00Z");
  private static final LocalDate TODAY = LocalDate.of(2026,11,4);
  private BirthdayVoucherIssuanceService service;

  @BeforeEach void prepare() {
    when(manager.getTransaction(any())).thenAnswer(call -> new SimpleTransactionStatus());
    when(vouchers.findCandidates(anyLong(), any(), anyInt())).thenReturn(List.of());
    service = new BirthdayVoucherIssuanceService(vouchers, manager);
  }

  private void candidates(Candidate... values) {
    when(vouchers.findCandidates(anyLong(), eq(TODAY), eq(200)))
        .thenReturn(List.of(values), List.of());
  }

  @Test void eligibleCandidateIsIssuedInIndependentTransaction() {
    candidates(new Candidate(1, LocalDate.of(1990,11,4)));
    when(vouchers.issue(1, TODAY, NOW)).thenReturn(Outcome.ISSUED);
    assertThat(service.issueDue(NOW).issued()).isEqualTo(1);
    var definitions = ArgumentCaptor.forClass(TransactionDefinition.class);
    verify(manager, times(3)).getTransaction(definitions.capture());
    assertThat(definitions.getAllValues()).allSatisfy(d ->
        assertThat(d.getPropagationBehavior()).isEqualTo(TransactionDefinition.PROPAGATION_REQUIRES_NEW));
    assertThat(definitions.getAllValues().get(1).isReadOnly()).isFalse();
    assertThat(definitions.getAllValues().get(1).getIsolationLevel())
        .isEqualTo(TransactionDefinition.ISOLATION_READ_COMMITTED);
  }

  @ParameterizedTest
  @CsvSource({
      "1990-11-04,2026-11-04,2026-11-04",
      "1990-11-01,2026-11-04,2026-11-01",
      "2000-02-29,2027-02-28,2027-02-28",
      "2000-02-29,2028-02-29,2028-02-29",
      "2000-02-29,2028-02-28,NONE",
      "1990-12-31,2027-01-02,2026-12-31"
  })
  void birthdayAndCatchUpUseOccurrenceYear(String birth, String today, String expected) {
    var result = BirthdayVoucherIssuanceService.birthdayWithinWindow(
        LocalDate.parse(birth), LocalDate.parse(today));
    if ("NONE".equals(expected)) assertThat(result).isEmpty();
    else assertThat(result).contains(LocalDate.parse(expected));
  }

  static Stream<Arguments> invalidDates() {
    return Stream.of(Arguments.of((Object) null), Arguments.of(LocalDate.of(2027,11,4)),
        Arguments.of(LocalDate.of(0,11,4)), Arguments.of(LocalDate.of(1990,10,31)));
  }

  @ParameterizedTest @MethodSource("invalidDates")
  void invalidOrOutsideWindowBirthIsSkipped(LocalDate dob) {
    candidates(new Candidate(1, dob));
    assertThat(service.issueDue(NOW).skipped()).isEqualTo(1);
    verify(vouchers, never()).issue(anyLong(), any(), any());
  }

  @Test void expiryIsExclusiveVietnamMidnightAndExpiredRequestsDoNotReachDatabase() {
    assertThat(BirthdayVoucherRepository.expiresAt(LocalDate.of(2026,11,4)))
        .isEqualTo(OffsetDateTime.parse("2026-12-04T00:00:00+07:00"));
    DataSource source = mock(DataSource.class);
    var repository = new BirthdayVoucherRepository(new JdbcTemplate(source));
    Instant expired = Instant.parse("2026-12-03T17:00:00Z");
    assertThat(repository.issue(1, TODAY, expired)).isEqualTo(Outcome.SKIPPED);
    assertThat(repository.issue(1, TODAY.plusDays(1), NOW)).isEqualTo(Outcome.SKIPPED);
    verifyNoInteractions(source);
  }

  @Test void allOutcomesAreCountedWithoutRetry() {
    candidates(new Candidate(1,TODAY), new Candidate(2,TODAY),
        new Candidate(3,TODAY), new Candidate(4,TODAY));
    when(vouchers.issue(1,TODAY,NOW)).thenReturn(Outcome.ISSUED);
    when(vouchers.issue(2,TODAY,NOW)).thenReturn(Outcome.ALREADY_ISSUED);
    when(vouchers.issue(3,TODAY,NOW)).thenReturn(Outcome.SKIPPED);
    when(vouchers.issue(4,TODAY,NOW)).thenReturn(Outcome.ANOMALY);
    assertThat(service.issueDue(NOW))
        .isEqualTo(new BirthdayVoucherIssuanceService.Report(1,1,1,1,0,false));
    verify(vouchers, times(4)).issue(anyLong(), any(), any());
  }

  @Test void memberFailureRollsBackAndDoesNotStopNextMember() {
    candidates(new Candidate(1,TODAY), new Candidate(2,TODAY));
    when(vouchers.issue(1,TODAY,NOW)).thenThrow(new DataIntegrityViolationException("Lỗi fixture"));
    when(vouchers.issue(2,TODAY,NOW)).thenReturn(Outcome.ISSUED);
    var report = service.issueDue(NOW);
    assertThat(report.failed()).isEqualTo(1);
    assertThat(report.issued()).isEqualTo(1);
    verify(manager).rollback(any());
    verify(vouchers).issue(1,TODAY,NOW);
  }

  @Test void commitFailureIsCaughtOutsideMemberTransaction() {
    candidates(new Candidate(1,TODAY), new Candidate(2,TODAY));
    TransactionStatus scanStatus = new SimpleTransactionStatus();
    TransactionStatus failedStatus = new SimpleTransactionStatus();
    when(manager.getTransaction(any())).thenReturn(scanStatus, failedStatus,
        new SimpleTransactionStatus(), new SimpleTransactionStatus());
    doThrow(new IllegalStateException("Lỗi commit fixture")).when(manager).commit(failedStatus);
    when(vouchers.issue(anyLong(), eq(TODAY), eq(NOW))).thenReturn(Outcome.ISSUED);
    var report = service.issueDue(NOW);
    assertThat(report.failed()).isEqualTo(1);
    assertThat(report.issued()).isEqualTo(1);
  }

  @Test void keysetAdvancesUsingProcessedIdEvenWhenCandidateBecomesIneligible() {
    when(vouchers.findCandidates(0,TODAY,200)).thenReturn(List.of(new Candidate(11,TODAY)));
    when(vouchers.findCandidates(11,TODAY,200)).thenReturn(List.of(new Candidate(29,TODAY)));
    when(vouchers.findCandidates(29,TODAY,200)).thenReturn(List.of());
    when(vouchers.issue(11,TODAY,NOW)).thenReturn(Outcome.SKIPPED);
    when(vouchers.issue(29,TODAY,NOW)).thenReturn(Outcome.ISSUED);
    var report = service.issueDue(NOW);
    assertThat(report.skipped()).isEqualTo(1);
    assertThat(report.issued()).isEqualTo(1);
    verify(vouchers).findCandidates(29,TODAY,200);
  }

  @Test void scanFailureStopsWithoutRetryOrIssuance() {
    when(vouchers.findCandidates(0,TODAY,200)).thenThrow(new IllegalStateException("Lỗi đọc fixture"));
    assertThat(service.issueDue(NOW).scanFailed()).isTrue();
    verify(vouchers).findCandidates(0,TODAY,200);
    verify(vouchers, never()).issue(anyLong(), any(), any());
  }
}
