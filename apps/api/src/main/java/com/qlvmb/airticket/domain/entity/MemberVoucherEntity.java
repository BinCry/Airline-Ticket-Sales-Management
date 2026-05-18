package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "member_voucher")
public class MemberVoucherEntity {

  public static final String STATUS_AVAILABLE = "AVAILABLE";
  public static final String STATUS_RESERVED = "RESERVED";
  public static final String STATUS_USED = "USED";
  public static final String STATUS_EXPIRED = "EXPIRED";
  public static final String STATUS_REVOKED = "REVOKED";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "voucher_code", nullable = false, unique = true, length = 40)
  private String voucherCode;

  @Column(nullable = false, length = 160)
  private String title;

  @Column(nullable = false, length = 255)
  private String description;

  @Column(name = "discount_amount", nullable = false)
  private long discountAmount;

  @Column(nullable = false, length = 8)
  private String currency;

  @Column(nullable = false, length = 16)
  private String status;

  @Column(name = "expires_at", nullable = false)
  private OffsetDateTime expiresAt;

  @Column(name = "used_at")
  private OffsetDateTime usedAt;

  @Column(name = "booking_code", length = 6)
  private String bookingCode;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @Column(name = "operations_hidden_at")
  private OffsetDateTime operationsHiddenAt;

  @Column(name = "member_hidden_at")
  private OffsetDateTime memberHiddenAt;

  protected MemberVoucherEntity() {
  }

  public Long getId() {
    return id;
  }

  public Long getUserId() {
    return userId;
  }

  public String getVoucherCode() {
    return voucherCode;
  }

  public String getTitle() {
    return title;
  }

  public String getDescription() {
    return description;
  }

  public long getDiscountAmount() {
    return discountAmount;
  }

  public String getCurrency() {
    return currency;
  }

  public String getStatus() {
    return status;
  }

  public OffsetDateTime getExpiresAt() {
    return expiresAt;
  }

  public OffsetDateTime getUsedAt() {
    return usedAt;
  }

  public String getBookingCode() {
    return bookingCode;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public OffsetDateTime getOperationsHiddenAt() {
    return operationsHiddenAt;
  }

  public OffsetDateTime getMemberHiddenAt() {
    return memberHiddenAt;
  }

  public boolean isAvailable() {
    return STATUS_AVAILABLE.equals(status);
  }

  public boolean isReserved() {
    return STATUS_RESERVED.equals(status);
  }

  public boolean isUsed() {
    return STATUS_USED.equals(status);
  }

  public boolean isHiddenForOperations() {
    return operationsHiddenAt != null;
  }

  public boolean isHiddenForMember() {
    return memberHiddenAt != null;
  }

  public boolean isReservedForBooking(String bookingCode) {
    return STATUS_RESERVED.equals(status)
        && bookingCode != null
        && bookingCode.equalsIgnoreCase(this.bookingCode);
  }

  public boolean belongsToBooking(String bookingCode) {
    return bookingCode != null
        && this.bookingCode != null
        && bookingCode.equalsIgnoreCase(this.bookingCode);
  }

  public boolean isExpired(OffsetDateTime currentTime) {
    return expiresAt.isBefore(currentTime) || expiresAt.isEqual(currentTime) || STATUS_EXPIRED.equals(status);
  }

  public static MemberVoucherEntity create(
      Long userId,
      String voucherCode,
      String title,
      String description,
      long discountAmount,
      String currency,
      OffsetDateTime expiresAt,
      OffsetDateTime createdAt
  ) {
    MemberVoucherEntity voucher = new MemberVoucherEntity();
    voucher.userId = userId;
    voucher.voucherCode = voucherCode;
    voucher.title = title;
    voucher.description = description;
    voucher.discountAmount = discountAmount;
    voucher.currency = currency;
    voucher.status = STATUS_AVAILABLE;
    voucher.expiresAt = expiresAt;
    voucher.usedAt = null;
    voucher.bookingCode = null;
    voucher.createdAt = createdAt;
    voucher.updatedAt = createdAt;
    voucher.operationsHiddenAt = null;
    voucher.memberHiddenAt = null;
    return voucher;
  }

  public void reserveForBooking(String bookingCode, OffsetDateTime updatedAt) {
    status = STATUS_RESERVED;
    this.bookingCode = bookingCode;
    usedAt = null;
    this.updatedAt = updatedAt;
  }

  public void releaseReservation(OffsetDateTime updatedAt) {
    status = STATUS_AVAILABLE;
    bookingCode = null;
    usedAt = null;
    this.updatedAt = updatedAt;
  }

  public void markUsed(String bookingCode, OffsetDateTime usedAt) {
    status = STATUS_USED;
    this.bookingCode = bookingCode;
    this.usedAt = usedAt;
    operationsHiddenAt = null;
    updatedAt = usedAt;
  }

  public void markExpired(OffsetDateTime updatedAt) {
    status = STATUS_EXPIRED;
    bookingCode = null;
    usedAt = null;
    this.updatedAt = updatedAt;
  }

  public void updateBackofficeMetadata(
      String title,
      String description,
      long discountAmount,
      String currency,
      OffsetDateTime expiresAt,
      OffsetDateTime updatedAt
  ) {
    this.title = title;
    this.description = description;
    this.discountAmount = discountAmount;
    this.currency = currency;
    this.expiresAt = expiresAt;
    this.updatedAt = updatedAt;
  }

  public void applyBackofficeStatus(String status, OffsetDateTime updatedAt) {
    this.status = status;
    if (!STATUS_USED.equals(status)) {
      bookingCode = null;
      usedAt = null;
    }
    if (STATUS_REVOKED.equals(status)) {
      memberHiddenAt = updatedAt;
    } else {
      memberHiddenAt = null;
    }
    this.updatedAt = updatedAt;
  }

  public void revoke(OffsetDateTime updatedAt) {
    status = STATUS_REVOKED;
    bookingCode = null;
    usedAt = null;
    memberHiddenAt = updatedAt;
    this.updatedAt = updatedAt;
  }

  public void hideForOperations(OffsetDateTime hiddenAt) {
    operationsHiddenAt = hiddenAt;
    updatedAt = hiddenAt;
  }

  public void hideForMember(OffsetDateTime hiddenAt) {
    memberHiddenAt = hiddenAt;
    updatedAt = hiddenAt;
  }
}
