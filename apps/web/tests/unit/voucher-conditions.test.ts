import { describe, expect, it } from "vitest";
import { ApiClientError } from "@/lib/api-client";
import { buildVoucherConditions, createVoucherConditionDraft, describeVoucherApplyError, isVoucherConditions, normalizeVoucherConditionInfo } from "@/lib/voucher-conditions";

describe("Điều kiện voucher: hợp đồng và bản nháp", () => {
  it("voucher cũ null được diễn giải đúng từ Backend", () => {
    const voucher = { conditions: null, conditionsValid: true, conditionSummary: "Không có điều kiện bổ sung." };
    expect(normalizeVoucherConditionInfo(voucher)).toEqual(voucher);
  });
  it("null không được coi là vô điều kiện khi Backend báo cấu hình lỗi", () => {
    expect(normalizeVoucherConditionInfo({ conditions: null, conditionsValid: false, conditionSummary: "Sai cấu hình" }))
      .toMatchObject({ conditionsValid: false, conditionSummary: expect.stringContaining("cấu hình lỗi") });
  });
  it.each([{}, { conditions: null, conditionsValid: true }, { conditions: { minAmount: -1 }, conditionsValid: true, conditionSummary: "Sai" }])(
    "thiếu hoặc sai metadata không được cho qua: %j", (info) => {
      expect(normalizeVoucherConditionInfo(info).conditionsValid).toBe(false);
    });
  it("bản nháp trống gửi null để xóa điều kiện", () => expect(buildVoucherConditions(createVoucherConditionDraft())).toBeNull());
  it("gửi đầy đủ bốn nhóm; chuẩn hóa, giữ nhiều tuyến/hạng và ngưỡng 0", () => {
    const draft = createVoucherConditionDraft();
    Object.assign(draft, { routes: [{ from: " sgn ", to: "han" }, { from: "HAN", to: "SGN" }, { from: "SGN", to: "HAN" }],
      fareFamilies: ["thuong_gia", "pho_thong_linh_hoat"], departureFrom: "2026-11-01", departureTo: "2026-11-30", minAmount: "0" });
    expect(buildVoucherConditions(draft)).toEqual({ routes: [{ from: "SGN", to: "HAN" }, { from: "HAN", to: "SGN" }],
      fareFamilies: ["thuong_gia", "pho_thong_linh_hoat"], departureFrom: "2026-11-01", departureTo: "2026-11-30", minAmount: 0 });
  });
  it("không biến ngày lịch thành timestamp hoặc đổi theo múi giờ trình duyệt", () => {
    expect(buildVoucherConditions({ ...createVoucherConditionDraft(), departureFrom: "2026-11-01" })).toEqual({ departureFrom: "2026-11-01" });
  });
  it("cho phép cùng ngày và chỉ một mốc cuối", () => {
    expect(buildVoucherConditions({ ...createVoucherConditionDraft(), departureFrom: "2026-11-01", departureTo: "2026-11-01" })).toBeTruthy();
    expect(buildVoucherConditions({ ...createVoucherConditionDraft(), departureTo: "2026-11-01" })).toEqual({ departureTo: "2026-11-01" });
  });
  it("đọc điều kiện không làm thay đổi object gốc", () => {
    const original = { routes: [{ from: "SGN", to: "HAN" }], fareFamilies: ["thuong_gia"], minAmount: 1500000 };
    const draft = createVoucherConditionDraft(original);
    draft.routes[0].from = "DAD"; draft.fareFamilies.push("pho_thong_linh_hoat");
    expect(original.routes[0].from).toBe("SGN"); expect(original.fareFamilies).toHaveLength(1);
  });
  it.each([
    { routes: [{ from: "", to: "HAN" }] }, { routes: [{ from: "SGN", to: "SGN" }] },
    { routes: [{ from: "S<script", to: "HAN" }] }, { fareFamilies: ["unknown"] },
    { departureFrom: "2026-02-30" }, { departureTo: "not-a-date" },
    { departureFrom: "2026-11-02", departureTo: "2026-11-01" },
    { minAmount: "-1" }, { minAmount: "1.5" }, { minAmount: "1e6" }, { minAmount: "9007199254740992" }
  ])("từ chối dữ liệu form sai %j", (changes) => {
    expect(() => buildVoucherConditions({ ...createVoucherConditionDraft(), ...changes })).toThrow();
  });
  it.each([null, [], "", { unexpected: true }, { routes: [{ from: "SGN", to: "SGN" }] },
    { fareFamilies: ["first"] }, { departureFrom: "2026-02-30" }, { minAmount: -1 }, { minAmount: 1.2 }])(
    "nhận diện response cấu hình sai %j", (value) => expect(isVoucherConditions(value)).toBe(false));
  it("đọc được danh sách bị lược bỏ và số 0", () => expect(isVoucherConditions({ minAmount: 0 })).toBe(true));
});

describe("Thông báo áp voucher", () => {
  it("hiện lý do 400 và giải thích mã cũ được giữ", () => {
    expect(describeVoucherApplyError(new ApiClientError("Chưa đạt mức tối thiểu", 400), "OLD"))
      .toBe("Chưa đạt mức tối thiểu Voucher OLD và tổng tiền đang hiển thị được giữ nguyên.");
  });
  it("không khẳng định giữ DB khi lỗi mạng hoặc server", () => {
    for (const error of [new TypeError("fetch failed"), new ApiClientError("Internal stack", 500), null]) {
      const text = describeVoucherApplyError(error, "OLD");
      expect(text).toContain("Chưa xác nhận"); expect(text).not.toContain("được giữ nguyên"); expect(text).not.toContain("Internal");
    }
  });
  it.each([401, 403])("hướng dẫn đăng nhập lại cho %d", (status) => {
    expect(describeVoucherApplyError(new ApiClientError("Unauthorized", status))).toContain("đăng nhập lại");
  });
});
