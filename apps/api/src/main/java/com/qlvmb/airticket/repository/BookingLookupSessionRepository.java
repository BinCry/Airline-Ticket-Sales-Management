package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.BookingLookupSessionEntity;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingLookupSessionRepository extends JpaRepository<BookingLookupSessionEntity, Long> {

  Optional<BookingLookupSessionEntity> findFirstByBookingCodeAndContactEmailAndConsumedAtIsNullOrderByCreatedAtDesc(
      String bookingCode,
      String contactEmail
  );

  Optional<BookingLookupSessionEntity> findByTokenKey(String tokenKey);

  long countByBookingCodeAndContactEmailAndCreatedAtAfter(
      String bookingCode,
      String contactEmail,
      OffsetDateTime createdAt
  );
}
