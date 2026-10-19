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
@Table(name = "booking_ancillary")
public class BookingAncillaryEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "booking_id", nullable = false)
  private BookingEntity booking;

  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="booking_passenger_id")
  private BookingPassengerEntity passenger;
  @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="booking_segment_id")
  private BookingSegmentEntity segment;
  @Column(length=16) private String kind;

  @Column(nullable = false, length = 32)
  private String code;

  @Column(nullable = false, length = 160)
  private String name;

  @Column(nullable = false, length = 255)
  private String description;

  @Column(name = "unit_price", nullable = false)
  private long unitPrice;

  @Column(nullable = false)
  private int quantity;

  @Column(name = "subtotal_amount", nullable = false)
  private long subtotalAmount;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected BookingAncillaryEntity() {
  }

  public static BookingAncillaryEntity create(
      BookingEntity booking,
      String code,
      String name,
      String description,
      long unitPrice,
      int quantity,
      long subtotalAmount,
      OffsetDateTime createdAt
  ) {
    BookingAncillaryEntity ancillary = new BookingAncillaryEntity();
    ancillary.booking = booking;
    ancillary.code = code;
    ancillary.name = name;
    ancillary.description = description;
    ancillary.unitPrice = unitPrice;
    ancillary.quantity = quantity;
    ancillary.subtotalAmount = subtotalAmount;
    ancillary.createdAt = createdAt;
    return ancillary;
  }

  public BookingPassengerEntity getPassenger(){return passenger;}
  public BookingSegmentEntity getSegment(){return segment;}
  public String getKind(){return kind;}
  public void attachBaggageScope(BookingPassengerEntity passenger,BookingSegmentEntity segment){
    this.passenger=passenger;this.segment=segment;this.kind="BAGGAGE";
  }

  public Long getId() {
    return id;
  }

  public BookingEntity getBooking() {
    return booking;
  }

  public String getCode() {
    return code;
  }

  public String getName() {
    return name;
  }

  public String getDescription() {
    return description;
  }

  public long getUnitPrice() {
    return unitPrice;
  }

  public int getQuantity() {
    return quantity;
  }

  public long getSubtotalAmount() {
    return subtotalAmount;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }
}
