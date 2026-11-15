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

test("HoloCraft có lối tắt phù hợp trên header desktop và menu di động", async ({ page }) => {
  await page.goto("/");
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const accessibleName = "Mở HoloCraft 3D trong tab mới";

  if (viewportWidth > 880) {
    const link = page.locator(".desktop-main-nav").getByRole("link", { name: accessibleName });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://holo-craft.bincrydev.id.vn/");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);

    for (const width of [881, 900, 1024, 1101, 1200, 1280, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.locator(".site-header").evaluate((header) => {
        const brand = header.querySelector(".nav-brand-stack")!.getBoundingClientRect();
        const nav = header.querySelector(".desktop-main-nav")!;
        const navBounds = nav.getBoundingClientRect();
        const actions = header.querySelector(".nav-row-actions")!.getBoundingClientRect();
        return {
          brandRight: brand.right,
          navLeft: navBounds.left,
          navRight: navBounds.right,
          actionsLeft: actions.left,
          navContentFits: nav.scrollWidth <= nav.clientWidth + 1,
          pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
        };
      });
      expect(layout.brandRight, `Logo đè menu ở ${width}px`).toBeLessThanOrEqual(layout.navLeft + 1);
      expect(layout.navRight, `Menu đè cụm tác vụ ở ${width}px`).toBeLessThanOrEqual(layout.actionsLeft + 1);
      expect(layout.navContentFits, `Link HoloCraft làm tràn thanh menu ở ${width}px`).toBe(true);
      expect(layout.pageFits, `Trang bị tràn ngang ở ${width}px`).toBe(true);
    }
    return;
  }

  await page.getByRole("button", { name: "Mở menu điều hướng" }).click();
  const drawer = page.getByRole("dialog", { name: "Điều hướng" });
  const link = drawer.getByRole("link", { name: accessibleName });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "https://holo-craft.bincrydev.id.vn/");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  expect(await link.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
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
