package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.NotificationOutboxEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationOutboxRepository extends JpaRepository<NotificationOutboxEntity, Long> {

  long countByStatus(String status);

  List<NotificationOutboxEntity> findAllByOrderByCreatedAtDesc();

  List<NotificationOutboxEntity> findTop5ByRecipientEmailIgnoreCaseOrderByCreatedAtDesc(String recipientEmail);
}
