package com.qlvmb.airticket.domain.dto;

import java.util.List;

public record AuditLogPageResponse(
    List<AuditLogItemResponse> items,
    int page,
    int size,
    long totalElements,
    int totalPages
) {

  public AuditLogPageResponse {
    items = List.copyOf(items);
  }
}
