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

  @Query("""
      select voucher from MemberVoucherEntity voucher
      where voucher.operationsHiddenAt is null
        and (:userId is null or voucher.userId = :userId)
        and (:code is null or locate(lower(cast(:code as string)), lower(voucher.voucherCode)) > 0)
        and (:status is null
          or (:status = 'EXPIRED' and (voucher.status = 'EXPIRED'
            or (voucher.status = 'AVAILABLE' and voucher.expiresAt <= :asOf)))
          or (:status = 'AVAILABLE' and voucher.status = 'AVAILABLE' and voucher.expiresAt > :asOf)
          or (:status not in ('AVAILABLE', 'EXPIRED') and voucher.status = :status))
      order by voucher.updatedAt desc, voucher.expiresAt asc
      """)
  List<MemberVoucherEntity> findOperationsVouchers(
      @Param("userId") Long userId, @Param("code") String code, @Param("status") String status,
      @Param("asOf") java.time.OffsetDateTime asOf);

  long countByUserIdAndStatus(Long userId, String status);

  List<MemberVoucherEntity> findByUserIdOrderByExpiresAtAscCreatedAtDesc(Long userId);

  Optional<MemberVoucherEntity> findByVoucherCodeIgnoreCase(String voucherCode);

  Optional<MemberVoucherEntity> findByVoucherCodeIgnoreCaseAndUserId(String voucherCode, Long userId);
}
