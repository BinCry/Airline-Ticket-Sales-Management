import { expect, test } from "@playwright/test";

test("header giữ đúng nhịp, đường viền và không chồng cụm tác vụ", async ({ page }, testInfo) => {
  // Kiểm tra trên nhiều trang khác nhau bao gồm cả trang có nút Đặt vé
  const testPaths = ["/", "/manage-booking", "/login"];

  for (const path of testPaths) {
    await page.goto(path);

    const header = page.locator(".site-header");
    await expect(header).toBeVisible();

    const metrics = await header.evaluate((element) => {
      const headerRect = element.getBoundingClientRect();
      const desktopNavEl = element.querySelector<HTMLElement>(".desktop-main-nav");
      const isDesktopNavVisible =
        desktopNavEl !== null && getComputedStyle(desktopNavEl).display !== "none";
      const navRect = isDesktopNavVisible ? desktopNavEl.getBoundingClientRect() : null;
      const actionsRect = (element.querySelector(".nav-row-actions") || element.querySelector(".nav-actions"))?.getBoundingClientRect();
      const brandRect = element.querySelector(".nav-brand-stack")?.getBoundingClientRect();
      const style = getComputedStyle(element);

      return {
        height: headerRect.height,
        borderWidth: Number.parseFloat(style.borderBottomWidth),
        brandRight: brandRect?.right ?? null,
        navLeft: navRect?.left ?? null,
        navRight: navRect?.right ?? null,
        actionsLeft: actionsRect?.left ?? null
      };
    });

    expect(metrics.borderWidth).toBeGreaterThanOrEqual(1);
    expect(metrics.height).toBeLessThanOrEqual(testInfo.project.name.includes("mobile") ? 68 : 84);

    if (metrics.navRight !== null && metrics.actionsLeft !== null) {
      expect(metrics.navRight).toBeLessThanOrEqual(metrics.actionsLeft);
    }
    if (metrics.brandRight !== null && metrics.navLeft !== null) {
      expect(metrics.brandRight).toBeLessThanOrEqual(metrics.navLeft);
    }
  }

  await testInfo.attach("site-header", {
    body: await page.locator(".site-header").screenshot({ animations: "disabled" }),
    contentType: "image/png"
  });
});

test("khối tìm chuyến nằm trọn trong viewport", async ({ page }, testInfo) => {
  await page.goto("/");

  const searchPanel = page.locator(".search-panel");
  await expect(searchPanel).toBeVisible();

  const bounds = await searchPanel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewportWidth: document.documentElement.clientWidth
    };
  });

  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth + 1);

  await testInfo.attach("flight-search-panel", {
    body: await searchPanel.screenshot({ animations: "disabled" }),
    contentType: "image/png"
  });
});
