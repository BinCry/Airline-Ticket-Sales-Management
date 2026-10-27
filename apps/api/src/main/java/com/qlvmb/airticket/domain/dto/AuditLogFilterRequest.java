package com.qlvmb.airticket.domain.dto;

import com.qlvmb.airticket.exception.BadRequestException;
import java.time.DateTimeException;
import java.time.LocalDate;

public record AuditLogFilterRequest(
    Integer page,
    Integer size,
    String actorId,
    String actorKeyword,
    String actionPrefix,
    String action,
    String targetType,
    String targetId,
    LocalDate from,
    LocalDate to,
    String keyword,
    Boolean includeHidden
) {

  public AuditLogFilterRequest {
    page = page == null ? 0 : page;
    size = size == null ? 20 : Math.min(size, 100);
    includeHidden = Boolean.TRUE.equals(includeHidden);
    if (page < 0 || size < 1) {
      throw new BadRequestException("Trang phải từ 0 và số dòng mỗi trang phải lớn hơn 0.");
    }
    if ((long) page * size > Integer.MAX_VALUE) {
      throw new BadRequestException("Vị trí phân trang vượt giới hạn truy vấn, hãy thu hẹp bộ lọc.");
    }

    actorId = normalizeText(actorId, "Người thao tác", 19);
    if (actorId != null && !"none".equals(actorId)) {
      try {
        if (!actorId.matches("[0-9]+") || Long.parseLong(actorId) <= 0) {
          throw new NumberFormatException();
        }
        actorId = Long.toString(Long.parseLong(actorId));
      } catch (NumberFormatException exception) {
        throw new BadRequestException("Người thao tác phải là ID dương hoặc giá trị none.");
      }
    }

    actorKeyword = normalizeText(actorKeyword, "Email hoặc tên người thao tác", 160);
    actionPrefix = normalizeText(actionPrefix, "Tiền tố hành động", 120);
    action = normalizeText(action, "Hành động", 120);
    targetType = normalizeText(targetType, "Loại đối tượng", 80);
    targetId = normalizeText(targetId, "Mã đối tượng", 120);
    keyword = normalizeText(keyword, "Từ khóa", 1000);

    if (from != null && to != null && from.isAfter(to)) {
      throw new BadRequestException("Ngày bắt đầu không được sau ngày kết thúc.");
    }
    if (to != null) {
      try {
        to.plusDays(1);
      } catch (DateTimeException exception) {
        throw new BadRequestException("Ngày kết thúc vượt giới hạn thời gian hỗ trợ.");
      }
    }
  }

  private static String normalizeText(String value, String label, int maxLength) {
    if (value == null) {
      return null;
    }
    String normalized = value.strip();
    if (normalized.isEmpty()) {
      return null;
    }
    if (normalized.codePointCount(0, normalized.length()) > maxLength) {
      throw new BadRequestException(label + " không được vượt quá " + maxLength + " ký tự.");
    }
    return normalized;
  }
}
