package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.MyLoyaltyLedgerItemResponse;
import com.qlvmb.airticket.domain.dto.MyLoyaltyResponse;
import com.qlvmb.airticket.domain.dto.MyVoucherResponse;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.MemberLoyaltyAccountEntity;
import com.qlvmb.airticket.domain.entity.MemberLoyaltyLedgerEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.MemberLoyaltyAccountRepository;
import com.qlvmb.airticket.repository.MemberLoyaltyLedgerRepository;
import com.qlvmb.airticket.repository.MemberVoucherRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.RoleCode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberLoyaltyService {

  private final UserAccountRepository userAccountRepository;
  private final MemberLoyaltyAccountRepository memberLoyaltyAccountRepository;
  private final MemberLoyaltyLedgerRepository memberLoyaltyLedgerRepository;
  private final MemberVoucherRepository memberVoucherRepository;
  private final AuditLogRepository auditLogRepository;

  public MemberLoyaltyService(
      UserAccountRepository userAccountRepository,
      MemberLoyaltyAccountRepository memberLoyaltyAccountRepository,
      MemberLoyaltyLedgerRepository memberLoyaltyLedgerRepository,
      MemberVoucherRepository memberVoucherRepository,
      AuditLogRepository auditLogRepository
  ) {
    this.userAccountRepository = userAccountRepository;
    this.memberLoyaltyAccountRepository = memberLoyaltyAccountRepository;
    this.memberLoyaltyLedgerRepository = memberLoyaltyLedgerRepository;
    this.memberVoucherRepository = memberVoucherRepository;
    this.auditLogRepository = auditLogRepository;
  }

  @Transactional(readOnly = true)
  public MyLoyaltyResponse getMyLoyalty(AuthenticatedUser authenticatedUser) {
    UserAccountEntity userAccount = loadMemberAccount(authenticatedUser);
    MemberLoyaltyAccountEntity loyaltyAccount = memberLoyaltyAccountRepository.findByUserId(userAccount.getId())
        .orElse(null);

    if (loyaltyAccount == null) {
      return new MyLoyaltyResponse("Hội viên", 0, 0, 0, List.of());
    }

    List<MyLoyaltyLedgerItemResponse> recentEntries = memberLoyaltyLedgerRepository
        .findTop5ByLoyaltyAccountIdOrderByCreatedAtDesc(loyaltyAccount.getId()).stream()
        .map(this::toLedgerItemResponse)
        .toList();

    return new MyLoyaltyResponse(
        loyaltyAccount.getMembershipTier(),
        loyaltyAccount.getPointBalance(),
        loyaltyAccount.getLifetimePoints(),
        (int) memberVoucherRepository.countByUserIdAndStatus(
            userAccount.getId(),
            MemberVoucherEntity.STATUS_AVAILABLE
        ),
        recentEntries
    );
  }

  @Transactional(readOnly = true)
  public List<MyVoucherResponse> getMyVouchers(AuthenticatedUser authenticatedUser) {
    UserAccountEntity userAccount = loadMemberAccount(authenticatedUser);
    return memberVoucherRepository.findByUserIdOrderByExpiresAtAscCreatedAtDesc(userAccount.getId()).stream()
        .filter(voucher -> !voucher.isHiddenForMember())
        .map(this::toVoucherResponse)
        .toList();
  }

  @Transactional
  public void hideMyUsedVoucherHistory(AuthenticatedUser authenticatedUser, String voucherCode) {
    UserAccountEntity userAccount = loadMemberAccount(authenticatedUser);
    MemberVoucherEntity voucher = memberVoucherRepository.findByVoucherCodeIgnoreCaseAndUserId(voucherCode, userAccount.getId())
        .orElseThrow(() -> new BadRequestException("Không tìm thấy voucher của hội viên theo mã đã nhập."));

    if (!voucher.isUsed()) {
      throw new BadRequestException("Chỉ có thể ẩn lịch sử với voucher đã sử dụng.");
    }

    if (voucher.isHiddenForMember()) {
      return;
    }

    OffsetDateTime currentTime = OffsetDateTime.now();
    voucher.hideForMember(currentTime);
    auditLogRepository.save(AuditLogEntity.create(
        userAccount,
        "member.voucher.hide_history",
        "member_voucher",
        voucher.getVoucherCode(),
        "Hội viên tự ẩn lịch sử voucher đã dùng " + voucher.getVoucherCode(),
        currentTime
    ));
  }

  private UserAccountEntity loadMemberAccount(AuthenticatedUser authenticatedUser) {
    UserAccountEntity userAccount = userAccountRepository.findOneWithRolesById(authenticatedUser.userId())
        .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin tài khoản hội viên."));

    if (!hasRole(userAccount.getRoles(), RoleCode.MEMBER)) {
      throw new UnauthorizedException("Tài khoản hiện tại chưa được kích hoạt quyền hội viên.");
    }

    return userAccount;
  }

  private MyLoyaltyLedgerItemResponse toLedgerItemResponse(MemberLoyaltyLedgerEntity ledgerEntry) {
    return new MyLoyaltyLedgerItemResponse(
        ledgerEntry.getEntryType(),
        ledgerEntry.getPointsDelta(),
        ledgerEntry.getBalanceAfter(),
        ledgerEntry.getBookingCode(),
        ledgerEntry.getDescription(),
        ledgerEntry.getCreatedAt()
    );
  }

  private MyVoucherResponse toVoucherResponse(MemberVoucherEntity voucher) {
    return new MyVoucherResponse(
        voucher.getVoucherCode(),
        voucher.getTitle(),
        voucher.getDescription(),
        voucher.getDiscountAmount(),
        voucher.getCurrency(),
        voucher.getStatus(),
        voucher.getExpiresAt(),
        voucher.getUsedAt(),
        voucher.getBookingCode()
    );
  }

  private boolean hasRole(Set<RoleEntity> roles, String roleCode) {
    return roles.stream()
        .map(RoleEntity::getCode)
        .map(code -> code.toLowerCase(Locale.ROOT))
        .anyMatch(roleCode::equals);
  }
}
