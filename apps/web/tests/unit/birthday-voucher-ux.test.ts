import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { VoucherOriginSummary } from "@/components/voucher-origin-summary";
import {
  canEditVoucherMetadata, canEditVoucherPolicy, canOfferVoucher, getEffectiveVoucherStatus,
  getReadyVoucherCount, getVoucherSource, voucherExpiryMillis
} from "@/lib/voucher-presentation";
import { getVoucherDisplayStatus } from "@/lib/voucher-stats";
import { fetchMyVouchers } from "@/lib/my-account-api";
import {
  buildBackofficeVoucherUpdatePayload, fetchBackofficeOperationsVouchers,
  updateBackofficeOperationsVoucher, type BackofficeVoucherItem, type BackofficeVoucherUpdateInput
} from "@/lib/backoffice-operations-api";

const now = Date.parse("2026-11-05T00:00:00Z");
const voucher: BackofficeVoucherItem = {
  voucherId: 1, userId: 2, memberEmail: "fixture@example.test", memberDisplayName: "Hội viên",
  voucherCode: "BDAY-2-2026", title: "Quà sinh nhật", description: "Mô tả Backend",
  discountAmount: 100000, currency: "VND", status: "AVAILABLE", source: "BIRTHDAY",
  expiresAt: "2026-12-01T00:00:00.123456789+07:00", usedAt: null, bookingCode: null,
  conditions: { minAmount: 200000 }, conditionSummary: "Đơn từ 200.000 VND.", conditionsValid: true
};
const input: BackofficeVoucherUpdateInput = {
  title: " Tên mới ", description: " Mô tả mới ", status: "AVAILABLE",
  discountAmount: 1, currency: "USD", expiresAt: "2030-01-01T00:00:00Z", conditions: null
};
function mock(body: unknown) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body),
    { status: 200, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetch); return fetch;
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it.each([
  ["BIRTHDAY", "BIRTHDAY"], ["MANUAL", "MANUAL"], [undefined, "UNKNOWN"],
  [null, "UNKNOWN"], ["birthday", "UNKNOWN"], ["FUTURE", "UNKNOWN"]
])("nguồn %s không suy từ mã BDAY", (source, expected) => {
  expect(getVoucherSource(source)).toBe(expected);
});
it("expiry đúng biên và múi giờ, không sửa raw status", () => {
  const value = { ...voucher, expiresAt: "2026-11-05T07:00:00+07:00" };
  expect(getEffectiveVoucherStatus(value, now - 1)).toBe("AVAILABLE");
  expect(getEffectiveVoucherStatus(value, now)).toBe("EXPIRED");
  expect(getEffectiveVoucherStatus(value, now + 1)).toBe("EXPIRED");
  expect(voucherExpiryMillis(value.expiresAt)).toBe(now);
  expect(value.status).toBe("AVAILABLE");
  expect(getEffectiveVoucherStatus({ ...voucher, expiresAt: "2026-11-05T00:00:00.000000001Z" }, now)).toBe("AVAILABLE");
});
it.each([undefined, "bad", "2026-11-05", "2026-11-05T07:00:00", "2026-02-30T00:00:00Z"])(
  "expiry %s chưa xác minh không được đề xuất dùng", expiresAt => {
    const value = { ...voucher, expiresAt };
    expect(voucherExpiryMillis(expiresAt)).toBeNull();
    expect(getEffectiveVoucherStatus(value, now)).toBe("UNVERIFIED");
    expect(canOfferVoucher(value, "PNR1", now)).toBe(false);
    expect(getReadyVoucherCount([value], true, now)).toBeNull();
  }
);
it("giữ USED/REVOKED/RESERVED kể cả đã hết hạn", () => {
  for (const status of ["USED", "REVOKED", "RESERVED"]) {
    expect(getEffectiveVoucherStatus({ ...voucher, status, effectiveStatus: "EXPIRED",
      expiresAt: "2020-01-01T00:00:00Z" }, now)).toBe(status);
  }
});
it("ready count phân biệt đầy đủ, chưa xác minh, lỗi và rỗng", () => {
  const list = [voucher, { ...voucher, expiresAt: "2020-01-01T00:00:00Z" }, { ...voucher, status: "USED" }];
  expect(getReadyVoucherCount(list, true, now)).toBe(1);
  expect(getReadyVoucherCount(list, false, now)).toBeNull();
  expect(getReadyVoucherCount(null, true, now)).toBeNull();
  expect(getReadyVoucherCount([], false, now)).toBeNull();
  expect(getReadyVoucherCount([], true, now)).toBe(0);
  expect(getReadyVoucherCount([...list, { ...voucher, expiresAt: "bad" }], true, now)).toBeNull();
});
it("giữ RESERVED của chính booking khi expiry thiếu", () => {
  const reserved = { ...voucher, status: "RESERVED", bookingCode: "PNR1", expiresAt: null };
  expect(canOfferVoucher(reserved, "PNR1", now)).toBe(true);
  expect(canOfferVoucher(reserved, "PNR2", now)).toBe(false);
  expect(canOfferVoucher({ ...voucher, status: "USED" }, "PNR1", now)).toBe(false);
  expect(canOfferVoucher(voucher, "PNR1", now)).toBe(true);
});
it("hai API giữ source cũ/mới, Bearer và endpoint hiện có", async () => {
  for (const source of ["BIRTHDAY", "MANUAL", undefined, null, "FUTURE"]) {
    const fetch = mock([{ ...voucher, source }]);
    expect((await fetchMyVouchers("mock")).at(0)?.source).toBe(source);
    expect(new URL(fetch.mock.calls[0][0]).pathname).toBe("/api/me/vouchers");
    expect(fetch.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer mock");
    mock({ queryEmail: null, queryCode: null, queryStatus: null, vouchers: [{ ...voucher, source }] });
    expect((await fetchBackofficeOperationsVouchers("mock")).vouchers[0].source).toBe(source);
  }
});
it("từ chối source sai kiểu", async () => {
  mock([{ ...voucher, source: 42 }]);
  await expect(fetchMyVouchers("mock")).rejects.toMatchObject({ status: 500 });
  mock({ queryEmail: null, queryCode: null, queryStatus: null, vouchers: [{ ...voucher, source: false }] });
  await expect(fetchBackofficeOperationsVouchers("mock")).rejects.toMatchObject({ status: 500 });
});
it("Birthday PATCH whitelist và giữ expiry nguyên văn từ snapshot", async () => {
  const payload = buildBackofficeVoucherUpdatePayload(voucher, { ...input, ...{ source: "MANUAL", effectiveStatus: "EXPIRED" } });
  expect(payload).toEqual({ title: "Tên mới", description: "Mô tả mới", status: "AVAILABLE",
    discountAmount: voucher.discountAmount, currency: voucher.currency, expiresAt: voucher.expiresAt });
  const fetch = mock(voucher);
  await updateBackofficeOperationsVoucher(1, payload, "mock");
  expect(fetch.mock.calls[0][1].method).toBe("PATCH");
  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.expiresAt).toBe(voucher.expiresAt);
  expect(body.status).toBe("AVAILABLE");
  for (const key of ["conditions", "source", "effectiveStatus"]) expect(body).not.toHaveProperty(key);
});
it("MANUAL vẫn sửa policy và gửi conditions null", () => {
  expect(buildBackofficeVoucherUpdatePayload({ ...voucher, source: "MANUAL" }, input))
    .toEqual({ ...input, title: "Tên mới", description: "Mô tả mới" });
  expect(canEditVoucherPolicy({ ...voucher, source: "MANUAL" })).toBe(true);
});
it("Birthday chỉ sửa metadata hợp lệ; chặn conditions lỗi và trạng thái cấm", () => {
  expect(canEditVoucherMetadata(voucher)).toBe(true);
  expect(canEditVoucherPolicy(voucher)).toBe(false);
  for (const value of [{ ...voucher, conditionsValid: false }, { ...voucher, status: "RESERVED" },
    { ...voucher, status: "USED" }, { ...voucher, expiresAt: "bad" }]) {
    expect(canEditVoucherMetadata(value)).toBe(false);
    expect(() => buildBackofficeVoucherUpdatePayload(value, input)).toThrow();
  }
});
it("nhãn theo source, description không lặp, giải thích ngày sinh tự khai", () => {
  const description = "Quà dựa trên ngày sinh tự khai của hồ sơ hành khách chính.";
  const render = (source: string | null | undefined, showDescription = true) =>
    renderToStaticMarkup(createElement(VoucherOriginSummary, { voucher: { ...voucher, source, description }, showDescription }));
  const html = render("BIRTHDAY");
  expect(html.split(description)).toHaveLength(2);
  expect(html).toContain('class="pill"');
  expect(html).toContain("chưa được hệ thống xác minh");
  expect(html).not.toContain(voucher.conditionSummary);
  for (const source of ["MANUAL", undefined, null, "FUTURE"]) expect(render(source)).not.toContain('class="pill"');
  expect(render("BIRTHDAY", false)).not.toContain(description);
  expect(render("BIRTHDAY", false)).toContain("hồ sơ hành khách chính");
});
it("giữ helper Statistics cũ; helper mới không đoán AVAILABLE khi thiếu expiry", () => {
  expect(getVoucherDisplayStatus({ status: "AVAILABLE" })).toBe("AVAILABLE");
  expect(getVoucherDisplayStatus({ status: "AVAILABLE", effectiveStatus: "EXPIRED" })).toBe("EXPIRED");
  expect(getEffectiveVoucherStatus({ status: "AVAILABLE" }, now)).toBe("UNVERIFIED");
});
