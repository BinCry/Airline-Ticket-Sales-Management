package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "refund_request")
public class RefundRequestEntity {

  public static final String STATUS_PENDING = "PENDING";
  public static final String STATUS_APPROVED = "APPROVED";
  public static final String STATUS_REJECTED = "REJECTED";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "booking_code", referencedColumnName = "booking_code", nullable = false)
  private BookingEntity booking;

  @Column(nullable = false, length = 500)
  private String reason;

  @Column(name = "refund_amount", nullable = false)
  private long refundAmount;

  @Column(nullable = false, length = 16)
  private String status;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @Column(name = "hidden_at")
  private OffsetDateTime hiddenAt;

  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
      name = "refund_request_ticket",
      joinColumns = @JoinColumn(name = "refund_request_id"),
      inverseJoinColumns = @JoinColumn(name = "ticket_id")
  )
  private Set<TicketEntity> requestedTickets = new LinkedHashSet<>();

  protected RefundRequestEntity() {
  }

  public static RefundRequestEntity createPending(
      BookingEntity booking,
      String reason,
      long refundAmount,
      OffsetDateTime createdAt
  ) {
    return createPending(booking, reason, refundAmount, createdAt, booking.getTickets());
  }

  public static RefundRequestEntity createPending(
      BookingEntity booking,
      String reason,
      long refundAmount,
      OffsetDateTime createdAt,
      Collection<TicketEntity> requestedTickets
  ) {
    RefundRequestEntity refundRequest = new RefundRequestEntity();
    refundRequest.booking = booking;
    refundRequest.reason = reason;
    refundRequest.refundAmount = refundAmount;
    refundRequest.status = STATUS_PENDING;
    refundRequest.createdAt = createdAt;
    refundRequest.updatedAt = createdAt;
    refundRequest.requestedTickets.addAll(requestedTickets);
    return refundRequest;
  }

  public Long getId() {
    return id;
  }

  public BookingEntity getBooking() {
    return booking;
  }

  public String getReason() {
    return reason;
  }

  public long getRefundAmount() {
    return refundAmount;
  }

  public String getStatus() {
    return status;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public OffsetDateTime getHiddenAt() {
    return hiddenAt;
  }

  public Set<TicketEntity> getRequestedTickets() {
    return requestedTickets;
  }

  public boolean isPending() {
    return STATUS_PENDING.equals(status);
  }

  public void markApproved(OffsetDateTime updatedAt) {
    status = STATUS_APPROVED;
    this.updatedAt = updatedAt;
  }

  public void markRejected(OffsetDateTime updatedAt) {
    status = STATUS_REJECTED;
    this.updatedAt = updatedAt;
  }

  public boolean isHidden() {
    return hiddenAt != null;
  }

  public void hideFromUi(OffsetDateTime hiddenAt) {
    this.hiddenAt = hiddenAt;
    this.updatedAt = hiddenAt;
  }
}
