package com.qlvmb.airticket.domain.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record BookingHoldRequest(
    @NotBlank String tripType,
    @NotNull @Valid ContactRequest contact,
    @NotEmpty @Size(max = 9) List<@Valid PassengerRequest> passengers,
    @NotEmpty @Size(max = 2) List<@Valid SegmentRequest> segments,
    List<@Valid AncillaryRequest> ancillaries,
    List<@Valid SeatSelectionRequest> seatSelections
) {

  public BookingHoldRequest {
    ancillaries = ancillaries == null ? List.of() : List.copyOf(ancillaries);
    seatSelections = seatSelections == null ? List.of() : List.copyOf(seatSelections);
  }

  public record ContactRequest(
      @NotBlank String fullName,
      @NotBlank @Email String email,
      @NotBlank @Pattern(regexp = "^[0-9+]{9,15}$") String phone
  ) {
  }

  public record PassengerRequest(
      @NotBlank String fullName,
      @NotBlank String passengerType,
      @NotNull LocalDate dateOfBirth,
      @NotBlank String documentType,
      @NotBlank String documentNumber
  ) {
  }

  public record SegmentRequest(
      @NotNull Long inventoryId
  ) {
  }

  public record AncillaryRequest(
      @NotBlank String code,
      Integer quantity
  ) {
  }

  public record SeatSelectionRequest(
      @NotNull Long inventoryId,
      @NotNull Integer passengerIndex,
      @NotBlank String seatNumber
  ) {
  }
}
