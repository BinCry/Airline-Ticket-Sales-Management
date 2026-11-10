import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VoucherConditionEditor } from "@/components/voucher-condition-editor";
import { VoucherConditionSummary } from "@/components/voucher-condition-summary";
import { createVoucherConditionDraft } from "@/lib/voucher-conditions";

describe("Giao diện điều kiện voucher", () => {
  it("hiện nguyên văn diễn giải Backend, không chỉ in mã JSON", () => {
    const text = "Có ít nhất một chặng đồng thời đáp ứng: tuyến SGN → HAN; hạng Thương gia.";
    const html = renderToStaticMarkup(createElement(VoucherConditionSummary, { voucher: {
      conditions: { routes: [{ from: "SGN", to: "HAN" }] }, conditionSummary: text, conditionsValid: true
    } }));
    expect(html).toContain(text); expect(html).toContain("Điều kiện áp dụng");
  });
  it("cấu hình lỗi có cảnh báo dù conditions null", () => {
    const html = renderToStaticMarkup(createElement(VoucherConditionSummary, { voucher: { conditions: null, conditionsValid: false } }));
    expect(html).toContain("Cần kiểm tra cấu hình"); expect(html).not.toContain("Không có điều kiện bổ sung");
  });
  it("không render HTML từ diễn giải", () => {
    const html = renderToStaticMarkup(createElement(VoucherConditionSummary, { voucher: {
      conditions: null, conditionsValid: true, conditionSummary: '<img src=x onerror="alert(1)">'
    } }));
    expect(html).toContain("&lt;img"); expect(html).not.toContain("<img");
  });
  it("editor thu gọn, có giải thích VÀ/HOẶC, cùng chặng, ngày biên và trước giảm", () => {
    const html = renderToStaticMarkup(createElement(VoucherConditionEditor, {
      value: createVoucherConditionDraft(), onChange: () => {}, currency: "VND"
    }));
    expect(html).toContain("<details"); expect(html).not.toContain(" open=");
    for (const text of ["(VÀ)", "(HOẶC)", "một chặng", "trước giảm", "giờ Việt Nam", "Thêm tuyến", "Xóa toàn bộ điều kiện"]) expect(html).toContain(text);
  });
  it.each(["RESERVED", "USED"])("chỉ đọc %s có lý do, không có controls sửa", () => {
    const html = renderToStaticMarkup(createElement(VoucherConditionEditor, {
      value: createVoucherConditionDraft(), onChange: () => {}, currency: "VND", readOnly: true
    }));
    expect(html).toContain("chỉ đọc"); expect(html).not.toContain("<input"); expect(html).not.toContain("<button");
  });
  it("mọi ô cấu hình nằm trong fieldset disabled khi đang lưu", () => {
    const html = renderToStaticMarkup(createElement(VoucherConditionEditor, {
      value: createVoucherConditionDraft({ routes: [{ from: "SGN", to: "HAN" }] }),
      onChange: () => {}, currency: "VND", disabled: true
    }));
    expect(html).toContain('<fieldset disabled=""'); expect(html).toContain('list="');
    expect(html).toContain("Sân bay đi tuyến 1");
  });
});
