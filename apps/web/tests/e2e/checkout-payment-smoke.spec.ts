import { expect, test } from "@playwright/test";

import { jsonResponse, taoThoiDiemTuongLai } from "./e2e-helpers";

test("checkout hien thi dung phien thanh toan live cua SePay", async ({ page }) => {
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
  await expect(page.locator("img[alt*='SEPAY-000000000003']")).toHaveAttribute(
    "src",
    /qr\.sepay\.vn\/img/
  );

  const paymentLink = page.locator(".auth-action-row a.button.button-primary");
  await expect(paymentLink).toHaveAttribute("href", /qr\.sepay\.vn\/img/);
  await expect(page.locator(".booking-total-amount")).toContainText("SePay");
});

test("checkout live tu chuyen sang manage booking khi da doi soat thanh cong", async ({ page }) => {
  const pendingSession = {
    bookingCode: "C8L9V1",
    provider: "sepay",
    sessionMode: "live",
    paymentUrl: "https://qr.sepay.vn/img?acc=0985512831&bank=MBBank&amount=1490000&des=SEPAY-000000000004",
    paymentStatus: "pending",
    expiresAt: taoThoiDiemTuongLai(20),
    referenceCode: "SEPAY-000000000004",
    amount: 1490000,
    bankName: "MB Bank",
    accountNumber: "0985512831",
    accountHolderName: "Vietnam Airlines",
    qrCodeUrl: "https://qr.sepay.vn/img?acc=0985512831&bank=MBBank&amount=1490000&des=SEPAY-000000000004",
    qrCodeDataUrl: null,
    discountAmount: 0,
    appliedVoucherCode: null
  };
  const paidSession = {
    ...pendingSession,
    paymentStatus: "paid"
  };
  let soLanTaiPhien = 0;

  await page.addInitScript(() => {
    const setIntervalGoc = window.setInterval.bind(window);
    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
      const timeoutRutGon = timeout === 15000 ? 20 : timeout;
      return setIntervalGoc(handler, timeoutRutGon, ...args);
    }) as typeof window.setInterval;
  });

  await page.route("**/api/bookings/C8L9V1/payments/session", async (route) => {
    soLanTaiPhien += 1;
    await route.fulfill(jsonResponse(soLanTaiPhien >= 2 ? paidSession : pendingSession));
  });

  await page.goto("/booking/C8L9V1/checkout");

  await expect(page).toHaveURL(/\/manage-booking\?bookingCode=C8L9V1/);
});

test("checkout local cho xac nhan thu cong va chuyen sang manage booking", async ({ page }) => {
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
      steps: ["Chon chuyen bay", "Giu cho thanh cong", "Thanh toan thanh cong"],
      segments: [],
      contact: {
        fullName: "Nguyen Van B",
        email: "guest@example.com",
        phone: "0900000003"
      },
      passengers: [],
      ancillaries: [],
      seatSelections: [],
      tickets: [],
      boardingPasses: [],
      refundRequest: null,
      paymentMethods: ["Chuyen khoan SePay"],
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
