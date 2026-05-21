package com.qlvmb.airticket.domain.dto;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SePayWebhookRequestTest {

  @Test
  void normalizedCode_shouldPreferCodeFieldWhenPresent() {
    SePayWebhookRequest request = new SePayWebhookRequest(
        1L,
        "MBBank",
        "2026-05-22 01:21:00",
        "0985512831",
        null,
        "SEPAY-123456789012",
        "noi dung khac",
        "in",
        "mo ta khac",
        2210000L,
        0L,
        "FT123456789"
    );

    assertThat(request.normalizedCode()).isEqualTo("SEPAY-123456789012");
  }

  @Test
  void normalizedCode_shouldExtractCodeFromContentWhenCodeBlank() {
    SePayWebhookRequest request = new SePayWebhookRequest(
        1L,
        "MBBank",
        "2026-05-22 01:21:00",
        "0985512831",
        null,
        "   ",
        "SEPAY123456789012- Ma GD ACSP/ II296625",
        "in",
        null,
        2210000L,
        0L,
        "FT123456789"
    );

    assertThat(request.normalizedCode()).isEqualTo("SEPAY-123456789012");
  }

  @Test
  void normalizedCode_shouldExtractCodeFromDescriptionWhenContentMissing() {
    SePayWebhookRequest request = new SePayWebhookRequest(
        1L,
        "MBBank",
        "2026-05-22 01:21:00",
        "0985512831",
        null,
        null,
        null,
        "in",
        "Thanh toan cho ma SEPAY-123456789012 tu MB Bank",
        2210000L,
        0L,
        "FT123456789"
    );

    assertThat(request.normalizedCode()).isEqualTo("SEPAY-123456789012");
  }

  @Test
  void normalizedCode_shouldReturnNullWhenNoPaymentCodeFound() {
    SePayWebhookRequest request = new SePayWebhookRequest(
        1L,
        "MBBank",
        "2026-05-22 01:21:00",
        "0985512831",
        null,
        null,
        "Noi dung khong co ma",
        "in",
        "Mo ta khong co ma",
        2210000L,
        0L,
        "FT123456789"
    );

    assertThat(request.normalizedCode()).isNull();
  }
}
