package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberVoucherRepository extends JpaRepository<MemberVoucherEntity, Long> {

  long countByUserIdAndStatus(Long userId, String status);

  List<MemberVoucherEntity> findByUserIdOrderByExpiresAtAscCreatedAtDesc(Long userId);

  Optional<MemberVoucherEntity> findByVoucherCodeIgnoreCase(String voucherCode);

  Optional<MemberVoucherEntity> findByVoucherCodeIgnoreCaseAndUserId(String voucherCode, Long userId);
}
