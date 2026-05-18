package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.domain.entity.CmsHomepageEntryEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CmsHomepageEntryRepository extends JpaRepository<CmsHomepageEntryEntity, Long> {

  List<CmsHomepageEntryEntity> findAllByPublishedTrueAndArchivedFalseOrderBySectionAscSortOrderAscIdAsc();

  List<CmsHomepageEntryEntity> findAllByArchivedFalseOrderBySectionAscSortOrderAscIdAsc();
}
