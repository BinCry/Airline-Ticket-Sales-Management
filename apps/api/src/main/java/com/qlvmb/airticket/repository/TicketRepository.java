package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.TicketEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketRepository extends JpaRepository<TicketEntity, Long> {

  boolean existsByTicketNumberIgnoreCase(String ticketNumber);

  long countBySegmentIdAndStatusNot(Long segmentId, String status);
}
