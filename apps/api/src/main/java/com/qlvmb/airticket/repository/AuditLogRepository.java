package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {

  @EntityGraph(attributePaths = {"actorUserAccount"})
  List<AuditLogEntity> findTop8ByHiddenAtIsNullOrderByCreatedAtDesc();

  boolean existsByIdAndHiddenAtIsNull(Long id);

  Optional<AuditLogEntity> findByIdAndHiddenAtIsNull(Long id);
}
