package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.MemberLoyaltyAccountEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface MemberLoyaltyAccountRepository extends JpaRepository<MemberLoyaltyAccountEntity, Long> {

  Optional<MemberLoyaltyAccountEntity> findByUserId(Long userId);

  @Modifying
  @Query(value = """
      insert into member_loyalty_account (user_id, membership_tier)
      values (:userId, :tierName) on conflict (user_id) do nothing
      """, nativeQuery = true)
  int initializeIfMissing(@Param("userId") Long userId, @Param("tierName") String tierName);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select account from MemberLoyaltyAccountEntity account where account.userId = :userId")
  Optional<MemberLoyaltyAccountEntity> lockByUserId(@Param("userId") Long userId);
}
