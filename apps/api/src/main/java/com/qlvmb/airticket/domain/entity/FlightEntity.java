package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "flight")
public class FlightEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 16)
  private String code;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "origin_airport_id", nullable = false)
  private AirportEntity originAirport;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "destination_airport_id", nullable = false)
  private AirportEntity destinationAirport;

  @Column(name = "departure_at", nullable = false)
  private OffsetDateTime departureAt;

  @Column(name = "arrival_at", nullable = false)
  private OffsetDateTime arrivalAt;

  @Column(nullable = false, length = 32)
  private String status = "scheduled";

  @Column(length = 12)
  private String gate;

  @Column(name = "operations_note", length = 255)
  private String operationsNote;

  @Column(name = "sales_open", nullable = false)
  private boolean salesOpen = true;

  @Column(name = "hidden_at")
  private OffsetDateTime hiddenAt;

  @Column(name = "cancelled_at")
  private OffsetDateTime cancelledAt;

  @OneToMany(mappedBy = "flight", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<FlightFareInventoryEntity> fareInventories = new ArrayList<>();

  protected FlightEntity() {
  }

  public static FlightEntity create(
      String code,
      AirportEntity originAirport,
      AirportEntity destinationAirport,
      OffsetDateTime departureAt,
      OffsetDateTime arrivalAt,
      String gate,
      String operationsNote,
      boolean salesOpen
  ) {
    FlightEntity flight = new FlightEntity();
    flight.code = code;
    flight.originAirport = originAirport;
    flight.destinationAirport = destinationAirport;
    flight.departureAt = departureAt;
    flight.arrivalAt = arrivalAt;
    flight.status = "scheduled";
    flight.gate = gate;
    flight.operationsNote = operationsNote;
    flight.salesOpen = salesOpen;
    flight.hiddenAt = null;
    flight.cancelledAt = null;
    return flight;
  }

  public Long getId() {
    return id;
  }

  public String getCode() {
    return code;
  }

  public AirportEntity getOriginAirport() {
    return originAirport;
  }

  public AirportEntity getDestinationAirport() {
    return destinationAirport;
  }

  public OffsetDateTime getDepartureAt() {
    return departureAt;
  }

  public OffsetDateTime getArrivalAt() {
    return arrivalAt;
  }

  public String getStatus() {
    return status;
  }

  public String getGate() {
    return gate;
  }

  public String getOperationsNote() {
    return operationsNote;
  }

  public boolean isSalesOpen() {
    return salesOpen;
  }

  public OffsetDateTime getHiddenAt() {
    return hiddenAt;
  }

  public OffsetDateTime getCancelledAt() {
    return cancelledAt;
  }

  public List<FlightFareInventoryEntity> getFareInventories() {
    return fareInventories;
  }

  public boolean isCancelled() {
    return "cancelled".equals(status);
  }

  public boolean isHiddenFromUi() {
    return hiddenAt != null;
  }

  public void addFareInventory(FlightFareInventoryEntity fareInventory) {
    fareInventories.add(fareInventory);
  }

  public void updateOperations(
      String status,
      String gate,
      String operationsNote,
      boolean salesOpen
  ) {
    this.status = status;
    this.gate = gate;
    this.operationsNote = operationsNote;
    this.salesOpen = salesOpen;
  }

  public void markCancelled(String operationsNote, OffsetDateTime cancelledAt) {
    status = "cancelled";
    this.operationsNote = operationsNote;
    salesOpen = false;
    this.cancelledAt = cancelledAt;
  }

  public void hideFromUi(OffsetDateTime hiddenAt) {
    this.hiddenAt = hiddenAt;
  }
}
