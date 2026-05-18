package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.AdminUserResponse;
import com.qlvmb.airticket.domain.dto.AdminUserRoleUpdateRequest;
import com.qlvmb.airticket.domain.dto.AdminUserStatusUpdateRequest;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
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
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {

  private static final Set<String> ALLOWED_ROLES = Set.of(
      RoleCode.CUSTOMER,
      RoleCode.MEMBER,
      RoleCode.CUSTOMER_SUPPORT,
      RoleCode.OPERATIONS_STAFF
  );
  private static final Set<String> ALLOWED_STATUSES = Set.of("active", "locked", "suspended");

  private final UserAccountRepository userAccountRepository;
  private final RoleRepository roleRepository;
  private final AuditLogRepository auditLogRepository;
  private final RefreshSessionRepository refreshSessionRepository;

  public AdminUserService(
      UserAccountRepository userAccountRepository,
      RoleRepository roleRepository,
      AuditLogRepository auditLogRepository,
      RefreshSessionRepository refreshSessionRepository
  ) {
    this.userAccountRepository = userAccountRepository;
    this.roleRepository = roleRepository;
    this.auditLogRepository = auditLogRepository;
    this.refreshSessionRepository = refreshSessionRepository;
  }

  @Transactional(readOnly = true)
  public List<AdminUserResponse> getUsers() {
    return userAccountRepository.findAllByOrderByCreatedAtDesc().stream()
        .filter(userAccount -> !DisplayNamePresentationSupport.isLegacySeedEmail(userAccount.getEmail()))
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public AdminUserResponse updateRoles(
      AuthenticatedUser actor,
      Long userId,
      AdminUserRoleUpdateRequest request
  ) {
    UserAccountEntity actorAccount = requireUser(actor.userId());
    UserAccountEntity targetAccount = requireUser(userId);
    Set<String> nextRoleCodes = normalizeRoleCodes(request.roles());
    guardLastOperationsStaff(targetAccount, nextRoleCodes, "Không thể gỡ quyền operations_staff cuối cùng.");

    Set<RoleEntity> nextRoles = nextRoleCodes.stream()
        .map(roleCode -> roleRepository.findByCode(roleCode)
            .orElseThrow(() -> new BadRequestException("Role không hợp lệ: " + roleCode)))
        .collect(Collectors.toCollection(LinkedHashSet::new));

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    String oldRoles = String.join(",", extractRoleCodes(targetAccount));
    targetAccount.replaceRoles(nextRoles, now);
    revokeActiveRefreshSessions(targetAccount.getId(), now);
    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        "admin.user.roles.update",
        "user_account",
        targetAccount.getId().toString(),
        "Đổi role từ [" + oldRoles + "] sang [" + String.join(",", nextRoleCodes) + "]",
        now
    ));
    return toResponse(targetAccount);
  }

  @Transactional
  public AdminUserResponse updateStatus(
      AuthenticatedUser actor,
      Long userId,
      AdminUserStatusUpdateRequest request
  ) {
    UserAccountEntity actorAccount = requireUser(actor.userId());
    UserAccountEntity targetAccount = requireUser(userId);
    String nextStatus = normalizeStatus(request.status());
    if (!"active".equals(nextStatus)
        && hasRole(targetAccount, RoleCode.OPERATIONS_STAFF)
        && userAccountRepository.countActiveUsersByRoleCode(RoleCode.OPERATIONS_STAFF) <= 1) {
      throw new BadRequestException("Không thể khóa hoặc tạm dừng operations_staff cuối cùng.");
    }

    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    String oldStatus = targetAccount.getStatus();
    targetAccount.updateStatus(nextStatus, now);
    revokeActiveRefreshSessions(targetAccount.getId(), now);
    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        "admin.user.status.update",
        "user_account",
        targetAccount.getId().toString(),
        "Đổi trạng thái từ " + oldStatus + " sang " + nextStatus,
        now
    ));
    return toResponse(targetAccount);
  }

  private UserAccountEntity requireUser(Long userId) {
    return userAccountRepository.findOneWithRolesById(userId)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản người dùng."));
  }

  private Set<String> normalizeRoleCodes(List<String> roleCodes) {
    Set<String> normalizedRoleCodes = roleCodes.stream()
        .map(roleCode -> roleCode.trim().toLowerCase(Locale.ROOT))
        .filter(roleCode -> !roleCode.isBlank())
        .collect(Collectors.toCollection(LinkedHashSet::new));
    if (normalizedRoleCodes.isEmpty()) {
      throw new BadRequestException("Người dùng phải có ít nhất một role.");
    }
    normalizedRoleCodes.forEach(roleCode -> {
      if (!ALLOWED_ROLES.contains(roleCode)) {
        throw new BadRequestException("Role không hợp lệ: " + roleCode);
      }
    });
    if (normalizedRoleCodes.size() != 1) {
      throw new BadRequestException("Mỗi tài khoản chỉ được gán một vai trò sản phẩm.");
    }
    return normalizedRoleCodes;
  }

  private String normalizeStatus(String status) {
    String normalizedStatus = status.trim().toLowerCase(Locale.ROOT);
    if (!ALLOWED_STATUSES.contains(normalizedStatus)) {
      throw new BadRequestException("Trạng thái tài khoản không hợp lệ.");
    }
    return normalizedStatus;
  }

  private void guardLastOperationsStaff(
      UserAccountEntity targetAccount,
      Set<String> nextRoleCodes,
      String message
  ) {
    if (!hasRole(targetAccount, RoleCode.OPERATIONS_STAFF) || nextRoleCodes.contains(RoleCode.OPERATIONS_STAFF)) {
      return;
    }
    if (userAccountRepository.countActiveUsersByRoleCode(RoleCode.OPERATIONS_STAFF) <= 1) {
      throw new BadRequestException(message);
    }
  }

  private boolean hasRole(UserAccountEntity userAccount, String roleCode) {
    return userAccount.getRoles().stream().anyMatch(role -> roleCode.equals(role.getCode()));
  }

  private void revokeActiveRefreshSessions(Long userId, OffsetDateTime revokedAt) {
    refreshSessionRepository.findAllByUserAccountIdAndRevokedAtIsNull(userId)
        .forEach(refreshSession -> refreshSession.revoke(revokedAt));
  }

  private List<String> extractRoleCodes(UserAccountEntity userAccount) {
    return userAccount.getRoles().stream()
        .map(RoleEntity::getCode)
        .sorted()
        .toList();
  }

  private AdminUserResponse toResponse(UserAccountEntity userAccount) {
    return new AdminUserResponse(
        userAccount.getId(),
        userAccount.getEmail(),
        DisplayNamePresentationSupport.present(userAccount.getDisplayName()),
        userAccount.getPhone(),
        userAccount.getStatus(),
        userAccount.isEmailVerified(),
        userAccount.getAvatarUrl(),
        userAccount.getLockedAt(),
        userAccount.getLastLoginAt(),
        extractRoleCodes(userAccount)
    );
  }
}
