import { expect, test } from "@playwright/test";

const AUTH_SESSION_STORAGE_KEY = "qlvmb.auth.session";

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function createAccessToken(roles: string[], permissions: string[], expiresInSeconds: number) {
  const header = encodeBase64Url(JSON.stringify({
    alg: "none",
    typ: "JWT"
  }));
  const payload = encodeBase64Url(JSON.stringify({
    type: "access",
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    roles,
    permissions
  }));

  return `${header}.${payload}.signature`;
}

function createAuthSession(
  roles: string[],
  permissions: string[],
  accessTokenExpiresAt: string,
  expiresInSeconds: number
) {
  return {
    accessToken: createAccessToken(roles, permissions, expiresInSeconds),
    refreshToken: "refresh-token-moi",
    tokenType: "Bearer",
    accessTokenExpiresAt,
    user: {
      id: 7,
      email: "staff@vietnam-airlines.vn",
      displayName: "Nhân viên backoffice",
      phone: "0900000001",
      avatarUrl: null,
      emailVerified: true,
      roles,
      permissions
    }
  };
}

test("dang nhap xong vao backoffice ngay khong bi bat dang nhap lai", async ({ page }) => {
  const authSession = createAuthSession(
    ["customer_support"],
    ["backoffice.support"],
    new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    30 * 60
  );

  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify(authSession)
    });
  });

  await page.goto("/login?redirectTo=%2Fbackoffice");
  await page.getByPlaceholder("tenban@gmail.com").fill("staff@vietnam-airlines.vn");
  await page.getByPlaceholder("Nhập mật khẩu của bạn").fill("12345678");
  await page.getByRole("button", { name: "Tiếp tục đăng nhập" }).click();

  await expect(page).toHaveURL(/\/backoffice$/);
  await expect(page.getByText("Công cụ đang khả dụng trong phiên làm việc")).toBeVisible();
});

test("phien het access token van tu lam moi khi refresh token con song", async ({ page }) => {
  const expiredSession = createAuthSession(
    ["customer_support"],
    ["backoffice.support"],
    new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    -5 * 60
  );
  const refreshedSession = createAuthSession(
    ["customer_support"],
    ["backoffice.support"],
    new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    30 * 60
  );

  await page.addInitScript(
    ({ serializedSession, storageKey }) => {
      window.localStorage.setItem(storageKey, serializedSession);
    },
    {
      serializedSession: JSON.stringify(expiredSession),
      storageKey: AUTH_SESSION_STORAGE_KEY
    }
  );

  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify(refreshedSession)
    });
  });

  await page.goto("/");
  await page.waitForResponse((response) =>
    response.url().includes("/api/auth/refresh") &&
    response.request().method() === "POST"
  );

  const backofficeLink = page.getByRole("link", { name: "Backoffice" }).first();
  await expect(backofficeLink).toBeVisible();
  await backofficeLink.click();

  await expect(page).toHaveURL(/\/backoffice$/);
  await expect(page.getByText("Công cụ đang khả dụng trong phiên làm việc")).toBeVisible();
});

test("route proxy anh bai bao tra anh du phong an toan cho host khong hop le", async ({ request }) => {
  const response = await request.get(
    "/api/news-image?src="
    + encodeURIComponent("https://example.com/du-lich/anh.jpg")
  );

  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("image/jpeg");
  expect((await response.body()).byteLength).toBeGreaterThan(0);
});
