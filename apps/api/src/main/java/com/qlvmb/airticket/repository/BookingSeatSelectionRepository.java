package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.BookingSeatSelectionEntity;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingSeatSelectionRepository extends JpaRepository<BookingSeatSelectionEntity, Long> {

  interface SeatOccupant {
    String getSeatNumber();
    String getFareFamily();
    Long getPassengerId();
    Long getSegmentId();
  }

  @Query(value = """
      select upper(s.seat_number) as "seatNumber", bs.fare_family as "fareFamily",
          s.booking_passenger_id as "passengerId", s.booking_segment_id as "segmentId"
      from booking_seat_selection s join booking b on b.id=s.booking_id
      join booking_segment bs on bs.id=s.booking_segment_id
      join flight_fare_inventory i on i.id=bs.inventory_id
      join flight f on f.id=i.flight_id
      where f.id=:flightId and f.status<>'cancelled' and (
        (b.status='HOLD' and b.expires_at>:currentTime) or
        (b.status in ('TICKETED','REFUND_PENDING') and (
          exists (select 1 from ticket t where t.booking_passenger_id=s.booking_passenger_id
            and t.booking_segment_id=s.booking_segment_id and t.status in ('ISSUED','CHECKED_IN'))
          or not exists (select 1 from ticket t where t.booking_passenger_id=s.booking_passenger_id
            and t.booking_segment_id=s.booking_segment_id)
        ))
      ) and not exists (
        select 1 from ticket t join boarding_pass bp on bp.ticket_id=t.id
        where t.booking_passenger_id=s.booking_passenger_id and t.booking_segment_id=s.booking_segment_id
          and t.status in ('ISSUED','CHECKED_IN')
      )
      union
      select upper(bp.seat_number), bs.fare_family, t.booking_passenger_id, t.booking_segment_id
      from boarding_pass bp join ticket t on t.id=bp.ticket_id
      join booking b on b.id=t.booking_id join booking_segment bs on bs.id=t.booking_segment_id
      join flight_fare_inventory i on i.id=bs.inventory_id join flight f on f.id=i.flight_id
      where f.id=:flightId and f.status<>'cancelled' and b.status in ('TICKETED','REFUND_PENDING')
        and t.status in ('ISSUED','CHECKED_IN')
      """, nativeQuery = true)
  List<SeatOccupant> findActiveSeatOccupants(@Param("flightId") Long flightId,
      @Param("currentTime") OffsetDateTime currentTime);

  @Query("""
      select distinct selection.seatNumber
      from BookingSeatSelectionEntity selection
      where selection.segment.inventory.flight.id = :flightId
        and (
          (selection.booking.status = 'HOLD' and selection.booking.expiresAt > :currentTime)
          or selection.booking.status = 'TICKETED'
          or selection.booking.status = 'REFUND_PENDING'
        )
      """)
  List<String> findOccupiedSeatNumbersByFlightId(
      @Param("flightId") Long flightId,
      @Param("currentTime") OffsetDateTime currentTime
  );
}
