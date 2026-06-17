import { expect, test } from "@playwright/test";

import { jsonResponse, seedAuthSession, taoThoiDiemTuongLai } from "./e2e-helpers";

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

test("checkout cho phep bo voucher va khoi phuc tong tien", async ({ page }) => {
  await seedAuthSession(page, {
    roles: ["member"],
    permissions: ["customer.self_service", "member.loyalty"],
    email: "member@example.com",
    displayName: "Hoi vien"
  });

  const sessionCoVoucher = {
    bookingCode: "V7U8C1",
    provider: "sepay",
    sessionMode: "live",
    paymentUrl: "https://qr.sepay.vn/img?acc=0985512831&bank=MBBank&amount=890000&des=SEPAY-000000000005",
    paymentStatus: "pending",
    expiresAt: taoThoiDiemTuongLai(20),
    referenceCode: "SEPAY-000000000005",
    amount: 890000,
    bankName: "MB Bank",
    accountNumber: "0985512831",
    accountHolderName: "Vietnam Airlines",
    qrCodeUrl: "https://qr.sepay.vn/img?acc=0985512831&bank=MBBank&amount=890000&des=SEPAY-000000000005",
    qrCodeDataUrl: null,
    discountAmount: 100000,
    appliedVoucherCode: "VNA-100K"
  };
  const sessionKhongVoucher = {
    ...sessionCoVoucher,
    amount: 990000,
    discountAmount: 0,
    appliedVoucherCode: null,
    paymentUrl: "https://qr.sepay.vn/img?acc=0985512831&bank=MBBank&amount=990000&des=SEPAY-000000000005",
    qrCodeUrl: "https://qr.sepay.vn/img?acc=0985512831&bank=MBBank&amount=990000&des=SEPAY-000000000005"
  };
  let daBoVoucher = false;

  await page.route("**/api/bookings/V7U8C1/payments/session", async (route) => {
    await route.fulfill(jsonResponse(daBoVoucher ? sessionKhongVoucher : sessionCoVoucher));
  });

  await page.route("**/api/me/vouchers", async (route) => {
    await route.fulfill(jsonResponse([
      {
        voucherCode: "VNA-100K",
        title: "Giam 100.000 dong",
        description: "Ap dung cho booking hoi vien",
        discountAmount: 100000,
        currency: "VND",
        status: daBoVoucher ? "AVAILABLE" : "RESERVED",
        expiresAt: "2026-07-01T23:59:00+07:00",
        usedAt: null,
        bookingCode: daBoVoucher ? null : "V7U8C1"
      }
    ]));
  });

  await page.route("**/api/bookings/V7U8C1/applied-voucher", async (route) => {
    daBoVoucher = true;
    await route.fulfill(jsonResponse({
      bookingCode: "V7U8C1",
      status: "held",
      paymentStatus: "pending",
      holdExpiresAt: taoThoiDiemTuongLai(20),
      ticketedAt: null,
      tripType: "one_way",
      steps: ["Giữ chỗ thành công"],
      segments: [],
      contact: {
        fullName: "Nguyen Van A",
        email: "member@example.com",
        phone: "0912345678"
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

  await page.goto("/booking/V7U8C1/checkout");

  const tongTienTomTat = page.locator(".booking-summary-card strong");

  await expect(page.getByRole("button", { name: "Bo voucher" })).toBeVisible();
  await expect(tongTienTomTat).toContainText("890.000");

  await page.getByRole("button", { name: "Bo voucher" }).click();

  await expect.poll(() => daBoVoucher).toBe(true);
  await expect(page.getByRole("button", { name: "Bo voucher" })).toHaveCount(0);
  await expect(tongTienTomTat).toContainText("990.000");
  await expect(page.locator('input[placeholder="VNA-MEMBER-01"]')).toHaveValue("");
});
