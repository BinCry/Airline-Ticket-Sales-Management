package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "member_loyalty_ledger")
public class MemberLoyaltyLedgerEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "loyalty_account_id", nullable = false)
  private Long loyaltyAccountId;

  @Column(name = "entry_type", nullable = false, length = 32)
  private String entryType;

  @Column(name = "points_delta", nullable = false)
  private int pointsDelta;

  @Column(name = "balance_after", nullable = false)
  private int balanceAfter;

  @Column(name = "booking_code", length = 6)
  private String bookingCode;

  @Column(nullable = false, length = 255)
  private String description;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  protected MemberLoyaltyLedgerEntity() {
  }

  public Long getId() {
    return id;
  }

  public Long getLoyaltyAccountId() {
    return loyaltyAccountId;
  }

  public String getEntryType() {
    return entryType;
  }

  public int getPointsDelta() {
    return pointsDelta;
  }

  public int getBalanceAfter() {
    return balanceAfter;
  }

  public String getBookingCode() {
    return bookingCode;
  }

  public String getDescription() {
    return description;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }
}
