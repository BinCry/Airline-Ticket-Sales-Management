package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.LoyaltyTierRuleEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoyaltyTierRuleRepository extends JpaRepository<LoyaltyTierRuleEntity, Long> {
  List<LoyaltyTierRuleEntity> findAllByOrderBySortOrderAsc();
}
