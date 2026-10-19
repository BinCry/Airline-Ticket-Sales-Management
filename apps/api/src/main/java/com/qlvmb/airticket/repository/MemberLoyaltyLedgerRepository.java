package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.MemberLoyaltyLedgerEntity;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberLoyaltyLedgerRepository extends JpaRepository<MemberLoyaltyLedgerEntity, Long> {

  List<MemberLoyaltyLedgerEntity> findTop5ByLoyaltyAccountIdOrderByCreatedAtDesc(Long loyaltyAccountId);

  Page<MemberLoyaltyLedgerEntity> findByLoyaltyAccountIdOrderByCreatedAtDescIdDesc(
      Long loyaltyAccountId, Pageable pageable);

  boolean existsByLoyaltyAccountIdAndBookingSegmentIdAndEntryType(
      Long loyaltyAccountId, Long bookingSegmentId, String entryType);
}
