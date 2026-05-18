package com.qlvmb.airticket.domain.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record BookingHoldResponse(
    String bookingCode,
    String status,
    OffsetDateTime expiresAt,
    OffsetDateTime createdAt,
    String tripType,
    ContactResponse contact,
    List<PassengerResponse> passengers,
    List<SelectedSegmentResponse> selectedSegments,
    List<SelectedAncillaryResponse> selectedAncillaries,
    PriceSummaryResponse priceSummary
) {

  public record ContactResponse(
      String fullName,
      String email,
      String phone
  ) {
  }

  public record PassengerResponse(
      String fullName,
      String passengerType,
      LocalDate dateOfBirth,
      String documentType,
      String documentNumber
  ) {
  }

  public record SelectedSegmentResponse(
      long inventoryId,
      String code,
      String from,
      String to,
      String originCode,
      String destinationCode,
      OffsetDateTime departureAt,
      OffsetDateTime arrivalAt,
      String fareFamily,
      String fareTitle,
      long pricePerPassenger,
      int passengerCount,
      long subtotalAmount
  ) {
  }

  public record SelectedAncillaryResponse(
      String code,
      String name,
      String description,
      long unitPrice,
      int quantity,
      long subtotalAmount
  ) {
  }

  public record PriceSummaryResponse(
      long baseAmount,
      long ancillaryAmount,
      long discountAmount,
      long totalAmount,
      String currency,
      String appliedVoucherCode
  ) {
  }
}
