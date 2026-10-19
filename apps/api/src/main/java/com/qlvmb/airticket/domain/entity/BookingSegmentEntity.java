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
@Table(name = "booking_segment")
public class BookingSegmentEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "booking_id", nullable = false)
  private BookingEntity booking;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "inventory_id", nullable = false)
  private FlightFareInventoryEntity inventory;

  @Column(name = "flight_code", nullable = false, length = 16)
  private String flightCode;

  @Column(name = "from_city", nullable = false, length = 120)
  private String fromCity;

  @Column(name = "to_city", nullable = false, length = 120)
  private String toCity;

  @Column(name = "origin_code", nullable = false, length = 8)
  private String originCode;

  @Column(name = "destination_code", nullable = false, length = 8)
  private String destinationCode;

  @Column(name = "departure_at", nullable = false)
  private OffsetDateTime departureAt;

  @Column(name = "arrival_at", nullable = false)
  private OffsetDateTime arrivalAt;

  @Column(name = "fare_family", nullable = false, length = 64)
  private String fareFamily;

  @Column(name = "fare_title", nullable = false, length = 120)
  private String fareTitle;

  @Column(name = "price_per_passenger", nullable = false)
  private long pricePerPassenger;

  @Column(name = "passenger_count", nullable = false)
  private int passengerCount;

  @Column(name = "subtotal_amount", nullable = false)
  private long subtotalAmount;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected BookingSegmentEntity() {
  }

  public static BookingSegmentEntity create(
      BookingEntity booking,
      FlightFareInventoryEntity inventory,
      String flightCode,
      String fromCity,
      String toCity,
      String originCode,
      String destinationCode,
      OffsetDateTime departureAt,
      OffsetDateTime arrivalAt,
      String fareFamily,
      String fareTitle,
      long pricePerPassenger,
      int passengerCount,
      long subtotalAmount,
      OffsetDateTime createdAt
  ) {
    BookingSegmentEntity segment = new BookingSegmentEntity();
    segment.booking = booking;
    segment.inventory = inventory;
    segment.flightCode = flightCode;
    segment.fromCity = fromCity;
    segment.toCity = toCity;
    segment.originCode = originCode;
    segment.destinationCode = destinationCode;
    segment.departureAt = departureAt;
    segment.arrivalAt = arrivalAt;
    segment.fareFamily = fareFamily;
    segment.fareTitle = fareTitle;
    segment.pricePerPassenger = pricePerPassenger;
    segment.passengerCount = passengerCount;
    segment.subtotalAmount = subtotalAmount;
    segment.createdAt = createdAt;
    return segment;
  }

  public void reschedule(OffsetDateTime departureAt,OffsetDateTime arrivalAt){
    this.departureAt=departureAt;this.arrivalAt=arrivalAt;
  }
  public Long getId() {
    return id;
  }

  public BookingEntity getBooking() {
    return booking;
  }

  public FlightFareInventoryEntity getInventory() {
    return inventory;
  }

  public String getFlightCode() {
    return flightCode;
  }

  public String getFromCity() {
    return fromCity;
  }

  public String getToCity() {
    return toCity;
  }

  public String getOriginCode() {
    return originCode;
  }

  public String getDestinationCode() {
    return destinationCode;
  }

  public OffsetDateTime getDepartureAt() {
    return departureAt;
  }

  public OffsetDateTime getArrivalAt() {
    return arrivalAt;
  }

  public String getFareFamily() {
    return fareFamily;
  }

  public String getFareTitle() {
    return fareTitle;
  }

  public long getPricePerPassenger() {
    return pricePerPassenger;
  }

  public int getPassengerCount() {
    return passengerCount;
  }

  public long getSubtotalAmount() {
    return subtotalAmount;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }
}
