package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.PaymentTransactionEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransactionEntity, Long> {

  Optional<PaymentTransactionEntity> findByBookingId(Long bookingId);

  Optional<PaymentTransactionEntity> findByOrderCodeIgnoreCase(String orderCode);

  Optional<PaymentTransactionEntity> findByExternalTransactionId(Long externalTransactionId);
}
