package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "loyalty_tier_rule")
public class LoyaltyTierRuleEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "tier_name", nullable = false, length = 64)
  private String tierName;

  @Column(name = "min_lifetime_points", nullable = false)
  private int minLifetimePoints;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(nullable = false)
  private boolean active;

  protected LoyaltyTierRuleEntity() {
  }

  public String getTierName() { return tierName; }
  public int getMinLifetimePoints() { return minLifetimePoints; }
  public int getSortOrder() { return sortOrder; }
  public boolean isActive() { return active; }
}
