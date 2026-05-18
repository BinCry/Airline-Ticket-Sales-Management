package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.AdminUserRoleUpdateRequest;
import com.qlvmb.airticket.domain.dto.AdminUserStatusUpdateRequest;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.RefreshSessionEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.RefreshSessionRepository;
import com.qlvmb.airticket.repository.RoleRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.RoleCode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
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
class AdminUserServiceTest {

  @Mock
  private UserAccountRepository userAccountRepository;

  @Mock
  private RoleRepository roleRepository;

  @Mock
  private AuditLogRepository auditLogRepository;

  @Mock
  private RefreshSessionRepository refreshSessionRepository;

  private AdminUserService adminUserService;

  @BeforeEach
  void setUp() {
    adminUserService = new AdminUserService(
        userAccountRepository,
        roleRepository,
        auditLogRepository,
        refreshSessionRepository
    );
  }

  @Test
  void updateRoles_shouldRevokeActiveRefreshSessions() {
    UserAccountEntity actorAccount = createUserAccount(301L, "bincry2006@gmail.com", "active", RoleCode.OPERATIONS_STAFF);
    UserAccountEntity targetAccount = createUserAccount(151L, "nnn045856@gmail.com", "active", RoleCode.MEMBER);
    RoleEntity customerSupportRole = createRole(RoleCode.CUSTOMER_SUPPORT);
    RefreshSessionEntity refreshSession = RefreshSessionEntity.create(
        targetAccount,
        "token-key-1",
        OffsetDateTime.now(ZoneOffset.UTC).plusDays(7),
        OffsetDateTime.now(ZoneOffset.UTC).minusDays(1),
        "Chrome",
        "127.0.0.1"
    );

    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount));
    when(userAccountRepository.findOneWithRolesById(151L)).thenReturn(Optional.of(targetAccount));
    when(roleRepository.findByCode(RoleCode.CUSTOMER_SUPPORT)).thenReturn(Optional.of(customerSupportRole));
    when(refreshSessionRepository.findAllByUserAccountIdAndRevokedAtIsNull(151L)).thenReturn(List.of(refreshSession));
    when(auditLogRepository.save(any(AuditLogEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    adminUserService.updateRoles(
        actor(),
        151L,
        new AdminUserRoleUpdateRequest(List.of(RoleCode.CUSTOMER_SUPPORT))
    );

    assertThat(refreshSession.getRevokedAt()).isNotNull();
    assertThat(targetAccount.getRoles()).extracting(RoleEntity::getCode).containsExactly(RoleCode.CUSTOMER_SUPPORT);
    verify(auditLogRepository).save(any(AuditLogEntity.class));
  }

  @Test
  void updateRoles_shouldRejectRemovingLastOperationsStaff() {
    UserAccountEntity actorAccount = createUserAccount(301L, "bincry2006@gmail.com", "active", RoleCode.OPERATIONS_STAFF);
    UserAccountEntity targetAccount = createUserAccount(301L, "bincry2006@gmail.com", "active", RoleCode.OPERATIONS_STAFF);

    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount), Optional.of(targetAccount));
    when(userAccountRepository.countActiveUsersByRoleCode(RoleCode.OPERATIONS_STAFF)).thenReturn(1L);

    assertThatThrownBy(() -> adminUserService.updateRoles(
        actor(),
        301L,
        new AdminUserRoleUpdateRequest(List.of(RoleCode.CUSTOMER_SUPPORT))
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Không thể gỡ quyền operations_staff cuối cùng.");
  }

  @Test
  void updateStatus_shouldRejectLockingLastOperationsStaff() {
    UserAccountEntity actorAccount = createUserAccount(301L, "bincry2006@gmail.com", "active", RoleCode.OPERATIONS_STAFF);
    UserAccountEntity targetAccount = createUserAccount(301L, "bincry2006@gmail.com", "active", RoleCode.OPERATIONS_STAFF);

    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount), Optional.of(targetAccount));
    when(userAccountRepository.countActiveUsersByRoleCode(RoleCode.OPERATIONS_STAFF)).thenReturn(1L);

    assertThatThrownBy(() -> adminUserService.updateStatus(
        actor(),
        301L,
        new AdminUserStatusUpdateRequest("locked")
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Không thể khóa hoặc tạm dừng operations_staff cuối cùng.");
  }

  @Test
  void getUsers_shouldHideLegacySeedAccountsAndNormalizeDisplayNames() {
    UserAccountEntity legacySeedAccount = createUserAccount(
        401L,
        "operations.demo@qlvmb.local",
        "active",
        RoleCode.OPERATIONS_STAFF
    );
    ReflectionTestUtils.setField(legacySeedAccount, "displayName", "Nhân sự vận hành kiểm thử");

    UserAccountEntity gmailSeedAccount = createUserAccount(
        402L,
        "bincry2006@gmail.com",
        "active",
        RoleCode.OPERATIONS_STAFF
    );
    ReflectionTestUtils.setField(gmailSeedAccount, "displayName", "Nhân sự vận hành kiểm thử");

    when(userAccountRepository.findAllByOrderByCreatedAtDesc())
        .thenReturn(List.of(legacySeedAccount, gmailSeedAccount));

    assertThat(adminUserService.getUsers())
        .extracting(user -> user.email() + "|" + user.displayName())
        .containsExactly("bincry2006@gmail.com|Nhân viên vận hành");
  }

  private AuthenticatedUser actor() {
    return new AuthenticatedUser(
        301L,
        "bincry2006@gmail.com",
        "Operations",
        List.of("operations_staff"),
        List.of("backoffice.operations", "backoffice.admin")
    );
  }

  private UserAccountEntity createUserAccount(Long userId, String email, String status, String roleCode) {
    UserAccountEntity userAccount = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(userAccount, "id", userId);
    ReflectionTestUtils.setField(userAccount, "email", email);
    ReflectionTestUtils.setField(userAccount, "status", status);
    ReflectionTestUtils.setField(userAccount, "roles", createRoles(roleCode));
    return userAccount;
  }

  private Set<RoleEntity> createRoles(String roleCode) {
    Set<RoleEntity> roles = new LinkedHashSet<>();
    roles.add(createRole(roleCode));
    return roles;
  }

  private RoleEntity createRole(String roleCode) {
    RoleEntity role = BeanUtils.instantiateClass(RoleEntity.class);
    ReflectionTestUtils.setField(role, "code", roleCode);
    ReflectionTestUtils.setField(role, "name", roleCode);
    return role;
  }
}
