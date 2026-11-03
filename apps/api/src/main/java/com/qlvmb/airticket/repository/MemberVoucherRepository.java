package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.MemberVoucherEntity;
import java.util.List;
import java.util.Collection;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberVoucherRepository extends JpaRepository<MemberVoucherEntity, Long> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select voucher from MemberVoucherEntity voucher where lower(voucher.voucherCode) in :codes order by lower(voucher.voucherCode), voucher.id")
  List<MemberVoucherEntity> lockByCodes(@Param("codes") Collection<String> codes);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select voucher from MemberVoucherEntity voucher where voucher.id = :id")
  Optional<MemberVoucherEntity> lockById(@Param("id") Long id);

  long countByUserIdAndStatus(Long userId, String status);

  List<MemberVoucherEntity> findByUserIdOrderByExpiresAtAscCreatedAtDesc(Long userId);

  Optional<MemberVoucherEntity> findByVoucherCodeIgnoreCase(String voucherCode);

  Optional<MemberVoucherEntity> findByVoucherCodeIgnoreCaseAndUserId(String voucherCode, Long userId);
}
