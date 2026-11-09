import { describe, expect, it } from "vitest";

import {
  buildAuditLogSearchParams, createDefaultAuditLogFilters, getAuditActionGroups,
  getAuditActionsInGroup, normalizeAuditLogFilters, validateAuditLogFilters
} from "@/lib/audit-log-filters";

const defaults = () => createDefaultAuditLogFilters(new Date("2026-10-25T00:00:00Z"));

describe("Bộ lọc nhật ký kiểm toán", () => {
  it("tính bảy ngày lịch theo Việt Nam, kể cả qua năm mới", () => {
    const filters = createDefaultAuditLogFilters(new Date("2026-12-31T17:05:00Z"));
    expect(filters.from).toBe("2026-12-26");
    expect(filters.to).toBe("2027-01-01");
    expect(filters.includeHidden).toBe(false);
  });

  it("không dùng ngày UTC trước thời điểm giao ngày tại Việt Nam", () => {
    expect(createDefaultAuditLogFilters(new Date("2026-10-24T17:01:00Z")).to).toBe("2026-10-25");
    expect(createDefaultAuditLogFilters(new Date("2026-10-24T16:59:00Z")).to).toBe("2026-10-24");
  });

  it("chuẩn hóa khoảng trắng nhưng giữ nguyên ký tự tìm kiếm literal", () => {
    const filters = { ...defaults(), keyword: "  50%_\\ + & tiếng Việt  ", actorKeyword: "  Nguyễn  An  " };
    expect(normalizeAuditLogFilters(filters)).toMatchObject({ keyword: "50%_\\ + & tiếng Việt", actorKeyword: "Nguyễn  An" });
    const params = buildAuditLogSearchParams(filters, { page: 2, size: 100 });
    expect(new URLSearchParams(params.toString()).get("keyword")).toBe("50%_\\ + & tiếng Việt");
    expect(params.get("page")).toBe("2");
    expect(params.get("size")).toBe("100");
    expect(params.has("actorId")).toBe(false);
    expect(params.has("includeHidden")).toBe(false);
  });

  it("export gửi toàn bộ bộ lọc đã áp dụng và bỏ pagination", () => {
    const filters = { ...defaults(), actorId: "none", actorKeyword: "An", actionPrefix: "admin", action: "admin.user.update",
      targetType: "user", targetId: "A%_\\", keyword: "chi tiết", includeHidden: true };
    const params = buildAuditLogSearchParams(filters);
    expect(Object.fromEntries(params)).toEqual({ ...filters, includeHidden: "true" });
    expect(params.has("page")).toBe(false);
    expect(params.has("size")).toBe(false);
  });

  it.each(["none", "1", "9223372036854775807"])("chấp nhận actorId %s", (actorId) => {
    expect(validateAuditLogFilters({ ...defaults(), actorId })).toBeNull();
  });

  it.each(["0", "-1", "1.5", "abc", "9223372036854775808", "none%"])("từ chối actorId %s", (actorId) => {
    expect(validateAuditLogFilters({ ...defaults(), actorId })).toContain("ID dương");
  });

  it.each(["2026-02-29", "2026-13-01", "25/10/2026", "0000-01-01"])("từ chối ngày không hợp lệ %s", (from) => {
    expect(validateAuditLogFilters({ ...defaults(), from })).toContain("yyyy-MM-dd");
  });

  it("từ chối khoảng đảo ngược và chấp nhận ngày nhuận", () => {
    expect(validateAuditLogFilters({ ...defaults(), from: "2026-10-26" })).toContain("không được lớn hơn");
    expect(validateAuditLogFilters({ ...defaults(), from: "2024-02-29" })).toBeNull();
  });

  it("chỉ giới hạn 90 ngày bao gồm hai đầu khi xuất CSV", () => {
    const filters = { ...defaults(), from: "2026-01-01", to: "2026-03-31" };
    expect(validateAuditLogFilters(filters, true)).toBeNull();
    expect(validateAuditLogFilters({ ...filters, to: "2026-04-01" }, true)).toContain("90 ngày");
    expect(validateAuditLogFilters({ ...filters, to: "2026-04-01" })).toBeNull();
    expect(validateAuditLogFilters({ ...filters, from: "" }, true)).toContain("bắt buộc");
    expect(validateAuditLogFilters({ ...filters, from: "", to: "" })).toBeNull();
  });

  it("đếm độ dài Unicode như backend, không tự cắt bộ lọc", () => {
    expect(validateAuditLogFilters({ ...defaults(), keyword: "😀".repeat(1000) })).toBeNull();
    expect(validateAuditLogFilters({ ...defaults(), keyword: "😀".repeat(1001) })).toContain("1000");
    expect(validateAuditLogFilters({ ...defaults(), actorKeyword: "x".repeat(161) })).toContain("160");
  });

  it("suy ra nhóm từ dữ liệu và dùng ranh giới dấu chấm", () => {
    const actions = ["ops.change", "admin.export", "administrator.update", "admin.user.create", "standalone", "admin.export"];
    expect(getAuditActionGroups(actions)).toEqual(["admin", "administrator", "ops"]);
    expect(getAuditActionsInGroup(actions, "admin")).toEqual(["admin.export", "admin.user.create", "admin.export"]);
    expect(getAuditActionsInGroup(actions, "")).toEqual(actions);
  });
});
