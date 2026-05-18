package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.MemberLoyaltyAccountEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberLoyaltyAccountRepository extends JpaRepository<MemberLoyaltyAccountEntity, Long> {

  Optional<MemberLoyaltyAccountEntity> findByUserId(Long userId);
}
