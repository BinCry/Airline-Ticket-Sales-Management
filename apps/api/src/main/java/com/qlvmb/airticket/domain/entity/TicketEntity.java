package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "ticket")
public class TicketEntity {

  public static final String STATUS_ISSUED = "ISSUED";
  public static final String STATUS_CHECKED_IN = "CHECKED_IN";
  public static final String STATUS_CANCELLED = "CANCELLED";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "booking_id", nullable = false)
  private BookingEntity booking;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "booking_passenger_id", nullable = false, unique = true)
  private BookingPassengerEntity passenger;

  @OneToOne(mappedBy = "ticket", fetch = FetchType.LAZY, orphanRemoval = true)
  private BoardingPassEntity boardingPass;

  @Column(name = "ticket_number", nullable = false, unique = true, length = 20)
  private String ticketNumber;

  @Column(nullable = false, length = 16)
  private String status;

  @Column(name = "issued_at", nullable = false)
  private OffsetDateTime issuedAt;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected TicketEntity() {
  }

  public static TicketEntity issue(
      BookingEntity booking,
      BookingPassengerEntity passenger,
      String ticketNumber,
      OffsetDateTime issuedAt
  ) {
    TicketEntity ticket = new TicketEntity();
    ticket.booking = booking;
    ticket.passenger = passenger;
    ticket.ticketNumber = ticketNumber;
    ticket.status = STATUS_ISSUED;
    ticket.issuedAt = issuedAt;
    ticket.createdAt = issuedAt;
    ticket.updatedAt = issuedAt;
    return ticket;
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

  public BoardingPassEntity getBoardingPass() {
    return boardingPass;
  }

  public String getTicketNumber() {
    return ticketNumber;
  }

  public String getStatus() {
    return status;
  }

  public OffsetDateTime getIssuedAt() {
    return issuedAt;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void assignBoardingPass(BoardingPassEntity boardingPass) {
    this.boardingPass = boardingPass;
  }

  public void markCheckedIn(OffsetDateTime updatedAt) {
    status = STATUS_CHECKED_IN;
    this.updatedAt = updatedAt;
  }

  public void markCancelled(OffsetDateTime updatedAt) {
    status = STATUS_CANCELLED;
    this.updatedAt = updatedAt;
  }
}
