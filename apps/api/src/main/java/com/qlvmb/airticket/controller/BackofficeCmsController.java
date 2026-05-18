package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.BackofficeCmsHomepageResponse;
import com.qlvmb.airticket.domain.dto.CmsHomepageEntryUpsertRequest;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.CmsHomepageService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/backoffice/cms")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_CMS + "')")
public class BackofficeCmsController {

  private final CmsHomepageService cmsHomepageService;

  public BackofficeCmsController(CmsHomepageService cmsHomepageService) {
    this.cmsHomepageService = cmsHomepageService;
  }

  @GetMapping("/homepage")
  public BackofficeCmsHomepageResponse getHomepageContent() {
    return cmsHomepageService.getBackofficeHomepage();
  }

  @PostMapping("/homepage")
  public BackofficeCmsHomepageResponse.EntryItem createHomepageEntry(
      Authentication authentication,
      @Valid @RequestBody CmsHomepageEntryUpsertRequest request
  ) {
    return cmsHomepageService.createEntry(requireAuthenticatedUser(authentication), request);
  }

  @PatchMapping("/homepage/{entryId}")
  public BackofficeCmsHomepageResponse.EntryItem updateHomepageEntry(
      Authentication authentication,
      @PathVariable Long entryId,
      @Valid @RequestBody CmsHomepageEntryUpsertRequest request
  ) {
    return cmsHomepageService.updateEntry(requireAuthenticatedUser(authentication), entryId, request);
  }

  @PostMapping("/homepage/{entryId}/publish")
  public BackofficeCmsHomepageResponse.EntryItem publishHomepageEntry(
      Authentication authentication,
      @PathVariable Long entryId
  ) {
    return cmsHomepageService.publishEntry(requireAuthenticatedUser(authentication), entryId);
  }

  @PostMapping("/homepage/{entryId}/archive")
  public BackofficeCmsHomepageResponse.EntryItem archiveHomepageEntry(
      Authentication authentication,
      @PathVariable Long entryId
  ) {
    return cmsHomepageService.archiveEntry(requireAuthenticatedUser(authentication), entryId);
  }

  private AuthenticatedUser requireAuthenticatedUser(Authentication authentication) {
    if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser authenticatedUser)) {
      throw new UnauthorizedException("Bạn cần đăng nhập để thực hiện thao tác này.");
    }
    return authenticatedUser;
  }
}
