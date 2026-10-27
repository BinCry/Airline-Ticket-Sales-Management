package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;

public record AuditLogItemResponse(
    Long id,
    Long actorId,
    String actorEmail,
    String actorName,
    String action,
    String targetType,
    String targetId,
    String detail,
    OffsetDateTime createdAt,
    boolean hidden
) {
}
