package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qlvmb.airticket.domain.dto.BackofficeVoucherCreateRequest;
import com.qlvmb.airticket.domain.dto.BackofficeVoucherUpdateRequest;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AirportRepository;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.LoyaltyTierRuleRepository;
import com.qlvmb.airticket.repository.MemberLoyaltyAccountRepository;
import com.qlvmb.airticket.repository.MemberLoyaltyLedgerRepository;
import com.qlvmb.airticket.repository.MemberVoucherRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

class BirthdayVoucherPolicyTest {
  private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
  private final UserAccountRepository users = mock(UserAccountRepository.class);
  private final MemberVoucherRepository vouchers = mock(MemberVoucherRepository.class);
  private final AuditLogRepository audit = mock(AuditLogRepository.class);
  private final VoucherLockService locks = mock(VoucherLockService.class);
  private final VoucherConditionService conditions = new VoucherConditionService(
      mapper, mock(AirportRepository.class), new ProductCatalogService());
  private final OffsetDateTime expiry = OffsetDateTime.parse("2026-12-03T00:00:00+07:00");
  private final AuthenticatedUser actor = new AuthenticatedUser(301L, "operator@example.test",
      "Vận hành", List.of("operations_staff"), List.of("backoffice.operations"));
  private BackofficeVoucherService service;
  private MemberVoucherEntity voucher;

  @BeforeEach
  void prepare() {
    service = new BackofficeVoucherService(vouchers, users, mock(BookingRepository.class),
        audit, conditions, locks);
    voucher = MemberVoucherEntity.create(151L, "BDAY-151-2026", "Quà sinh nhật",
        "Ngày sinh tự khai", 100000, "VND", expiry, expiry.minusDays(30));
    voucher.updateConditions("{\"minAmount\":200000}");
    ReflectionTestUtils.setField(voucher, "source", MemberVoucherEntity.SOURCE_BIRTHDAY);
    ReflectionTestUtils.setField(voucher, "id", 5L);
    when(locks.lockId(5L)).thenReturn(voucher);
    when(users.findOneWithRolesById(301L)).thenReturn(Optional.of(account(301L, "operations_staff")));
    when(users.findById(151L)).thenReturn(Optional.of(account(151L, "member")));
  }

  @Test
  void manualFactoryDoesNotInferSourceFromCode() {
    var manual = MemberVoucherEntity.create(151L, "BDAY-151-2026", "Voucher", "Kiểm thử",
        100000, "VND", expiry, expiry.minusDays(30));
    assertThat(manual.getSource()).isEqualTo("MANUAL");
    assertThat(manual.isBirthday()).isFalse();
    for (var requestType : List.of(BackofficeVoucherCreateRequest.class, BackofficeVoucherUpdateRequest.class)) {
      assertThat(Arrays.stream(requestType.getRecordComponents()).map(c -> c.getName()).toList())
          .doesNotContain("source");
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"amount", "currency", "expiry", "minimum", "clear"})
  void birthdayPolicyChangesAreRejectedBeforeMutation(String change) {
    JsonNode node = change.equals("clear") ? com.fasterxml.jackson.databind.node.NullNode.instance
        : change.equals("minimum") ? mapper.createObjectNode().put("minAmount", 300000) : null;
    var request = new BackofficeVoucherUpdateRequest("Tên mới", "Mô tả mới",
        change.equals("amount") ? 200000 : 100000,
        change.equals("currency") ? "USD" : "VND", "AVAILABLE",
        change.equals("expiry") ? expiry.plusDays(1) : expiry, node);
    assertThatThrownBy(() -> service.updateVoucher(actor, 5L, request))
        .isInstanceOf(BadRequestException.class).hasMessageContaining("quà sinh nhật");
    assertThat(voucher.getTitle()).isEqualTo("Quà sinh nhật");
    assertThat(voucher.getDiscountAmount()).isEqualTo(100000);
    assertThat(voucher.getCurrency()).isEqualTo("VND");
    assertThat(voucher.getExpiresAt()).isEqualTo(expiry);
    assertThat(voucher.getConditionJson()).isEqualTo("{\"minAmount\":200000}");
    verify(audit, never()).save(any());
  }

