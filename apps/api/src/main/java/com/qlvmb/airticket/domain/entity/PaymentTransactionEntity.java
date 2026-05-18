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
@Table(name = "payment_transaction")
public class PaymentTransactionEntity {

  public static final String STATUS_PENDING = "PENDING";
  public static final String STATUS_PAID = "PAID";
  public static final String STATUS_FAILED = "FAILED";
  public static final String STATUS_EXPIRED = "EXPIRED";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "booking_id", nullable = false, unique = true)
  private BookingEntity booking;

  @Column(nullable = false, length = 32)
  private String provider;

  @Column(name = "session_mode", nullable = false, length = 16)
  private String sessionMode;

  @Column(name = "order_code", nullable = false, unique = true, length = 64)
  private String orderCode;

  @Column(name = "provider_order_id", length = 96)
  private String providerOrderId;

  @Column(name = "external_transaction_id")
  private Long externalTransactionId;

  @Column(name = "external_reference_code", length = 128)
  private String externalReferenceCode;

  @Column(nullable = false, length = 16)
  private String status;

  @Column(nullable = false)
  private long amount;

  @Column(name = "payment_url", length = 255)
  private String paymentUrl;

  @Column(name = "qr_code_url")
  private String qrCodeUrl;

  @Column(name = "qr_code_data_url")
  private String qrCodeDataUrl;

  @Column(name = "bank_name", length = 120)
  private String bankName;

  @Column(name = "account_number", length = 64)
  private String accountNumber;

  @Column(name = "account_holder_name", length = 160)
  private String accountHolderName;

  @Column(name = "last_payload")
  private String lastPayload;

  @Column(name = "paid_at")
  private OffsetDateTime paidAt;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected PaymentTransactionEntity() {
  }

  public static PaymentTransactionEntity createPending(
      BookingEntity booking,
      String provider,
      String sessionMode,
      String orderCode,
      long amount,
      String paymentUrl,
      String qrCodeUrl,
      String qrCodeDataUrl,
      String bankName,
      String accountNumber,
      String accountHolderName,
      String providerOrderId,
      OffsetDateTime createdAt
  ) {
    PaymentTransactionEntity transaction = new PaymentTransactionEntity();
    transaction.booking = booking;
    transaction.provider = provider;
    transaction.sessionMode = sessionMode;
    transaction.orderCode = orderCode;
    transaction.amount = amount;
    transaction.status = STATUS_PENDING;
    transaction.paymentUrl = paymentUrl;
    transaction.qrCodeUrl = qrCodeUrl;
    transaction.qrCodeDataUrl = qrCodeDataUrl;
    transaction.bankName = bankName;
    transaction.accountNumber = accountNumber;
    transaction.accountHolderName = accountHolderName;
    transaction.providerOrderId = providerOrderId;
    transaction.createdAt = createdAt;
    transaction.updatedAt = createdAt;
    return transaction;
  }

  public Long getId() {
    return id;
  }

  public BookingEntity getBooking() {
    return booking;
  }

  public String getProvider() {
    return provider;
  }

  public String getSessionMode() {
    return sessionMode;
  }

  public String getOrderCode() {
    return orderCode;
  }

  public String getProviderOrderId() {
    return providerOrderId;
  }

  public Long getExternalTransactionId() {
    return externalTransactionId;
  }

  public String getExternalReferenceCode() {
    return externalReferenceCode;
  }

  public String getStatus() {
    return status;
  }

  public long getAmount() {
    return amount;
  }

  public String getPaymentUrl() {
    return paymentUrl;
  }

  public String getQrCodeUrl() {
    return qrCodeUrl;
  }

  public String getQrCodeDataUrl() {
    return qrCodeDataUrl;
  }

  public String getBankName() {
    return bankName;
  }

  public String getAccountNumber() {
    return accountNumber;
  }

  public String getAccountHolderName() {
    return accountHolderName;
  }

  public String getLastPayload() {
    return lastPayload;
  }

  public OffsetDateTime getPaidAt() {
    return paidAt;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void refreshPendingSession(
      String sessionMode,
      String paymentUrl,
      String qrCodeUrl,
      String qrCodeDataUrl,
      String bankName,
      String accountNumber,
      String accountHolderName,
      String providerOrderId,
      OffsetDateTime updatedAt
  ) {
    this.sessionMode = sessionMode;
    this.status = STATUS_PENDING;
    this.paymentUrl = paymentUrl;
    this.qrCodeUrl = qrCodeUrl;
    this.qrCodeDataUrl = qrCodeDataUrl;
    this.bankName = bankName;
    this.accountNumber = accountNumber;
    this.accountHolderName = accountHolderName;
    this.providerOrderId = providerOrderId;
    this.updatedAt = updatedAt;
  }

  public void markPaid(Long externalTransactionId, String externalReferenceCode, String lastPayload, OffsetDateTime paidAt) {
    this.status = STATUS_PAID;
    this.externalTransactionId = externalTransactionId;
    this.externalReferenceCode = externalReferenceCode;
    this.lastPayload = lastPayload;
    this.paidAt = paidAt;
    this.updatedAt = paidAt;
  }

  public void markFailed(String lastPayload, OffsetDateTime updatedAt) {
    this.status = STATUS_FAILED;
    this.lastPayload = lastPayload;
    this.updatedAt = updatedAt;
  }

  public void markExpired(OffsetDateTime updatedAt) {
    this.status = STATUS_EXPIRED;
    this.updatedAt = updatedAt;
  }
}
