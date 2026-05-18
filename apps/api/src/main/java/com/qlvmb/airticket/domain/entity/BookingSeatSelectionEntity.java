package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "booking_seat_selection")
public class BookingSeatSelectionEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "booking_id", nullable = false)
  private BookingEntity booking;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "booking_passenger_id", nullable = false)
  private BookingPassengerEntity passenger;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "booking_segment_id", nullable = false)
  private BookingSegmentEntity segment;

  @Column(name = "seat_number", nullable = false, length = 8)
  private String seatNumber;

  @Column(name = "unit_price", nullable = false)
  private long unitPrice;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected BookingSeatSelectionEntity() {
  }

  public static BookingSeatSelectionEntity create(
      BookingEntity booking,
      BookingPassengerEntity passenger,
      BookingSegmentEntity segment,
      String seatNumber,
      long unitPrice,
      OffsetDateTime createdAt
  ) {
    BookingSeatSelectionEntity seatSelection = new BookingSeatSelectionEntity();
    seatSelection.booking = booking;
    seatSelection.passenger = passenger;
    seatSelection.segment = segment;
    seatSelection.seatNumber = seatNumber;
    seatSelection.unitPrice = unitPrice;
    seatSelection.createdAt = createdAt;
    return seatSelection;
  }

  public Long getId() {
    return id;
  }

  public BookingEntity getBooking() {
    return booking;
  }

  public BookingPassengerEntity getPassenger() {
    return passenger;
  }

  public BookingSegmentEntity getSegment() {
    return segment;
  }

  public String getSeatNumber() {
    return seatNumber;
  }

  public long getUnitPrice() {
    return unitPrice;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }
}
