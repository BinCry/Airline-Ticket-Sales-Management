package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.time.OffsetDateTime;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class AuditLogSpecifications {

  private AuditLogSpecifications() {
  }

  public static Specification<AuditLogEntity> visibility(boolean includeHidden) {
    return (root, query, builder) -> includeHidden
        ? builder.conjunction() : builder.isNull(root.get("hiddenAt"));
  }

  public static Specification<AuditLogEntity> actorId(Long actorId) {
    return (root, query, builder) -> builder.equal(root.get("actorUserAccount").get("id"), actorId);
  }

  public static Specification<AuditLogEntity> withoutActor() {
    return (root, query, builder) -> builder.isNull(root.get("actorUserAccount"));
  }

  public static Specification<AuditLogEntity> actorKeyword(String value) {
    return (root, query, builder) -> {
      Join<AuditLogEntity, UserAccountEntity> actor = root.join("actorUserAccount", JoinType.LEFT);
      String pattern = containsPattern(value);
      return builder.or(
          builder.like(builder.lower(actor.get("email")), pattern, '\\'),
          builder.like(builder.lower(actor.get("displayName")), pattern, '\\')
      );
    };
  }

  public static Specification<AuditLogEntity> action(String value) {
    return (root, query, builder) -> builder.equal(root.get("action"), value);
  }

  public static Specification<AuditLogEntity> actionPrefix(String value) {
    // Thay tiền tố tự do bằng tiền tố kết thúc ở ranh giới dấu chấm.
    String prefix = value.endsWith(".") ? value : value + ".";
    return (root, query, builder) -> builder.like(root.get("action"), escapeLike(prefix) + "%", '\\');
  }

  public static Specification<AuditLogEntity> targetType(String value) {
    return (root, query, builder) -> builder.equal(root.get("targetType"), value);
  }

  public static Specification<AuditLogEntity> targetId(String value) {
    return (root, query, builder) -> builder.like(
        builder.lower(root.get("targetId")), containsPattern(value), '\\');
  }

  public static Specification<AuditLogEntity> keyword(String value) {
    return (root, query, builder) -> builder.like(
        builder.lower(root.get("detail")), containsPattern(value), '\\');
  }

  public static Specification<AuditLogEntity> createdFrom(OffsetDateTime value) {
    return (root, query, builder) -> builder.greaterThanOrEqualTo(root.get("createdAt"), value);
  }

  public static Specification<AuditLogEntity> createdBefore(OffsetDateTime value) {
    return (root, query, builder) -> builder.lessThan(root.get("createdAt"), value);
  }

  private static String containsPattern(String value) {
    return "%" + escapeLike(value.toLowerCase(Locale.ROOT)) + "%";
  }

  private static String escapeLike(String value) {
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }
}
