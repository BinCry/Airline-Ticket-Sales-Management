package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "boarding_pass")
public class BoardingPassEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "ticket_id", nullable = false, unique = true)
  private TicketEntity ticket;

  @Column(name = "seat_number", nullable = false, length = 8)
  private String seatNumber;

  @Column(nullable = false, length = 12)
  private String gate;

  @Column(name = "boarding_time", nullable = false)
  private OffsetDateTime boardingTime;

  @Column(nullable = false, length = 64)
  private String barcode;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected BoardingPassEntity() {
  }

  public static BoardingPassEntity create(
      TicketEntity ticket,
      String seatNumber,
      String gate,
      OffsetDateTime boardingTime,
      String barcode,
      OffsetDateTime createdAt
  ) {
    BoardingPassEntity boardingPass = new BoardingPassEntity();
    boardingPass.ticket = ticket;
    boardingPass.seatNumber = seatNumber;
    boardingPass.gate = gate;
    boardingPass.boardingTime = boardingTime;
    boardingPass.barcode = barcode;
    boardingPass.createdAt = createdAt;
    boardingPass.updatedAt = createdAt;
    return boardingPass;
  }

  public void syncFlight(String gate,java.time.Duration offset,OffsetDateTime now){
    if(gate!=null)this.gate=gate;
    if(offset!=null)this.boardingTime=this.boardingTime.plus(offset);
    this.updatedAt=now;
  }
  public Long getId() {
    return id;
  }

  public TicketEntity getTicket() {
    return ticket;
  }

  public String getSeatNumber() {
    return seatNumber;
  }

  public String getGate() {
    return gate;
  }

  public OffsetDateTime getBoardingTime() {
    return boardingTime;
  }

  public String getBarcode() {
    return barcode;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }
}
