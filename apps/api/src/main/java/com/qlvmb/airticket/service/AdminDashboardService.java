package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.AdminDashboardResponse;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.NotificationOutboxEntity;
import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BookingRepository;
import com.qlvmb.airticket.repository.NotificationOutboxRepository;
import com.qlvmb.airticket.repository.RefundRequestRepository;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDashboardService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final DateTimeFormatter DATE_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("dd/MM HH:mm");

  private final BookingRepository bookingRepository;
  private final RefundRequestRepository refundRequestRepository;
  private final NotificationOutboxRepository notificationOutboxRepository;
  private final AuditLogRepository auditLogRepository;

  public AdminDashboardService(
      BookingRepository bookingRepository,
      RefundRequestRepository refundRequestRepository,
      NotificationOutboxRepository notificationOutboxRepository,
      AuditLogRepository auditLogRepository
  ) {
    this.bookingRepository = bookingRepository;
    this.refundRequestRepository = refundRequestRepository;
    this.notificationOutboxRepository = notificationOutboxRepository;
    this.auditLogRepository = auditLogRepository;
  }

  @Transactional(readOnly = true)
  public AdminDashboardResponse getDashboard() {
    return new AdminDashboardResponse(
        List.of(
            new AdminDashboardResponse.MetricCard(
                "\u0110\u1eb7t ch\u1ed7 ch\u1edd thanh to\u00e1n",
                String.valueOf(bookingRepository.countByPaymentStatus(BookingEntity.PAYMENT_STATUS_PENDING)),
                "C\u1ea7n theo d\u00f5i \u0111\u1ec3 tr\u00e1nh qu\u00e1 h\u1ea1n gi\u1eef ch\u1ed7."
            ),
            new AdminDashboardResponse.MetricCard(
                "Booking \u0111\u00e3 xu\u1ea5t v\u00e9",
                String.valueOf(bookingRepository.countByStatus(BookingEntity.STATUS_TICKETED)),
                "Bao g\u1ed3m c\u00e1c m\u00e3 \u0111\u00e3 thanh to\u00e1n v\u00e0 ph\u00e1t h\u00e0nh v\u00e9."
            ),
            new AdminDashboardResponse.MetricCard(
                "Ho\u00e0n v\u00e9 ch\u1edd duy\u1ec7t",
                String.valueOf(refundRequestRepository.countByStatus(RefundRequestEntity.STATUS_PENDING)),
                "\u01afu ti\u00ean ki\u1ec3m tra c\u00e1c y\u00eau c\u1ea7u m\u1edbi ph\u00e1t sinh."
            ),
            new AdminDashboardResponse.MetricCard(
                "Email l\u1ed7i c\u1ea7n x\u1eed l\u00fd",
                String.valueOf(notificationOutboxRepository.countByStatus(NotificationOutboxEntity.STATUS_FAILED)),
                "Nh\u00e2n s\u1ef1 h\u1ed7 tr\u1ee3 c\u00f3 th\u1ec3 g\u1eedi l\u1ea1i t\u1eeb ph\u00e2n h\u1ec7 support."
            )
        ),
        buildModuleCards(),
        auditLogRepository.findTop8ByHiddenAtIsNullOrderByCreatedAtDesc().stream()
            .map(this::toAuditCard)
            .toList()
    );
  }

  @Transactional
  public void deleteAuditLog(Long auditLogId) {
    AuditLogEntity auditLog = auditLogRepository.findByIdAndHiddenAtIsNull(auditLogId)
        .orElseThrow(() -> new NotFoundException("Kh\u00f4ng t\u00ecm th\u1ea5y nh\u1eadt k\u00fd thao t\u00e1c c\u1ea7n x\u00f3a."));
    auditLog.hideFromUi(OffsetDateTime.now());
  }

  private List<AdminDashboardResponse.ModuleCard> buildModuleCards() {
    return List.of(
        new AdminDashboardResponse.ModuleCard(
            "sales",
            "B\u00e1n v\u00e9 n\u1ed9i b\u1ed9",
            "Tra c\u1ee9u \u0111\u1eb7t ch\u1ed7, theo d\u00f5i thanh to\u00e1n v\u00e0 m\u1edf nhanh h\u1ed3 s\u01a1 booking.",
            List.of("customer_support")
        ),
        new AdminDashboardResponse.ModuleCard(
            "support",
            "Ch\u0103m s\u00f3c kh\u00e1ch h\u00e0ng",
            "Theo d\u00f5i email v\u00e9 l\u1ed7i v\u00e0 x\u1eed l\u00fd l\u1ea1i c\u00e1c th\u00f4ng b\u00e1o ch\u01b0a g\u1eedi \u0111\u01b0\u1ee3c.",
            List.of("customer_support")
        ),
        new AdminDashboardResponse.ModuleCard(
            "finance",
            "\u0110\u1ed1i so\u00e1t v\u00e0 ho\u00e0n ti\u1ec1n",
            "Duy\u1ec7t ho\u00e0n v\u00e9 v\u00e0 ki\u1ec3m tra c\u00e1c y\u00eau c\u1ea7u \u0111ang ch\u1edd x\u1eed l\u00fd.",
            List.of("customer_support")
        ),
        new AdminDashboardResponse.ModuleCard(
            "cms",
            "N\u1ed9i dung c\u00f4ng khai",
            "R\u00e0 so\u00e1t n\u1ed9i dung \u0111ang ph\u00e1t h\u00e0nh tr\u00ean c\u00e1c m\u00e0n c\u00f4ng khai v\u00e0 trung t\u00e2m h\u1ed7 tr\u1ee3.",
            List.of("customer_support")
        ),
        new AdminDashboardResponse.ModuleCard(
            "operations",
            "\u0110i\u1ec1u h\u00e0nh chuy\u1ebfn bay",
            "Theo d\u00f5i chuy\u1ebfn bay, tr\u1ea1ng th\u00e1i khai th\u00e1c v\u00e0 d\u1eef li\u1ec7u b\u00e1n gh\u1ebf.",
            List.of("operations_staff")
        ),
        new AdminDashboardResponse.ModuleCard(
            "admin",
            "Qu\u1ea3n tr\u1ecb h\u1ec7 th\u1ed1ng",
            "Theo d\u00f5i ch\u1ec9 s\u1ed1 v\u1eadn h\u00e0nh, role v\u00e0 tr\u1ea1ng th\u00e1i t\u00e0i kho\u1ea3n n\u1ed9i b\u1ed9.",
            List.of("operations_staff")
        )
    );
  }

  private AdminDashboardResponse.AuditCard toAuditCard(AuditLogEntity auditLog) {
    UserAccountEntity actor = auditLog.getActorUserAccount();
    String actorLabel = actor == null ? "H\u1ec7 th\u1ed1ng" : actor.getEmail();

    return new AdminDashboardResponse.AuditCard(
        auditLog.getId(),
        actorLabel,
        auditLog.getAction(),
        auditLog.getDetail(),
        auditLog.getCreatedAt().atZoneSameInstant(ZONE_ID).format(DATE_TIME_FORMATTER)
    );
  }
}
