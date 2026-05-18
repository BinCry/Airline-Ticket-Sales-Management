package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "cms_homepage_entry")
public class CmsHomepageEntryEntity {

  public static final String SECTION_BANNER = "banner";
  public static final String SECTION_ARTICLE = "article";
  public static final String SECTION_FAQ = "faq";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 16)
  private String section;

  @Column(nullable = false, length = 160)
  private String title;

  @Column(length = 255)
  private String subtitle;

  @Column(length = 160)
  private String cta;

  @Column(length = 120)
  private String category;

  @Column(length = 500)
  private String summary;

  @Column(nullable = false, length = 10)
  private String locale;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Column(nullable = false)
  private boolean published;

  @Column(nullable = false)
  private boolean archived;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  protected CmsHomepageEntryEntity() {
  }

  public Long getId() {
    return id;
  }

  public String getSection() {
    return section;
  }

  public String getTitle() {
    return title;
  }

  public String getSubtitle() {
    return subtitle;
  }

  public String getCta() {
    return cta;
  }

  public String getCategory() {
    return category;
  }

  public String getSummary() {
    return summary;
  }

  public String getLocale() {
    return locale;
  }

  public int getSortOrder() {
    return sortOrder;
  }

  public boolean isPublished() {
    return published;
  }

  public boolean isArchived() {
    return archived;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public static CmsHomepageEntryEntity create(
      String section,
      String title,
      String subtitle,
      String cta,
      String category,
      String summary,
      String locale,
      int sortOrder,
      boolean published,
      OffsetDateTime createdAt
  ) {
    CmsHomepageEntryEntity entry = new CmsHomepageEntryEntity();
    entry.section = section;
    entry.title = title;
    entry.subtitle = subtitle;
    entry.cta = cta;
    entry.category = category;
    entry.summary = summary;
    entry.locale = locale;
    entry.sortOrder = sortOrder;
    entry.published = published;
    entry.archived = false;
    entry.createdAt = createdAt;
    entry.updatedAt = createdAt;
    return entry;
  }

  public void updateContent(
      String section,
      String title,
      String subtitle,
      String cta,
      String category,
      String summary,
      String locale,
      int sortOrder,
      boolean published,
      OffsetDateTime updatedAt
  ) {
    this.section = section;
    this.title = title;
    this.subtitle = subtitle;
    this.cta = cta;
    this.category = category;
    this.summary = summary;
    this.locale = locale;
    this.sortOrder = sortOrder;
    this.published = published;
    this.updatedAt = updatedAt;
  }

  public void publish(OffsetDateTime updatedAt) {
    this.published = true;
    this.archived = false;
    this.updatedAt = updatedAt;
  }

  public void archive(OffsetDateTime updatedAt) {
    this.published = false;
    this.archived = true;
    this.updatedAt = updatedAt;
  }
}
