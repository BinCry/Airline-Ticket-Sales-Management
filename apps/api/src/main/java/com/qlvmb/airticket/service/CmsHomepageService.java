package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.dto.BackofficeCmsHomepageResponse;
import com.qlvmb.airticket.domain.dto.CmsHomepageEntryUpsertRequest;
import com.qlvmb.airticket.domain.dto.CmsHomepageResponse;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.CmsHomepageEntryEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.NotFoundException;
import com.qlvmb.airticket.repository.AuditLogRepository;
import com.qlvmb.airticket.repository.CmsHomepageEntryRepository;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.AuthenticatedUser;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CmsHomepageService {

  private final CmsHomepageEntryRepository cmsHomepageEntryRepository;
  private final UserAccountRepository userAccountRepository;
  private final AuditLogRepository auditLogRepository;

  public CmsHomepageService(
      CmsHomepageEntryRepository cmsHomepageEntryRepository,
      UserAccountRepository userAccountRepository,
      AuditLogRepository auditLogRepository
  ) {
    this.cmsHomepageEntryRepository = cmsHomepageEntryRepository;
    this.userAccountRepository = userAccountRepository;
    this.auditLogRepository = auditLogRepository;
  }

  @Transactional(readOnly = true)
  public CmsHomepageResponse getHomepageContent() {
    List<CmsHomepageEntryEntity> entries =
        cmsHomepageEntryRepository.findAllByPublishedTrueAndArchivedFalseOrderBySectionAscSortOrderAscIdAsc();

    return toHomepageResponse(entries);
  }

  @Transactional(readOnly = true)
  public BackofficeCmsHomepageResponse getBackofficeHomepage() {
    List<CmsHomepageEntryEntity> entries =
        cmsHomepageEntryRepository.findAllByArchivedFalseOrderBySectionAscSortOrderAscIdAsc();
    CmsHomepageResponse homepage = toHomepageResponse(entries.stream()
        .filter(CmsHomepageEntryEntity::isPublished)
        .toList());

    return new BackofficeCmsHomepageResponse(
        homepage.banners(),
        homepage.articles(),
        homepage.faqCards(),
        entries.stream()
            .map(this::toBackofficeEntry)
            .toList()
    );
  }

  @Transactional
  public BackofficeCmsHomepageResponse.EntryItem createEntry(
      AuthenticatedUser actor,
      CmsHomepageEntryUpsertRequest request
  ) {
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    CmsHomepageEntryEntity entry = CmsHomepageEntryEntity.create(
        normalizeSection(request.section()),
        request.title().trim(),
        normalizeOptionalText(request.subtitle()),
        normalizeOptionalText(request.cta()),
        normalizeOptionalText(request.category()),
        normalizeOptionalText(request.summary()),
        request.locale().trim().toLowerCase(Locale.ROOT),
        request.sortOrder(),
        request.published(),
        now
    );
    CmsHomepageEntryEntity savedEntry = cmsHomepageEntryRepository.save(entry);
    writeAudit(actor, "cms.homepage.create", savedEntry.getId().toString(),
        "Tạo mục " + savedEntry.getSection() + " với tiêu đề " + savedEntry.getTitle(), now);
    return toBackofficeEntry(savedEntry);
  }

  @Transactional
  public BackofficeCmsHomepageResponse.EntryItem updateEntry(
      AuthenticatedUser actor,
      Long entryId,
      CmsHomepageEntryUpsertRequest request
  ) {
    CmsHomepageEntryEntity entry = requireEntry(entryId);
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    entry.updateContent(
        normalizeSection(request.section()),
        request.title().trim(),
        normalizeOptionalText(request.subtitle()),
        normalizeOptionalText(request.cta()),
        normalizeOptionalText(request.category()),
        normalizeOptionalText(request.summary()),
        request.locale().trim().toLowerCase(Locale.ROOT),
        request.sortOrder(),
        request.published(),
        now
    );
    writeAudit(actor, "cms.homepage.update", entry.getId().toString(),
        "Cập nhật mục " + entry.getSection() + " với tiêu đề " + entry.getTitle(), now);
    return toBackofficeEntry(entry);
  }

  @Transactional
  public BackofficeCmsHomepageResponse.EntryItem publishEntry(
      AuthenticatedUser actor,
      Long entryId
  ) {
    CmsHomepageEntryEntity entry = requireEntry(entryId);
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    entry.publish(now);
    writeAudit(actor, "cms.homepage.publish", entry.getId().toString(),
        "Phát hành mục " + entry.getSection() + " với tiêu đề " + entry.getTitle(), now);
    return toBackofficeEntry(entry);
  }

  @Transactional
  public BackofficeCmsHomepageResponse.EntryItem archiveEntry(
      AuthenticatedUser actor,
      Long entryId
  ) {
    CmsHomepageEntryEntity entry = requireEntry(entryId);
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    entry.archive(now);
    writeAudit(actor, "cms.homepage.archive", entry.getId().toString(),
        "Lưu trữ mục " + entry.getSection() + " với tiêu đề " + entry.getTitle(), now);
    return toBackofficeEntry(entry);
  }

  private CmsHomepageResponse toHomepageResponse(List<CmsHomepageEntryEntity> entries) {
    return new CmsHomepageResponse(
        entries.stream()
            .filter(entry -> CmsHomepageEntryEntity.SECTION_BANNER.equals(entry.getSection()))
            .map(entry -> new CmsHomepageResponse.HeroBanner(
                entry.getTitle(),
                entry.getSubtitle(),
                entry.getCta(),
                entry.getLocale()
            ))
            .toList(),
        entries.stream()
            .filter(entry -> CmsHomepageEntryEntity.SECTION_ARTICLE.equals(entry.getSection()))
            .map(entry -> new CmsHomepageResponse.ContentCard(
                entry.getTitle(),
                entry.getCategory(),
                entry.getSummary(),
                entry.getLocale()
            ))
            .toList(),
        entries.stream()
            .filter(entry -> CmsHomepageEntryEntity.SECTION_FAQ.equals(entry.getSection()))
            .map(entry -> new CmsHomepageResponse.ContentCard(
                entry.getTitle(),
                entry.getCategory(),
                entry.getSummary(),
                entry.getLocale()
            ))
            .toList()
    );
  }

  private BackofficeCmsHomepageResponse.EntryItem toBackofficeEntry(CmsHomepageEntryEntity entry) {
    return new BackofficeCmsHomepageResponse.EntryItem(
        entry.getId(),
        entry.getSection(),
        entry.getTitle(),
        entry.getSubtitle(),
        entry.getCta(),
        entry.getCategory(),
        entry.getSummary(),
        entry.getLocale(),
        entry.getSortOrder(),
        entry.isPublished(),
        entry.isArchived(),
        entry.getCreatedAt(),
        entry.getUpdatedAt()
    );
  }

  private CmsHomepageEntryEntity requireEntry(Long entryId) {
    CmsHomepageEntryEntity entry = cmsHomepageEntryRepository.findById(entryId)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy mục nội dung cần xử lý."));
    if (entry.isArchived()) {
      throw new NotFoundException("Mục nội dung đã được lưu trữ.");
    }
    return entry;
  }

  private String normalizeSection(String section) {
    return section.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeOptionalText(String value) {
    if (value == null) {
      return null;
    }
    String normalizedValue = value.trim();
    return normalizedValue.isEmpty() ? null : normalizedValue;
  }

  private void writeAudit(
      AuthenticatedUser actor,
      String action,
      String targetId,
      String detail,
      OffsetDateTime createdAt
  ) {
    UserAccountEntity actorAccount = userAccountRepository.findOneWithRolesById(actor.userId())
        .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản nội bộ đang thao tác."));
    auditLogRepository.save(AuditLogEntity.create(
        actorAccount,
        action,
        "cms_homepage_entry",
        targetId,
        detail,
        createdAt
    ));
  }
}
