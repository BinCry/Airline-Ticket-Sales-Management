import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuditLogEntryCells, copyAuditLogValue } from "@/components/audit-log-entry-cells";
import type { AuditLogItem } from "@/lib/audit-log-api";
import { pushToast } from "@/lib/toast";

vi.mock("@/lib/toast", () => ({ pushToast: vi.fn() }));

const item: AuditLogItem = {
  id: 1, actorId: null, actorName: null, actorEmail: null,
  action: "admin.audit.export", targetType: "audit_log", targetId: "43bcb953-6196-423b-974a-7b761a8a41bc",
  detail: ' {"filters":{"from":"2026-10-22","to":"2026-10-28"},"rowsPrepared":1,"truncated":false}\r\n',
  createdAt: "2026-10-28T00:00:00Z", hidden: true
};
const render = (record: AuditLogItem) => renderToStaticMarkup(createElement("table", null,
  createElement("tbody", null, createElement("tr", null, createElement(AuditLogEntryCells, { item: record })))));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("Các ô thông tin Audit", () => {
  it("hiện nhãn dễ đọc và giữ mã/UUID cùng toàn bộ detail nguyên văn trong phần mở rộng", () => {
    const html = render(item);
    expect(html).toContain("Xuất nhật ký kiểm toán");
    expect(html).toContain("Nhật ký kiểm toán");
    expect(html).toContain("Số dòng chuẩn bị: 1");
    expect(html).toContain("<code>admin.audit.export</code>");
    expect(html).toContain(`<code>${item.targetId}</code>`);
    expect(html).toContain(renderToStaticMarkup(createElement("pre", { className: "audit-log-detail-full" }, item.detail)));
    for (const label of ["mã hành động", "loại đối tượng gốc", "mã đối tượng", "chi tiết gốc"]) {
      expect(html).toContain(`aria-label="Sao chép ${label}"`);
    }
  });

  it("render văn bản độc hại thành text, không chèn HTML từ log", () => {
    const detail = '<script>alert(1)</script>\n<img src=x onerror="alert(2)">';
    const html = render({ ...item, action: "future.<script>", targetType: "unknown.<img>", targetId: "<iframe>", detail });
    expect(html).not.toMatch(/<script>|<img|<iframe>|<svg/);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain(renderToStaticMarkup(createElement("pre", { className: "audit-log-detail-full" }, detail)));
  });

  it("JSON chưa nhận diện không bị mất hoặc định dạng lại", () => {
    const detail = '{\n  "unknown": [1, null, "Tiếng Việt"]\n}\n';
    const html = render({ ...item, action: "future.action", targetType: "future_target", detail });
    expect(html).toContain("future.action");
    expect(html).toContain("future_target");
    expect(html).toContain("Chưa có bản diễn giải cho nội dung này. Bạn vẫn có thể xem dữ liệu gốc.");
    expect(html).toContain(renderToStaticMarkup(createElement("pre", { className: "audit-log-detail-full" }, detail)));
  });

  it.each(["", " \r\n "])("detail rỗng mở mã kỹ thuật trực tiếp, không lồng thêm phần dữ liệu gốc: %j", (detail) => {
    const html = render({ ...item, targetId: "", detail });
    expect(html).toContain("Không có nội dung chi tiết");
    expect(html).toContain('disabled="" aria-label="Sao chép mã đối tượng"');
    if (!detail) expect(html).toContain('disabled="" aria-label="Sao chép chi tiết gốc"');
    expect(html).toContain("Xem mã kỹ thuật");
    expect(html).toContain("Thu gọn");
    expect(html).not.toContain('class="audit-log-raw"');
    expect(html).toContain("Mã hành động");
  });

  it("giữ diễn giải ở điều khiển native và phần dữ liệu gốc đóng riêng mặc định", () => {
    const detail = "Đổi trạng thái từ active sang locked";
    const html = render({ ...item, action: "admin.user.status.update", targetType: "user_account", detail });
    expect(html).toContain("Trạng thái tài khoản: Đang hoạt động → Đã khóa");
    expect(html).toContain('<details class="audit-log-detail"><summary>');
    expect(html).toContain('<details class="audit-log-raw"><summary>Xem dữ liệu gốc</summary>');
    expect(html).toContain('class="audit-log-detail-expand">Xem đầy đủ</span>');
    expect(html).toContain('class="audit-log-detail-collapse">Thu gọn</span>');
    expect(html).not.toContain(" open=");
    expect(html).toContain(renderToStaticMarkup(createElement("pre", { className: "audit-log-detail-full" }, detail)));
  });

  it("cảnh báo ghi CSV và giới hạn nằm ngoài phần diễn giải có thể bị cắt hoặc đóng", () => {
    const detail = JSON.stringify({ filters: { from: "2026-10-22", to: "2026-10-28", includeHidden: false },
      rowsPrepared: 10000, truncated: true, status: "SERVER_WRITE_FAILED" });
    const html = render({ ...item, detail });
    const error = html.indexOf("Máy chủ gặp lỗi khi ghi CSV.");
    const truncated = html.indexOf("Dữ liệu chuẩn bị cho CSV bị giới hạn ở 10.000 dòng");
    const expandable = html.indexOf('<details class="audit-log-detail">');
    expect(error).toBeGreaterThan(-1);
    expect(truncated).toBeGreaterThan(error);
    expect(expandable).toBeGreaterThan(truncated);
    expect(html).not.toMatch(/ghi xong CSV|tải thành công|lỗi lưu sự kiện/i);
    expect(html).toContain(renderToStaticMarkup(createElement("pre", { className: "audit-log-detail-full" }, detail)));
  });

  it("không tạo cảnh báo cho cờ false hoặc trạng thái không nhận diện", () => {
    const detail = JSON.stringify({ filters: { from: "2026-10-22", to: "2026-10-28", includeHidden: false },
      rowsPrepared: 0, truncated: false, status: "FUTURE_STATUS" });
    const html = render({ ...item, detail });
    expect(html).toContain("Số dòng chuẩn bị: 0");
    expect(html).toContain("Không bị cắt");
    expect(html).not.toContain("audit-log-detail-notices");
    expect(html).not.toMatch(/Máy chủ.*(?:lỗi|ghi xong)/);
  });
});

describe("Sao chép dữ liệu gốc", () => {
  it("sao chép đúng bytes văn bản, không tóm tắt hoặc JSON stringify lại", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await copyAuditLogValue(item.detail, "Chi tiết gốc");
    expect(writeText).toHaveBeenCalledExactlyOnceWith(item.detail);
    expect(pushToast).toHaveBeenCalledWith({ title: "Đã sao chép", message: "Chi tiết gốc", tone: "success" });
  });

  it.each([{}, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } }])(
    "khi clipboard không dùng được thì hướng dẫn sao chép thủ công", async (navigator) => {
      vi.stubGlobal("navigator", navigator);
      await copyAuditLogValue(item.detail, "Chi tiết gốc");
      expect(pushToast).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: "Chưa sao chép được", tone: "warning" }));
      expect(JSON.stringify(vi.mocked(pushToast).mock.calls)).not.toContain(item.detail);
    }
  );
});
