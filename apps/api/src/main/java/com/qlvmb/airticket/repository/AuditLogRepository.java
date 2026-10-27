package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long>,
    JpaSpecificationExecutor<AuditLogEntity> {

  @Override
  @EntityGraph(attributePaths = {"actorUserAccount"})
  Page<AuditLogEntity> findAll(Specification<AuditLogEntity> specification, Pageable pageable);

  @Query("select distinct audit.action from AuditLogEntity audit order by audit.action asc")
  List<String> findDistinctActions();

  @EntityGraph(attributePaths = {"actorUserAccount"})
  List<AuditLogEntity> findTop8ByHiddenAtIsNullOrderByCreatedAtDesc();

  boolean existsByIdAndHiddenAtIsNull(Long id);

  boolean existsByTargetTypeAndTargetIdAndActionAndDetail(
      String targetType, String targetId, String action, String detail);

  Optional<AuditLogEntity> findByIdAndHiddenAtIsNull(Long id);
}
