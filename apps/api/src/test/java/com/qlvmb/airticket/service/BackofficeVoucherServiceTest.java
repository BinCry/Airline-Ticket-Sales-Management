package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.BackofficeVoucherCreateRequest;
import com.qlvmb.airticket.domain.dto.BackofficeVoucherResponse;
import com.qlvmb.airticket.domain.dto.BackofficeVoucherUpdateRequest;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BookingRepository;
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
class BackofficeVoucherServiceTest {

  @Mock
  private MemberVoucherRepository memberVoucherRepository;

  @Mock
  private UserAccountRepository userAccountRepository;

  @Mock
  private BookingRepository bookingRepository;

  @Mock
  private AuditLogRepository auditLogRepository;

  private BackofficeVoucherService backofficeVoucherService;

  @BeforeEach
  void setUp() {
    backofficeVoucherService = new BackofficeVoucherService(
        memberVoucherRepository,
        userAccountRepository,
        bookingRepository,
        auditLogRepository
    );
  }

  @Test
  void createVoucher_shouldCreateVoucherForMember() {
    OffsetDateTime expiresAt = OffsetDateTime.parse("2026-06-05T03:00:00Z");
    UserAccountEntity actorAccount = createUserAccount(301L, "bincry2006@gmail.com", RoleCode.OPERATIONS_STAFF);
    UserAccountEntity memberAccount = createUserAccount(151L, "nnn045856@gmail.com", RoleCode.MEMBER);

    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount));
    when(userAccountRepository.findOneWithRolesByEmailIgnoreCase("nnn045856@gmail.com"))
        .thenReturn(Optional.of(memberAccount));
    when(memberVoucherRepository.findByVoucherCodeIgnoreCase("OPS52026")).thenReturn(Optional.empty());
    when(auditLogRepository.save(any(AuditLogEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BackofficeVoucherResponse.VoucherItem item = backofficeVoucherService.createVoucher(
        actor(),
        new BackofficeVoucherCreateRequest(
            "nnn045856@gmail.com",
            "OPS52026",
            "Bu cham chuyen",
            "Giam gia cho hoi vien bi anh huong chuyen bay.",
            180000L,
            "VND",
            expiresAt
        )
    );

    assertThat(item.memberEmail()).isEqualTo("nnn045856@gmail.com");
    assertThat(item.voucherCode()).isEqualTo("OPS52026");
    assertThat(item.discountAmount()).isEqualTo(180000L);
    assertThat(item.status()).isEqualTo(MemberVoucherEntity.STATUS_AVAILABLE);
    verify(memberVoucherRepository).save(any(MemberVoucherEntity.class));
    verify(auditLogRepository).save(any(AuditLogEntity.class));
  }

  @Test
  void createVoucher_shouldRejectCustomerAccount() {
    UserAccountEntity actorAccount = createUserAccount(301L, "bincry2006@gmail.com", RoleCode.OPERATIONS_STAFF);
    UserAccountEntity customerAccount = createUserAccount(101L, "quanpm2006git@gmail.com", RoleCode.CUSTOMER);

    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount));
    when(userAccountRepository.findOneWithRolesByEmailIgnoreCase("quanpm2006git@gmail.com"))
        .thenReturn(Optional.of(customerAccount));

    assertThatThrownBy(() -> backofficeVoucherService.createVoucher(
        actor(),
        new BackofficeVoucherCreateRequest(
            "quanpm2006git@gmail.com",
            "OPS52026",
            "Bu cham chuyen",
            "Giam gia cho hoi vien bi anh huong chuyen bay.",
            180000L,
            "VND",
            OffsetDateTime.parse("2026-06-05T03:00:00Z")
        )
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Chỉ có thể cấp voucher cho tài khoản đang là hội viên.");
  }

  @Test
  void updateVoucher_shouldRejectReservedVoucherBeforeChangingStatus() {
    OffsetDateTime currentTime = OffsetDateTime.parse("2026-05-17T10:00:00Z");
    UserAccountEntity actorAccount = createUserAccount(301L, "bincry2006@gmail.com", RoleCode.OPERATIONS_STAFF);
    UserAccountEntity memberAccount = createUserAccount(151L, "nnn045856@gmail.com", RoleCode.MEMBER);
    MemberVoucherEntity voucher = createVoucher(
        5L,
        151L,
        "OPS52026",
        "Bu cham chuyen",
        "Giam gia cho hoi vien bi anh huong chuyen bay.",
        180000L,
        MemberVoucherEntity.STATUS_RESERVED,
        OffsetDateTime.parse("2026-06-05T03:00:00Z"),
        "QC5004"
    );
    BookingEntity booking = createHeldBooking("QC5004", "nnn045856@gmail.com", currentTime);
    booking.applyVoucher("OPS52026", 180000L, currentTime);

    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount));
    when(memberVoucherRepository.findById(5L)).thenReturn(Optional.of(voucher));
    when(userAccountRepository.findById(151L)).thenReturn(Optional.of(memberAccount));

    assertThatThrownBy(() -> backofficeVoucherService.updateVoucher(
        actor(),
        5L,
        new BackofficeVoucherUpdateRequest(
            "Gia han ho tro",
            "Giu quyen loi cho hoi vien bi anh huong.",
            220000L,
            "VND",
            "expired",
            OffsetDateTime.parse("2026-06-10T03:00:00Z")
        )
    ))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Voucher đang được giữ cho một booking, vui lòng thu hồi rõ ràng trước khi chỉnh sửa.");

    assertThat(booking.getAppliedVoucherCode()).isEqualTo("OPS52026");
    assertThat(booking.getDiscountAmount()).isEqualTo(180000L);
    assertThat(voucher.getBookingCode()).isEqualTo("QC5004");
  }

  @Test
  void revokeVoucher_shouldRejectUsedVoucher() {
    UserAccountEntity actorAccount = createUserAccount(301L, "bincry2006@gmail.com", RoleCode.OPERATIONS_STAFF);
    UserAccountEntity memberAccount = createUserAccount(151L, "nnn045856@gmail.com", RoleCode.MEMBER);
    MemberVoucherEntity voucher = createVoucher(
        5L,
        151L,
        "OPS52026",
        "Bu cham chuyen",
        "Giam gia cho hoi vien bi anh huong chuyen bay.",
        180000L,
        MemberVoucherEntity.STATUS_USED,
        OffsetDateTime.parse("2026-06-05T03:00:00Z"),
        "QC5004"
    );

    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount));
    when(memberVoucherRepository.findById(5L)).thenReturn(Optional.of(voucher));
    when(userAccountRepository.findById(151L)).thenReturn(Optional.of(memberAccount));

    assertThatThrownBy(() -> backofficeVoucherService.revokeVoucher(actor(), 5L))
        .isInstanceOf(BadRequestException.class)
        .hasMessage("Voucher đã sử dụng không thể thu hồi.");
  }

  @Test
  void hideVoucherFromOperations_shouldHideUsedVoucherOnlyInOperationsList() {
    UserAccountEntity actorAccount = createUserAccount(301L, "bincry2006@gmail.com", RoleCode.OPERATIONS_STAFF);
    UserAccountEntity memberAccount = createUserAccount(151L, "nnn045856@gmail.com", RoleCode.MEMBER);
    MemberVoucherEntity voucher = createVoucher(
        5L,
        151L,
        "SPRINGUSED",
        "Uu dai da dung",
        "Voucher da dung de kiem tra an lich su.",
        150000L,
        MemberVoucherEntity.STATUS_USED,
        OffsetDateTime.parse("2026-04-10T16:59:00Z"),
        "QC5004"
    );

    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount));
    when(memberVoucherRepository.findById(5L)).thenReturn(Optional.of(voucher));
    when(userAccountRepository.findById(151L)).thenReturn(Optional.of(memberAccount));
    when(auditLogRepository.save(any(AuditLogEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    backofficeVoucherService.hideVoucherFromOperations(actor(), 5L);

    assertThat(voucher.isHiddenForOperations()).isTrue();
    assertThat(voucher.isHiddenForMember()).isFalse();
    verify(auditLogRepository).save(any(AuditLogEntity.class));
  }

  @Test
  void hideVoucherFromOperations_shouldHideRevokedVoucher() {
    UserAccountEntity actorAccount = createUserAccount(301L, "bincry2006@gmail.com", RoleCode.OPERATIONS_STAFF);
    UserAccountEntity memberAccount = createUserAccount(151L, "nnn045856@gmail.com", RoleCode.MEMBER);
    MemberVoucherEntity voucher = createVoucher(
        5L,
        151L,
        "OPS52026",
        "Bu cham chuyen",
        "Voucher da thu hoi.",
        180000L,
        MemberVoucherEntity.STATUS_REVOKED,
        OffsetDateTime.parse("2026-06-05T03:00:00Z"),
        null
    );

    when(userAccountRepository.findOneWithRolesById(301L)).thenReturn(Optional.of(actorAccount));
    when(memberVoucherRepository.findById(5L)).thenReturn(Optional.of(voucher));
    when(userAccountRepository.findById(151L)).thenReturn(Optional.of(memberAccount));
    when(auditLogRepository.save(any(AuditLogEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

    backofficeVoucherService.hideVoucherFromOperations(actor(), 5L);

    assertThat(voucher.isHiddenForOperations()).isTrue();
    verify(auditLogRepository).save(any(AuditLogEntity.class));
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
      long voucherId,
      long userId,
      String voucherCode,
      String title,
      String description,
      long discountAmount,
      String status,
      OffsetDateTime expiresAt,
      String bookingCode
  ) {
    MemberVoucherEntity voucher = BeanUtils.instantiateClass(MemberVoucherEntity.class);
    ReflectionTestUtils.setField(voucher, "id", voucherId);
    ReflectionTestUtils.setField(voucher, "userId", userId);
    ReflectionTestUtils.setField(voucher, "voucherCode", voucherCode);
    ReflectionTestUtils.setField(voucher, "title", title);
    ReflectionTestUtils.setField(voucher, "description", description);
    ReflectionTestUtils.setField(voucher, "discountAmount", discountAmount);
    ReflectionTestUtils.setField(voucher, "currency", "VND");
    ReflectionTestUtils.setField(voucher, "status", status);
    ReflectionTestUtils.setField(voucher, "expiresAt", expiresAt);
    ReflectionTestUtils.setField(voucher, "bookingCode", bookingCode);
    ReflectionTestUtils.setField(voucher, "createdAt", expiresAt.minusDays(5));
    ReflectionTestUtils.setField(voucher, "updatedAt", expiresAt.minusDays(1));
    return voucher;
  }

  private BookingEntity createHeldBooking(String bookingCode, String contactEmail, OffsetDateTime currentTime) {
    BookingEntity booking = BookingEntity.createHold(
        bookingCode,
        "one_way",
        1490000L,
        200000L,
        1690000L,
        "VND",
        currentTime,
        currentTime.plusMinutes(15)
    );
    booking.assignContact(BookingContactEntity.create(
        booking,
        "Hoi vien",
        contactEmail,
        "0912345678"
    ));
    return booking;
  }
}
