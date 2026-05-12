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

@Entity
@Table(name = "flight_fare_inventory")
public class FlightFareInventoryEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "flight_id", nullable = false)
  private FlightEntity flight;

  @Column(name = "fare_family", nullable = false, length = 64)
  private String fareFamily;

  @Column(name = "total_seats", nullable = false)
  private int totalSeats;

  @Column(name = "available_seats", nullable = false)
  private int availableSeats;

  @Column(nullable = false)
  private long price;

  protected FlightFareInventoryEntity() {
  }

  public Long getId() {
    return id;
  }

  public FlightEntity getFlight() {
    return flight;
  }

  public String getFareFamily() {
    return fareFamily;
  }

  public int getTotalSeats() {
    return totalSeats;
  }

  public int getAvailableSeats() {
    return availableSeats;
  }

  public long getPrice() {
    return price;
  }

  public void reserveSeats(int seatCount) {
    availableSeats -= seatCount;
  }

  public void releaseSeats(int seatCount) {
    availableSeats = Math.min(totalSeats, availableSeats + seatCount);
  }
}
