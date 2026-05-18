package com.qlvmb.airticket.domain.dto;

public record SePayWebhookRequest(
    Long id,
    String gateway,
    String transactionDate,
    String accountNumber,
    String subAccount,
    String code,
    String content,
    String transferType,
    String description,
    Long transferAmount,
    Long accumulated,
    String referenceCode
) {

  public boolean isIncomingTransfer() {
    return transferType != null && "in".equalsIgnoreCase(transferType.trim());
  }

  public String normalizedCode() {
    if (code == null || code.isBlank()) {
      return null;
    }
    return code.trim().toUpperCase();
  }
}
