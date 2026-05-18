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
@Table(name = "audit_log")
public class AuditLogEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "actor_user_id")
  private UserAccountEntity actorUserAccount;

  @Column(nullable = false, length = 120)
  private String action;

  @Column(name = "target_type", nullable = false, length = 80)
  private String targetType;

  @Column(name = "target_id", nullable = false, length = 120)
  private String targetId;

  @Column(nullable = false, length = 1000)
  private String detail;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "hidden_at")
  private OffsetDateTime hiddenAt;

  protected AuditLogEntity() {
  }

  public static AuditLogEntity create(
      UserAccountEntity actorUserAccount,
      String action,
      String targetType,
      String targetId,
      String detail,
      OffsetDateTime createdAt
  ) {
    AuditLogEntity auditLog = new AuditLogEntity();
    auditLog.actorUserAccount = actorUserAccount;
    auditLog.action = action;
    auditLog.targetType = targetType;
    auditLog.targetId = targetId;
    auditLog.detail = detail;
    auditLog.createdAt = createdAt;
    auditLog.hiddenAt = null;
    return auditLog;
  }

  public Long getId() {
    return id;
  }

  public UserAccountEntity getActorUserAccount() {
    return actorUserAccount;
  }

  public String getAction() {
    return action;
  }

  public String getTargetType() {
    return targetType;
  }

  public String getTargetId() {
    return targetId;
  }

  public String getDetail() {
    return detail;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getHiddenAt() {
    return hiddenAt;
  }

  public boolean isHiddenFromUi() {
    return hiddenAt != null;
  }

  public void hideFromUi(OffsetDateTime hiddenAt) {
    this.hiddenAt = hiddenAt;
  }
}
