import { expect, test, type Page } from "@playwright/test";
import type { ApiManageBookingOverview } from "@qlvmb/shared-types";
import { jsonResponse, seedAuthSession, taoThoiDiemTuongLai } from "./e2e-helpers";
import { aircraftFixture, aircraftTypeFixture, seatMapFixture } from "./seat-map-fixtures";

function bookingUrl(roundTrip = false, passengers = 1) {
  const params = new URLSearchParams({ adultCount: String(passengers), childCount: "0", infantCount: "0", tripType: roundTrip ? "round_trip" : "one_way" });
  for (const [index, id] of (roundTrip ? [18, 19] : [18]).entries()) {
    for (const [key, value] of Object.entries({ FlightId: id, Code: `VN${id}`, From: "Hồ Chí Minh", To: "Hà Nội",
      OriginCode: "SGN", DestinationCode: "HAN", DepartureAt: taoThoiDiemTuongLai(24 * 60), ArrivalAt: taoThoiDiemTuongLai(26 * 60),
      DepartureTime: "08:30", ArrivalTime: "10:30", BaseFare: 1490000 })) params.set(`segment${index + 1}${key}`, String(value));
  }
  return `/booking?${params}`;
}

async function mockBookingOptions(page: Page) {
  await page.route(/\/api\/flights\/\d+\/booking-options$/, (route) => {
    const id = Number(new URL(route.request().url()).pathname.split("/")[3]);
    return route.fulfill(jsonResponse({ flightId: id, code: `VN${id}`, originCode: "SGN", destinationCode: "HAN", from: "Hồ Chí Minh", to: "Hà Nội",
      departureAt: taoThoiDiemTuongLai(1440), arrivalAt: taoThoiDiemTuongLai(1560), baseFare: 1490000,
      fareOptions: [{ inventoryId: id * 100 + 1, fareFamily: "pho_thong_tiet_kiem", title: "Phổ thông tiết kiệm", price: 1490000, seatsLeft: 6, totalSeats: 6, rowStart: id === 18 ? 9 : 20, rowEnd: id === 18 ? 9 : 20 }], seats: [] }));
  });
}

function overview(currentSeat: string | null): ApiManageBookingOverview {
  return {
    bookingCode: "SEAT01", status: "ticketed", paymentStatus: "paid", holdExpiresAt: null, ticketedAt: taoThoiDiemTuongLai(-60), tripType: "one_way", steps: [],
    segments: [{ flightId: 18, inventoryId: 1801, code: "VN18", from: "Hồ Chí Minh", to: "Hà Nội", originCode: "SGN", destinationCode: "HAN",
      departureAt: taoThoiDiemTuongLai(20 * 60), arrivalAt: taoThoiDiemTuongLai(22 * 60), fareFamily: "pho_thong_tiet_kiem", fareTitle: "Phổ thông tiết kiệm", pricePerPassenger: 1490000, passengerCount: 1, subtotalAmount: 1490000 }],
    contact: { fullName: "Khách thử", email: "guest@example.com", phone: "0900000000" }, passengers: [], ancillaries: [], seatSelections: [],
    tickets: [{ ticketNumber: "TICKET1", inventoryId: 1801, passengerName: "Khách thử", status: "issued", issuedAt: taoThoiDiemTuongLai(-60), currentSeatNumber: currentSeat }],
    boardingPasses: [], refundRequest: null, paymentMethods: [],
    priceSummary: { baseAmount: 1490000, ancillaryAmount: 0, discountAmount: 0, totalAmount: 1490000, currency: "VND", appliedVoucherCode: null }
  };
}

