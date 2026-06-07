import { expect, test, type Page } from "@playwright/test";

const LOOKUP_TOKEN = "lookup-token-123";
const QUERY_LOOKUP_TOKEN = "lookup-token-tu-query";
const THOI_DIEM_HIEN_TAI = Date.now();
const THOI_DIEM_HET_GIU_CHO = new Date(THOI_DIEM_HIEN_TAI + 5 * 60 * 1000).toISOString();
const THOI_DIEM_XUAT_VE = new Date(THOI_DIEM_HIEN_TAI - 5 * 60 * 1000).toISOString();
const THOI_DIEM_KHOI_HANH = new Date(THOI_DIEM_HIEN_TAI + 48 * 60 * 60 * 1000).toISOString();
const THOI_DIEM_HA_CANH = new Date(THOI_DIEM_HIEN_TAI + 50 * 60 * 60 * 1000).toISOString();
const THOI_DIEM_HET_OTP = new Date(THOI_DIEM_HIEN_TAI + 10 * 60 * 1000).toISOString();

const bookingOverviewPayload = {
  bookingCode: "A6C2P1",
  status: "ticketed",
  paymentStatus: "paid",
  holdExpiresAt: THOI_DIEM_HET_GIU_CHO,
  ticketedAt: THOI_DIEM_XUAT_VE,
  tripType: "one_way",
  steps: ["Chon chuyen bay", "Giu cho thanh cong", "Thanh toan thanh cong"],
  segments: [
    {
      inventoryId: 20101,
      code: "AU201",
      from: "Thanh pho Ho Chi Minh",
      to: "Ha Noi",
      originCode: "SGN",
      destinationCode: "HAN",
      departureAt: THOI_DIEM_KHOI_HANH,
      arrivalAt: THOI_DIEM_HA_CANH,
      fareFamily: "pho_thong_tiet_kiem",
      fareTitle: "Pho thong tiet kiem",
      pricePerPassenger: 1490000,
      passengerCount: 1,
      subtotalAmount: 1490000
    }
  ],
  contact: {
    fullName: "Nguyen Van A",
    email: "guest@example.com",
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
      issuedAt: THOI_DIEM_XUAT_VE
    }
  ],
  boardingPasses: [],
  refundRequest: null,
  paymentMethods: ["Chuyen khoan SePay"],
  priceSummary: {
    baseAmount: 1490000,
    ancillaryAmount: 0,
    discountAmount: 0,
    totalAmount: 1490000,
    currency: "VND",
    appliedVoucherCode: null
  }
};

function jsonResponse(payload: unknown, status = 200) {
  return {
    status,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  };
}

async function fillGuestLookupForm(page: Page) {
  await page.getByPlaceholder(/A6C2P1/).fill("A6C2P1");
  await page.getByPlaceholder(/tenban@gmail.com/).fill("guest@example.com");
  await page.getByPlaceholder(/OTP/).fill("123456");
}

test("check-in otp guest gui lookupToken sau xac minh thanh cong", async ({ page }) => {
  let lookupTokenHeader = "";
  let soLanTraCuu = 0;

  await page.route("**/api/bookings/lookup/verify-otp", async (route) => {
    await route.fulfill(
      jsonResponse({
        status: "verified",
        lookupToken: LOOKUP_TOKEN,
        expiresAt: THOI_DIEM_HET_OTP
      })
    );
  });

  await page.route("**/api/bookings/manage/**", async (route) => {
    soLanTraCuu += 1;
    lookupTokenHeader = route.request().headers()["x-booking-lookup-token"] ?? "";
    await route.fulfill(jsonResponse(bookingOverviewPayload));
  });

  await page.goto("/check-in");
  await fillGuestLookupForm(page);
  await page.getByRole("button", { name: /OTP/ }).click();

  await expect.poll(() => soLanTraCuu).toBe(1);
  await expect.poll(() => lookupTokenHeader).toBe(LOOKUP_TOKEN);
  await expect(page.getByText("Nguyen Van A").first()).toBeVisible();
  await expect(page.getByPlaceholder(/OTP/)).toHaveValue("");
});

test("check-in otp guest giu nguyen OTP khi tra cuu sau xac minh bi loi", async ({ page }) => {
  let lookupTokenHeader = "";
  let soLanTraCuu = 0;

  await page.route("**/api/bookings/lookup/verify-otp", async (route) => {
    await route.fulfill(
      jsonResponse({
        status: "verified",
        lookupToken: LOOKUP_TOKEN,
        expiresAt: THOI_DIEM_HET_OTP
      })
    );
  });

  await page.route("**/api/bookings/manage/**", async (route) => {
    soLanTraCuu += 1;
    lookupTokenHeader = route.request().headers()["x-booking-lookup-token"] ?? "";
    await route.fulfill(
      jsonResponse(
        {
          status: 500,
          message: "Tra cuu that bai thu nghiem."
        },
        500
      )
    );
  });

  await page.goto("/check-in");
  await fillGuestLookupForm(page);
  await page.getByRole("button", { name: /OTP/ }).click();

  await expect.poll(() => soLanTraCuu).toBe(1);
  await expect.poll(() => lookupTokenHeader).toBe(LOOKUP_TOKEN);
  await expect(page.getByPlaceholder(/OTP/)).toHaveValue("123456");
  await expect(page.getByText("Tra cuu that bai thu nghiem.").first()).toBeVisible();
});

test("check-in otp guest tu dong tra cuu bang lookupToken tu query", async ({ page }) => {
  let lookupTokenHeader = "";
  let soLanTraCuu = 0;

  await page.route("**/api/bookings/manage/**", async (route) => {
    soLanTraCuu += 1;
    lookupTokenHeader = route.request().headers()["x-booking-lookup-token"] ?? "";
    await route.fulfill(jsonResponse(bookingOverviewPayload));
  });

  await page.goto(`/check-in?bookingCode=A6C2P1&email=guest%40example.com&lookupToken=${QUERY_LOOKUP_TOKEN}`);

  await expect.poll(() => soLanTraCuu).toBe(1);
  await expect.poll(() => lookupTokenHeader).toBe(QUERY_LOOKUP_TOKEN);
  await expect(page.getByText("Nguyen Van A").first()).toBeVisible();
});
