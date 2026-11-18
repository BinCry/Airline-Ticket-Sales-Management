import { describe, expect, it } from "vitest";

import type { ApiPaymentSessionResponse } from "@qlvmb/shared-types";

import {
  coTheXacNhanThanhToanThuCong,
  laPhienThanhToanLocalDangCho
} from "@/lib/checkout-payment";

const QUYEN_NHAN_VIEN = ["backoffice.sales"];

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
  it("cho phep nhan vien co quyen backoffice.sales xac nhan thu cong phien local dang cho", () => {
    expect(coTheXacNhanThanhToanThuCong(taoPhienThanhToan(), QUYEN_NHAN_VIEN)).toBe(true);
  });

  it("khong hien nut xac nhan thu cong cho khach hang khong co quyen backoffice.sales", () => {
    expect(coTheXacNhanThanhToanThuCong(taoPhienThanhToan())).toBe(false);
    expect(
      coTheXacNhanThanhToanThuCong(taoPhienThanhToan(), ["booking.self_service"])
    ).toBe(false);
  });

  it("nhan dien phien local dang cho de hien loi nhac lien he nhan vien", () => {
    expect(laPhienThanhToanLocalDangCho(taoPhienThanhToan())).toBe(true);
    expect(laPhienThanhToanLocalDangCho(taoPhienThanhToan({ sessionMode: "live" }))).toBe(false);
    expect(laPhienThanhToanLocalDangCho(null)).toBe(false);
  });

  it("khong cho phep xac nhan thu cong voi phien live", () => {
    expect(
      coTheXacNhanThanhToanThuCong(
        taoPhienThanhToan({
          sessionMode: "live"
        }),
        QUYEN_NHAN_VIEN
      )
    ).toBe(false);
  });

  it("khong cho phep xac nhan thu cong khi giao dich da xu ly", () => {
    expect(
      coTheXacNhanThanhToanThuCong(
        taoPhienThanhToan({
          paymentStatus: "paid"
        }),
        QUYEN_NHAN_VIEN
      )
    ).toBe(false);
  });
});
