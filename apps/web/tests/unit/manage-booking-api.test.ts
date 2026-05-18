import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchManageBooking } from "@/lib/manage-booking-api";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe("manage-booking-api", () => {
  it("tai duoc booking overview hop le", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          bookingCode: "A6C2P1",
          status: "ticketed",
          paymentStatus: "paid",
          holdExpiresAt: "2026-03-11T14:15:00+07:00",
          ticketedAt: "2026-03-11T14:10:00+07:00",
          tripType: "one_way",
          steps: ["Chọn chuyến bay", "Giữ chỗ thành công", "Thanh toán thành công"],
          segments: [
            {
              inventoryId: 20101,
              code: "AU201",
              from: "Thanh pho Ho Chi Minh",
              to: "Ha Noi",
              originCode: "SGN",
              destinationCode: "HAN",
              departureAt: "2026-03-20T06:10:00+07:00",
              arrivalAt: "2026-03-20T08:20:00+07:00",
              fareFamily: "pho_thong_tiet_kiem",
              fareTitle: "Pho thong tiet kiem",
              pricePerPassenger: 1490000,
              passengerCount: 1,
              subtotalAmount: 1490000
            }
          ],
          contact: {
            fullName: "Nguyen Van A",
            email: "a@example.com",
            phone: "0912345678"
          },
          passengers: [
            {
              fullName: "Nguyen Van A",
              passengerType: "adult",
              dateOfBirth: "1995-05-12",
              documentType: "CCCD",
              documentNumber: "079123456789"
            }
          ],
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

    await expect(fetchManageBooking("A6C2P1", "token-hop-le")).resolves.toMatchObject({
      bookingCode: "A6C2P1",
      paymentStatus: "paid",
      status: "ticketed"
    });
  });
});
