import { expect, test } from "@playwright/test";

import { seedAuthSession } from "./e2e-helpers";

test("header hiển thị avatar từ phiên đăng nhập", async ({ page }) => {
  const avatarPath = "/uploads/avatars/header-test.png";

  await page.route(`**${avatarPath}`, async (route) => {
    await route.fulfill({
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4xkAAAAASUVORK5CYII=",
        "base64"
      ),
      contentType: "image/png",
      status: 200
    });
  });

  await seedAuthSession(page, {
    avatarUrl: avatarPath,
    displayName: "Nhân viên vận hành",
    permissions: ["backoffice.operations"],
    roles: ["operations_staff"]
  });

  await page.goto("/");

  await expect(
    page.locator('.account-menu-trigger .account-menu-avatar-custom').first()
  ).toHaveAttribute("src", /\/uploads\/avatars\/header-test\.png$/);
});

test("header dùng chữ cái mặc định khi avatar tải lỗi", async ({ page }) => {
  const avatarPath = "/uploads/avatars/missing.png";

  await page.route(`**${avatarPath}`, async (route) => {
    await route.fulfill({ status: 404 });
  });

  await seedAuthSession(page, {
    avatarUrl: avatarPath,
    displayName: "Dinh Thi Quynh Huong",
    permissions: [],
    roles: ["customer"]
  });

  await page.goto("/");

  const avatar = page.locator('.account-menu-trigger .account-menu-avatar').last();
  await expect(avatar.locator(".account-menu-avatar-custom")).toHaveCount(0);
  await expect(avatar.locator(".account-menu-avatar-default")).toHaveAttribute(
    "src",
    "/images/default-avatar.svg"
  );
});
