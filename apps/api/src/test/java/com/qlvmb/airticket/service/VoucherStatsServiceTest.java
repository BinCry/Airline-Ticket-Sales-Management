package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.VoucherStatsRepository;
import com.qlvmb.airticket.repository.VoucherStatsRepository.IssuedVoucher;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class VoucherStatsServiceTest {
  private static final OffsetDateTime AS_OF = OffsetDateTime.parse("2026-11-05T00:00:00+07:00");
  private final VoucherStatsRepository repository = mock(VoucherStatsRepository.class);
  private final VoucherStatsService service = new VoucherStatsService(repository);

  private IssuedVoucher row(long id, String status, String source, boolean hidden,
      Long booking, Long discount, String currency) {
    return new IssuedVoucher(id, status, source,
        OffsetDateTime.parse("2026-10-28T12:00:00+07:00"), AS_OF.plusDays(10),
        hidden, booking, discount, currency);
  }

  private void data(IssuedVoucher... rows) {
    when(repository.findIssued(any(), any())).thenReturn(List.of(rows));
  }

  @Test void countsAllStatusesIncludingHiddenAndUsesNonRevokedDenominator() {
    data(row(1,"AVAILABLE","MANUAL",false,null,null,null),
        row(2,"RESERVED","MANUAL",false,null,null,null),
        row(3,"USED","BIRTHDAY",true,30L,100000L,"VND"),
        row(4,"EXPIRED","MANUAL",false,null,null,null),
        row(5,"REVOKED","MANUAL",true,null,null,null));
    var result = service.getStats(null, null, AS_OF);
    var summary = result.summary();
    assertThat(summary.totalVouchers()).isEqualTo(5);
    assertThat(summary.statusCounts()).containsEntry("AVAILABLE",1L).containsEntry("RESERVED",1L)
        .containsEntry("USED",1L).containsEntry("EXPIRED",1L).containsEntry("REVOKED",1L);
    assertThat(summary.usageDenominator()).isEqualTo(4);
    assertThat(summary.usageRate()).isEqualByComparingTo("0.25");
    assertThat(summary.operationsHiddenCount()).isEqualTo(2);
    assertThat(result.includesHidden()).isTrue();
    assertThat(result.dateBasis()).isEqualTo("CREATED_AT");
    assertThat(result.asOf()).isEqualTo(AS_OF);
    assertThat(result.timezone()).isEqualTo("Asia/Ho_Chi_Minh");
    assertThat(result.discountBasis()).isEqualTo("BOOKING_RECORDED_DISCOUNT");
    assertThat(result.bySource()).anySatisfy(s -> {
      assertThat(s.source()).isEqualTo("BIRTHDAY");
      assertThat(s.summary().totalVouchers()).isEqualTo(1);
      assertThat(s.summary().actualDiscountByCurrency()).containsEntry("VND",100000L);
    });
  }

  @Test void expiryAtBoundaryUsesOneAsOfAndDoesNotReplaceUsedOrReserved() {
    var expired = new IssuedVoucher(1,"AVAILABLE","MANUAL",AS_OF.minusDays(2),AS_OF,false,null,null,null);
    var available = new IssuedVoucher(2,"AVAILABLE","MANUAL",AS_OF.minusDays(2),AS_OF.plusNanos(1),false,null,null,null);
    var used = new IssuedVoucher(3,"USED","MANUAL",AS_OF.minusDays(2),AS_OF.minusDays(1),false,3L,50L,"VND");
    var reserved = new IssuedVoucher(4,"RESERVED","MANUAL",AS_OF.minusDays(2),AS_OF.minusDays(1),false,null,null,null);
    data(expired,available,used,reserved);
    var summary = service.getStats(null,null,AS_OF).summary();
    assertThat(summary.statusCounts()).containsEntry("EXPIRED",1L).containsEntry("AVAILABLE",1L)
        .containsEntry("USED",1L).containsEntry("RESERVED",1L);
    assertThat(summary.actualDiscountByCurrency()).containsEntry("VND",50L);
  }

  @Test void emptyDatasetHasUndefinedRateAndNoFabricatedDiscount() {
    data();
    var result = service.getStats(null,null,AS_OF);
    assertThat(result.summary().totalVouchers()).isZero();
    assertThat(result.summary().usageRate()).isNull();
    assertThat(result.summary().actualDiscountByCurrency()).isEmpty();
    assertThat(result.summary().actualDiscountComplete()).isTrue();
    assertThat(result.byMonth()).isEmpty();
    assertThat(result.bySource()).hasSize(2).allSatisfy(s ->
        assertThat(s.summary().totalVouchers()).isZero());
    verify(repository).findIssued(isNull(),isNull());
  }

  @Test void allRevokedHasUndefinedUsageRate() {
    data(row(1,"REVOKED","MANUAL",true,null,null,null));
    var summary = service.getStats(null,null,AS_OF).summary();
    assertThat(summary.usageDenominator()).isZero();
    assertThat(summary.usageRate()).isNull();
  }

  @Test void discountsUseBookingAmountsAndKeepCurrenciesSeparate() {
    data(row(1,"USED","MANUAL",false,10L,80000L,"VND"),
        row(2,"USED","BIRTHDAY",false,20L,100000L,"VND"),
        row(3,"USED","MANUAL",false,30L,12L,"USD"),
        row(4,"AVAILABLE","MANUAL",false,null,null,null));
    var summary = service.getStats(null,null,AS_OF).summary();
    assertThat(summary.actualDiscountByCurrency()).containsExactlyInAnyOrderEntriesOf(
        java.util.Map.of("VND",180000L,"USD",12L));
    assertThat(summary.actualDiscountComplete()).isTrue();
    assertThat(summary.unmatchedUsedCount()).isZero();
  }

  @Test void missingOrInvalidBookingDataIsCountedButNotInventedAsMoney() {
    data(row(1,"USED","MANUAL",false,null,null,null),
        row(2,"USED","MANUAL",false,2L,-1L,"VND"),
        row(3,"USED","MANUAL",false,3L,10L," "),
        row(4,"USED","MANUAL",false,4L,null,"VND"),
        row(5,"USED","MANUAL",false,5L,0L,"VND"));
    var summary = service.getStats(null,null,AS_OF).summary();
    assertThat(summary.statusCounts()).containsEntry("USED",5L);
    assertThat(summary.unmatchedUsedCount()).isEqualTo(4);
    assertThat(summary.actualDiscountComplete()).isFalse();
    assertThat(summary.actualDiscountByCurrency()).containsOnlyKeys("VND").containsEntry("VND",0L);
  }

  @Test void duplicateVoucherRowsCannotInflateCountsOrMoney() {
    var used = row(1,"USED","MANUAL",false,1L,100000L,"VND");
    data(used,used);
    var summary = service.getStats(null,null,AS_OF).summary();
    assertThat(summary.totalVouchers()).isEqualTo(1);
    assertThat(summary.actualDiscountByCurrency()).containsEntry("VND",100000L);
  }

  @Test void ambiguousBookingCannotBeAttributedTwiceOrToArbitrarySource() {
    data(row(1,"USED","MANUAL",false,1L,100000L,"VND"),
        row(2,"USED","BIRTHDAY",false,1L,100000L,"VND"));
    var result = service.getStats(null,null,AS_OF);
    assertThat(result.summary().totalVouchers()).isEqualTo(2);
    assertThat(result.summary().actualDiscountByCurrency()).isEmpty();
    assertThat(result.summary().unmatchedUsedCount()).isEqualTo(2);
    assertThat(result.bySource()).allSatisfy(s -> {
      assertThat(s.summary().unmatchedUsedCount()).isEqualTo(1);
      assertThat(s.summary().actualDiscountComplete()).isFalse();
    });
  }

  @Test void contradictoryDuplicateVoucherRowsAreRejected() {
    data(row(1,"USED","MANUAL",false,1L,100000L,"VND"),
        row(1,"AVAILABLE","MANUAL",false,null,null,null));
    assertThatThrownBy(() -> service.getStats(null,null,AS_OF))
        .isInstanceOf(IllegalStateException.class);
  }

  @Test void inclusiveVietnamDatesBecomeHalfOpenInstantBounds() {
    data();
    var result = service.getStats("2026-10-01","2026-10-31",AS_OF);
    verify(repository).findIssued(OffsetDateTime.parse("2026-10-01T00:00:00+07:00"),
        OffsetDateTime.parse("2026-11-01T00:00:00+07:00"));
    assertThat(result.fromDate()).isEqualTo(java.time.LocalDate.of(2026,10,1));
    assertThat(result.toDate()).isEqualTo(java.time.LocalDate.of(2026,10,31));
  }

  @Test void oneSidedRangeRemainsOpenInsteadOfInventingDefaultPeriod() {
    data();
    service.getStats(null,"2026-12-31",AS_OF);
    verify(repository).findIssued(null,OffsetDateTime.parse("2027-01-01T00:00:00+07:00"));
  }

  @Test void monthIsVietnamCreationMonthIncludingCrossYearBirthdayCatchUp() {
    var createdJanuary = new IssuedVoucher(1,"USED","BIRTHDAY",
        OffsetDateTime.parse("2026-12-31T17:00:00Z"),AS_OF.plusYears(1),false,1L,100000L,"VND");
    data(row(2,"USED","MANUAL",false,2L,200L,"VND"),createdJanuary);
    var result = service.getStats(null,null,AS_OF.plusYears(1));
    assertThat(result.byMonth()).extracting(m -> m.month()).containsExactly("2026-10","2027-01");
    assertThat(result.byMonth().get(0).summary().actualDiscountByCurrency()).containsEntry("VND",200L);
    assertThat(result.byMonth().get(1).summary().actualDiscountByCurrency()).containsEntry("VND",100000L);
  }

  @ParameterizedTest
  @CsvSource({"2026-11-02,2026-11-01","2026-02-30,2026-03-01",
      "bad,2026-11-01","2026/10/01,2026-11-01","0000-01-01,2026-11-01"})
  void invalidDatesAreRejectedBeforeQuery(String from,String to) {
    assertThatThrownBy(() -> service.getStats(from,to,AS_OF)).isInstanceOf(BadRequestException.class);
    verifyNoInteractions(repository);
  }
}
