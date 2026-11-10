package com.qlvmb.airticket.domain.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record VoucherConditions(
    List<Route> routes,
    List<String> fareFamilies,
    @JsonFormat(shape = JsonFormat.Shape.STRING) LocalDate departureFrom,
    @JsonFormat(shape = JsonFormat.Shape.STRING) LocalDate departureTo,
    Long minAmount
) {
  public record Route(String from, String to) {
  }
}
