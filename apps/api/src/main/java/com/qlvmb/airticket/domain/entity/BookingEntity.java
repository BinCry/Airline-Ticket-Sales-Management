package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "booking")
public class BookingEntity {

  public static final String STATUS_HOLD = "HOLD";
  public static final String STATUS_TICKETED = "TICKETED";
  public static final String STATUS_REFUND_PENDING = "REFUND_PENDING";
  public static final String STATUS_CANCELLED = "CANCELLED";

  public static final String PAYMENT_STATUS_PENDING = "PENDING";
  public static final String PAYMENT_STATUS_PAID = "PAID";
  public static final String PAYMENT_STATUS_FAILED = "FAILED";
  public static final String PAYMENT_STATUS_EXPIRED = "EXPIRED";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "booking_code", nullable = false, unique = true, length = 6)
  private String bookingCode;

  @Column(nullable = false, length = 16)
  private String status;

  @Column(name = "payment_status", nullable = false, length = 16)
  private String paymentStatus;

  @Column(name = "trip_type", nullable = false, length = 16)
  private String tripType;

  @Column(name = "base_amount", nullable = false)
  private long baseAmount;

  @Column(name = "ancillary_amount", nullable = false)
  private long ancillaryAmount;

  @Column(name = "total_amount", nullable = false)
  private long totalAmount;

  @Column(nullable = false, length = 8)
  private String currency;

  @Column(name = "expires_at", nullable = false)
  private OffsetDateTime expiresAt;

  @Column(name = "ticketed_at")
  private OffsetDateTime ticketedAt;

  @Column(name = "payment_reference", length = 64)
  private String paymentReference;

  @Column(name = "payment_session_url", length = 255)
  private String paymentSessionUrl;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  private BookingContactEntity contact;

  @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("id asc")
  private Set<BookingPassengerEntity> passengers = new LinkedHashSet<>();

  @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("id asc")
  private Set<BookingSegmentEntity> segments = new LinkedHashSet<>();

  @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("id asc")
  private Set<BookingAncillaryEntity> ancillaries = new LinkedHashSet<>();

  @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("id asc")
  private Set<TicketEntity> tickets = new LinkedHashSet<>();

  @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("createdAt desc")
  private Set<RefundRequestEntity> refundRequests = new LinkedHashSet<>();

  protected BookingEntity() {
  }

  public static BookingEntity createHold(
      String bookingCode,
      String tripType,
      long baseAmount,
      long ancillaryAmount,
      long totalAmount,
      String currency,
      OffsetDateTime createdAt,
      OffsetDateTime expiresAt
  ) {
    BookingEntity booking = new BookingEntity();
    booking.bookingCode = bookingCode;
    booking.status = STATUS_HOLD;
    booking.paymentStatus = PAYMENT_STATUS_PENDING;
    booking.tripType = tripType;
    booking.baseAmount = baseAmount;
    booking.ancillaryAmount = ancillaryAmount;
    booking.totalAmount = totalAmount;
    booking.currency = currency;
    booking.expiresAt = expiresAt;
    booking.createdAt = createdAt;
    booking.updatedAt = createdAt;
    return booking;
  }

  public Long getId() {
    return id;
  }

  public String getBookingCode() {
    return bookingCode;
  }

  public String getStatus() {
    return status;
  }

  public String getPaymentStatus() {
    return paymentStatus;
  }

  public String getTripType() {
    return tripType;
  }

  public long getBaseAmount() {
    return baseAmount;
  }

  public long getAncillaryAmount() {
    return ancillaryAmount;
  }

  public long getTotalAmount() {
    return totalAmount;
  }

  public String getCurrency() {
    return currency;
  }

  public OffsetDateTime getExpiresAt() {
    return expiresAt;
  }

  public OffsetDateTime getTicketedAt() {
    return ticketedAt;
  }

  public String getPaymentReference() {
    return paymentReference;
  }

  public String getPaymentSessionUrl() {
    return paymentSessionUrl;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public BookingContactEntity getContact() {
    return contact;
  }

  public Set<BookingPassengerEntity> getPassengers() {
    return passengers;
  }

  public Set<BookingSegmentEntity> getSegments() {
    return segments;
  }

  public Set<BookingAncillaryEntity> getAncillaries() {
    return ancillaries;
  }

  public Set<TicketEntity> getTickets() {
    return tickets;
  }

  public Set<RefundRequestEntity> getRefundRequests() {
    return refundRequests;
  }

  public void assignContact(BookingContactEntity contact) {
    this.contact = contact;
  }

  public void addPassenger(BookingPassengerEntity passenger) {
    passengers.add(passenger);
  }

  public void addSegment(BookingSegmentEntity segment) {
    segments.add(segment);
  }

  public void addAncillary(BookingAncillaryEntity ancillary) {
    ancillaries.add(ancillary);
  }

  public void addTicket(TicketEntity ticket) {
    tickets.add(ticket);
  }

  public void addRefundRequest(RefundRequestEntity refundRequest) {
    refundRequests.add(refundRequest);
  }

  public boolean isExpired(OffsetDateTime currentTime) {
    return expiresAt.isBefore(currentTime) || expiresAt.isEqual(currentTime);
  }

  public boolean isHold() {
    return STATUS_HOLD.equals(status);
  }

  public boolean isTicketed() {
    return STATUS_TICKETED.equals(status);
  }

  public boolean isRefundPending() {
    return STATUS_REFUND_PENDING.equals(status);
  }

  public void markPaymentSessionPending(String paymentSessionUrl, OffsetDateTime updatedAt) {
    this.paymentSessionUrl = paymentSessionUrl;
    this.paymentStatus = PAYMENT_STATUS_PENDING;
    this.updatedAt = updatedAt;
  }

  public void markPaymentFailed(OffsetDateTime updatedAt) {
    paymentStatus = PAYMENT_STATUS_FAILED;
    this.updatedAt = updatedAt;
  }

  public void markExpired(OffsetDateTime updatedAt) {
    status = STATUS_CANCELLED;
    paymentStatus = PAYMENT_STATUS_EXPIRED;
    this.updatedAt = updatedAt;
  }

  public void markTicketed(String paymentReference, OffsetDateTime ticketedAt) {
    status = STATUS_TICKETED;
    paymentStatus = PAYMENT_STATUS_PAID;
    this.paymentReference = paymentReference;
    this.ticketedAt = ticketedAt;
    this.updatedAt = ticketedAt;
  }

  public void markRefundPending(OffsetDateTime updatedAt) {
    status = STATUS_REFUND_PENDING;
    this.updatedAt = updatedAt;
  }

  public void markCancelled(OffsetDateTime updatedAt) {
    status = STATUS_CANCELLED;
    this.updatedAt = updatedAt;
  }

  public void markTicketedAgain(OffsetDateTime updatedAt) {
    status = STATUS_TICKETED;
    this.updatedAt = updatedAt;
  }
}
