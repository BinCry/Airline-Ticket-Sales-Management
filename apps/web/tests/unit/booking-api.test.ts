import { afterEach, describe, expect, it, vi } from "vitest";

import {
  cancelAppliedVoucherForBooking,
  completeCheckin,
  createBookingHold,
  createPaymentSession,
  createRefundRequest,
  submitSandboxPayment
} from "@/lib/booking-api";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("booking-api", () => {
  it("goi api giu cho hop le", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          bookingCode: "A6C2P1",
          status: "held",
          expiresAt: "2026-03-11T14:15:00+07:00",
          createdAt: "2026-03-11T14:00:00+07:00",
          tripType: "one_way",
          contact: {
            fullName: "Nguyen Van A",
            email: "a@example.com",
            phone: "0912345678"
          },
          passengers: [],
          selectedSegments: [],
          selectedAncillaries: [],
          priceSummary: {
            baseAmount: 1490000,
            ancillaryAmount: 0,
            discountAmount: 0,
            totalAmount: 1490000,
            currency: "VND",
            appliedVoucherCode: null
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      createBookingHold({
        ancillaries: [],
        contact: {
          email: "a@example.com",
          fullName: "Nguyen Van A",
          phone: "0912345678"
        },
        passengers: [
          {
            dateOfBirth: "1995-05-12",
            documentNumber: "079123456789",
            documentType: "CCCD",
            fullName: "Nguyen Van A",
            passengerType: "adult"
          }
        ],
        seatSelections: [],
        segments: [{ inventoryId: 20101 }],
        tripType: "one_way"
      })
    ).resolves.toMatchObject({
      bookingCode: "A6C2P1",
      status: "held"
    });
  });

  it("goi api khoi tao phien thanh toan SePay", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          bookingCode: "A6C2P1",
          provider: "sepay",
          sessionMode: "local",
          paymentUrl: null,
          paymentStatus: "pending",
          expiresAt: "2026-03-11T14:15:00+07:00",
          referenceCode: "SEPAY-000000000001",
          amount: 1490000,
          discountAmount: 0,
          appliedVoucherCode: null,
          bankName: "BIDV",
          accountNumber: "1234567890",
          accountHolderName: "VIETNAM AIRLINES",
          qrCodeUrl: null,
          qrCodeDataUrl: null
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(createPaymentSession("A6C2P1")).resolves.toMatchObject({
      bookingCode: "A6C2P1",
      paymentStatus: "pending"
    });
  });

  it("goi api huy ap dung voucher", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          bookingCode: "A6C2P1",
          status: "held",
          paymentStatus: "pending",
          holdExpiresAt: "2026-03-11T14:15:00+07:00",
          ticketedAt: null,
          tripType: "one_way",
          steps: ["Giữ chỗ thành công"],
          segments: [],
          contact: null,
          passengers: [],
          ancillaries: [],
          seatSelections: [],
          tickets: [],
          boardingPasses: [],
          refundRequest: null,
          paymentMethods: ["Chuyển khoản SePay"],
          priceSummary: {
            baseAmount: 1490000,
            ancillaryAmount: 0,
            discountAmount: 0,
            totalAmount: 1490000,
            currency: "VND",
            appliedVoucherCode: null
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );
    global.fetch = fetchMock as typeof fetch;

    await expect(cancelAppliedVoucherForBooking(" A6C2P1 ", "access-token")).resolves.toMatchObject({
      bookingCode: "A6C2P1",
      priceSummary: {
        appliedVoucherCode: null,
        discountAmount: 0
      }
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/bookings/A6C2P1/apply-voucher",
      expect.objectContaining({
        method: "DELETE"
      })
    );
  });

  it("goi xac nhan thanh toan cuc bo", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
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
          seatSelections: [],
          tickets: [],
          boardingPasses: [],
          refundRequest: null,
          paymentMethods: ["Chuyển khoản SePay"],
          priceSummary: {
            baseAmount: 1490000,
            ancillaryAmount: 0,
            discountAmount: 0,
            totalAmount: 1490000,
            currency: "VND",
            appliedVoucherCode: null
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      submitSandboxPayment({
        bookingCode: "A6C2P1",
        result: "success"
      })
    ).resolves.toMatchObject({
      bookingCode: "A6C2P1",
      paymentStatus: "paid",
      status: "ticketed"
    });
  });

  it("goi api hoan tat check-in", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          bookingCode: "A6C2P1",
          ticketNumbers: ["7380000000001"],
          boardingPasses: [
            {
              ticketNumber: "7380000000001",
              passengerName: "Nguyen Van A",
              seatNumber: "12A",
              gate: "G3",
              boardingTime: "2026-03-20T05:25:00+07:00",
              barcode: "BP-A6C2P1-7380000000001"
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      completeCheckin({
        bookingCode: "A6C2P1",
        ticketNumbers: ["7380000000001"]
      })
    ).resolves.toMatchObject({
      bookingCode: "A6C2P1",
      ticketNumbers: ["7380000000001"]
    });
  });

  it("goi api tao yeu cau hoan ve", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          bookingCode: "A6C2P1",
          status: "refund_pending",
          paymentStatus: "paid",
          holdExpiresAt: "2026-03-11T14:15:00+07:00",
          ticketedAt: "2026-03-11T14:10:00+07:00",
          tripType: "one_way",
          steps: ["Giữ chỗ thành công", "Thanh toán thành công", "Đang chờ duyệt hoàn vé"],
          segments: [],
          contact: null,
          passengers: [],
          ancillaries: [],
          seatSelections: [],
          tickets: [
            {
              ticketNumber: "7380000000001",
              passengerName: "Nguyen Van A",
              status: "issued",
              issuedAt: "2026-03-11T14:10:00+07:00"
            }
          ],
          boardingPasses: [],
          refundRequest: {
            reason: "Thay doi ke hoach",
            refundAmount: 1490000,
            status: "pending",
            createdAt: "2026-03-11T14:20:00+07:00"
          },
          paymentMethods: ["Chuyển khoản SePay"],
          priceSummary: {
            baseAmount: 1490000,
            ancillaryAmount: 0,
            discountAmount: 0,
            totalAmount: 1490000,
            currency: "VND",
            appliedVoucherCode: null
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      createRefundRequest("A6C2P1", {
        reason: "Thay doi ke hoach"
      })
    ).resolves.toMatchObject({
      bookingCode: "A6C2P1",
      status: "refund_pending"
    });
  });
});
