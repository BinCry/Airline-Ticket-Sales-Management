package com.qlvmb.airticket.domain.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record BookingOverviewResponse(
    String bookingCode,
    String status,
    String paymentStatus,
    OffsetDateTime holdExpiresAt,
    OffsetDateTime ticketedAt,
    String tripType,
    List<String> steps,
    List<SegmentItem> segments,
    ContactItem contact,
    List<PassengerItem> passengers,
    List<AncillaryItem> ancillaries,
    List<SeatSelectionItem> seatSelections,
    List<TicketItem> tickets,
    List<BoardingPassItem> boardingPasses,
    RefundRequestItem refundRequest,
    List<String> paymentMethods,
    PriceSummaryItem priceSummary
) {

  public BookingOverviewResponse(
      String bookingCode,
      String status,
      String holdExpiresAt,
      List<String> steps,
      List<AncillaryItem> ancillaries,
      List<String> paymentMethods
  ) {
    this(
        bookingCode,
        status,
        "pending",
        holdExpiresAt == null ? null : OffsetDateTime.parse(holdExpiresAt),
        null,
        "one_way",
        steps,
        List.of(),
        null,
        List.of(),
        ancillaries,
        List.of(),
        List.of(),
        List.of(),
        null,
        paymentMethods,
        new PriceSummaryItem(0L, 0L, 0L, 0L, "VND", null)
    );
  }

  public record SegmentItem(
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
      long subtotalAmount,
      String status,
      String statusLabel,
      String gate,
      String note
  ) {
  }

  public record ContactItem(
      String fullName,
      String email,
      String phone
  ) {
  }

  public record PassengerItem(
      String fullName,
      String passengerType,
      LocalDate dateOfBirth,
      String documentType,
      String documentNumber
  ) {
  }

  public record AncillaryItem(
      String code,
      String name,
      String description,
      long unitPrice,
      int quantity,
      long subtotalAmount
  ) {

    public AncillaryItem(String code, String name, String description, long subtotalAmount) {
      this(code, name, description, subtotalAmount, 1, subtotalAmount);
    }
  }

  public record SeatSelectionItem(
      long inventoryId,
      String flightCode,
      String passengerName,
      String seatNumber,
      long unitPrice
  ) {
  }

  public record TicketItem(
      String ticketNumber,
      String passengerName,
      String status,
      OffsetDateTime issuedAt
  ) {
  }

  public record BoardingPassItem(
      String ticketNumber,
      String passengerName,
      String seatNumber,
      String gate,
      OffsetDateTime boardingTime,
      String barcode
  ) {
  }

  public record RefundRequestItem(
      String reason,
      long refundAmount,
      String status,
      OffsetDateTime createdAt
  ) {
  }

  public record PriceSummaryItem(
      long baseAmount,
      long ancillaryAmount,
      long discountAmount,
      long totalAmount,
      String currency,
      String appliedVoucherCode
  ) {
  }
}
