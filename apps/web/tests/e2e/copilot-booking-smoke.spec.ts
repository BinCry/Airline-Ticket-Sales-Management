import { expect, test } from "@playwright/test";

import { jsonResponse, taoThoiDiemTuongLai } from "./e2e-helpers";

function taoDuongDanHandoff() {
  const departureAt = encodeURIComponent(taoThoiDiemTuongLai(60 * 24 * 7));
  const arrivalAt = encodeURIComponent(taoThoiDiemTuongLai(60 * 24 * 7 + 130));

  return "/booking?adultCount=1&childCount=0&infantCount=0&tripType=one_way"
    + "&segment1FlightId=18"
    + "&segment1Code=VN5201"
    + "&segment1From=Thanh%20pho%20Ho%20Chi%20Minh"
    + "&segment1To=Ha%20Noi"
    + "&segment1OriginCode=SGN"
    + "&segment1DestinationCode=HAN"
    + `&segment1DepartureAt=${departureAt}`
    + `&segment1ArrivalAt=${arrivalAt}`
    + "&segment1DepartureTime=08:30"
    + "&segment1ArrivalTime=10:40"
    + "&segment1BaseFare=1490000";
}

function taoBookingOptions() {
  return {
    flightId: 18,
    code: "VN5201",
    originCode: "SGN",
    destinationCode: "HAN",
    from: "Thanh pho Ho Chi Minh",
    to: "Ha Noi",
    departureAt: taoThoiDiemTuongLai(60 * 24 * 7),
    arrivalAt: taoThoiDiemTuongLai(60 * 24 * 7 + 130),
    baseFare: 1490000,
    fareOptions: [
      {
        inventoryId: 1801,
        fareFamily: "pho_thong_tiet_kiem",
        title: "Pho thong tiet kiem",
        price: 1490000,
        seatsLeft: 120,
        totalSeats: 120,
        rowStart: 9,
        rowEnd: 28
      },
      {
        inventoryId: 1802,
        fareFamily: "pho_thong_linh_hoat",
        title: "Pho thong linh hoat",
        price: 1990000,
        seatsLeft: 36,
        totalSeats: 36,
        rowStart: 3,
        rowEnd: 8
      },
      {
        inventoryId: 1803,
        fareFamily: "thuong_gia",
        title: "Thuong gia",
        price: 2490000,
        seatsLeft: 12,
        totalSeats: 12,
        rowStart: 1,
        rowEnd: 2
      }
    ],
    seats: [
      { seatNumber: "9A", fareFamily: "pho_thong_tiet_kiem", occupied: false },
      { seatNumber: "9B", fareFamily: "pho_thong_tiet_kiem", occupied: false },
      { seatNumber: "9C", fareFamily: "pho_thong_tiet_kiem", occupied: false },
      { seatNumber: "9D", fareFamily: "pho_thong_tiet_kiem", occupied: false },
      { seatNumber: "9E", fareFamily: "pho_thong_tiet_kiem", occupied: false },
      { seatNumber: "9F", fareFamily: "pho_thong_tiet_kiem", occupied: false }
    ]
  };
}

test("copilot sidebar chi hien o booking va checkout", async ({ page }) => {
  await page.goto("/search");
  await expect(page.getByTestId("booking-copilot-sidebar")).toHaveCount(0);

  await page.route("**/api/flights/18/booking-options", async (route) => {
    await route.fulfill(jsonResponse(taoBookingOptions()));
  });

  await page.goto(taoDuongDanHandoff());
  await expect(page.getByTestId("booking-copilot-sidebar")).toHaveCount(1);
  await expect(page.locator(".booking-copilot-shell .copilotKitButton")).toBeVisible();
  await page.locator(".booking-copilot-shell .copilotKitButton").click();
  await expect(page.locator(".booking-copilot-shell .copilotKitWindow")).toBeVisible();
  await expect(page.locator(".booking-copilot-shell textarea")).toBeVisible();

  await page.route("**/api/bookings/A6C2P1/payments/session", async (route) => {
    await route.fulfill(jsonResponse({
      bookingCode: "A6C2P1",
      provider: "sepay",
      sessionMode: "live",
      paymentUrl: "https://qr.sepay.vn/img?acc=0985512831&bank=MBBank&amount=1490000&des=SEPAY-000000000003",
      paymentStatus: "pending",
      expiresAt: taoThoiDiemTuongLai(20),
      referenceCode: "SEPAY-000000000003",
      amount: 1490000,
      bankName: "MB Bank",
      accountNumber: "0985512831",
      accountHolderName: "Vietnam Airlines",
      qrCodeUrl: "https://qr.sepay.vn/img?acc=0985512831&bank=MBBank&amount=1490000&des=SEPAY-000000000003",
      qrCodeDataUrl: null,
      discountAmount: 0,
      appliedVoucherCode: null
    }));
  });

  await page.goto("/booking/A6C2P1/checkout");
  await expect(page.getByTestId("booking-copilot-sidebar")).toHaveCount(1);
  await expect(page.locator(".booking-copilot-shell .copilotKitButton")).toBeVisible();
  await page.locator(".booking-copilot-shell .copilotKitButton").click();
  await expect(page.locator(".booking-copilot-shell .copilotKitWindow")).toBeVisible();
  await expect(page.locator(".booking-copilot-shell textarea")).toBeVisible();
});
