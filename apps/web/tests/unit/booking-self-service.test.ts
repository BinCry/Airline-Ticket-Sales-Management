import { describe, expect, it } from "vitest";

import type { ApiManageBookingOverview, ApiManageBookingSegment } from "@qlvmb/shared-types";

import {
  coTheLamThuTuc,
  coTheYeuCauHoanVe,
  layVeCoTheCheckin
} from "@/lib/booking-self-service";

const THOI_GIAN_THAM_CHIEU = new Date("2026-06-07T10:00:00+07:00");

function taoPhanDoan(
  departureAt: string,
  status: ApiManageBookingSegment["status"] = "scheduled"
): ApiManageBookingSegment {
  return {
    inventoryId: 20101,
    code: "VN123",
    from: "Thành phố Hồ Chí Minh",
    to: "Hà Nội",
    originCode: "SGN",
    destinationCode: "HAN",
    departureAt,
    arrivalAt: "2026-06-08T10:10:00+07:00",
    fareFamily: "pho_thong_tiet_kiem",
    fareTitle: "Phổ thông tiết kiệm",
    pricePerPassenger: 1490000,
    passengerCount: 1,
    subtotalAmount: 1490000,
    status,
    statusLabel: "Lên lịch"
  };
}

const bookingMau: ApiManageBookingOverview = {
  bookingCode: "A6C2P1",
  status: "ticketed",
  paymentStatus: "paid",
  holdExpiresAt: "2026-06-07T14:15:00+07:00",
  ticketedAt: "2026-06-07T14:10:00+07:00",
  tripType: "one_way",
  steps: ["Giữ chỗ thành công", "Thanh toán thành công"],
  segments: [taoPhanDoan("2026-06-08T08:00:00+07:00")],
  contact: null,
  passengers: [],
  ancillaries: [],
  seatSelections: [],
  tickets: [
    {
      ticketNumber: "7380000000001",
      passengerName: "Nguyen Van A",
      status: "issued",
      issuedAt: "2026-06-07T14:10:00+07:00"
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
    expect(layVeCoTheCheckin(bookingMau, THOI_GIAN_THAM_CHIEU)).toHaveLength(1);
    expect(coTheLamThuTuc(bookingMau, THOI_GIAN_THAM_CHIEU)).toBe(true);
  });

  it("khong cho check-in voi hanh trinh khu hoi", () => {
    expect(
      layVeCoTheCheckin(
        {
          ...bookingMau,
          tripType: "round_trip"
        },
        THOI_GIAN_THAM_CHIEU
      )
    ).toHaveLength(0);
  });

  it("chan check-in khi chuyen bay da bat dau", () => {
    expect(
      coTheLamThuTuc(
        {
          ...bookingMau,
          segments: [taoPhanDoan("2026-06-07T09:00:00+07:00", "boarding")]
        },
        THOI_GIAN_THAM_CHIEU
      )
    ).toBe(false);
  });

  it("chan hoan ve khi da co ve checked_in", () => {
    expect(
      coTheYeuCauHoanVe(
        {
          ...bookingMau,
          tickets: [
            {
              ticketNumber: "7380000000001",
              passengerName: "Nguyen Van A",
              status: "checked_in",
              issuedAt: "2026-06-07T14:10:00+07:00"
            }
          ]
        },
        THOI_GIAN_THAM_CHIEU
      )
    ).toBe(false);
  });

  it("chan hoan ve khi da co yeu cau dang cho duyet", () => {
    expect(
      coTheYeuCauHoanVe(
        {
          ...bookingMau,
          status: "refund_pending",
          refundRequest: {
            reason: "Thay doi ke hoach",
            refundAmount: 1490000,
            status: "pending",
            createdAt: "2026-06-07T14:20:00+07:00"
          }
        },
        THOI_GIAN_THAM_CHIEU
      )
    ).toBe(false);
  });

  it("chan hoan ve khi hanh trinh da bat dau", () => {
    expect(
      coTheYeuCauHoanVe(
        {
          ...bookingMau,
          segments: [taoPhanDoan("2026-06-07T08:00:00+07:00", "departed")]
        },
        THOI_GIAN_THAM_CHIEU
      )
    ).toBe(false);
  });

  it("cho hoan ve voi booking bi huy nhung da thanh toan", () => {
    expect(
      coTheYeuCauHoanVe(
        {
          ...bookingMau,
          status: "cancelled",
          paymentStatus: "paid",
          segments: [taoPhanDoan("2026-06-07T08:00:00+07:00", "cancelled")]
        },
        THOI_GIAN_THAM_CHIEU
      )
    ).toBe(true);
  });
});
