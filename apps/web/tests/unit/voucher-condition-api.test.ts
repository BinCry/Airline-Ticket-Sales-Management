import { afterEach, describe, expect, it, vi } from "vitest";
import { createBackofficeOperationsVoucher, fetchBackofficeOperationsVouchers, updateBackofficeOperationsVoucher } from "@/lib/backoffice-operations-api";
import { fetchMyVouchers } from "@/lib/my-account-api";

const voucher = {
  voucherId: 1, userId: 2, memberEmail: "member@example.test", memberDisplayName: "Hội viên",
  voucherCode: "COND", title: "Ưu đãi", description: "Theo tuyến", discountAmount: 100000,
  currency: "VND", status: "AVAILABLE", expiresAt: "2026-12-01T00:00:00Z", usedAt: null, bookingCode: null,
  conditions: { routes: [{ from: "SGN", to: "HAN" }], minAmount: 1500000 },
  conditionSummary: "Tuyến SGN → HAN. Giá trị booking trước giảm từ 1.500.000 VND.", conditionsValid: true
};
function response(body: unknown) { return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }); }
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Contract điều kiện trên API Operations và hội viên", () => {
  it("hai danh sách cùng bảo toàn điều kiện, summary và flag Backend", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response({ queryEmail: null, queryCode: null, queryStatus: null, vouchers: [voucher] }))
      .mockResolvedValueOnce(response([voucher])));
    expect((await fetchBackofficeOperationsVouchers("mock")).vouchers[0]).toMatchObject(voucher);
    expect((await fetchMyVouchers("mock"))[0]).toMatchObject(voucher);
  });
  it("voucher cũ conditions null vẫn được giữ khi flag true", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ ...voucher, conditions: null, conditionSummary: "Không có điều kiện bổ sung." }])));
    expect((await fetchMyVouchers("mock"))[0]).toMatchObject({ conditions: null, conditionsValid: true });
  });
  it("conditionsValid false không bị đổi thành voucher vô điều kiện", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ ...voucher, conditions: null, conditionsValid: false }])));
    expect((await fetchMyVouchers("mock"))[0]).toMatchObject({ conditions: null, conditionsValid: false });
  });
  it("JSON sai cấu trúc không được đưa vào editor như dữ liệu hợp lệ", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ ...voucher, conditions: "bad json" }])));
    expect((await fetchMyVouchers("mock"))[0]).toMatchObject({ conditions: null, conditionsValid: false });
  });
  it.each([undefined, null, {}, { routes: [{ from: "HAN", to: "SGN" }], minAmount: 0 }])(
    "PATCH phân biệt omit/null/object: %j", async (conditions) => {
      const fetchMock = vi.fn().mockResolvedValue(response(voucher));
      vi.stubGlobal("fetch", fetchMock);
      await updateBackofficeOperationsVoucher(1, { title: "Ưu đãi", description: "", discountAmount: 100000,
        currency: "VND", status: "AVAILABLE", expiresAt: "2026-12-01T00:00:00Z", ...(conditions === undefined ? {} : { conditions }) }, "mock");
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      if (conditions === undefined) expect(body).not.toHaveProperty("conditions");
      else expect(body.conditions).toEqual(conditions);
    });
  it("POST gửi đủ điều kiện đã xác nhận", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(voucher)); vi.stubGlobal("fetch", fetchMock);
    await createBackofficeOperationsVoucher({ memberEmail: voucher.memberEmail, voucherCode: "COND",
      title: voucher.title, description: "", discountAmount: 100000, currency: "VND",
      expiresAt: voucher.expiresAt, conditions: voucher.conditions }, "mock");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).conditions).toEqual(voucher.conditions);
  });
});
