package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.UnauthorizedException;
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
class MemberVoucherServiceTest {

  @Mock
  private UserAccountRepository userAccountRepository;

  @Mock
  private MemberVoucherRepository memberVoucherRepository;

  private MemberVoucherService memberVoucherService;

  @BeforeEach
  void setUp() {
    memberVoucherService = new MemberVoucherService(userAccountRepository, memberVoucherRepository);
  }

  @Test
  void applyVoucherToBooking_shouldReserveVoucherAndUpdateBookingTotal() {
    OffsetDateTime currentTime = OffsetDateTime.parse("2026-05-17T10:00:00Z");
    AuthenticatedUser authenticatedUser = new AuthenticatedUser(
        151L,
        "nnn045856@gmail.com",
        "Hoi vien",
        List.of("member"),
        List.of("customer.self_service", "member.loyalty")
    );
    UserAccountEntity memberAccount = createUserAccount(151L, "nnn045856@gmail.com", RoleCode.MEMBER);
    BookingEntity booking = createHeldBooking("QC5004", "nnn045856@gmail.com", 1490000L, 200000L, currentTime);
    MemberVoucherEntity voucher = createVoucher(
        151L,
        "MEM52026",
        180000L,
        MemberVoucherEntity.STATUS_AVAILABLE,
        currentTime.plusDays(5),
        null
    );

    when(userAccountRepository.findOneWithRolesById(151L)).thenReturn(Optional.of(memberAccount));
    when(memberVoucherRepository.findByVoucherCodeIgnoreCaseAndUserId("MEM52026", 151L))
        .thenReturn(Optional.of(voucher));

    memberVoucherService.applyVoucherToBooking(authenticatedUser, booking, "mem52026", currentTime);

    assertThat(booking.getAppliedVoucherCode()).isEqualTo("MEM52026");
    assertThat(booking.getDiscountAmount()).isEqualTo(180000L);
    assertThat(booking.getTotalAmount()).isEqualTo(1510000L);
    assertThat(voucher.getStatus()).isEqualTo(MemberVoucherEntity.STATUS_RESERVED);
    assertThat(voucher.getBookingCode()).isEqualTo("QC5004");
  }

  @Test
  void finalizeVoucherForBooking_shouldMarkVoucherUsed() {
    OffsetDateTime currentTime = OffsetDateTime.parse("2026-05-17T10:00:00Z");
    BookingEntity booking = createHeldBooking("QC5004", "nnn045856@gmail.com", 1490000L, 0L, currentTime);
    MemberVoucherEntity voucher = createVoucher(
        151L,
        "MEM52026",
        120000L,
        MemberVoucherEntity.STATUS_RESERVED,
        currentTime.plusDays(5),
        "QC5004"
    );

    booking.applyVoucher("MEM52026", 120000L, currentTime);
    when(memberVoucherRepository.findByVoucherCodeIgnoreCase("MEM52026")).thenReturn(Optional.of(voucher));

    memberVoucherService.finalizeVoucherForBooking(booking, currentTime.plusMinutes(3));

    assertThat(voucher.getStatus()).isEqualTo(MemberVoucherEntity.STATUS_USED);
    assertThat(voucher.getUsedAt()).isEqualTo(currentTime.plusMinutes(3));
  }

