import { describe, expect, it } from "vitest";

import { taoNoiDungPdfTheLenMayBay } from "@/lib/boarding-pass-pdf";

describe("boarding-pass-pdf", () => {
  it("tao noi dung in cho the len may bay", () => {
    const html = taoNoiDungPdfTheLenMayBay({
      boardingPass: {
        inventoryId: 1201,
        ticketNumber: "7380000000001",
        passengerName: "Nguyen Van A",
        seatNumber: "12A",
        gate: "G3",
        boardingTime: "2026-06-20T07:15:00+07:00",
        barcode: "BP-A6C2P1-7380000000001"
      },
      bookingCode: "A6C2P1",
      segment: {
        inventoryId: 1201,
        code: "VN123",
        originCode: "SGN",
        destinationCode: "HAN",
        from: "TP. HCM",
        to: "Ha Noi",
        departureAt: "2026-06-20T08:00:00+07:00",
        arrivalAt: "2026-06-20T10:05:00+07:00",
        fareFamily: "pho_thong_linh_hoat",
        fareTitle: "Pho thong",
        pricePerPassenger: 990000,
        passengerCount: 1,
        subtotalAmount: 990000,
        status: "scheduled"
      }
    });

    expect(html).toContain("A6C2P1");
    expect(html).toContain("7380000000001");
    expect(html).toContain("Nguyen Van A");
    expect(html).toContain("VN123");
    expect(html).toContain("20/06/2026");
    expect(html).toContain("12A");
  });
});
