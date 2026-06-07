import { describe, expect, it } from "vitest";

import type { ApiPaymentSessionResponse } from "@qlvmb/shared-types";

import { coTheXacNhanThanhToanThuCong } from "@/lib/checkout-payment";

function taoPhienThanhToan(
  overrides: Partial<ApiPaymentSessionResponse> = {}
): ApiPaymentSessionResponse {
  return {
    bookingCode: "A6C2P1",
    provider: "sepay",
    sessionMode: "local",
    paymentUrl: null,
    paymentStatus: "pending",
    expiresAt: "2026-06-07T14:15:00+07:00",
    referenceCode: "A6C2P1-001",
    amount: 1490000,
    bankName: "BIDV",
    accountNumber: "123456789",
    accountHolderName: "Vietnam Airlines",
    qrCodeUrl: null,
    qrCodeDataUrl: null,
    discountAmount: 0,
    appliedVoucherCode: null,
    ...overrides
  };
}

describe("checkout-payment", () => {
  it("cho phep xac nhan thu cong voi phien local dang cho thanh toan", () => {
    expect(coTheXacNhanThanhToanThuCong(taoPhienThanhToan())).toBe(true);
  });

  it("khong cho phep xac nhan thu cong voi phien live", () => {
    expect(
      coTheXacNhanThanhToanThuCong(
        taoPhienThanhToan({
          sessionMode: "live"
        })
      )
    ).toBe(false);
  });

  it("khong cho phep xac nhan thu cong khi giao dich da xu ly", () => {
    expect(
      coTheXacNhanThanhToanThuCong(
        taoPhienThanhToan({
          paymentStatus: "paid"
        })
      )
    ).toBe(false);
  });
});
