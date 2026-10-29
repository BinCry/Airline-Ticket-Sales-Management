import { describe, expect, it } from "vitest";

import { getAuditActionLabel, getAuditDetailPresentation, getAuditDetailSummary, getAuditTargetLabel } from "@/lib/audit-log-presentation";

const exportDetail = {
  filters: { from: "2026-10-22", to: "2026-10-28", includeHidden: false, keyword: "%_\\" },
  rowsPrepared: 10000,
  truncated: true,
  status: "SERVER_WRITE_COMPLETED"
};
const exportItem = (detail: unknown = exportDetail) => ({
  action: "admin.audit.export", targetType: "audit_log", detail: JSON.stringify(detail)
});

describe("Nhãn trình bày Audit", () => {
  it.each([
    ["admin.audit.export", "Xuất nhật ký kiểm toán"],
    ["admin.user.roles.update", "Đổi vai trò tài khoản"],
    ["operations.flight.cancel", "Hủy chuyến bay"],
    ["operations.baggage.deliver", "Trả hành lý"],
    ["sales.booking.create", "Hỗ trợ tạo giữ chỗ"],
    ["cms.homepage.publish", "Phát hành nội dung trang chủ"],
    ["member.loyalty.tier_upgrade", "Tự động nâng hạng hội viên"]
  ])("diễn giải hành động đã có trong source: %s", (action, label) => {
    expect(getAuditActionLabel(action)).toBe(label);
  });

  it.each(["future.action", "admin.audit.export.unknown", "ADMIN.AUDIT.EXPORT", "constructor", "__proto__", ""])(
    "không đoán hành động chưa biết: %s", (action) => expect(getAuditActionLabel(action)).toBe(action)
  );

  it.each([
    ["audit_log", "Nhật ký kiểm toán"], ["user_account", "Tài khoản người dùng"],
    ["member_voucher", "Voucher hội viên"], ["baggage", "Hành lý ký gửi"]
  ])("diễn giải loại đối tượng %s", (type, label) => expect(getAuditTargetLabel(type)).toBe(label));

  it.each(["future_target", "audit_log.other", "constructor", ""])(
    "giữ loại đối tượng chưa biết: %s", (type) => expect(getAuditTargetLabel(type)).toBe(type)
  );
});