  @Test
  void cancelVoucherForBooking_shouldReleaseVoucherAndUpdateBookingTotal() {
    OffsetDateTime currentTime = OffsetDateTime.parse("2026-05-17T10:00:00Z");
    AuthenticatedUser authenticatedUser = new AuthenticatedUser(
        151L,
        "nnn045856@gmail.com",
        "Hoi vien",
        List.of("member"),
        List.of("customer.self_service", "member.loyalty")
    );
    UserAccountEntity memberAccount = createUserAccount(151L, "nnn045856@gmail.com", RoleCode.MEMBER);
    BookingEntity booking = createHeldBooking("QC5004", "nnn045856@gmail.com", 1490000L, 200000L, currentTime);
    MemberVoucherEntity voucher = createVoucher(
        151L,
        "MEM52026",
        180000L,
        MemberVoucherEntity.STATUS_RESERVED,
        currentTime.plusDays(5),
        "QC5004"
    );
    booking.applyVoucher("MEM52026", 180000L, currentTime);

    when(userAccountRepository.findOneWithRolesById(151L)).thenReturn(Optional.of(memberAccount));
    when(memberVoucherRepository.findByVoucherCodeIgnoreCase("MEM52026")).thenReturn(Optional.of(voucher));

    memberVoucherService.cancelVoucherForBooking(authenticatedUser, booking, currentTime.plusMinutes(2));

    assertThat(booking.getAppliedVoucherCode()).isNull();
    assertThat(booking.getDiscountAmount()).isZero();
    assertThat(booking.getTotalAmount()).isEqualTo(1690000L);
    assertThat(voucher.getStatus()).isEqualTo(MemberVoucherEntity.STATUS_AVAILABLE);
    assertThat(voucher.getBookingCode()).isNull();
  }

  @Test
  void applyVoucherToBooking_shouldRejectCustomerRole() {
    OffsetDateTime currentTime = OffsetDateTime.parse("2026-05-17T10:00:00Z");
    AuthenticatedUser authenticatedUser = new AuthenticatedUser(
        101L,
        "quanpm2006git@gmail.com",
        "Khach hang",
        List.of("customer"),
        List.of("customer.self_service")
    );
    UserAccountEntity customerAccount = createUserAccount(101L, "quanpm2006git@gmail.com", RoleCode.CUSTOMER);
    BookingEntity booking = createHeldBooking("QC5004", "quanpm2006git@gmail.com", 1490000L, 0L, currentTime);

    when(userAccountRepository.findOneWithRolesById(101L)).thenReturn(Optional.of(customerAccount));

    assertThatThrownBy(() ->
        memberVoucherService.applyVoucherToBooking(authenticatedUser, booking, "MEM52026", currentTime)
    )
        .isInstanceOf(UnauthorizedException.class)
        .hasMessage("Tài khoản hiện tại chưa được kích hoạt quyền hội viên.");
  }

  private BookingEntity createHeldBooking(
      String bookingCode,
      String contactEmail,
      long baseAmount,
      long ancillaryAmount,
      OffsetDateTime createdAt
  ) {
    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        "one_way",
        baseAmount,
        ancillaryAmount,
        baseAmount + ancillaryAmount,
        "VND",
        createdAt,
        createdAt.plusMinutes(15)
    );
    booking.assignContact(BookingContactEntity.create(
        booking,
        "Nguoi dung thu nghiem",
        contactEmail,
        "0912345678"
    ));
    return booking;
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
      long userId,
      String voucherCode,
      long discountAmount,
      String status,
      OffsetDateTime expiresAt,
      String bookingCode
  ) {
    MemberVoucherEntity voucher = BeanUtils.instantiateClass(MemberVoucherEntity.class);
    ReflectionTestUtils.setField(voucher, "userId", userId);
    ReflectionTestUtils.setField(voucher, "voucherCode", voucherCode);
    ReflectionTestUtils.setField(voucher, "title", "Voucher thu nghiem");
    ReflectionTestUtils.setField(voucher, "description", "Giam gia thu nghiem");
    ReflectionTestUtils.setField(voucher, "discountAmount", discountAmount);
    ReflectionTestUtils.setField(voucher, "currency", "VND");
    ReflectionTestUtils.setField(voucher, "status", status);
    ReflectionTestUtils.setField(voucher, "expiresAt", expiresAt);
    ReflectionTestUtils.setField(voucher, "bookingCode", bookingCode);
    ReflectionTestUtils.setField(voucher, "createdAt", expiresAt.minusDays(5));
    ReflectionTestUtils.setField(voucher, "updatedAt", expiresAt.minusDays(1));
    return voucher;
  }
}
