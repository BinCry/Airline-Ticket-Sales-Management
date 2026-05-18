import { expect, test } from "@playwright/test";

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function createAccessToken(roles: string[], permissions: string[]) {
  const header = encodeBase64Url(JSON.stringify({
    alg: "none",
    typ: "JWT"
  }));
  const payload = encodeBase64Url(JSON.stringify({
    type: "access",
    exp: Math.floor(Date.now() / 1000) + 60 * 30,
    roles,
    permissions
  }));
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

test("màn booking hiển thị seat map khi có handoff hợp lệ", async ({ page }) => {
  const handoffUrl = "/booking?adultCount=1&childCount=0&infantCount=0&tripType=one_way"
    + "&segment1InventoryId=18"
    + "&segment1Code=VN5201"
    + "&segment1From=Th%C3%A0nh%20ph%E1%BB%91%20H%E1%BB%93%20Ch%C3%AD%20Minh"
    + "&segment1To=H%C3%A0%20N%E1%BB%99i"
    + "&segment1OriginCode=SGN"
    + "&segment1DestinationCode=HAN"
    + "&segment1DepartureAt=2026-05-23T01:30:00Z"
    + "&segment1ArrivalAt=2026-05-23T03:40:00Z"
    + "&segment1DepartureTime=08:30"
    + "&segment1ArrivalTime=10:40"
    + "&segment1FareFamily=pho_thong_tiet_kiem"
    + "&segment1Price=1490000";

  await page.goto(handoffUrl);
  await expect(page.locator(".seat-map-cabin")).toBeVisible();
  await expect(page.locator(".seat-map-wing-left")).toBeVisible();
  await expect(page.locator(".seat-map-wing-right")).toBeVisible();
});