test("khứ hồi dùng hai layout riêng, mỗi hành khách không chọn trùng ghế", async ({ page }) => {
  await mockBookingOptions(page);
  await page.route("**/api/flights/18/seat-map", (route) => route.fulfill(jsonResponse(seatMapFixture(18, 9, ["A", "B"]))));
  await page.route("**/api/flights/19/seat-map", (route) => route.fulfill(jsonResponse(seatMapFixture(19, 20, ["A", "C", "D", "F"]))));
  await page.goto(bookingUrl(true, 2));
  const outbound = page.getByRole("group", { name: "Sơ đồ chỗ ngồi cho VN18" });
  const inbound = page.getByRole("group", { name: "Sơ đồ chỗ ngồi cho VN19" });
  await expect(outbound.getByRole("button")).toHaveCount(2);
  await expect(inbound.getByRole("button")).toHaveCount(4);
  await expect(outbound.locator(".seat-map-legend")).toContainText("Vùng ghế của hạng đã chọn");
  await expect(outbound.locator(".seat-map-legend .seat-legend-dot")).toHaveCount(3);
  await expect(outbound).not.toContainText("Dùng Tab");
  await expect(outbound.locator(".seat-map-summary")).toHaveText("Hành khách 1 đang chọn Phổ thông tiết kiệm • chưa chọn ghế");
  const seat = outbound.getByRole("button", { name: /^Ghế 9A,/ });
  await seat.focus(); await page.keyboard.press("Enter");
  await expect(seat).toHaveAttribute("aria-pressed", "true");
  await expect(outbound.locator(".seat-map-summary")).toContainText("• Ghế 9A");
  await page.getByRole("button", { name: /^Hành khách 2 • Người lớn/ }).first().click();
  await expect(outbound.getByRole("button", { name: /^Ghế 9A,/ })).toBeDisabled();
  await inbound.getByRole("button", { name: /^Ghế 20A,/ }).click();
  await expect(inbound.getByRole("button", { name: /^Ghế 9A,/ })).toHaveCount(0);
  await expect(page.locator(".booking-total-amount")).toContainText("5.960.000");
});

test("thiếu aircraft báo lỗi cấu hình, không fallback 168 ghế", async ({ page }) => {
  await mockBookingOptions(page);
  await page.route("**/api/flights/18/seat-map", (route) => route.fulfill(jsonResponse({ message: "Chuyến bay chưa gán tàu bay." }, 409)));
  await page.goto(bookingUrl());
  await expect(page.locator(".booking-inline-error")).toContainText("Chuyến bay chưa gán tàu bay.");
  await expect(page.locator(".seat-map-cabin")).toHaveCount(0);
});

test("sơ đồ cabin đọc được trên điện thoại, không tràn chiều ngang trang", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockBookingOptions(page);
  await page.route("**/api/flights/18/seat-map", (route) => route.fulfill(jsonResponse(seatMapFixture())));
  await page.goto(bookingUrl());
  const map = page.getByRole("group", { name: "Sơ đồ chỗ ngồi cho VN18" });
  await expect(map.getByRole("button")).toHaveCount(6);
  await map.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await map.screenshot({ path: test.info().outputPath("seat-map-mobile.png") });
});

test("xung đột giữ ghế cập nhật map và yêu cầu chọn ghế mới", async ({ page }) => {
  await mockBookingOptions(page);
  let holdConflict = false;
  await page.route("**/api/flights/18/seat-map", (route) => {
    const map = seatMapFixture(18, 9, ["A", "B"]);
    if (holdConflict) map.seats[0].occupied = true;
    return route.fulfill(jsonResponse(map));
  });
  await page.route("**/api/bookings/holds", (route) => {
    holdConflict = true;
    return route.fulfill(jsonResponse({ message: "Ghế 9A vừa được giữ bởi người khác." }, 409));
  });
  await page.goto(bookingUrl());
  await page.getByLabel("Họ và tên").first().fill("Khách thử");
  await page.getByLabel("Email", { exact: true }).fill("guest@example.com");
  await page.getByLabel("Số điện thoại").fill("0900000000");
  await page.getByLabel("Họ và tên").nth(1).fill("Khách thử");
  await page.getByLabel("Ngày sinh").fill("12/05/1995");
  await page.getByLabel("Số giấy tờ").fill("123456789000");
  await page.getByRole("button", { name: /^Ghế 9A,/ }).click();
  await page.getByRole("button", { name: "Tiếp tục / Giữ chỗ" }).click();
  await expect(page.getByRole("button", { name: /^Ghế 9A,/ })).toBeDisabled();
  await expect(page.locator(".seat-map-summary")).toContainText("chưa chọn ghế");
  await page.getByRole("button", { name: /^Ghế 9B,/ }).click();
  await expect(page.locator(".seat-map-summary")).toContainText("9B");
});

