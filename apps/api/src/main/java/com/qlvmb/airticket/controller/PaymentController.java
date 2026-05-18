package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.BookingOverviewResponse;
import com.qlvmb.airticket.domain.dto.PaymentCallbackRequest;
import com.qlvmb.airticket.domain.dto.SePayWebhookRequest;
import com.qlvmb.airticket.service.PaymentService;
import java.util.Map;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

  private final PaymentService paymentService;

  public PaymentController(PaymentService paymentService) {
    this.paymentService = paymentService;
  }

  @PostMapping("/callback")
  public BookingOverviewResponse handleCallback(@Valid @RequestBody PaymentCallbackRequest request) {
    return paymentService.handlePaymentCallback(request);
  }

  @PostMapping("/webhooks/sepay")
  public Map<String, Boolean> handleSePayWebhook(
      @RequestBody SePayWebhookRequest request,
      @RequestHeader(value = "Authorization", required = false) String authorizationHeader
  ) {
    paymentService.handleSePayWebhook(request, authorizationHeader);
    return Map.of("success", true);
  }
}
