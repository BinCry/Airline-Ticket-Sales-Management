package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "oauth_temporary_code")
public class OAuthTemporaryCodeEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "state_hash", nullable = false, length = 64, unique = true)
  private String stateHash;

  @Column(name = "exchange_code_hash", length = 64, unique = true)
  private String exchangeCodeHash;

  @Column(nullable = false, length = 32)
  private String provider;

  @Column(name = "provider_subject", length = 190)
  private String providerSubject;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private UserAccountEntity userAccount;

  @Column(name = "redirect_to", length = 500)
  private String redirectTo;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "expires_at", nullable = false)
  private OffsetDateTime expiresAt;

  @Column(name = "consumed_at")
  private OffsetDateTime consumedAt;

  protected OAuthTemporaryCodeEntity() {
  }

  public static OAuthTemporaryCodeEntity issueState(
      String stateHash,
      String provider,
      String redirectTo,
      OffsetDateTime createdAt,
      OffsetDateTime expiresAt
  ) {
    OAuthTemporaryCodeEntity temporaryCode = new OAuthTemporaryCodeEntity();
    temporaryCode.stateHash = stateHash;
    temporaryCode.provider = provider;
    temporaryCode.redirectTo = redirectTo;
    temporaryCode.createdAt = createdAt;
    temporaryCode.expiresAt = expiresAt;
    return temporaryCode;
  }

  public Long getId() {
    return id;
  }

  public String getStateHash() {
    return stateHash;
  }

  public String getExchangeCodeHash() {
    return exchangeCodeHash;
  }

  public String getProvider() {
    return provider;
  }

  public String getProviderSubject() {
    return providerSubject;
  }

  public UserAccountEntity getUserAccount() {
    return userAccount;
  }

  public String getRedirectTo() {
    return redirectTo;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getExpiresAt() {
    return expiresAt;
  }

  public OffsetDateTime getConsumedAt() {
    return consumedAt;
  }

  public boolean isExpired(OffsetDateTime currentTime) {
    return expiresAt.isBefore(currentTime);
  }

  public boolean isConsumed() {
    return consumedAt != null;
  }

  public void attachExchangeCode(
      String exchangeCodeHash,
      String providerSubject,
      UserAccountEntity userAccount,
      OffsetDateTime expiresAt
  ) {
    this.exchangeCodeHash = exchangeCodeHash;
    this.providerSubject = providerSubject;
    this.userAccount = userAccount;
    this.expiresAt = expiresAt;
  }

  public void consume(OffsetDateTime consumedAt) {
    this.consumedAt = consumedAt;
  }
}
