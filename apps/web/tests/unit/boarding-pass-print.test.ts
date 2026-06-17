import { describe, expect, it } from "vitest";

import {
  buildBoardingPassPrintHtml,
  buildBoardingPassPrintModel
} from "@/lib/boarding-pass-print";

describe("boarding-pass-print", () => {
  it("tao model in the len may bay tu du lieu booking hien co", () => {
    const model = buildBoardingPassPrintModel(
      "A6C2P1",
      {
        inventoryId: 20101,
        ticketNumber: "7380000000001",
        passengerName: "Nguyen Van A",
        seatNumber: "12A",
        gate: "G3",
        boardingTime: "2026-06-15T08:00:00+07:00",
        barcode: "BP-A6C2P1-7380000000001"
      },
      {
        inventoryId: 20101,
        code: "VN123",
        from: "Thành phố Hồ Chí Minh",
        to: "Hà Nội",
        originCode: "SGN",
        destinationCode: "HAN",
        departureAt: "2026-06-15T09:00:00+07:00",
        arrivalAt: "2026-06-15T11:10:00+07:00",
        fareFamily: "pho_thong_tiet_kiem",
        fareTitle: "Phổ thông tiết kiệm",
        pricePerPassenger: 1490000,
        passengerCount: 1,
        subtotalAmount: 1490000
      },
      new Date("2026-06-15T02:00:00.000Z")
    );

    expect(model.bookingCode).toBe("A6C2P1");
    expect(model.routeLabel).toBe("Thành phố Hồ Chí Minh (SGN) - Hà Nội (HAN)");
    expect(model.boardingTimeLabel).toBe("15/06/2026 08:00");
    expect(model.printedAtLabel).toBe("15/06/2026 09:00");
  });

  it("escape html truoc khi dua vao ban in", () => {
    const html = buildBoardingPassPrintHtml({
      arrivalLabel: "15/06/2026 11:10",
      barcode: "BP-<unsafe>",
      boardingTimeLabel: "15/06/2026 08:00",
      bookingCode: "A6C2P1",
      departureLabel: "15/06/2026 09:00",
      flightLabel: "VN123",
      gate: "G3",
      passengerName: "Nguyen Van A <script>",
      printedAtLabel: "15/06/2026 09:05",
      routeLabel: "SGN - HAN",
      seatNumber: "12A",
      ticketNumber: "7380000000001"
    });

    expect(html).toContain("Nguyen Van A &lt;script&gt;");
    expect(html).toContain("BP-&lt;unsafe&gt;");
    expect(html).not.toContain("<script>");
  });
});