for (const currentSeat of ["9A", null]) {
  test(`check-in ${currentSeat ? "preselect và đổi ghế" : "booking cũ bắt buộc chọn ghế"}, boarding pass lấy ghế xác nhận`, async ({ page }) => {
    let booking = overview(currentSeat);
    let confirmed: unknown;
    await page.route("**/api/bookings/manage/SEAT01", (route) => route.fulfill(jsonResponse(booking)));
    await page.route("**/api/flights/18/seat-map", (route) => {
      const map = seatMapFixture(18, 9, ["A", "B", "C"]); map.seats[0].occupied = Boolean(currentSeat);
      map.seats[2].occupied = true;
      return route.fulfill(jsonResponse(map));
    });
    await page.route("**/api/check-in/complete", (route) => {
      confirmed = route.request().postDataJSON();
      const pass = { ticketNumber: "TICKET1", inventoryId: 1801, passengerName: "Khách thử", seatNumber: "9B", gate: "G1", boardingTime: taoThoiDiemTuongLai(1140), barcode: "TEST-BARCODE" };
      booking = { ...booking, tickets: [{ ...booking.tickets[0], status: "checked_in", currentSeatNumber: "9B" }], boardingPasses: [pass] };
      return route.fulfill(jsonResponse({ bookingCode: "SEAT01", ticketNumbers: ["TICKET1"], boardingPasses: [pass] }));
    });
    await page.goto("/check-in?bookingCode=SEAT01&lookupToken=read-only-test-token");
    const complete = page.getByRole("button", { name: "Hoàn tất Check-in" });
    const map = page.getByRole("group", { name: "Sơ đồ check-in VN18" });
    await expect(map.getByRole("button", { name: /^Ghế 9C,/ })).toBeDisabled();
    if (currentSeat) await expect(map.getByRole("button", { name: /^Ghế 9A,/ })).toHaveAttribute("aria-pressed", "true");
    else await expect(complete).toBeDisabled();
    await map.getByRole("button", { name: /^Ghế 9B,/ }).click();
    await complete.click();
    await expect.poll(() => confirmed).toMatchObject({ seatSelections: [{ ticketNumber: "TICKET1", seatNumber: "9B" }] });
    await expect(page.locator(".boarding-pass-card")).toContainText("Ghế 9B");
    await expect(page.getByRole("group", { name: "Sơ đồ check-in VN18" })).toHaveCount(0);
  });
}

test("Operations chỉ gán ACTIVE và hiển thị xung đột layout", async ({ page }) => {
  await seedAuthSession(page, { roles: ["operations_staff"], permissions: ["backoffice.operations"] });
  await page.route("**/api/backoffice/operations/aircraft", (route) => route.fulfill(jsonResponse([aircraftFixture, { ...aircraftFixture, id: 19, registrationCode: "VN-MAINT", status: "MAINTENANCE" }])));
  await page.route("**/api/backoffice/operations/aircraft-types", (route) => route.fulfill(jsonResponse([aircraftTypeFixture])));
  await page.route("**/api/backoffice/operations/aircraft-types/18", (route) => route.fulfill(jsonResponse({ message: "Ghế 9A đang giữ không hợp lệ trong layout mới." }, 409)));
  await page.route("**/api/backoffice/operations/flights**", (route) => route.fulfill(jsonResponse({ queryCode: null, queryDate: null, flights: [] })));
  await page.route("**/api/backoffice/operations/vouchers**", (route) => route.fulfill(jsonResponse({ queryEmail: null, queryCode: null, queryStatus: null, vouchers: [] })));
  await page.goto("/backoffice/operations");
  const assignment = page.getByLabel("Tàu bay cho chuyến mới");
  await expect(assignment.locator("option")).toHaveCount(2);
  await expect(assignment).not.toContainText("VN-MAINT");
  await page.getByLabel("Chọn loại tàu để sửa").selectOption("18");
  await page.getByRole("button", { name: "Lưu loại tàu và layout" }).click();
  await expect(page.locator("#operations-aircraft")).toContainText("Ghế 9A đang giữ không hợp lệ");
});

test("check-in gặp 409 tải lại ghế, không phát boarding pass hoặc giữ lựa chọn đã bị chiếm", async ({ page }) => {
  let checkinConflict = false;
  await page.route("**/api/bookings/manage/SEAT01", (route) => route.fulfill(jsonResponse(overview(null))));
  await page.route("**/api/flights/18/seat-map", (route) => {
    const map = seatMapFixture(18, 9, ["A", "B"]);
    if (checkinConflict) map.seats[0].occupied = true;
    return route.fulfill(jsonResponse(map));
  });
  await page.route("**/api/check-in/complete", (route) => {
    checkinConflict = true;
    return route.fulfill(jsonResponse({ message: "Ghế 9A không còn trống." }, 409));
  });
  await page.goto("/check-in?bookingCode=SEAT01&lookupToken=read-only-test-token");
  const seat = page.getByRole("button", { name: /^Ghế 9A,/ });
  await seat.click();
  await page.getByRole("button", { name: "Hoàn tất Check-in" }).click();
  await expect(seat).toBeDisabled();
  await expect(page.getByRole("button", { name: "Hoàn tất Check-in" })).toBeDisabled();
  await expect(page.locator(".boarding-pass-card")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Sơ đồ check-in VN18" }).locator(".seat-map-summary")).toContainText("Chưa chọn ghế");
});
