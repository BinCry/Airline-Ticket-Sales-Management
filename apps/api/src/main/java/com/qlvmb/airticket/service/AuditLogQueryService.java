package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.AuditLogFilterRequest;
import com.qlvmb.airticket.domain.dto.AuditLogItemResponse;
import com.qlvmb.airticket.domain.dto.AuditLogPageResponse;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.AuditLogSpecifications;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogQueryService {

  // Dùng múi giờ Việt Nam thay offset cố định khi xác định đầu ngày.
  private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final Sort ORDER = Sort.by(Sort.Direction.DESC, "createdAt", "id");
  static final int EXPORT_BATCH_SIZE = 500;
  private final AuditLogRepository auditLogRepository;

  public AuditLogQueryService(AuditLogRepository auditLogRepository) {
    this.auditLogRepository = auditLogRepository;
  }

  @Transactional(readOnly = true)
  public AuditLogPageResponse getAuditLogs(AuditLogFilterRequest filter) {
    Page<AuditLogEntity> result = auditLogRepository.findAll(
        specification(filter), PageRequest.of(filter.page(), filter.size(), ORDER));
    return new AuditLogPageResponse(
        result.getContent().stream().map(this::toItem).toList(),
        result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
  }

  @Transactional(readOnly = true)
  public List<String> getActions() {
    return auditLogRepository.findDistinctActions().stream().distinct().sorted().toList();
  }

  @Transactional(readOnly = true)
  public List<AuditLogItemResponse> getExportBatch(AuditLogFilterRequest filter, int batch) {
    return auditLogRepository.findAll(specification(filter), PageRequest.of(batch, EXPORT_BATCH_SIZE, ORDER))
        .getContent().stream().map(this::toItem).toList();
  }

  private Specification<AuditLogEntity> specification(AuditLogFilterRequest filter) {
    if (filter == null) {
      throw new BadRequestException("Thiếu tham số truy vấn nhật ký kiểm toán.");
    }
    List<Specification<AuditLogEntity>> conditions = new ArrayList<>();
    conditions.add(AuditLogSpecifications.visibility(filter.includeHidden()));
    if (filter.actorId() != null) {
      conditions.add("none".equals(filter.actorId())
          ? AuditLogSpecifications.withoutActor()
          : AuditLogSpecifications.actorId(Long.valueOf(filter.actorId())));
    }
    if (filter.actorKeyword() != null) {
      conditions.add(AuditLogSpecifications.actorKeyword(filter.actorKeyword()));
    }
    if (filter.actionPrefix() != null) {
      conditions.add(AuditLogSpecifications.actionPrefix(filter.actionPrefix()));
    }
    if (filter.action() != null) {
      conditions.add(AuditLogSpecifications.action(filter.action()));
    }
    if (filter.targetType() != null) {
      conditions.add(AuditLogSpecifications.targetType(filter.targetType()));
    }
    if (filter.targetId() != null) {
      conditions.add(AuditLogSpecifications.targetId(filter.targetId()));
    }
    if (filter.keyword() != null) {
      conditions.add(AuditLogSpecifications.keyword(filter.keyword()));
    }
    if (filter.from() != null) {
      conditions.add(AuditLogSpecifications.createdFrom(
          filter.from().atStartOfDay(VIETNAM_ZONE).toOffsetDateTime()));
    }
    if (filter.to() != null) {
      conditions.add(AuditLogSpecifications.createdBefore(
          filter.to().plusDays(1).atStartOfDay(VIETNAM_ZONE).toOffsetDateTime()));
    }
    return Specification.allOf(conditions);
  }

  private AuditLogItemResponse toItem(AuditLogEntity auditLog) {
    UserAccountEntity actor = auditLog.getActorUserAccount();
    return new AuditLogItemResponse(
        auditLog.getId(),
        actor == null ? null : actor.getId(),
        actor == null ? null : actor.getEmail(),
        actor == null ? null : actor.getDisplayName(),
        auditLog.getAction(), auditLog.getTargetType(), auditLog.getTargetId(),
        auditLog.getDetail(), auditLog.getCreatedAt(), auditLog.isHiddenFromUi());
  }
}
