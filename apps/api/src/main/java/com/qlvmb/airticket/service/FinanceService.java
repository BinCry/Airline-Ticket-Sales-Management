package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.FinanceRefundItem;
import com.qlvmb.airticket.domain.entity.BookingContactEntity;
import com.qlvmb.airticket.domain.entity.BookingEntity;
import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import com.qlvmb.airticket.domain.entity.TicketEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.RefundRequestRepository;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinanceService {

  private static final String REFUND_NOT_FOUND_MESSAGE =
      "Không tìm thấy yêu cầu hoàn vé tương ứng.";
  private static final String REFUND_APPROVE_INVALID_MESSAGE =
      "Yêu cầu hoàn vé này không còn ở trạng thái chờ duyệt.";
  private static final String REFUND_REJECT_INVALID_MESSAGE =
      "Yêu cầu hoàn vé này không còn ở trạng thái có thể từ chối.";
  private static final String REFUND_HIDE_INVALID_MESSAGE =
      "Yêu cầu hoàn vé đang chờ duyệt, chưa thể xóa khỏi danh sách.";

  private final RefundRequestRepository refundRequestRepository;
  private final NotificationOutboxService notificationOutboxService;

  public FinanceService(
      RefundRequestRepository refundRequestRepository,
      NotificationOutboxService notificationOutboxService
  ) {
    this.refundRequestRepository = refundRequestRepository;
    this.notificationOutboxService = notificationOutboxService;
  }

  @Transactional(readOnly = true)
  public List<FinanceRefundItem> getRefunds() {
    return refundRequestRepository.findAllDetailedOrderByCreatedAtDesc().stream()
        .map(this::mapRefundItem)
        .toList();
  }

  @Transactional
  public FinanceRefundItem approveRefund(long refundRequestId) {
    RefundRequestEntity refundRequest = lockRefundRequest(refundRequestId);
    BookingEntity booking = refundRequest.getBooking();

    if (!refundRequest.isPending() || (!booking.isRefundPending() && !booking.isCancelled())) {
      throw new BadRequestException(REFUND_APPROVE_INVALID_MESSAGE);
    }

    OffsetDateTime currentTime = OffsetDateTime.now();
    List<TicketEntity> requestedTickets = refundRequest.getRequestedTickets().isEmpty()
        ? booking.getTickets().stream().toList()
        : refundRequest.getRequestedTickets().stream().toList();
    Map<Long, Integer> releaseCountByInventoryId = new LinkedHashMap<>();

    refundRequest.markApproved(currentTime);
    requestedTickets.forEach(ticket -> {
      if (!TicketEntity.STATUS_CANCELLED.equals(ticket.getStatus())) {
        Long inventoryId = ticket.getSegment().getInventory().getId();
        releaseCountByInventoryId.merge(inventoryId, 1, Integer::sum);
        ticket.markCancelled(currentTime);
      }
    });

    booking.getSegments().forEach(segment -> {
      Integer releaseCount = releaseCountByInventoryId.get(segment.getInventory().getId());
      if (releaseCount != null && releaseCount > 0) {
        segment.getInventory().releaseSeats(releaseCount);
      }
    });

    boolean hasRemainingActiveTickets = booking.getTickets().stream()
        .anyMatch(ticket -> !TicketEntity.STATUS_CANCELLED.equals(ticket.getStatus()));
    if (hasRemainingActiveTickets) {
      if (booking.isRefundPending()) {
        booking.markTicketedAgain(currentTime);
      }
    } else {
      booking.markCancelled(currentTime);
    }
    notificationOutboxService.createAndSendRefundStatusEmail(booking, refundRequest);

    return mapRefundItem(refundRequest);
  }

  @Transactional
  public FinanceRefundItem rejectRefund(long refundRequestId) {
    RefundRequestEntity refundRequest = lockRefundRequest(refundRequestId);
    BookingEntity booking = refundRequest.getBooking();

    if (!refundRequest.isPending() || (!booking.isRefundPending() && !booking.isCancelled())) {
      throw new BadRequestException(REFUND_REJECT_INVALID_MESSAGE);
    }

    OffsetDateTime currentTime = OffsetDateTime.now();
    refundRequest.markRejected(currentTime);
    if (booking.isRefundPending()) {
      booking.markTicketedAgain(currentTime);
    }
    notificationOutboxService.createAndSendRefundStatusEmail(booking, refundRequest);

    return mapRefundItem(refundRequest);
  }

  @Transactional
  public void hideResolvedRefund(long refundRequestId) {
    RefundRequestEntity refundRequest = lockRefundRequest(refundRequestId);
    if (refundRequest.isPending()) {
      throw new BadRequestException(REFUND_HIDE_INVALID_MESSAGE);
    }
    refundRequest.hideFromUi(OffsetDateTime.now());
  }

  private RefundRequestEntity lockRefundRequest(long refundRequestId) {
    return refundRequestRepository.lockDetailedById(refundRequestId)
        .orElseThrow(() -> new NotFoundException(REFUND_NOT_FOUND_MESSAGE));
  }

  private FinanceRefundItem mapRefundItem(RefundRequestEntity refundRequest) {
    BookingEntity booking = refundRequest.getBooking();
    BookingContactEntity contact = booking.getContact();

    return new FinanceRefundItem(
        refundRequest.getId(),
        booking.getBookingCode(),
        mapBookingStatus(booking.getStatus()),
        contact == null ? "Chưa có thông tin liên hệ" : contact.getFullName(),
        refundRequest.getReason(),
        refundRequest.getRefundAmount(),
        mapRefundStatus(refundRequest.getStatus()),
        refundRequest.getCreatedAt()
    );
  }

  private String mapBookingStatus(String status) {
    return switch (status) {
      case BookingEntity.STATUS_HOLD -> "held";
      case BookingEntity.STATUS_TICKETED -> "ticketed";
      case BookingEntity.STATUS_REFUND_PENDING -> "refund_pending";
      case BookingEntity.STATUS_CANCELLED -> "cancelled";
      default -> status == null ? "held" : status.toLowerCase();
    };
  }

  private String mapRefundStatus(String status) {
    return switch (status) {
      case RefundRequestEntity.STATUS_PENDING -> "pending";
      case RefundRequestEntity.STATUS_APPROVED -> "approved";
      case RefundRequestEntity.STATUS_REJECTED -> "rejected";
      default -> status == null ? "pending" : status.toLowerCase();
    };
  }
}
