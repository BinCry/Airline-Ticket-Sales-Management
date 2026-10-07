package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "aircraft")
public class AircraftEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "aircraft_type_id", nullable = false) private AircraftTypeEntity aircraftType;
  @Column(name = "registration_code", nullable = false, unique = true, length = 20)
  private String registrationCode;
  @Column(nullable = false, length = 16) private String status;
  @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
  @Column(name = "updated_at", nullable = false) private OffsetDateTime updatedAt;

  protected AircraftEntity() {}
  public static AircraftEntity create(AircraftTypeEntity type, String registration, String status) {
    AircraftEntity aircraft = new AircraftEntity();
    aircraft.createdAt = OffsetDateTime.now();
    aircraft.update(type, registration, status);
    return aircraft;
  }
  public void update(AircraftTypeEntity type, String registration, String status) {
    this.aircraftType = type; this.registrationCode = registration;
    this.status = status; this.updatedAt = OffsetDateTime.now();
  }
  public Long getId() { return id; }
  public AircraftTypeEntity getAircraftType() { return aircraftType; }
  public String getRegistrationCode() { return registrationCode; }
  public String getStatus() { return status; }
}
