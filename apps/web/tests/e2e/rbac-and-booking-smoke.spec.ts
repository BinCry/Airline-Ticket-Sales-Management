import { expect, test } from "@playwright/test";

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function taoThoiDiemTuongLaiTheoUtc(soNgayCong: number, gio: number, phut: number) {
  const hienTai = new Date();
  return new Date(
    Date.UTC(
      hienTai.getUTCFullYear(),
      hienTai.getUTCMonth(),
      hienTai.getUTCDate() + soNgayCong,
      gio,
      phut,
      0,
      0
    )
  ).toISOString();
}

const THOI_DIEM_KHOI_HANH_HANDOFF = taoThoiDiemTuongLaiTheoUtc(7, 1, 30);
const THOI_DIEM_HA_CANH_HANDOFF = taoThoiDiemTuongLaiTheoUtc(7, 3, 40);

function createAccessToken(roles: string[], permissions: string[]) {
  const header = encodeBase64Url(
    JSON.stringify({
      alg: "none",
      typ: "JWT"
    })
  );
  const payload = encodeBase64Url(
    JSON.stringify({
      type: "access",
      exp: Math.floor(Date.now() / 1000) + 60 * 30,
      roles,
      permissions
    })
  );
  return `${header}.${payload}.signature`;
}

async function setAccessTokenCookie(
  page: import("@playwright/test").Page,
  roles: string[],
  permissions: string[]
) {
  await page.context().addCookies([
    {
      name: "qlvmb.access_token",
      value: createAccessToken(roles, permissions),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 30
    }
  ]);
}

function taoDuongDanHandoff() {
  return "/booking?adultCount=1&childCount=0&infantCount=0&tripType=one_way"
    + "&segment1FlightId=18"
    + "&segment1Code=VN5201"
    + "&segment1From=Th%C3%A0nh%20ph%E1%BB%91%20H%E1%BB%93%20Ch%C3%AD%20Minh"
    + "&segment1To=H%C3%A0%20N%E1%BB%99i"
    + "&segment1OriginCode=SGN"
    + "&segment1DestinationCode=HAN"
    + `&segment1DepartureAt=${encodeURIComponent(THOI_DIEM_KHOI_HANH_HANDOFF)}`
    + `&segment1ArrivalAt=${encodeURIComponent(THOI_DIEM_HA_CANH_HANDOFF)}`
    + "&segment1DepartureTime=08:30"
    + "&segment1ArrivalTime=10:40"
    + "&segment1BaseFare=1490000";
}

test("guest bị chuyển về đăng nhập khi mở trang account", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Faccount/);
});

test("customer_support vào được support nhưng bị chặn khỏi operations", async ({ page }) => {
  await setAccessTokenCookie(page, ["customer_support"], [
    "backoffice.sales",
    "backoffice.support",
    "backoffice.finance",
    "backoffice.cms"
  ]);

  await page.goto("/backoffice/support");
  await expect(page).toHaveURL(/\/backoffice\/support/);

  await page.goto("/backoffice/operations");
  await expect(page).toHaveURL(/\/backoffice$/);
  await expect(page.getByText("Công cụ đang khả dụng trong phiên làm việc")).toBeVisible();
});

test("operations_staff vào được admin và operations", async ({ page }) => {
  await setAccessTokenCookie(page, ["operations_staff"], [
    "backoffice.operations",
    "backoffice.admin"
  ]);

  await page.goto("/backoffice/admin");
  await expect(page).toHaveURL(/\/backoffice\/admin/);

  await page.goto("/backoffice/operations");
  await expect(page).toHaveURL(/\/backoffice\/operations/);
});

test("trang chủ mặc định chọn một chiều", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Một chiều" })).toHaveClass(/active/);
  await expect(page.getByRole("button", { name: "Khứ hồi" })).not.toHaveClass(/active/);
  await expect(page.locator('input[type="date"]').nth(1)).toBeDisabled();
});

test("trang hỗ trợ không render highlight FAQ", async ({ page }) => {
  await page.goto("/support");

  await page.getByRole("searchbox").fill("hoàn vé");
  await expect(page.locator("mark")).toHaveCount(0);

  const faqToggle = page.getByRole("button", {
    name: "Hoàn vé Tôi muốn hoàn vé hoặc hủy đặt chỗ thì cần làm gì?"
  });

  await expect(faqToggle).toBeVisible();
  await faqToggle.click();
  await expect(page.locator("mark")).toHaveCount(0);
});

test("màn booking hiển thị seat map khi có handoff hợp lệ", async ({ page }) => {
  await page.route("**/api/flights/18/booking-options", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        flightId: 18,
        code: "VN5201",
        originCode: "SGN",
        destinationCode: "HAN",
        from: "Thành phố Hồ Chí Minh",
        to: "Hà Nội",
        departureAt: THOI_DIEM_KHOI_HANH_HANDOFF,
        arrivalAt: THOI_DIEM_HA_CANH_HANDOFF,
        baseFare: 1490000,
        fareOptions: [
          {
            inventoryId: 1801,
            fareFamily: "pho_thong_tiet_kiem",
            title: "Phổ thông tiết kiệm",
            price: 1490000,
            seatsLeft: 120,
            totalSeats: 120,
            rowStart: 9,
            rowEnd: 28
          },
          {
            inventoryId: 1802,
            fareFamily: "pho_thong_linh_hoat",
            title: "Phổ thông linh hoạt",
            price: 1990000,
            seatsLeft: 36,
            totalSeats: 36,
            rowStart: 3,
            rowEnd: 8
          },
          {
            inventoryId: 1803,
            fareFamily: "thuong_gia",
            title: "Thương gia",
            price: 2490000,
            seatsLeft: 12,
            totalSeats: 12,
            rowStart: 1,
            rowEnd: 2
          }
        ],
        seats: []
      })
    });
  });

  await page.goto(taoDuongDanHandoff());
  await expect(page.locator(".seat-map-cabin")).toBeVisible();
  await expect(page.locator(".seat-map-wing-left")).toBeVisible();
  await expect(page.locator(".seat-map-wing-right")).toBeVisible();
});

test("màn booking báo rõ khi chuyến bay đã quá ngưỡng mở bán công khai", async ({ page }) => {
  await page.route("**/api/flights/18/booking-options", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 400,
      body: JSON.stringify({
        message: "Chuyến bay hiện không còn mở bán."
      })
    });
  });

  await page.goto(taoDuongDanHandoff());
  const theLoi = page.locator(".booking-inline-error").first();
  await expect(theLoi.getByText("Không thể tải lựa chọn chuyến bay")).toBeVisible();
  await expect(theLoi.getByText("Chuyến bay hiện không còn mở bán.")).toBeVisible();
});