describe("Tóm tắt chi tiết nhưng bảo toàn bản gốc", () => {
  it("tóm tắt số dòng chuẩn bị, ngày, giới hạn và trạng thái ghi phía máy chủ", () => {
    const item = Object.freeze(exportItem());
    const original = item.detail;
    expect(getAuditDetailSummary(item)).toBe("Số dòng chuẩn bị: 10000 · Từ 22/10/2026 đến 28/10/2026 · Không gồm bản ghi đã ẩn · Máy chủ đã ghi xong CSV");
    expect(getAuditDetailPresentation(item).warnings).toEqual([{
      tone: "warning", message: "Dữ liệu chuẩn bị cho CSV bị giới hạn ở 10.000 dòng; còn bản ghi chưa được đưa vào CSV."
    }]);
    expect(item.detail).toBe(original);
    expect(getAuditDetailSummary(item)).not.toMatch(/tải thành công|xuất thành công/i);
  });

  it("giữ được số dòng bằng 0 và các cờ false", () => {
    const presentation = getAuditDetailPresentation(exportItem({ ...exportDetail, rowsPrepared: 0, truncated: false }));
    expect(presentation.summary).toContain("Số dòng chuẩn bị: 0");
    expect(presentation.summary).toContain("Không bị cắt");
    expect(presentation.summary).toContain("Không gồm bản ghi đã ẩn");
    expect(presentation.warnings).toEqual([]);
  });

  it("chỉ diễn giải lỗi máy chủ khi có trạng thái được ghi rõ", () => {
    const failed = getAuditDetailPresentation(exportItem({ ...exportDetail, status: "SERVER_WRITE_FAILED" }));
    expect(failed.warnings.map((warning) => warning.tone)).toEqual(["error", "warning"]);
    expect(failed.warnings[0].message).toBe("Máy chủ gặp lỗi khi ghi CSV.");
    expect(failed.summary).not.toContain("ghi xong");
    expect(JSON.stringify(failed)).not.toMatch(/lỗi ghi audit|lỗi lưu sự kiện|tải thành công/i);
    for (const status of [undefined, null, "NEW_STATUS", "success"]) {
      const unknown = getAuditDetailPresentation(exportItem({ ...exportDetail, status, truncated: false }));
      expect(unknown.summary).not.toMatch(/ghi xong|lỗi|thành công/i);
      expect(unknown.warnings).toEqual([]);
    }
  });

  it("không gán giới hạn 10.000 cho dữ liệu cắt không khớp số dòng đã biết", () => {
    const presentation = getAuditDetailPresentation(exportItem({ ...exportDetail, rowsPrepared: 42 }));
    expect(presentation.warnings).toEqual([{ tone: "warning", message: "Dữ liệu bị cắt theo giới hạn xuất." }]);
    expect(presentation.summary).toContain("Số dòng chuẩn bị: 42");
  });

  it("hiện đúng cờ bao gồm log ẩn, không nhầm nó với trạng thái của sự kiện", () => {
    expect(getAuditDetailSummary(exportItem({ ...exportDetail, filters: { ...exportDetail.filters, includeHidden: true } })))
      .toContain("Gồm bản ghi đã ẩn");
  });

  it("không diễn giải JSON cùng cấu trúc ở hành động hoặc đối tượng khác", () => {
    for (const item of [{ ...exportItem(), action: "future.action" }, { ...exportItem(), targetType: "other" }]) {
      expect(getAuditDetailPresentation(item)).toEqual({
        summary: "Chưa có bản diễn giải cho nội dung này. Bạn vẫn có thể xem dữ liệu gốc.", warnings: []
      });
    }
  });

  it.each([
    null, [], 42, "nội dung", { other: "dữ liệu chưa biết" },
    { ...exportDetail, rowsPrepared: "100" }, { ...exportDetail, rowsPrepared: -1 },
    { ...exportDetail, rowsPrepared: undefined }, { ...exportDetail, truncated: undefined },
    { ...exportDetail, rowsPrepared: Number.MAX_SAFE_INTEGER + 1 },
    { ...exportDetail, truncated: "false" }, { ...exportDetail, filters: null },
    { ...exportDetail, filters: { from: "2026-02-30", to: "2026-10-28" } },
    { ...exportDetail, filters: { from: "not-a-date", to: "2026-10-28" } }
  ])("JSON không nhận diện được có fallback an toàn: %j", (detail) => {
    const item = exportItem(detail);
    const original = item.detail;
    expect(getAuditDetailPresentation(item)).toEqual({
      summary: "Chưa có bản diễn giải cho nội dung này. Bạn vẫn có thể xem dữ liệu gốc.", warnings: []
    });
    expect(item.detail).toBe(original);
  });

  it.each(["Đổi trạng thái từ active sang locked", "{ JSON chưa hợp lệ", "<script>alert(1)</script>", "a".repeat(5000)])(
    "giữ nguyên chi tiết văn bản hoặc JSON lỗi", (detail) => {
      expect(getAuditDetailSummary({ ...exportItem(), detail })).toBe(detail);
    }
  );

  it.each([null, undefined, "", " \r\n "])("xử lý chi tiết rỗng/null", (detail) => {
    expect(getAuditDetailPresentation({ ...exportItem(), detail })).toEqual({ summary: "Không có nội dung chi tiết", warnings: [] });
  });
});

