package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.BackofficeVoucherCreateRequest;
import com.qlvmb.airticket.domain.dto.BackofficeVoucherResponse;
import com.qlvmb.airticket.domain.dto.BackofficeVoucherUpdateRequest;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.MemberVoucherRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.RoleCode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BackofficeVoucherService {

  private static final Set<String> ALLOWED_BACKOFFICE_STATUSES = Set.of(
      MemberVoucherEntity.STATUS_AVAILABLE,
      MemberVoucherEntity.STATUS_EXPIRED,
      MemberVoucherEntity.STATUS_REVOKED
  );

  private final MemberVoucherRepository memberVoucherRepository;
  private final UserAccountRepository userAccountRepository;
  private final BookingRepository bookingRepository;
  private final AuditLogRepository auditLogRepository;

  public BackofficeVoucherService(
      MemberVoucherRepository memberVoucherRepository,
      UserAccountRepository userAccountRepository,
      BookingRepository bookingRepository,
      AuditLogRepository auditLogRepository
  ) {
    this.memberVoucherRepository = memberVoucherRepository;
    this.userAccountRepository = userAccountRepository;
    this.bookingRepository = bookingRepository;
    this.auditLogRepository = auditLogRepository;
  }

  @Transactional(readOnly = true)
  public BackofficeVoucherResponse getVouchers(String email, String code, String status) {
    String normalizedEmail = normalizeOptional(email);
    String normalizedCode = normalizeOptional(code);
    String normalizedStatus = normalizeStatusFilter(status);

    List<MemberVoucherEntity> vouchers = loadVoucherCandidates(normalizedEmail).stream()
        .filter(voucher -> normalizedCode == null
            || voucher.getVoucherCode().toLowerCase(Locale.ROOT).contains(normalizedCode.toLowerCase(Locale.ROOT)))
        .filter(voucher -> normalizedStatus == null || voucher.getStatus().equals(normalizedStatus))
        .sorted(Comparator
            .comparing(MemberVoucherEntity::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparing(MemberVoucherEntity::getExpiresAt, Comparator.nullsLast(Comparator.naturalOrder())))
        .toList();

    Map<Long, UserAccountEntity> userAccounts = userAccountRepository.findAllById(
            vouchers.stream().map(MemberVoucherEntity::getUserId).distinct().toList()
        )
        .stream()
        .collect(Collectors.toMap(UserAccountEntity::getId, Function.identity()));

    return new BackofficeVoucherResponse(
        normalizedEmail,
        normalizedCode,
        normalizedStatus,
        vouchers.stream().map(voucher -> mapVoucher(voucher, userAccounts.get(voucher.getUserId()))).toList()
    );
  }

  @Transactional
  public BackofficeVoucherResponse.VoucherItem createVoucher(
      AuthenticatedUser actor,
      BackofficeVoucherCreateRequest request
  ) {
    UserAccountEntity actorAccount = loadActorAccount(actor);
    UserAccountEntity memberAccount = loadMemberAccountByEmail(request.memberEmail());
    String normalizedVoucherCode = normalizeVoucherCode(request.voucherCode());

    if (memberVoucherRepository.findByVoucherCodeIgnoreCase(normalizedVoucherCode).isPresent()) {
      throw new BadRequestException("Mã voucher đã tồn tại, vui lòng dùng mã khác.");
    }

    OffsetDateTime currentTime = OffsetDateTime.now();
    MemberVoucherEntity voucher = MemberVoucherEntity.create(
        memberAccount.getId(),
        normalizedVoucherCode,
        request.title().trim(),
        request.description().trim(),
        request.discountAmount(),
        normalizeCurrency(request.currency()),
        request.expiresAt(),
        currentTime
    );
    memberVoucherRepository.save(voucher);

    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        "operations.voucher.create",
        "member_voucher",
        voucher.getVoucherCode(),
        "Tạo voucher " + voucher.getVoucherCode() + " cho " + memberAccount.getEmail(),
        currentTime
    ));

    return mapVoucher(voucher, memberAccount);
  }

  @Transactional
  public BackofficeVoucherResponse.VoucherItem updateVoucher(
      AuthenticatedUser actor,
      Long voucherId,
      BackofficeVoucherUpdateRequest request
  ) {
    UserAccountEntity actorAccount = loadActorAccount(actor);
    MemberVoucherEntity voucher = memberVoucherRepository.findById(voucherId)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy voucher cần cập nhật."));
    UserAccountEntity memberAccount = userAccountRepository.findById(voucher.getUserId())
        .orElseThrow(() -> new NotFoundException("Không tìm thấy hội viên sở hữu voucher này."));

    if (voucher.isUsed()) {
      throw new BadRequestException("Voucher đã sử dụng không thể chỉnh sửa hoặc thu hồi.");
    }

    if (voucher.isReserved()) {
      throw new BadRequestException(
          "Voucher đang được giữ cho một booking, vui lòng thu hồi rõ ràng trước khi chỉnh sửa."
      );
    }

    String nextStatus = normalizeBackofficeStatus(request.status());
    OffsetDateTime currentTime = OffsetDateTime.now();
    String oldStatus = voucher.getStatus();
    long oldDiscountAmount = voucher.getDiscountAmount();
    OffsetDateTime oldExpiresAt = voucher.getExpiresAt();
    String linkedBookingCode = voucher.getBookingCode();

    voucher.updateBackofficeMetadata(
        request.title().trim(),
        request.description().trim(),
        request.discountAmount(),
        normalizeCurrency(request.currency()),
        request.expiresAt(),
        currentTime
    );
    voucher.applyBackofficeStatus(nextStatus, currentTime);

    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        "operations.voucher.update",
        "member_voucher",
        voucher.getVoucherCode(),
        "Cập nhật voucher " + voucher.getVoucherCode()
            + " từ trạng thái " + oldStatus + " sang " + nextStatus
            + ", giảm giá từ " + oldDiscountAmount + " sang " + request.discountAmount()
            + ", hết hạn từ " + stringifyDate(oldExpiresAt) + " sang " + stringifyDate(request.expiresAt())
            + ", booking liên kết cũ " + stringifyValue(linkedBookingCode),
        currentTime
    ));

    return mapVoucher(voucher, memberAccount);
  }

  @Transactional
  public BackofficeVoucherResponse.VoucherItem revokeVoucher(AuthenticatedUser actor, Long voucherId) {
    UserAccountEntity actorAccount = loadActorAccount(actor);
    MemberVoucherEntity voucher = memberVoucherRepository.findById(voucherId)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy voucher cần thu hồi."));
    UserAccountEntity memberAccount = userAccountRepository.findById(voucher.getUserId())
        .orElseThrow(() -> new NotFoundException("Không tìm thấy hội viên sở hữu voucher này."));

    if (voucher.isUsed()) {
      throw new BadRequestException("Voucher đã sử dụng không thể thu hồi.");
    }

    OffsetDateTime currentTime = OffsetDateTime.now();
    if (voucher.isReserved()) {
      releaseReservedBooking(voucher, currentTime);
    }
    voucher.revoke(currentTime);

    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        "operations.voucher.revoke",
        "member_voucher",
        voucher.getVoucherCode(),
        "Thu hồi voucher " + voucher.getVoucherCode() + " của " + memberAccount.getEmail(),
        currentTime
    ));

    return mapVoucher(voucher, memberAccount);
  }

  @Transactional
  public void hideVoucherFromOperations(AuthenticatedUser actor, Long voucherId) {
    UserAccountEntity actorAccount = loadActorAccount(actor);
    MemberVoucherEntity voucher = memberVoucherRepository.findById(voucherId)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy voucher cần ẩn khỏi giao diện."));
    UserAccountEntity memberAccount = userAccountRepository.findById(voucher.getUserId())
        .orElseThrow(() -> new NotFoundException("Không tìm thấy hội viên sở hữu voucher này."));

    if (!voucher.isUsed() && !MemberVoucherEntity.STATUS_REVOKED.equals(voucher.getStatus())) {
      throw new BadRequestException("Chỉ có thể ẩn khỏi giao diện vận hành với voucher đã dùng hoặc đã thu hồi.");
    }

    if (voucher.isHiddenForOperations()) {
      return;
    }

    OffsetDateTime currentTime = OffsetDateTime.now();
    voucher.hideForOperations(currentTime);

    String actionCode = voucher.isUsed()
        ? "operations.voucher.hide_used_history"
        : "operations.voucher.hide_revoked";
    String description = voucher.isUsed()
        ? "Ẩn lịch sử voucher đã dùng " + voucher.getVoucherCode() + " của " + memberAccount.getEmail()
        : "Ẩn voucher đã thu hồi " + voucher.getVoucherCode() + " khỏi danh sách vận hành của " + memberAccount.getEmail();

    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        actionCode,
        "member_voucher",
        voucher.getVoucherCode(),
        description,
        currentTime
    ));
  }

  private List<MemberVoucherEntity> loadVoucherCandidates(String normalizedEmail) {
    if (normalizedEmail == null) {
      return memberVoucherRepository.findAll(Sort.by(Sort.Direction.DESC, "updatedAt")).stream()
          .filter(voucher -> !voucher.isHiddenForOperations())
          .toList();
    }

    return userAccountRepository.findByEmailIgnoreCase(normalizedEmail)
        .map(UserAccountEntity::getId)
        .map(memberVoucherRepository::findByUserIdOrderByExpiresAtAscCreatedAtDesc)
        .map(vouchers -> vouchers.stream()
            .filter(voucher -> !voucher.isHiddenForOperations())
            .toList())
        .orElse(List.of());
  }

  private UserAccountEntity loadActorAccount(AuthenticatedUser actor) {
    return userAccountRepository.findOneWithRolesById(actor.userId())
        .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản nội bộ đang thao tác."));
  }

  private UserAccountEntity loadMemberAccountByEmail(String email) {
    UserAccountEntity userAccount = userAccountRepository.findOneWithRolesByEmailIgnoreCase(email.trim())
        .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản hội viên theo email đã nhập."));

    boolean isMember = userAccount.getRoles().stream()
        .map(RoleEntity::getCode)
        .anyMatch(RoleCode.MEMBER::equals);

    if (!isMember) {
      throw new BadRequestException("Chỉ có thể cấp voucher cho tài khoản đang là hội viên.");
    }

    return userAccount;
  }

  private void releaseReservedBooking(MemberVoucherEntity voucher, OffsetDateTime currentTime) {
    String linkedBookingCode = voucher.getBookingCode();
    if (linkedBookingCode == null || linkedBookingCode.isBlank()) {
      return;
    }

    bookingRepository.findDetailedByBookingCode(linkedBookingCode)
        .ifPresent(booking -> {
          if (booking.isHold() && linkedBookingCode.equalsIgnoreCase(booking.getBookingCode())) {
            booking.clearAppliedVoucher(currentTime);
          }
        });
  }

  private BackofficeVoucherResponse.VoucherItem mapVoucher(MemberVoucherEntity voucher, UserAccountEntity userAccount) {
    return new BackofficeVoucherResponse.VoucherItem(
        voucher.getId(),
        voucher.getUserId(),
        userAccount == null ? "" : userAccount.getEmail(),
        userAccount == null ? "" : DisplayNamePresentationSupport.present(userAccount.getDisplayName()),
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

  private String normalizeVoucherCode(String voucherCode) {
    String normalizedVoucherCode = normalizeOptional(voucherCode);
    if (normalizedVoucherCode == null) {
      throw new BadRequestException("Mã voucher không được để trống.");
    }
    return normalizedVoucherCode.toUpperCase(Locale.ROOT);
  }

  private String normalizeCurrency(String currency) {
    String normalizedCurrency = normalizeOptional(currency);
    if (normalizedCurrency == null) {
      throw new BadRequestException("Tiền tệ voucher không được để trống.");
    }
    return normalizedCurrency.toUpperCase(Locale.ROOT);
  }

  private String normalizeBackofficeStatus(String status) {
    String normalizedStatus = normalizeStatusFilter(status);
    if (normalizedStatus == null || !ALLOWED_BACKOFFICE_STATUSES.contains(normalizedStatus)) {
      throw new BadRequestException("Trạng thái voucher không hợp lệ cho thao tác vận hành.");
    }
    return normalizedStatus;
  }

  private String normalizeStatusFilter(String status) {
    String normalizedStatus = normalizeOptional(status);
    return normalizedStatus == null ? null : normalizedStatus.trim().toUpperCase(Locale.ROOT);
  }

  private String normalizeOptional(String value) {
    if (value == null) {
      return null;
    }
    String normalizedValue = value.trim();
    return normalizedValue.isEmpty() ? null : normalizedValue;
  }

  private String stringifyValue(String value) {
    return value == null || value.isBlank() ? "trống" : value;
  }

  private String stringifyDate(OffsetDateTime value) {
    return value == null ? "trống" : value.toString();
  }
}
