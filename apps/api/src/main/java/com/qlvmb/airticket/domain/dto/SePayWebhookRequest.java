package com.qlvmb.airticket.domain.dto;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

  private static final Pattern PAYMENT_CODE_PATTERN =
      Pattern.compile("SEPAY-?(\\d{12})", Pattern.CASE_INSENSITIVE);

  public boolean isIncomingTransfer() {
    return transferType != null && "in".equalsIgnoreCase(transferType.trim());
  }

  public String normalizedCode() {
    String normalized = extractNormalizedPaymentCode(code);
    if (normalized != null) {
      return normalized;
    }
    normalized = extractNormalizedPaymentCode(content);
    if (normalized != null) {
      return normalized;
    }
    normalized = extractNormalizedPaymentCode(description);
    if (normalized != null) {
      return normalized;
    }
    return extractNormalizedPaymentCode(referenceCode);
  }

  public static String extractNormalizedPaymentCode(String rawValue) {
    if (rawValue == null || rawValue.isBlank()) {
      return null;
    }

    Matcher matcher = PAYMENT_CODE_PATTERN.matcher(rawValue.trim());
    if (!matcher.find()) {
      return null;
    }

    return "SEPAY-" + matcher.group(1);
  }
}
