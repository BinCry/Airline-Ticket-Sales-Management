import { expect, test } from "@playwright/test";

test("header giữ đúng nhịp, đường viền và không chồng cụm tác vụ", async ({ page }, testInfo) => {
  await page.goto("/");

  const header = page.locator(".site-header");
  await expect(header).toBeVisible();

  const metrics = await header.evaluate((element) => {
    const headerRect = element.getBoundingClientRect();
    const navRect = element.querySelector(".desktop-main-nav")?.getBoundingClientRect();
    const actionsRect = element.querySelector(".nav-actions")?.getBoundingClientRect();
    const style = getComputedStyle(element);

    return {
      height: headerRect.height,
      borderWidth: Number.parseFloat(style.borderBottomWidth),
      navRight: navRect?.right ?? null,
      actionsLeft: actionsRect?.left ?? null
    };
  });

  expect(metrics.borderWidth).toBeGreaterThanOrEqual(1);
  expect(metrics.height).toBeLessThanOrEqual(testInfo.project.name.includes("mobile") ? 68 : 84);

  if (metrics.navRight !== null && metrics.actionsLeft !== null) {
    expect(metrics.navRight).toBeLessThanOrEqual(metrics.actionsLeft);
  }

  await testInfo.attach("site-header", {
    body: await header.screenshot({ animations: "disabled" }),
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
