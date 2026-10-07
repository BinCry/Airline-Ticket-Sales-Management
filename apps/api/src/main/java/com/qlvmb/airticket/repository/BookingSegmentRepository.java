package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.BookingSegmentEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingSegmentRepository extends JpaRepository<BookingSegmentEntity, Long> {
  @Query(value = """
      select segment.id from booking_segment segment
      join booking on booking.id = segment.booking_id
      join flight_fare_inventory inventory on inventory.id = segment.inventory_id
      join flight on flight.id = inventory.flight_id
      where flight.status = 'landed' and (:flightId is null or flight.id = :flightId)
        and booking.member_user_id is not null
        and booking.payment_status = 'PAID'
        and booking.status in ('TICKETED', 'REFUND_PENDING')
        and exists (select 1 from user_role ur join auth_role role on role.id = ur.role_id
                    where ur.user_id = booking.member_user_id and lower(role.code) = 'member')
        and exists (select 1 from ticket where ticket.booking_segment_id = segment.id
                    and ticket.status <> 'CANCELLED')
        and not exists (
          select 1 from member_loyalty_ledger ledger
          join member_loyalty_account account on account.id = ledger.loyalty_account_id
          where account.user_id = booking.member_user_id
            and ledger.booking_segment_id = segment.id and ledger.entry_type = 'FLIGHT_EARN')
      order by segment.id
      """, nativeQuery = true)
  List<Long> findUncreditedLandedSegmentIds(@Param("flightId") Long flightId);
}
