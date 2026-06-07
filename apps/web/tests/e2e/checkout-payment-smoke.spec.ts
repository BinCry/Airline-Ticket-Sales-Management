import { expect, test } from "@playwright/test";

import { jsonResponse, taoThoiDiemTuongLai } from "./e2e-helpers";

test("checkout hiển thị đúng phiên thanh toán live của SePay", async ({ page }) => {
  const liveSession = {
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
  };

  await page.route("**/api/bookings/A6C2P1/payments/session", async (route) => {
    await route.fulfill(jsonResponse(liveSession));
  });

  await page.goto("/booking/A6C2P1/checkout");

  await expect(page.getByText("SEPAY-000000000003")).toBeVisible();
  await expect(page.getByText("MB Bank")).toBeVisible();
  await expect(page.locator("img[alt*='SEPAY-000000000003']")).toBeVisible();

  const paymentLink = page.locator(".auth-action-row a.button.button-primary");
  await expect(paymentLink).toHaveAttribute("href", /qr\.sepay\.vn\/img/);
  await expect(page.locator(".booking-total-amount")).toContainText("SePay");
});

test("checkout local cho xác nhận thủ công và chuyển sang manage booking", async ({ page }) => {
  const localSession = {
    bookingCode: "B7D4Q2",
    provider: "sepay",
    sessionMode: "local",
    paymentUrl: null,
    paymentStatus: "pending",
    expiresAt: taoThoiDiemTuongLai(15),
    referenceCode: "SEPAY-000000000001",
    amount: 990000,
    bankName: "BIDV",
    accountNumber: "1234567890",
    accountHolderName: "Vietnam Airlines",
    qrCodeUrl: null,
    qrCodeDataUrl: null,
    discountAmount: 0,
    appliedVoucherCode: null
  };
  let callbackPayload: Record<string, unknown> | null = null;

  await page.route("**/api/bookings/B7D4Q2/payments/session", async (route) => {
    await route.fulfill(jsonResponse(localSession));
  });

  await page.route("**/api/payments/callback", async (route) => {
    callbackPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill(jsonResponse({
      bookingCode: "B7D4Q2",
      status: "ticketed",
      paymentStatus: "paid",
      holdExpiresAt: taoThoiDiemTuongLai(15),
      ticketedAt: taoThoiDiemTuongLai(-1),
      tripType: "one_way",
      steps: ["Chọn chuyến bay", "Giữ chỗ thành công", "Thanh toán thành công"],
      segments: [],
      contact: {
        fullName: "Nguyễn Văn B",
        email: "guest@example.com",
        phone: "0900000003"
      },
      passengers: [],
      ancillaries: [],
      seatSelections: [],
      tickets: [],
      boardingPasses: [],
      refundRequest: null,
      paymentMethods: ["Chuyển khoản SePay"],
      priceSummary: {
        baseAmount: 990000,
        ancillaryAmount: 0,
        discountAmount: 0,
        totalAmount: 990000,
        currency: "VND",
        appliedVoucherCode: null
      }
    }));
  });

  await page.goto("/booking/B7D4Q2/checkout");

  const confirmButton = page.locator(".auth-action-row button.button.button-primary");
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();

  await expect.poll(() => callbackPayload).not.toBeNull();
  await expect.poll(() => callbackPayload?.bookingCode).toBe("B7D4Q2");
  await expect.poll(() => callbackPayload?.result).toBe("success");
  await expect(page).toHaveURL(/\/manage-booking\?bookingCode=B7D4Q2/);
});
