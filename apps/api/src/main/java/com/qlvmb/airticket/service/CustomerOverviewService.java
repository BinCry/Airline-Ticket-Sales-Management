package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.CustomerOverviewResponse;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.MemberLoyaltyAccountEntity;
import com.qlvmb.airticket.domain.entity.NotificationOutboxEntity;
import com.qlvmb.airticket.domain.entity.RoleEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.MemberLoyaltyAccountRepository;
import com.qlvmb.airticket.repository.NotificationOutboxRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.RoleCode;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerOverviewService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final UserAccountRepository userAccountRepository;
  private final BookingRepository bookingRepository;
  private final NotificationOutboxRepository notificationOutboxRepository;
  private final MemberLoyaltyAccountRepository memberLoyaltyAccountRepository;

  public CustomerOverviewService(
      UserAccountRepository userAccountRepository,
      BookingRepository bookingRepository,
      NotificationOutboxRepository notificationOutboxRepository,
      MemberLoyaltyAccountRepository memberLoyaltyAccountRepository
  ) {
    this.userAccountRepository = userAccountRepository;
    this.bookingRepository = bookingRepository;
    this.notificationOutboxRepository = notificationOutboxRepository;
    this.memberLoyaltyAccountRepository = memberLoyaltyAccountRepository;
  }

  @Transactional(readOnly = true)
  public CustomerOverviewResponse getOverview(AuthenticatedUser authenticatedUser) {
    UserAccountEntity userAccount = userAccountRepository.findOneWithRolesById(authenticatedUser.userId())
        .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin tài khoản."));

    List<Long> recentBookingIds = bookingRepository.findRecentIdsByContactEmail(
        userAccount.getEmail(),
        PageRequest.of(0, 5)
    );
    List<BookingEntity> recentBookings = recentBookingIds.isEmpty()
        ? List.of()
        : bookingRepository.findAllDetailedByIdIn(recentBookingIds).stream()
            .sorted(Comparator.comparing(BookingEntity::getCreatedAt).reversed())
            .toList();

    MemberLoyaltyAccountEntity loyaltyAccount = hasRole(userAccount.getRoles(), RoleCode.MEMBER)
        ? memberLoyaltyAccountRepository.findByUserId(userAccount.getId()).orElse(null)
        : null;

    return new CustomerOverviewResponse(
        DisplayNamePresentationSupport.present(userAccount.getDisplayName()),
        loyaltyAccount == null ? null : loyaltyAccount.getMembershipTier(),
        loyaltyAccount == null ? 0 : loyaltyAccount.getPointBalance(),
        recentBookings.stream().map(this::formatTripSummary).toList(),
        buildNotifications(userAccount, recentBookings)
    );
  }

  private List<String> buildNotifications(UserAccountEntity userAccount, List<BookingEntity> recentBookings) {
    List<String> outboxNotifications = notificationOutboxRepository
        .findTop5ByRecipientEmailIgnoreCaseOrderByCreatedAtDesc(userAccount.getEmail()).stream()
        .map(this::formatOutboxNotification)
        .toList();

    if (!outboxNotifications.isEmpty()) {
      return outboxNotifications;
    }

    return recentBookings.stream()
        .map(this::formatBookingStatusNotification)
        .limit(3)
        .toList();
  }

  private String formatTripSummary(BookingEntity booking) {
    BookingSegmentEntity firstSegment = booking.getSegments().stream().findFirst().orElse(null);
    if (firstSegment == null) {
      return booking.getBookingCode() + " • Chưa có thông tin chặng bay";
    }

    return "%s • %s → %s • %s".formatted(
        booking.getBookingCode(),
        firstSegment.getOriginCode(),
        firstSegment.getDestinationCode(),
        firstSegment.getDepartureAt().atZoneSameInstant(ZONE_ID).format(DATE_FORMATTER)
    );
  }

  private String formatOutboxNotification(NotificationOutboxEntity outbox) {
    String statusLabel = switch (outbox.getStatus()) {
      case NotificationOutboxEntity.STATUS_SENT -> "đã gửi";
      case NotificationOutboxEntity.STATUS_FAILED -> "gửi lỗi";
      default -> "đang chờ gửi";
    };

    String bookingLabel = outbox.getBookingCode() == null ? "Thông báo" : "Booking " + outbox.getBookingCode();
    return "%s %s email \"%s\".".formatted(bookingLabel, statusLabel, outbox.getSubject());
  }

  private String formatBookingStatusNotification(BookingEntity booking) {
    String bookingLabel = "Booking " + booking.getBookingCode();

    if (BookingEntity.STATUS_TICKETED.equals(booking.getStatus())) {
      return bookingLabel + " đã thanh toán và xuất vé.";
    }

    if (BookingEntity.STATUS_REFUND_PENDING.equals(booking.getStatus())) {
      return bookingLabel + " đang chờ xử lý hoàn vé.";
    }

    if (BookingEntity.PAYMENT_STATUS_PENDING.equals(booking.getPaymentStatus())) {
      return bookingLabel + " đang giữ chỗ và chờ hoàn tất thanh toán.";
    }

    return bookingLabel + " đang được theo dõi trong hồ sơ của bạn.";
  }

  private boolean hasRole(Set<RoleEntity> roles, String roleCode) {
    return roles.stream()
        .map(RoleEntity::getCode)
        .map(code -> code.toLowerCase(Locale.ROOT))
        .anyMatch(roleCode::equals);
  }
}
