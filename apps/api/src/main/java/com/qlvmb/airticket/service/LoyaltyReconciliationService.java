package com.qlvmb.airticket.service;

import com.qlvmb.airticket.repository.BookingSegmentRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@EnableScheduling
public class LoyaltyReconciliationService {
  private static final Logger LOGGER = LoggerFactory.getLogger(LoyaltyReconciliationService.class);
  private final BookingSegmentRepository segments;
  private final LoyaltyEngineService engine;
  private final TransactionTemplate transaction;

  public LoyaltyReconciliationService(BookingSegmentRepository segments, LoyaltyEngineService engine,
      PlatformTransactionManager transactionManager) {
    this.segments = segments;
    this.engine = engine;
    this.transaction = new TransactionTemplate(transactionManager);
    transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    transaction.setReadOnly(true);
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onFlightLanded(FlightLandedEvent event) {
    processLandedFlight(event.flightId());
  }

  @Scheduled(initialDelay = 60000, fixedDelay = 60000)
  public void reconcile() {
    processLandedFlight(null);
  }

  public void processLandedFlight(Long flightId) {
    try {
      // ponytail: quét chặng thiếu điểm mỗi phút; phân trang khi dữ liệu lớn.
      List<Long> pending = transaction.execute(status -> segments.findUncreditedLandedSegmentIds(flightId));
      if (pending == null) {
        return;
      }
      for (Long segmentId : pending) {
        try {
          engine.processSegment(segmentId);
        } catch (RuntimeException exception) {
          LOGGER.error("Chưa cộng được điểm cho chặng {}; job sẽ thử lại.", segmentId, exception);
        }
      }
    } catch (RuntimeException exception) {
      LOGGER.error("Chưa đọc được chặng cần tích điểm; job sẽ thử lại.", exception);
    }
  }
}