  @Test
  void unchangedBirthdayPolicyAllowsMetadataAndPreservesOriginalJson() {
    var node = mapper.createObjectNode().put("minAmount", 200000);
    node.putArray("routes");
    var result = service.updateVoucher(actor, 5L, request(node));
    assertThat(result.source()).isEqualTo("BIRTHDAY");
    assertThat(result.title()).isEqualTo("Tên mới");
    assertThat(result.conditions().minAmount()).isEqualTo(200000);
    assertThat(voucher.getConditionJson()).isEqualTo("{\"minAmount\":200000}");
    assertThat(result.expiresAt().isEqual(expiry)).isTrue();
  }

  @Test
  void omittedBirthdayConditionsStayUnchanged() {
    service.updateVoucher(actor, 5L, request(null));
    assertThat(voucher.getConditionJson()).isEqualTo("{\"minAmount\":200000}");
  }

  @Test
  void malformedStoredBirthdayConditionsFailClosed() {
    voucher.updateConditions("{");
    assertThatThrownBy(() -> service.updateVoucher(actor, 5L, request(null)))
        .isInstanceOf(BadRequestException.class);
    assertThat(voucher.getTitle()).isEqualTo("Quà sinh nhật");
  }

  @Test
  void manualVoucherRemainsEditable() {
    ReflectionTestUtils.setField(voucher, "source", MemberVoucherEntity.SOURCE_MANUAL);
    var result = service.updateVoucher(actor, 5L, new BackofficeVoucherUpdateRequest(
        "Tên mới", "Mô tả mới", 150000, "USD", "AVAILABLE", expiry.plusDays(1), com.fasterxml.jackson.databind.node.NullNode.instance));
    assertThat(result.source()).isEqualTo("MANUAL");
    assertThat(result.discountAmount()).isEqualTo(150000);
    assertThat(result.currency()).isEqualTo("USD");
    assertThat(result.conditions()).isNull();
    assertThat(result.expiresAt()).isEqualTo(expiry.plusDays(1));
  }

  @Test
  void birthdayRevokeAndOperationsHideRemainAvailable() {
    when(locks.lockForRevocation(5L)).thenReturn(new VoucherLockService.Reservation(voucher, null));
    assertThat(service.revokeVoucher(actor, 5L).source()).isEqualTo("BIRTHDAY");
    service.hideVoucherFromOperations(actor, 5L);
    assertThat(voucher.getStatus()).isEqualTo("REVOKED");
    assertThat(voucher.isHiddenForOperations()).isTrue();
    assertThat(voucher.getDiscountAmount()).isEqualTo(100000);
    assertThat(voucher.getConditionJson()).isEqualTo("{\"minAmount\":200000}");
  }

  @Test
  void memberResponseExposesSourceWithoutChangingConditions() {
    when(users.findOneWithRolesById(151L)).thenReturn(Optional.of(account(151L, "member")));
    when(vouchers.findByUserIdOrderByExpiresAtAscCreatedAtDesc(151L)).thenReturn(List.of(voucher));
    var loyalty = new MemberLoyaltyService(users, mock(MemberLoyaltyAccountRepository.class),
        mock(MemberLoyaltyLedgerRepository.class), vouchers, audit,
        mock(LoyaltyTierRuleRepository.class), conditions, locks);
    var member = new AuthenticatedUser(151L, "member@example.test", "Hội viên",
        List.of("member"), List.of());
    var result = loyalty.getMyVouchers(member).get(0);
    assertThat(result.source()).isEqualTo("BIRTHDAY");
    assertThat(result.conditionSummary()).contains("200.000");
    assertThat(result.conditionsValid()).isTrue();
  }

  private BackofficeVoucherUpdateRequest request(JsonNode node) {
    return new BackofficeVoucherUpdateRequest("Tên mới", "Mô tả mới", 100000, "VND",
        "AVAILABLE", expiry.withOffsetSameInstant(java.time.ZoneOffset.UTC), node);
  }

  private UserAccountEntity account(long id, String roleCode) {
    var user = BeanUtils.instantiateClass(UserAccountEntity.class);
    var role = BeanUtils.instantiateClass(RoleEntity.class);
    ReflectionTestUtils.setField(role, "code", roleCode);
    ReflectionTestUtils.setField(user, "id", id);
    ReflectionTestUtils.setField(user, "email", "user" + id + "@example.test");
    ReflectionTestUtils.setField(user, "displayName", "Kiểm thử");
    ReflectionTestUtils.setField(user, "roles", Set.of(role));
    return user;
  }
}
