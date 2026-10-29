package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.BaggageTrackingEntity;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface BaggageTrackingRepository extends JpaRepository<BaggageTrackingEntity,Long> {
 boolean existsByTagCode(String tagCode);
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select b from BaggageTrackingEntity b join fetch b.ticket t join fetch t.segment s join fetch s.inventory i join fetch i.flight where b.id=:id")
 Optional<BaggageTrackingEntity> lockById(@Param("id") Long id);
 @Query("select b from BaggageTrackingEntity b join fetch b.ticket t join fetch t.segment s join fetch s.inventory i join fetch i.flight where t.booking.id=:bookingId order by b.id")
 List<BaggageTrackingEntity> findByBookingId(@Param("bookingId") Long bookingId);
 @Query("select b from BaggageTrackingEntity b where b.ancillary.id=:ancillaryId order by b.pieceNo")
 List<BaggageTrackingEntity> findByAncillaryId(@Param("ancillaryId") Long ancillaryId);
 @Query("select b from BaggageTrackingEntity b join fetch b.ticket t join fetch t.segment s join fetch s.inventory i join fetch i.flight f where (:tag = '' or upper(b.tagCode) = upper(:tag)) and (:code = '' or upper(t.booking.bookingCode) = upper(:code)) and (:flight = '' or upper(f.code) = upper(:flight)) and (:state = '' or b.status = :state) order by b.id desc")
List<BaggageTrackingEntity> search(@Param("tag") String tag,@Param("code") String code,@Param("flight") String flight,@Param("state") String state);
 @Query("select b from BaggageTrackingEntity b join fetch b.ticket t join fetch t.segment s join fetch s.inventory i where i.flight.id=:flightId and b.status='ACCEPTED'")
 List<BaggageTrackingEntity> acceptedForFlight(@Param("flightId") Long flightId);
}
