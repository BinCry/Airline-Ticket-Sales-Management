package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.BookingEntity;
import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<BookingEntity, Long> {

  long countByStatus(String status);

  long countByPaymentStatus(String paymentStatus);

  boolean existsByBookingCodeIgnoreCase(String bookingCode);

  @Query("""
      select booking.id
      from BookingEntity booking
      join booking.contact contact
      where lower(contact.email) = lower(:email)
      order by booking.createdAt desc
      """)
  List<Long> findRecentIdsByContactEmail(
      @Param("email") String email,
      Pageable pageable
  );

  @Query("""
      select distinct booking from BookingEntity booking
      left join fetch booking.contact
      left join fetch booking.segments segment
      where booking.id in :bookingIds
      """)
  List<BookingEntity> findAllDetailedByIdIn(@Param("bookingIds") Collection<Long> bookingIds);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("""
      select distinct booking from BookingEntity booking
      left join fetch booking.contact
      left join fetch booking.passengers
      left join fetch booking.segments segment
      left join fetch segment.inventory inventory
      left join fetch inventory.flight flight
      left join fetch flight.originAirport
      left join fetch flight.destinationAirport
      left join fetch booking.ancillaries
      left join fetch booking.seatSelections seatSelection
      left join fetch seatSelection.passenger
      left join fetch seatSelection.segment
      left join fetch booking.tickets ticket
      left join fetch ticket.passenger
      left join fetch ticket.boardingPass
      left join fetch booking.refundRequests
      where upper(booking.bookingCode) = upper(:bookingCode)
      """)
  Optional<BookingEntity> lockDetailedByBookingCode(@Param("bookingCode") String bookingCode);

  @Query("""
      select distinct booking from BookingEntity booking
      left join fetch booking.contact
      left join fetch booking.passengers
      left join fetch booking.segments segment
      left join fetch segment.inventory inventory
      left join fetch inventory.flight flight
      left join fetch flight.originAirport
      left join fetch flight.destinationAirport
      left join fetch booking.ancillaries
      left join fetch booking.seatSelections seatSelection
      left join fetch seatSelection.passenger
      left join fetch seatSelection.segment
      left join fetch booking.tickets ticket
      left join fetch ticket.passenger
      left join fetch ticket.boardingPass
      left join fetch booking.refundRequests
      where upper(booking.bookingCode) = upper(:bookingCode)
      """)
  Optional<BookingEntity> findDetailedByBookingCode(@Param("bookingCode") String bookingCode);

  @Query("""
      select distinct booking from BookingEntity booking
      left join fetch booking.contact
      left join fetch booking.passengers
      left join fetch booking.segments segment
      left join fetch segment.inventory inventory
      left join fetch inventory.flight flight
      left join fetch flight.originAirport
      left join fetch flight.destinationAirport
      left join fetch booking.ancillaries
      left join fetch booking.seatSelections seatSelection
      left join fetch seatSelection.passenger
      left join fetch seatSelection.segment
      left join fetch booking.tickets ticket
      left join fetch ticket.passenger
      left join fetch ticket.boardingPass
      left join fetch booking.refundRequests
      where exists (
        select 1
        from BookingSegmentEntity linkedSegment
        where linkedSegment.booking = booking
          and linkedSegment.inventory.flight.id = :flightId
      )
      """)
  List<BookingEntity> findAllDetailedByFlightId(@Param("flightId") Long flightId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("""
      select distinct booking from BookingEntity booking
      join fetch booking.segments segment
      join fetch segment.inventory inventory
      join fetch inventory.flight flight
      join fetch flight.originAirport
      join fetch flight.destinationAirport
      where booking.status = :status
        and booking.expiresAt <= :currentTime
        and inventory.id in :inventoryIds
      """)
  List<BookingEntity> lockExpiredHoldsByInventoryIds(
      @Param("status") String status,
      @Param("currentTime") OffsetDateTime currentTime,
      @Param("inventoryIds") Collection<Long> inventoryIds
  );
}
