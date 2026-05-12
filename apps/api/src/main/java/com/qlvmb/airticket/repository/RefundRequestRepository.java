package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.RefundRequestEntity;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefundRequestRepository extends JpaRepository<RefundRequestEntity, Long> {

  Optional<RefundRequestEntity> findFirstByBooking_BookingCodeIgnoreCaseOrderByCreatedAtDesc(String bookingCode);

  @Query("""
      select distinct refundRequest from RefundRequestEntity refundRequest
      join fetch refundRequest.booking booking
      left join fetch booking.contact
      left join fetch booking.tickets ticket
      left join fetch booking.segments segment
      left join fetch segment.inventory
      order by refundRequest.createdAt desc
      """)
  List<RefundRequestEntity> findAllDetailedOrderByCreatedAtDesc();

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("""
      select distinct refundRequest from RefundRequestEntity refundRequest
      join fetch refundRequest.booking booking
      left join fetch booking.contact
      left join fetch booking.tickets ticket
      left join fetch booking.segments segment
      left join fetch segment.inventory
      where refundRequest.id = :refundRequestId
      """)
  Optional<RefundRequestEntity> lockDetailedById(@Param("refundRequestId") Long refundRequestId);
}
