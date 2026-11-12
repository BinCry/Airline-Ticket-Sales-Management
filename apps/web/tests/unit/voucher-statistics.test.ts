import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { VoucherStatsView } from "@/components/voucher-statistics-panel";
import { BackofficeOperationsPageClient, buildVoucherDraft } from "@/components/backoffice-operations-page-client";
import { fetchBackofficeOperationsVouchers, updateBackofficeOperationsVoucher, type BackofficeVoucherItem } from "@/lib/backoffice-operations-api";
import { fetchVoucherStats, formatVoucherStatsMoney, formatVoucherUsageRate, getVoucherDisplayStatus, type VoucherStatsResponse } from "@/lib/voucher-stats";

const summary = {
  totalVouchers: 5, statusCounts: { AVAILABLE: 1, RESERVED: 0, USED: 3, EXPIRED: 0, REVOKED: 1 },
  usageDenominator: 4, usageRate: 0.75, actualDiscountByCurrency: { VND: 80000, USD: 12 },
  unmatchedUsedCount: 1, actualDiscountComplete: false, operationsHiddenCount: 2
};
const data: VoucherStatsResponse = {
  fromDate: null, toDate: null, dateBasis: "CREATED_AT", timezone: "Asia/Ho_Chi_Minh",
  asOf: "2026-11-04T12:00:00Z", includesHidden: true, discountBasis: "BOOKING_RECORDED_DISCOUNT",
  summary, bySource: ["MANUAL", "BIRTHDAY"].map(source => ({ source, summary })),
  byMonth: [{ month: "2027-01", summary }]
};
function mock(body: unknown = data, status = 200) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body),
    { status, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetch); return fetch;
}
function view(value: VoucherStatsResponse = data) {
  return renderToStaticMarkup(createElement(VoucherStatsView, { state: "success", data: value, error: null }));
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("GET toàn lịch sử, ngày cuối giữ nguyên, Bearer và AbortSignal", async () => {
  const fetch = mock();
  await fetchVoucherStats("mock");
  expect(new URL(fetch.mock.calls[0][0]).pathname).toBe("/api/backoffice/operations/vouchers/stats");
  expect(new URL(fetch.mock.calls[0][0]).search).toBe("");
  expect(fetch.mock.calls[0][1].headers.get("Authorization")).toBe("Bearer mock");
  expect(fetch.mock.calls[0][1].method ?? "GET").toBe("GET");
  const signal = new AbortController().signal;
  const next = mock();
  await fetchVoucherStats("mock", { fromDate: " 2026-10-01 ", toDate: "2026-10-31" }, signal);
  expect(new URL(next.mock.calls[0][0]).search).toBe("?fromDate=2026-10-01&toDate=2026-10-31");
  expect(next.mock.calls[0][1].signal).toBe(signal);
});
it.each([400, 401, 403, 500])("không biến lỗi %s thành dữ liệu rỗng", async status => {
  mock({ message: "Không thể đọc" }, status);
  await expect(fetchVoucherStats("mock")).rejects.toMatchObject({ status });
});
it.each([
  { ...data, summary: { ...summary, usageRate: undefined } },
  { ...data, summary: { ...summary, totalVouchers: Number.MAX_SAFE_INTEGER + 1 } },
  { ...data, summary: { ...summary, actualDiscountByCurrency: { VND: "80000" } } },
  { ...data, dateBasis: "USED_AT" }
])("từ chối contract sai, không tự sửa số liệu", async invalid => {
  mock(invalid); await expect(fetchVoucherStats("mock")).rejects.toMatchObject({ status: 500 });
});
it("phần trăm là tỷ số Backend; null không phải 0%", () => {
  expect(formatVoucherUsageRate(0.125)).toContain("12,5");
  expect(formatVoucherUsageRate(0.125)).toContain("%");
  expect(formatVoucherUsageRate(0)).toContain("0");
  expect(formatVoucherUsageRate(null)).toBe("Chưa đủ cơ sở tính");
  expect(formatVoucherStatsMoney(12, "USD")).toContain("USD");
  expect(formatVoucherStatsMoney(12, "custom")).toBe("12 custom");
});
it("render đúng tiền riêng, ẩn, dữ liệu thiếu, nguồn, tháng cấp và asOf Việt Nam", () => {
  const html = view();
  for (const text of ["80.000", "VND", "USD", "Tính cả voucher đã ẩn", "Dữ liệu giảm giá chưa đầy đủ",
    "1 voucher USED", "Cấp thủ công", "Quà sinh nhật", "2027-01", "19:00", "04/11/2026", data.asOf]) expect(html).toContain(text);
  expect(html).not.toContain("80.012");
});
it.each(["loading", "error"] as const)("%s không hiện lại tiền cũ", state => {
  const html = renderToStaticMarkup(createElement(VoucherStatsView, { state, data, error: "Không đủ quyền" }));
  expect(html).not.toContain("80.000");
  expect(html).toContain(state === "loading" ? "Đang tải" : "Không đủ quyền");
  expect(html).toContain(state === "loading" ? 'role="status"' : 'role="alert"');
});
it("idle không kết luận nhầm người dùng chưa có quyền vận hành", () => {
  const html = renderToStaticMarkup(createElement(VoucherStatsView, { state: "idle", data: null, error: null }));
  expect(html).toContain("Đang xác định phiên làm việc");
  expect(html).toContain('role="status"');
  expect(html).not.toContain("Đăng nhập bằng tài khoản có quyền vận hành");
});
it("backoffice hiển thị trạng thái tải trước khi có kết quả API", () => {
  const html = renderToStaticMarkup(createElement(BackofficeOperationsPageClient));
  expect(html).toContain("Đang tải dữ liệu chuyến bay");
  expect(html).toContain("Đang tải dữ liệu voucher");
  expect(html).not.toContain("Không có chuyến bay phù hợp");
  expect(html).not.toContain("Không có voucher phù hợp");
});
it("empty và tỷ lệ null không bịa số liệu", () => {
  const html = view({ ...data, bySource: [], byMonth: [], summary: { ...summary, totalVouchers: 0,
    usageRate: null, usageDenominator: 0, actualDiscountByCurrency: {}, unmatchedUsedCount: 0,
    actualDiscountComplete: true, operationsHiddenCount: 0, statusCounts: { AVAILABLE: 0, RESERVED: 0, USED: 0, EXPIRED: 0, REVOKED: 0 } } });
  expect(html).toContain("Không có voucher"); expect(html).toContain("Chưa đủ cơ sở tính");
  expect(html).not.toContain("0%"); expect(html).toContain("Chưa có dữ liệu tháng");
});
it("không render dữ liệu cá nhân; escape nguồn không biết", () => {
  const html = view({ ...data, bySource: [{ source: "<img src=x>", summary }],
    ...{ memberEmail: "private@example.test" } });
  expect(html).not.toContain("private@example.test"); expect(html).toContain("&lt;img");
  expect(html).not.toContain("<img");
});
it("hiển thị effectiveStatus nhưng draft và PATCH vẫn giữ raw status", async () => {
  const voucher: BackofficeVoucherItem = { voucherId: 1, userId: 2, memberEmail: "fixture@example.test",
    memberDisplayName: "Hội viên", voucherCode: "FIXTURE", title: "Ưu đãi", description: "",
    discountAmount: 100000, currency: "VND", status: "AVAILABLE", effectiveStatus: "EXPIRED",
    expiresAt: "2026-10-01T00:00:00+07:00", usedAt: null, bookingCode: null };
  const draft = buildVoucherDraft(voucher);
  expect(getVoucherDisplayStatus(voucher)).toBe("EXPIRED");
  expect(draft.status).toBe("AVAILABLE"); expect(draft).not.toHaveProperty("effectiveStatus");
  const fetch = mock(voucher);
  await updateBackofficeOperationsVoucher(1, draft, "mock");
  expect(JSON.parse(fetch.mock.calls[0][1].body).status).toBe("AVAILABLE");
  expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty("effectiveStatus");
  mock({ queryEmail: null, queryCode: null, queryStatus: null, vouchers: [voucher] });
  expect((await fetchBackofficeOperationsVouchers("mock")).vouchers[0]).toMatchObject({
    status: "AVAILABLE", effectiveStatus: "EXPIRED"
  });
  expect(getVoucherDisplayStatus({ status: "AVAILABLE" })).toBe("AVAILABLE");
});
