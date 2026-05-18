package com.qlvmb.airticket.domain.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record BackofficeCmsHomepageResponse(
    List<CmsHomepageResponse.HeroBanner> banners,
    List<CmsHomepageResponse.ContentCard> articles,
    List<CmsHomepageResponse.ContentCard> faqCards,
    List<EntryItem> entries
) {

  public record EntryItem(
      Long id,
      String section,
      String title,
      String subtitle,
      String cta,
      String category,
      String summary,
      String locale,
      int sortOrder,
      boolean published,
      boolean archived,
      OffsetDateTime createdAt,
      OffsetDateTime updatedAt
  ) {
  }
}
