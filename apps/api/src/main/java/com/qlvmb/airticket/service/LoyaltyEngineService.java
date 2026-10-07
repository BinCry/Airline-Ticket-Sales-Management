package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import com.qlvmb.airticket.domain.entity.LoyaltyTierRuleEntity;
import com.qlvmb.airticket.domain.entity.MemberLoyaltyAccountEntity;
import com.qlvmb.airticket.domain.entity.MemberLoyaltyLedgerEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.BookingSegmentRepository;
import com.qlvmb.airticket.repository.LoyaltyTierRuleRepository;
import com.qlvmb.airticket.repository.MemberLoyaltyAccountRepository;
import com.qlvmb.airticket.repository.MemberLoyaltyLedgerRepository;
import com.qlvmb.airticket.repository.TicketRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.RoleCode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoyaltyEngineService {
  private final BookingSegmentRepository segments;
  private final TicketRepository tickets;
  private final UserAccountRepository users;
  private final MemberLoyaltyAccountRepository accounts;
  private final MemberLoyaltyLedgerRepository ledger;
  private final LoyaltyTierRuleRepository tiers;
  private final AuditLogRepository audit;
  private final NotificationOutboxService notifications;

  public LoyaltyEngineService(
      BookingSegmentRepository segments, TicketRepository tickets, UserAccountRepository users,
      MemberLoyaltyAccountRepository accounts, MemberLoyaltyLedgerRepository ledger,
      LoyaltyTierRuleRepository tiers, AuditLogRepository audit, NotificationOutboxService notifications
  ) {
    this.segments = segments;
    this.tickets = tickets;
    this.users = users;
    this.accounts = accounts;
    this.ledger = ledger;
    this.tiers = tiers;
    this.audit = audit;
    this.notifications = notifications;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public void processSegment(Long segmentId) {
    BookingSegmentEntity segment = segments.findById(segmentId).orElse(null);
    if (segment == null || !"landed".equals(segment.getInventory().getFlight().getStatus())) {
      return;
    }
    BookingEntity booking = segment.getBooking();
    if (booking.getMemberUserId() == null
        || !BookingEntity.PAYMENT_STATUS_PAID.equals(booking.getPaymentStatus())
        || !(booking.isTicketed() || booking.isRefundPending())) {
      return;
    }
    UserAccountEntity member = users.findOneWithRolesById(booking.getMemberUserId()).orElse(null);
    if (member == null || member.getRoles().stream()
        .noneMatch(role -> RoleCode.MEMBER.equalsIgnoreCase(role.getCode()))) {
      return;
    }
    long validTickets = tickets.countBySegmentIdAndStatusNot(segmentId, TicketEntity.STATUS_CANCELLED);
    if (validTickets == 0) {
      return;
    }
    int points = calculatePoints(segment.getPricePerPassenger(), validTickets);
    var rules = tiers.findAllByOrderBySortOrderAsc();
    LoyaltyTierRuleEntity baseTier = rules.stream().filter(LoyaltyTierRuleEntity::isActive)
        .filter(rule -> rule.getMinLifetimePoints() == 0).findFirst()
        .orElseThrow(() -> new IllegalStateException("Thiếu quy tắc hạng hội viên mặc định."));

    accounts.initializeIfMissing(member.getId(), baseTier.getTierName());
    MemberLoyaltyAccountEntity account = accounts.lockByUserId(member.getId()).orElseThrow();
    if (ledger.existsByLoyaltyAccountIdAndBookingSegmentIdAndEntryType(
        account.getId(), segmentId, MemberLoyaltyLedgerEntity.FLIGHT_EARN)) {
      return;
    }
    OffsetDateTime now = OffsetDateTime.now();
    account.earnPoints(points, now);
    String description = "Hoàn tất chuyến " + segment.getFlightCode() + " - "
        + segment.getOriginCode() + " → " + segment.getDestinationCode();
    ledger.save(MemberLoyaltyLedgerEntity.create(account.getId(), segmentId,
        MemberLoyaltyLedgerEntity.FLIGHT_EARN, points, account.getPointBalance(),
        booking.getBookingCode(), description, now));

    int currentOrder = rules.stream()
        .filter(rule -> rule.getTierName().equals(account.getMembershipTier()))
        .mapToInt(LoyaltyTierRuleEntity::getSortOrder).findFirst().orElse(Integer.MAX_VALUE);
    LoyaltyTierRuleEntity earnedTier = rules.stream().filter(LoyaltyTierRuleEntity::isActive)
        .filter(rule -> rule.getMinLifetimePoints() <= account.getLifetimePoints())
        .max(Comparator.comparingInt(LoyaltyTierRuleEntity::getSortOrder)).orElse(baseTier);
    if (earnedTier.getSortOrder() > currentOrder) {
      String tierChange = account.getMembershipTier() + " → " + earnedTier.getTierName();
      account.upgradeTier(earnedTier.getTierName(), now);
      ledger.save(MemberLoyaltyLedgerEntity.create(account.getId(), segmentId,
          MemberLoyaltyLedgerEntity.TIER_UPGRADE, 0, account.getPointBalance(),
          booking.getBookingCode(), tierChange, now));
      audit.save(AuditLogEntity.create(null, "member.loyalty.tier_upgrade", "member_loyalty_account",
          account.getId().toString(), "Tự động nâng hạng: " + tierChange, now));
      notifications.createAndSendLoyaltyTierUpgradeEmail(member.getEmail(), booking.getBookingCode(), tierChange);
    }
  }

  static int calculatePoints(long pricePerPassenger, long validTickets) {
    if (pricePerPassenger < 0 || validTickets < 0) {
      throw new IllegalArgumentException("Giá vé và số vé hợp lệ không được âm.");
    }
    return Math.toIntExact(Math.multiplyExact(pricePerPassenger, validTickets) / 1000);
  }
}
