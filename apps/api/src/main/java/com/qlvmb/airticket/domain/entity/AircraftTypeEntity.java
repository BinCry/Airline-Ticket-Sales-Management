package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "aircraft_type")
public class AircraftTypeEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @Column(nullable = false, unique = true, length = 16) private String code;
  @Column(nullable = false, length = 120) private String name;
  @Column(name = "total_rows", nullable = false) private int totalRows;
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "seat_layout_json", nullable = false, columnDefinition = "jsonb")
  private String seatLayoutJson;
  @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
  @Column(name = "updated_at", nullable = false) private OffsetDateTime updatedAt;

  protected AircraftTypeEntity() {}
  public static AircraftTypeEntity create(String code, String name, int totalRows, String layout) {
    AircraftTypeEntity type = new AircraftTypeEntity();
    type.createdAt = OffsetDateTime.now();
    type.update(code, name, totalRows, layout);
    return type;
  }
  public void update(String code, String name, int totalRows, String layout) {
    this.code = code; this.name = name; this.totalRows = totalRows;
    this.seatLayoutJson = layout; this.updatedAt = OffsetDateTime.now();
  }
  public Long getId() { return id; }
  public String getCode() { return code; }
  public String getName() { return name; }
  public int getTotalRows() { return totalRows; }
  public String getSeatLayoutJson() { return seatLayoutJson; }
}
