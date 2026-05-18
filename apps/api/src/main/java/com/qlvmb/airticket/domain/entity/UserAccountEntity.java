package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "user_account")
public class UserAccountEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 160)
  private String email;

  @Column(name = "password_hash", nullable = false, length = 255)
  private String passwordHash;

  @Column(name = "display_name", nullable = false, length = 160)
  private String displayName;

  @Column(length = 20)
  private String phone;

  @Column(name = "avatar_url", length = 500)
  private String avatarUrl;

  @Column(nullable = false, length = 32)
  private String status;

  @Column(name = "email_verified", nullable = false)
  private boolean emailVerified;

  @Column(name = "locked_at")
  private OffsetDateTime lockedAt;

  @Column(name = "last_login_at")
  private OffsetDateTime lastLoginAt;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @ManyToMany(fetch = FetchType.LAZY)
  @JoinTable(
      name = "user_role",
      joinColumns = @JoinColumn(name = "user_id"),
      inverseJoinColumns = @JoinColumn(name = "role_id")
  )
  private Set<RoleEntity> roles = new LinkedHashSet<>();

  protected UserAccountEntity() {
  }

  public Long getId() {
    return id;
  }

  public String getEmail() {
    return email;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public String getDisplayName() {
    return displayName;
  }

  public String getPhone() {
    return phone;
  }

  public String getAvatarUrl() {
    return avatarUrl;
  }

  public String getStatus() {
    return status;
  }

  public boolean isEmailVerified() {
    return emailVerified;
  }

  public OffsetDateTime getLockedAt() {
    return lockedAt;
  }

  public OffsetDateTime getLastLoginAt() {
    return lastLoginAt;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public Set<RoleEntity> getRoles() {
    return roles;
  }

  public static UserAccountEntity register(
      String email,
      String passwordHash,
      String displayName,
      String phone,
      String status,
      OffsetDateTime createdAt
  ) {
    UserAccountEntity userAccount = new UserAccountEntity();
    userAccount.email = email;
    userAccount.passwordHash = passwordHash;
    userAccount.displayName = displayName;
    userAccount.phone = phone;
    userAccount.status = status;
    userAccount.emailVerified = false;
    userAccount.createdAt = createdAt;
    userAccount.updatedAt = createdAt;
    return userAccount;
  }

  public void markLoggedIn(OffsetDateTime loggedInAt) {
    lastLoginAt = loggedInAt;
    updatedAt = loggedInAt;
  }

  public void updatePassword(String passwordHash, OffsetDateTime updatedAt) {
    this.passwordHash = passwordHash;
    this.updatedAt = updatedAt;
  }

  public void markEmailVerified(OffsetDateTime updatedAt) {
    emailVerified = true;
    this.updatedAt = updatedAt;
  }

  public void updateProfile(String displayName, String phone, OffsetDateTime updatedAt) {
    this.displayName = displayName;
    this.phone = phone;
    this.updatedAt = updatedAt;
  }

  public void updateAvatar(String avatarUrl, OffsetDateTime updatedAt) {
    this.avatarUrl = avatarUrl;
    this.updatedAt = updatedAt;
  }

  public void updateStatus(String status, OffsetDateTime updatedAt) {
    this.status = status;
    if ("locked".equalsIgnoreCase(status)) {
      lockedAt = updatedAt;
    } else {
      lockedAt = null;
    }
    this.updatedAt = updatedAt;
  }

  public void replaceRoles(Set<RoleEntity> roles, OffsetDateTime updatedAt) {
    this.roles.clear();
    this.roles.addAll(roles);
    this.updatedAt = updatedAt;
  }

  public boolean isLocked() {
    return lockedAt != null;
  }
}
