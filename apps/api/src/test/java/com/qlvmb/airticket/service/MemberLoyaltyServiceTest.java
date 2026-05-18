package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.MyVoucherResponse;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.MemberLoyaltyAccountRepository;
import com.qlvmb.airticket.repository.MemberLoyaltyLedgerRepository;
import com.qlvmb.airticket.repository.MemberVoucherRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.RoleCode;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class MemberLoyaltyServiceTest {

  @Mock
  private UserAccountRepository userAccountRepository;

  @Mock
  private MemberLoyaltyAccountRepository memberLoyaltyAccountRepository;

  @Mock
  private MemberLoyaltyLedgerRepository memberLoyaltyLedgerRepository;

  @Mock
  private MemberVoucherRepository memberVoucherRepository;

  @Mock
  private AuditLogRepository auditLogRepository;

  private MemberLoyaltyService memberLoyaltyService;

  @BeforeEach
  void setUp() {
    memberLoyaltyService = new MemberLoyaltyService(
        userAccountRepository,
        memberLoyaltyAccountRepository,
        memberLoyaltyLedgerRepository,
        memberVoucherRepository,
        auditLogRepository
    );
  }

  @Test
  void getMyVouchers_shouldHideMemberHiddenVoucherHistory() {
    AuthenticatedUser authenticatedUser = new AuthenticatedUser(
        151L,
        "nnn045856@gmail.com",
        "Hoi vien",
        List.of("member"),
        List.of("customer.self_service", "member.loyalty")
    );
    UserAccountEntity memberAccount = createUserAccount(151L, "nnn045856@gmail.com", RoleCode.MEMBER);
    MemberVoucherEntity activeVoucher = createVoucher(
        "MEM52026",
        "Uu dai mua he",
        MemberVoucherEntity.STATUS_AVAILABLE,
        OffsetDateTime.parse("2026-06-10T03:00:00Z")
    );
    MemberVoucherEntity hiddenUsedVoucher = createVoucher(
        "USED52026",
        "Uu dai da dung",
        MemberVoucherEntity.STATUS_USED,
        OffsetDateTime.parse("2026-04-10T03:00:00Z")
    );
    hiddenUsedVoucher.hideForMember(OffsetDateTime.parse("2026-05-18T02:00:00Z"));

    when(userAccountRepository.findOneWithRolesById(151L)).thenReturn(Optional.of(memberAccount));
    when(memberVoucherRepository.findByUserIdOrderByExpiresAtAscCreatedAtDesc(151L))
        .thenReturn(List.of(activeVoucher, hiddenUsedVoucher));

    List<MyVoucherResponse> vouchers = memberLoyaltyService.getMyVouchers(authenticatedUser);

    assertThat(vouchers).hasSize(1);
    assertThat(vouchers.get(0).voucherCode()).isEqualTo("MEM52026");
  }

  @Test
  void hideMyUsedVoucherHistory_shouldHideOnlyMemberView() {
    AuthenticatedUser authenticatedUser = new AuthenticatedUser(
        151L,
        "nnn045856@gmail.com",
        "Hoi vien",
        List.of("member"),
        List.of("customer.self_service", "member.loyalty")
    );
    UserAccountEntity memberAccount = createUserAccount(151L, "nnn045856@gmail.com", RoleCode.MEMBER);
    MemberVoucherEntity usedVoucher = createVoucher(
        "USED52026",
        "Uu dai da dung",
        MemberVoucherEntity.STATUS_USED,
        OffsetDateTime.parse("2026-04-10T03:00:00Z")
    );

    when(userAccountRepository.findOneWithRolesById(151L)).thenReturn(Optional.of(memberAccount));
    when(memberVoucherRepository.findByVoucherCodeIgnoreCaseAndUserId("USED52026", 151L))
        .thenReturn(Optional.of(usedVoucher));
    when(auditLogRepository.save(any(AuditLogEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    memberLoyaltyService.hideMyUsedVoucherHistory(authenticatedUser, "USED52026");

    assertThat(usedVoucher.isHiddenForMember()).isTrue();
    assertThat(usedVoucher.isHiddenForOperations()).isFalse();
    verify(auditLogRepository).save(any(AuditLogEntity.class));
  }

  private UserAccountEntity createUserAccount(Long userId, String email, String roleCode) {
    UserAccountEntity userAccount = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(userAccount, "id", userId);
    ReflectionTestUtils.setField(userAccount, "email", email);
    ReflectionTestUtils.setField(userAccount, "roles", createRoles(roleCode));
    return userAccount;
  }

  private Set<RoleEntity> createRoles(String roleCode) {
    RoleEntity role = BeanUtils.instantiateClass(RoleEntity.class);
    ReflectionTestUtils.setField(role, "code", roleCode);
    ReflectionTestUtils.setField(role, "name", roleCode);
    Set<RoleEntity> roles = new LinkedHashSet<>();
    roles.add(role);
    return roles;
  }

  private MemberVoucherEntity createVoucher(
      String voucherCode,
      String title,
      String status,
      OffsetDateTime expiresAt
  ) {
    MemberVoucherEntity voucher = BeanUtils.instantiateClass(MemberVoucherEntity.class);
    ReflectionTestUtils.setField(voucher, "userId", 151L);
    ReflectionTestUtils.setField(voucher, "voucherCode", voucherCode);
    ReflectionTestUtils.setField(voucher, "title", title);
    ReflectionTestUtils.setField(voucher, "description", "Mo ta voucher");
    ReflectionTestUtils.setField(voucher, "discountAmount", 150000L);
    ReflectionTestUtils.setField(voucher, "currency", "VND");
    ReflectionTestUtils.setField(voucher, "status", status);
    ReflectionTestUtils.setField(voucher, "expiresAt", expiresAt);
    ReflectionTestUtils.setField(voucher, "bookingCode", status.equals(MemberVoucherEntity.STATUS_USED) ? "QC5004" : null);
    ReflectionTestUtils.setField(voucher, "usedAt", status.equals(MemberVoucherEntity.STATUS_USED) ? expiresAt.minusDays(1) : null);
    ReflectionTestUtils.setField(voucher, "createdAt", expiresAt.minusDays(10));
    ReflectionTestUtils.setField(voucher, "updatedAt", expiresAt.minusDays(2));
    return voucher;
  }
}