describe("Diễn giải đúng mẫu nghiệp vụ Backend", () => {
  it.each([
    ["operations.baggage.accept", "REGISTERED -> ACCEPTED", "Đã đăng ký → Đã nhận ký gửi"],
    ["operations.baggage.load", "ACCEPTED -> LOADED", "Đã nhận ký gửi → Đã bốc xếp"],
    ["operations.baggage.deliver", "LOADED -> DELIVERED", "Đã bốc xếp → Đã trả hành lý"],
    ["operations.baggage.deliver", "RETURN_PENDING -> DELIVERED", "Chờ trả hành lý → Đã trả hành lý"]
  ])("hành lý khớp action và chuyển trạng thái: %s", (action, detail, expected) => {
    const item = Object.freeze({ action, targetType: "baggage", detail });
    expect(getAuditDetailSummary(item)).toBe(`Trạng thái hành lý: ${expected}`);
    expect(item.detail).toBe(detail);
  });

  it.each([
    ["operations.baggage.accept", "baggage", "LOADED -> DELIVERED"],
    ["operations.baggage.deliver", "flight", "LOADED -> DELIVERED"],
    ["future.action", "baggage", "LOADED -> DELIVERED"],
    ["operations.baggage.deliver", "baggage", "REGISTERED -> DELIVERED"],
    ["operations.baggage.deliver", "baggage", "UNKNOWN -> DELIVERED"],
    ["operations.baggage.deliver", "baggage", "loaded -> delivered"],
    ["operations.baggage.deliver", "baggage", "Ghi chú: LOADED -> DELIVERED"],
    ["operations.baggage.deliver", "baggage", "LOADED -> DELIVERED\n"]
  ])("giữ nguyên hành lý không đủ căn cứ: %s / %s / %s", (action, targetType, detail) => {
    expect(getAuditDetailPresentation({ action, targetType, detail })).toEqual({ summary: detail, warnings: [] });
  });

  it.each([
    ["customer", "operations_staff", "Khách hàng", "Vận hành"],
    ["customer_support,member", "customer,operations_staff", "Chăm sóc khách hàng, Hội viên", "Khách hàng, Vận hành"],
    ["guest", "member", "Khách vãng lai", "Hội viên"]
  ])("giữ đủ danh sách vai trò: %s → %s", (before, after, beforeLabel, afterLabel) => {
    const detail = `Đổi role từ [${before}] sang [${after}]`;
    const item = Object.freeze({ action: "admin.user.roles.update", targetType: "user_account", detail });
    expect(getAuditDetailSummary(item)).toBe(`Vai trò: ${beforeLabel} → ${afterLabel}`);
    expect(item.detail).toBe(detail);
  });

  it.each([
    "Đổi role từ [customer,unknown] sang [member]",
    "Đổi role từ [customer] sang [admin]",
    "Đổi role từ [customer,customer] sang [member]",
    "Đổi role từ [] sang [member]",
    "Đổi role từ [customer, member] sang [operations_staff]",
    "Ghi chú: Đổi role từ [customer] sang [member]",
    "Đổi role từ [customer] sang [member]\n"
  ])("không dịch một phần danh sách hoặc mẫu vai trò lạ: %s", (detail) => {
    expect(getAuditDetailSummary({ action: "admin.user.roles.update", targetType: "user_account", detail })).toBe(detail);
  });

  it.each([
    ["active", "locked", "Đang hoạt động", "Đã khóa"],
    ["locked", "suspended", "Đã khóa", "Tạm dừng"],
    ["suspended", "active", "Tạm dừng", "Đang hoạt động"]
  ])("trạng thái tài khoản đúng mẫu: %s → %s", (before, after, beforeLabel, afterLabel) => {
    const detail = `Đổi trạng thái từ ${before} sang ${after}`;
    expect(getAuditDetailSummary({ action: "admin.user.status.update", targetType: "user_account", detail }))
      .toBe(`Trạng thái tài khoản: ${beforeLabel} → ${afterLabel}`);
  });

  it.each([
    "Đổi trạng thái từ active sang unknown",
    "Đổi trạng thái từ ACTIVE sang locked",
    "Ghi chú: Đổi trạng thái từ active sang locked",
    "Đổi trạng thái từ active sang locked\n"
  ])("giữ nguyên trạng thái không đủ căn cứ: %s", (detail) => {
    expect(getAuditDetailSummary({ action: "admin.user.status.update", targetType: "user_account", detail })).toBe(detail);
  });

  it.each([
    ["admin.user.roles.update", "Đổi role từ [customer] sang [member]"],
    ["admin.user.status.update", "Đổi trạng thái từ active sang locked"]
  ])("không dịch mẫu tài khoản ở action hoặc đối tượng khác: %s", (action, detail) => {
    expect(getAuditDetailSummary({ action, targetType: "flight", detail })).toBe(detail);
    expect(getAuditDetailSummary({ action: "future.action", targetType: "user_account", detail })).toBe(detail);
  });

  it("không tách hoặc dịch mã nằm trong ghi chú cập nhật chuyến bay", () => {
    const detail = "Cập nhật chuyến bay VN123 từ trạng thái on_time sang delayed, gate A1 sang A2, ghi chú active sang locked, LOADED -> DELIVERED, mở bán true sang false, giá gốc 1000000 sang 1200000";
    expect(getAuditDetailPresentation({ action: "operations.flight.update", targetType: "flight", detail }))
      .toEqual({ summary: detail, warnings: [] });
  });
});
