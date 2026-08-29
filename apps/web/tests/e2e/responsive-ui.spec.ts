import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/search",
  "/blog",
  "/support",
  "/login",
  "/manage-booking",
  "/check-in",
  "/flight-status"
] as const;

for (const route of publicRoutes) {
  test(`${route} không tràn ngang và có đúng một tiêu đề chính`, async ({ page }) => {
    await page.goto(route);

    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
}

test("header mobile mở menu, thể hiện trang hiện tại và đóng bằng Escape", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));

  await page.goto("/support");
  const menuButton = page.getByRole("button", { name: "Mở menu điều hướng" });
  await menuButton.click();

  const drawer = page.getByRole("dialog", { name: "Điều hướng" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Hỗ trợ", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(menuButton).toBeFocused();
});

test("bố cục vẫn dùng được ở màn hình 320px và mobile landscape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-mobile");

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 844, height: 390 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/search");
    await expect(page.locator("h1")).toHaveCount(1);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasOverflow).toBe(false);
  }
});
