package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record RefundRequestCreateRequest(
    @NotBlank String reason,
    List<@NotBlank String> ticketNumbers
) {

  public RefundRequestCreateRequest(String reason) {
    this(reason, List.of());
  }

  public RefundRequestCreateRequest {
    ticketNumbers = ticketNumbers == null ? List.of() : List.copyOf(ticketNumbers);
  }
}
