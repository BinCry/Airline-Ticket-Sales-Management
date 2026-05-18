package com.qlvmb.airticket.domain.dto;

import java.util.List;

public record AdminDashboardResponse(
    List<MetricCard> metrics,
    List<ModuleCard> modules,
    List<AuditCard> auditTrail
) {

  public record MetricCard(
      String label,
      String value,
      String trend
  ) {
  }

  public record ModuleCard(
      String key,
      String title,
      String summary,
      List<String> roles
  ) {
  }

  public record AuditCard(
      Long id,
      String actor,
      String action,
      String target,
      String time
  ) {
  }
}
