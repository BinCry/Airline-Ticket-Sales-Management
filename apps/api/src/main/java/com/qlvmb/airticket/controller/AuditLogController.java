package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.AuditLogFilterRequest;
import com.qlvmb.airticket.domain.dto.AuditLogPageResponse;
import com.qlvmb.airticket.exception.UnauthorizedException;
import com.qlvmb.airticket.security.AuthenticatedUser;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.AuditLogExportService;
import com.qlvmb.airticket.service.AuditLogQueryService;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/audit-logs")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_ADMIN + "')")
public class AuditLogController {

  private static final Logger LOGGER = LoggerFactory.getLogger(AuditLogController.class);
  private final AuditLogQueryService auditLogQueryService;
  private final AuditLogExportService exportService;

  public AuditLogController(AuditLogQueryService auditLogQueryService, AuditLogExportService exportService) {
    this.auditLogQueryService = auditLogQueryService;
    this.exportService = exportService;
  }

  @GetMapping
  public AuditLogPageResponse getAuditLogs(
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size,
      @RequestParam(required = false) String actorId,
      @RequestParam(required = false) String actorKeyword,
      @RequestParam(required = false) String actionPrefix,
      @RequestParam(required = false) String action,
      @RequestParam(required = false) String targetType,
      @RequestParam(required = false) String targetId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) Boolean includeHidden
  ) {
    // Tạo DTO trực tiếp để lỗi validation không bị bọc bởi constructor binding.
    AuditLogFilterRequest filter = new AuditLogFilterRequest(page, size, actorId, actorKeyword,
        actionPrefix, action, targetType, targetId, from, to, keyword, includeHidden);
    return auditLogQueryService.getAuditLogs(filter);
  }

  @GetMapping("/actions")
  public List<String> getActions() {
    return auditLogQueryService.getActions();
  }

  @GetMapping("/export")
  public void exportAuditLogs(
      Authentication authentication,
      HttpServletResponse response,
      @RequestParam(required = false) String actorId,
      @RequestParam(required = false) String actorKeyword,
      @RequestParam(required = false) String actionPrefix,
      @RequestParam(required = false) String action,
      @RequestParam(required = false) String targetType,
      @RequestParam(required = false) String targetId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) Boolean includeHidden
  ) throws IOException {
    if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
      throw new UnauthorizedException("Bạn cần đăng nhập để xuất nhật ký.");
    }
    AuditLogFilterRequest filter = new AuditLogFilterRequest(null, null, actorId, actorKeyword,
        actionPrefix, action, targetType, targetId, from, to, keyword, includeHidden);
    try (var file = exportService.prepare(filter)) {
      response.setContentType("text/csv; charset=UTF-8");
      response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
          ContentDisposition.attachment().filename(file.filename()).build().toString());
      response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
      response.setHeader("X-Export-Truncated", Boolean.toString(file.truncated()));
      if (file.truncated()) {
        response.setHeader("X-Export-Warning", "truncated-at-10000-rows");
      }
      // Chỉ expose header của response này, giữ nguyên CORS của mọi endpoint khác.
      response.setHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS,
          "Content-Disposition, X-Export-Truncated, X-Export-Warning");
      response.setContentLengthLong(file.contentLength());
      try {
        exportService.writeTo(file, user.userId(), response.getOutputStream());
      } catch (IOException exception) {
        LOGGER.warn("Không truyền xong CSV nhật ký; actorId={}", user.userId(), exception);
        if (!response.isCommitted()) {
          response.reset();
          throw new IllegalStateException("Không thể truyền tệp CSV.", exception);
        }
      }
    }
  }
}
