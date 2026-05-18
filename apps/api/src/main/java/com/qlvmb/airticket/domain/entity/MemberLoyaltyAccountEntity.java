package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "member_loyalty_account")
public class MemberLoyaltyAccountEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false, unique = true)
  private Long userId;

  @Column(name = "membership_tier", nullable = false, length = 64)
  private String membershipTier;

  @Column(name = "point_balance", nullable = false)
  private int pointBalance;

  @Column(name = "lifetime_points", nullable = false)
  private int lifetimePoints;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected MemberLoyaltyAccountEntity() {
  }

  public Long getId() {
    return id;
  }

  public Long getUserId() {
    return userId;
  }

  public String getMembershipTier() {
    return membershipTier;
  }

  public int getPointBalance() {
    return pointBalance;
  }

  public int getLifetimePoints() {
    return lifetimePoints;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }
}
