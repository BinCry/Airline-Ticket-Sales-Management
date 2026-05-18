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
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;

@Entity
@Table(
    name = "auth_provider_identity",
    uniqueConstraints = @UniqueConstraint(columnNames = {"provider", "provider_subject"})
)
public class AuthProviderIdentityEntity {

  public static final String PROVIDER_GOOGLE = "google";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserAccountEntity userAccount;

  @Column(nullable = false, length = 32)
  private String provider;

  @Column(name = "provider_subject", nullable = false, length = 190)
  private String providerSubject;

  @Column(nullable = false, length = 160)
  private String email;

  @Column(name = "avatar_url", length = 500)
  private String avatarUrl;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected AuthProviderIdentityEntity() {
  }

  public static AuthProviderIdentityEntity createGoogle(
      UserAccountEntity userAccount,
      String providerSubject,
      String email,
      String avatarUrl,
      OffsetDateTime createdAt
  ) {
    AuthProviderIdentityEntity identity = new AuthProviderIdentityEntity();
    identity.userAccount = userAccount;
    identity.provider = PROVIDER_GOOGLE;
    identity.providerSubject = providerSubject;
    identity.email = email;
    identity.avatarUrl = avatarUrl;
    identity.createdAt = createdAt;
    identity.updatedAt = createdAt;
    return identity;
  }

  public Long getId() {
    return id;
  }

  public UserAccountEntity getUserAccount() {
    return userAccount;
  }

  public String getProvider() {
    return provider;
  }

  public String getProviderSubject() {
    return providerSubject;
  }

  public String getEmail() {
    return email;
  }

  public String getAvatarUrl() {
    return avatarUrl;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void updateFromGoogle(String email, String avatarUrl, OffsetDateTime updatedAt) {
    this.email = email;
    this.avatarUrl = avatarUrl;
    this.updatedAt = updatedAt;
  }
}
