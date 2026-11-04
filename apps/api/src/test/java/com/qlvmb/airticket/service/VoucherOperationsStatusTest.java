package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.repository.AirportRepository;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.MemberVoucherRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

class VoucherOperationsStatusTest {
  private final MemberVoucherRepository vouchers = mock(MemberVoucherRepository.class);
  private final UserAccountRepository users = mock(UserAccountRepository.class);
  private final AuditLogRepository audit = mock(AuditLogRepository.class);
  private final BackofficeVoucherService service = new BackofficeVoucherService(vouchers,users,
      mock(BookingRepository.class),audit,new VoucherConditionService(
          new ObjectMapper().findAndRegisterModules(),mock(AirportRepository.class),
          new ProductCatalogService()),mock(VoucherLockService.class));

  @ParameterizedTest
  @CsvSource({"AVAILABLE,EXPIRED","USED,USED","REVOKED,REVOKED","RESERVED,RESERVED","EXPIRED,EXPIRED"})
  void effectiveExpiryNeverOverwritesOtherStoredStatuses(String stored,String expected) {
    var now = OffsetDateTime.parse("2026-11-04T00:00:00+07:00");
    assertThat(VoucherStatusSupport.effectiveStatus(stored,now,now)).isEqualTo(expected);
    assertThat(VoucherStatusSupport.effectiveStatus("AVAILABLE",now.plusNanos(1),now))
        .isEqualTo("AVAILABLE");
  }

  @Test void listPreservesStoredStatusAndPublishesEffectiveStatusWithoutMutation() throws Exception {
    var now = OffsetDateTime.now();
    var voucher = MemberVoucherEntity.create(7L,"OLD","Voucher","Kiểm thử",100000L,"VND",
        now.minusDays(1),now.minusDays(5));
    ReflectionTestUtils.setField(voucher,"id",1L);
    when(vouchers.findOperationsVouchers(isNull(),isNull(),isNull(),any()))
        .thenReturn(List.of(voucher));
    when(users.findAllById(any())).thenReturn(List.of());
    var result = service.getVouchers(null,null,null);
    var item = result.vouchers().getFirst();
    assertThat(item.status()).isEqualTo("AVAILABLE");
    assertThat(item.effectiveStatus()).isEqualTo("EXPIRED");
    assertThat(voucher.getStatus()).isEqualTo("AVAILABLE");
    var json = new ObjectMapper().findAndRegisterModules().readTree(
        new ObjectMapper().findAndRegisterModules().writeValueAsString(item));
    assertThat(json.get("status").asText()).isEqualTo("AVAILABLE");
    assertThat(json.get("effectiveStatus").asText()).isEqualTo("EXPIRED");
    verify(vouchers,never()).save(any());
    verifyNoInteractions(audit);
  }

  @Test void effectiveStatusAndLiteralCodeFilterAreSentToRepositoryBeforeResults() {
    var user = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(user,"id",7L);
    when(users.findByEmailIgnoreCase("member@example.test")).thenReturn(Optional.of(user));
    when(vouchers.findOperationsVouchers(eq(7L),eq("%_"),eq("EXPIRED"),any()))
        .thenReturn(List.of());
    when(users.findAllById(any())).thenReturn(List.of());
    var result = service.getVouchers(" member@example.test "," %_ ","expired");
    assertThat(result.queryStatus()).isEqualTo("EXPIRED");
    verify(vouchers).findOperationsVouchers(eq(7L),eq("%_"),eq("EXPIRED"),any());
  }

  @Test void unknownMemberEmailDoesNotFallBackToAllVouchers() {
    when(users.findByEmailIgnoreCase("missing@example.test")).thenReturn(Optional.empty());
    assertThat(service.getVouchers("missing@example.test",null,null).vouchers()).isEmpty();
    verifyNoInteractions(vouchers);
  }
}
