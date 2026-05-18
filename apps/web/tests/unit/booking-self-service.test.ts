import { describe, expect, it } from "vitest";

import type { ApiManageBookingOverview } from "@qlvmb/shared-types";

import {
  coTheLamThuTuc,
  coTheYeuCauHoanVe,
  layVeCoTheCheckin
} from "@/lib/booking-self-service";

const bookingMau: ApiManageBookingOverview = {
  bookingCode: "A6C2P1",
  status: "ticketed",
  paymentStatus: "paid",
  holdExpiresAt: "2026-03-11T14:15:00+07:00",
  ticketedAt: "2026-03-11T14:10:00+07:00",
  tripType: "one_way",
  steps: ["Giữ chỗ thành công", "Thanh toán thành công"],
  segments: [],
  contact: null,
  passengers: [],
  ancillaries: [],
  tickets: [
    {
      ticketNumber: "7380000000001",
      passengerName: "Nguyen Van A",
      status: "issued",
      issuedAt: "2026-03-11T14:10:00+07:00"
    }
  ],
  boardingPasses: [],
  refundRequest: null,
  paymentMethods: ["Thanh toán (Sandbox)"],
  priceSummary: {
    baseAmount: 1490000,
    ancillaryAmount: 0,
    discountAmount: 0,
    totalAmount: 1490000,
    currency: "VND",
    appliedVoucherCode: null
  }
};

describe("booking-self-service", () => {
  it("lay dung danh sach ve co the check-in", () => {
    expect(layVeCoTheCheckin(bookingMau)).toHaveLength(1);
    expect(coTheLamThuTuc(bookingMau)).toBe(true);
  });

  it("khong cho check-in voi hanh trinh khu hoi", () => {
    expect(
      layVeCoTheCheckin({
        ...bookingMau,
        tripType: "round_trip"
      })
    ).toHaveLength(0);
  });

  it("chan hoan ve khi da co ve checked_in", () => {
    expect(
      coTheYeuCauHoanVe({
        ...bookingMau,
        tickets: [
          {
            ticketNumber: "7380000000001",
            passengerName: "Nguyen Van A",
            status: "checked_in",
            issuedAt: "2026-03-11T14:10:00+07:00"
          }
        ]
      })
    ).toBe(false);
  });

  it("chan hoan ve khi da co yeu cau dang cho duyet", () => {
    expect(
      coTheYeuCauHoanVe({
        ...bookingMau,
        status: "refund_pending",
        refundRequest: {
          reason: "Thay doi ke hoach",
          refundAmount: 1490000,
          status: "pending",
          createdAt: "2026-03-11T14:20:00+07:00"
        }
      })
    ).toBe(false);
  });
});
