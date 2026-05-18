package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "booking_lookup_session")
public class BookingLookupSessionEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "booking_code", nullable = false, length = 6)
  private String bookingCode;

  @Column(name = "contact_email", nullable = false, length = 160)
  private String contactEmail;

  @Column(name = "token_key", nullable = false, unique = true, length = 120)
  private String tokenKey;

  @Column(name = "expires_at", nullable = false)
  private OffsetDateTime expiresAt;

  @Column(name = "consumed_at")
  private OffsetDateTime consumedAt;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected BookingLookupSessionEntity() {
  }

  public static BookingLookupSessionEntity issue(
      String bookingCode,
      String contactEmail,
      String tokenKey,
      OffsetDateTime expiresAt,
      OffsetDateTime createdAt
  ) {
    BookingLookupSessionEntity session = new BookingLookupSessionEntity();
    session.bookingCode = bookingCode;
    session.contactEmail = contactEmail;
    session.tokenKey = tokenKey;
    session.expiresAt = expiresAt;
    session.createdAt = createdAt;
    return session;
  }

  public Long getId() {
    return id;
  }

  public String getBookingCode() {
    return bookingCode;
  }

  public String getContactEmail() {
    return contactEmail;
  }

  public String getTokenKey() {
    return tokenKey;
  }

  public OffsetDateTime getExpiresAt() {
    return expiresAt;
  }

  public OffsetDateTime getConsumedAt() {
    return consumedAt;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public boolean isExpired(OffsetDateTime now) {
    return expiresAt.isBefore(now) || expiresAt.isEqual(now);
  }

  public boolean isConsumed() {
    return consumedAt != null;
  }

  public void consume(OffsetDateTime consumedAt) {
    this.consumedAt = consumedAt;
  }
}
