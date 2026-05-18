package com.qlvmb.airticket.domain.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CmsHomepageEntryUpsertRequest(
    @NotBlank
    @Pattern(regexp = "banner|article|faq")
    String section,
    @NotBlank
    @Size(max = 160)
    String title,
    @Size(max = 255)
    String subtitle,
    @Size(max = 160)
    String cta,
    @Size(max = 120)
    String category,
    @Size(max = 500)
    String summary,
    @NotBlank
    @Pattern(regexp = "vi|en")
    String locale,
    @Min(0)
    @Max(999)
    int sortOrder,
    boolean published
) {
}
