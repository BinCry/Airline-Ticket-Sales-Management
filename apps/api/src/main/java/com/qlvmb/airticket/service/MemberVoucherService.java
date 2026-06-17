package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.repository.MemberVoucherRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.RoleCode;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class MemberVoucherService {

  private static final String MEMBER_ACCOUNT_NOT_FOUND_MESSAGE =
      "Không tìm thấy thông tin tài khoản hội viên.";
  private static final String MEMBER_ROLE_REQUIRED_MESSAGE =
      "Tài khoản hiện tại chưa được kích hoạt quyền hội viên.";
  private static final String BOOKING_OWNER_MISMATCH_MESSAGE =
      "Voucher chỉ áp dụng cho booking thuộc đúng tài khoản hội viên đang đăng nhập.";
  private static final String BOOKING_NOT_ELIGIBLE_MESSAGE =
      "Chỉ có thể áp voucher khi booking còn trong thời gian giữ chỗ.";
  private static final String VOUCHER_NOT_FOUND_MESSAGE =
      "Không tìm thấy voucher tương ứng với mã đã nhập.";
  private static final String VOUCHER_UNAVAILABLE_MESSAGE =
      "Voucher hiện không còn khả dụng cho booking này.";
  private static final String VOUCHER_EXPIRED_MESSAGE =
      "Voucher đã hết hạn và không thể tiếp tục sử dụng.";

  private final UserAccountRepository userAccountRepository;
  private final MemberVoucherRepository memberVoucherRepository;

  public MemberVoucherService(
      UserAccountRepository userAccountRepository,
      MemberVoucherRepository memberVoucherRepository
  ) {
    this.userAccountRepository = userAccountRepository;
    this.memberVoucherRepository = memberVoucherRepository;
  }

  public void applyVoucherToBooking(
      AuthenticatedUser authenticatedUser,
      BookingEntity booking,
      String voucherCode,
      OffsetDateTime currentTime
  ) {
    if (!booking.isHold()) {
      throw new BadRequestException(BOOKING_NOT_ELIGIBLE_MESSAGE);
    }

    BookingContactEntity contact = booking.getContact();
    if (contact == null) {
      throw new BadRequestException(BOOKING_OWNER_MISMATCH_MESSAGE);
    }

    UserAccountEntity memberAccount = loadMemberAccount(authenticatedUser);
    if (!contact.getEmail().equalsIgnoreCase(memberAccount.getEmail())) {
      throw new BadRequestException(BOOKING_OWNER_MISMATCH_MESSAGE);
    }

    String normalizedVoucherCode = normalizeVoucherCode(voucherCode);
    if (booking.getAppliedVoucherCode() != null
        && !booking.getAppliedVoucherCode().equalsIgnoreCase(normalizedVoucherCode)) {
      releaseVoucherForBooking(booking, currentTime);
    }

    MemberVoucherEntity voucher = memberVoucherRepository
        .findByVoucherCodeIgnoreCaseAndUserId(normalizedVoucherCode, memberAccount.getId())
        .orElseThrow(() -> new NotFoundException(VOUCHER_NOT_FOUND_MESSAGE));

    if (voucher.isExpired(currentTime)) {
      voucher.markExpired(currentTime);
      throw new BadRequestException(VOUCHER_EXPIRED_MESSAGE);
    }

    if (voucher.isReservedForBooking(booking.getBookingCode())) {
      booking.applyVoucher(
          voucher.getVoucherCode(),
          resolveDiscountAmount(booking, voucher),
          currentTime
      );
      return;
    }

    if (!voucher.isAvailable()) {
      throw new BadRequestException(VOUCHER_UNAVAILABLE_MESSAGE);
    }

    voucher.reserveForBooking(booking.getBookingCode(), currentTime);
    booking.applyVoucher(
        voucher.getVoucherCode(),
        resolveDiscountAmount(booking, voucher),
        currentTime
    );
  }

  public void removeVoucherFromBooking(
      AuthenticatedUser authenticatedUser,
      BookingEntity booking,
      OffsetDateTime currentTime
  ) {
    if (!booking.isHold()) {
      throw new BadRequestException(BOOKING_NOT_ELIGIBLE_MESSAGE);
    }

    BookingContactEntity contact = booking.getContact();
    if (contact == null) {
      throw new BadRequestException(BOOKING_OWNER_MISMATCH_MESSAGE);
    }

    UserAccountEntity memberAccount = loadMemberAccount(authenticatedUser);
    if (!contact.getEmail().equalsIgnoreCase(memberAccount.getEmail())) {
      throw new BadRequestException(BOOKING_OWNER_MISMATCH_MESSAGE);
    }

    releaseVoucherForBooking(booking, currentTime);
  }

  public void releaseVoucherForBooking(BookingEntity booking, OffsetDateTime currentTime) {
    if (booking.getAppliedVoucherCode() == null || booking.getBookingCode() == null) {
      return;
    }

    memberVoucherRepository.findByVoucherCodeIgnoreCase(booking.getAppliedVoucherCode())
        .ifPresent(voucher -> {
          if (voucher.isReservedForBooking(booking.getBookingCode())) {
            voucher.releaseReservation(currentTime);
          }
        });

    booking.clearAppliedVoucher(currentTime);
  }

  public void finalizeVoucherForBooking(BookingEntity booking, OffsetDateTime currentTime) {
    if (booking.getAppliedVoucherCode() == null || booking.getBookingCode() == null) {
      return;
    }

    memberVoucherRepository.findByVoucherCodeIgnoreCase(booking.getAppliedVoucherCode())
        .ifPresent(voucher -> {
          if (voucher.belongsToBooking(booking.getBookingCode())) {
            voucher.markUsed(booking.getBookingCode(), currentTime);
          }
        });
  }

  private UserAccountEntity loadMemberAccount(AuthenticatedUser authenticatedUser) {
    UserAccountEntity userAccount = userAccountRepository.findOneWithRolesById(authenticatedUser.userId())
        .orElseThrow(() -> new UnauthorizedException(MEMBER_ACCOUNT_NOT_FOUND_MESSAGE));

    if (!hasRole(userAccount.getRoles(), RoleCode.MEMBER)) {
      throw new UnauthorizedException(MEMBER_ROLE_REQUIRED_MESSAGE);
    }

    return userAccount;
  }

  private boolean hasRole(Set<RoleEntity> roles, String roleCode) {
    return roles.stream()
        .map(RoleEntity::getCode)
        .map(code -> code.toLowerCase(Locale.ROOT))
        .anyMatch(roleCode::equals);
  }

  private String normalizeVoucherCode(String voucherCode) {
    if (voucherCode == null || voucherCode.isBlank()) {
      throw new BadRequestException(VOUCHER_NOT_FOUND_MESSAGE);
    }

    return voucherCode.trim().toUpperCase(Locale.ROOT);
  }

  private long resolveDiscountAmount(BookingEntity booking, MemberVoucherEntity voucher) {
    long subtotalAmount = booking.getBaseAmount() + booking.getAncillaryAmount();
    return Math.min(subtotalAmount, voucher.getDiscountAmount());
  }
}
