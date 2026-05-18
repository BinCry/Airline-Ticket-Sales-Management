package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.SupportOverviewResponse;
import com.qlvmb.airticket.domain.entity.NotificationOutboxEntity;
import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import com.qlvmb.airticket.repository.NotificationOutboxRepository;
import com.qlvmb.airticket.repository.RefundRequestRepository;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupportOverviewService {

  private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final DateTimeFormatter DATE_TIME_FORMATTER =
      DateTimeFormatter.ofPattern("dd/MM HH:mm");

  private final NotificationOutboxRepository notificationOutboxRepository;
  private final RefundRequestRepository refundRequestRepository;

  public SupportOverviewService(
      NotificationOutboxRepository notificationOutboxRepository,
      RefundRequestRepository refundRequestRepository
  ) {
    this.notificationOutboxRepository = notificationOutboxRepository;
    this.refundRequestRepository = refundRequestRepository;
  }

  @Transactional(readOnly = true)
  public SupportOverviewResponse getOverview() {
    List<SupportOverviewResponse.TicketCard> cards = new ArrayList<>();

    notificationOutboxRepository.findAllByOrderByCreatedAtDesc().stream()
        .filter(outbox -> NotificationOutboxEntity.STATUS_FAILED.equals(outbox.getStatus()))
        .limit(3)
        .forEach(outbox -> cards.add(new SupportOverviewResponse.TicketCard(
            "MAIL-" + outbox.getId(),
            "Email vé gửi lỗi cho " + outbox.getRecipientEmail(),
            "Cần gửi lại",
            formatDateTime(outbox.getUpdatedAt())
        )));

    if (cards.size() < 4) {
      refundRequestRepository.findAllDetailedOrderByCreatedAtDesc().stream()
          .filter(RefundRequestEntity::isPending)
          .limit(4 - cards.size())
          .forEach(refundRequest -> cards.add(new SupportOverviewResponse.TicketCard(
              "RF-" + refundRequest.getId(),
              "Yêu cầu hoàn vé cho booking " + refundRequest.getBooking().getBookingCode(),
              "Chờ duyệt",
              formatDateTime(refundRequest.getCreatedAt())
          )));
    }

    return new SupportOverviewResponse(
        cards,
        List.of(
            "Email vé bị lỗi thì nhân sự hỗ trợ xử lý lại ở đâu?",
            "Khi nào cần chuyển yêu cầu hoàn vé sang tài chính?",
            "Booking đã thanh toán nhưng khách chưa nhận email vé thì cần kiểm tra gì trước?"
        ),
        List.of("1900 6868", "support@vietnam-airlines.vn", "Trung tâm hỗ trợ trên web")
    );
  }

  private String formatDateTime(java.time.OffsetDateTime value) {
    return value.atZoneSameInstant(ZONE_ID).format(DATE_TIME_FORMATTER);
  }
}
