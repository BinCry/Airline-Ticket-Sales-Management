import { expect, test } from "@playwright/test";

import { seedAuthSession } from "./e2e-helpers";

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
    await page.goto(route, { waitUntil: "domcontentloaded" });

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

  await page.goto("/support", { waitUntil: "domcontentloaded" });
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
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const accessibleName = "Mở HoloCraft 3D trong tab mới";

  if (viewportWidth > 1200) {
    const link = page.locator(".desktop-main-nav").getByRole("link", { name: accessibleName });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://holo-craft.bincrydev.id.vn/");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);

    for (const width of [881, 900, 1024, 1101, 1160, 1161, 1180, 1200]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator(".desktop-main-nav")).toBeHidden();
      const menuButton = page.getByRole("button", { name: "Mở menu điều hướng" });
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      await expect(page.getByRole("dialog", { name: "Điều hướng" }).getByRole("link", { name: accessibleName })).toBeVisible();
      await page.getByRole("dialog", { name: "Điều hướng" }).getByRole("button", { name: "Đóng menu điều hướng" }).click();
    }

    for (const width of [1201, 1210, 1240, 1280, 1366]) {
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
    await page.goto("/search", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toHaveCount(1);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasOverflow).toBe(false);
  }
});

test("trợ lý AI nằm ngoài luồng nội dung trên mobile, không che form", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));

  for (const route of ["/search", "/login", "/manage-booking", "/check-in", "/flight-status"]) {
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const bounds = await page.evaluate(() => {
        const main = document.querySelector("main")!.getBoundingClientRect();
        const assistant = document.querySelector<HTMLElement>(".chatbot-root")!;
        const footer = document.querySelector("footer")!.getBoundingClientRect();
        const assistantBounds = assistant.getBoundingClientRect();

        return {
          position: getComputedStyle(assistant).position,
          mainBottom: main.bottom + window.scrollY,
          assistantTop: assistantBounds.top + window.scrollY,
          assistantBottom: assistantBounds.bottom + window.scrollY,
          footerTop: footer.top + window.scrollY
        };
      });

      expect(bounds.position, `chatbot không được fixed ở ${viewport.width}px`).not.toBe("fixed");
      expect(bounds.assistantTop).toBeGreaterThanOrEqual(bounds.mainBottom);
      expect(bounds.footerTop).toBeGreaterThanOrEqual(bounds.assistantBottom);
    }
  }
});

test("các thao tác chính và phân hệ backoffice có vùng chạm đủ lớn trên mobile", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));

  for (const viewport of [{ width: 320, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/search", { waitUntil: "domcontentloaded" });
    for (const selector of [".date-input-picker-button", ".search-panel .toggle", ".filter-head .text-button"]) {
      const target = page.locator(selector).first();
      if (await target.isVisible()) {
        const bounds = await target.boundingBox();
        expect(bounds?.width, `${selector} rộng chưa đủ ở ${viewport.width}px`).toBeGreaterThanOrEqual(44);
        expect(bounds?.height, `${selector} cao chưa đủ ở ${viewport.width}px`).toBeGreaterThanOrEqual(44);
      }
    }

    await page.goto("/support", { waitUntil: "domcontentloaded" });
    const faqToggle = page.locator(".support-faq-toggle").first();
    const faqBounds = await faqToggle.boundingBox();
    expect(faqBounds?.height, `FAQ khó chạm ở ${viewport.width}px`).toBeGreaterThanOrEqual(44);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const manageBooking = page.locator(".home-hero-manage-link");
    if (await manageBooking.isVisible()) {
      const bounds = await manageBooking.boundingBox();
      expect(bounds?.height, `lối tắt quản lý đặt chỗ khó chạm ở ${viewport.width}px`).toBeGreaterThanOrEqual(44);
    }
  }

  await seedAuthSession(page, {
    displayName: "Nhân viên vận hành",
    email: "bincry2006@gmail.com",
    permissions: ["backoffice.operations"],
    roles: ["operations_staff"],
    mockMyNotifications: true
  });
  for (const viewport of [{ width: 320, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/backoffice/operations", { waitUntil: "domcontentloaded" });
    const activeLink = page.locator(".backoffice-module-nav-link[aria-current='page']");
    await expect(activeLink).toBeVisible();
    const navBounds = await activeLink.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const container = element.parentElement!.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, containerLeft: container.left, containerRight: container.right, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
    });
    expect(navBounds.left, `phân hệ active bị khuất bên trái ở ${viewport.width}px`).toBeGreaterThanOrEqual(navBounds.containerLeft - 1);
    expect(navBounds.right, `phân hệ active bị khuất bên phải ở ${viewport.width}px`).toBeLessThanOrEqual(navBounds.containerRight + 1);
    expect(navBounds.scrollWidth, `chữ phân hệ active bị cắt ở ${viewport.width}px`).toBeLessThanOrEqual(navBounds.clientWidth + 1);
    expect(navBounds.bottom - navBounds.top).toBeGreaterThanOrEqual(44);

    const localNav = page.locator(".backoffice-local-nav");
    await localNav.getByRole("link", { name: "Tạo voucher mới", exact: true }).click();
    const stickyNavBounds = await page.evaluate(() => {
      const moduleNav = document.querySelector(".backoffice-module-nav")!.getBoundingClientRect();
      const localNavBounds = document.querySelector(".backoffice-local-nav")!.getBoundingClientRect();
      return {
        moduleBottom: moduleNav.bottom,
        localTop: localNavBounds.top,
        localBottom: localNavBounds.bottom,
        targetTop: document.querySelector("#operations-create-voucher")!.getBoundingClientRect().top
      };
    });
    expect(stickyNavBounds.localTop, `thanh điều hướng con bị đè lên thanh phân hệ ở ${viewport.width}px`)
      .toBeGreaterThanOrEqual(stickyNavBounds.moduleBottom - 1);
    expect(stickyNavBounds.localBottom - stickyNavBounds.localTop, `điều hướng con chiếm quá nhiều chiều cao ở ${viewport.width}px`)
      .toBeLessThanOrEqual(72);
    await expect.poll(async () => page.evaluate(() => {
      const localNavBounds = document.querySelector(".backoffice-local-nav")!.getBoundingClientRect();
      const targetTop = document.querySelector("#operations-create-voucher")!.getBoundingClientRect().top;
      return targetTop - localNavBounds.bottom;
    })).toBeGreaterThanOrEqual(8);
  }
});

test("bộ lọc tìm vé và FAQ không bóp chữ hoặc cắt chip trên mobile", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));

  await page.goto("/search", { waitUntil: "domcontentloaded" });
  const clearFilters = page.getByRole("button", { name: "Xóa bộ lọc" });
  await expect(clearFilters).toBeVisible();
  await expect(clearFilters).toHaveCSS("white-space", "nowrap");
  const filterBounds = await clearFilters.evaluate((button) => {
    const buttonRect = button.getBoundingClientRect();
    const headRect = button.parentElement!.getBoundingClientRect();
    return { buttonLeft: buttonRect.left, buttonRight: buttonRect.right, headLeft: headRect.left, headRight: headRect.right };
  });
  expect(filterBounds.buttonLeft).toBeGreaterThanOrEqual(filterBounds.headLeft);
  expect(filterBounds.buttonRight).toBeLessThanOrEqual(filterBounds.headRight + 1);

  await page.goto("/support", { waitUntil: "domcontentloaded" });
  const categories = page.locator(".support-faq-category-list");
  const categoryBounds = await categories.evaluate((list) => {
    const listRect = list.getBoundingClientRect();
    return {
      scrollWidth: list.scrollWidth,
      clientWidth: list.clientWidth,
      items: Array.from(list.children).map((item) => {
        const rect = item.getBoundingClientRect();
        return { left: rect.left, right: rect.right, height: rect.height };
      }),
      left: listRect.left,
      right: listRect.right
    };
  });
  expect(categoryBounds.scrollWidth).toBeLessThanOrEqual(categoryBounds.clientWidth + 1);
  for (const item of categoryBounds.items) {
    expect(item.left).toBeGreaterThanOrEqual(categoryBounds.left - 1);
    expect(item.right).toBeLessThanOrEqual(categoryBounds.right + 1);
    expect(item.height).toBeGreaterThanOrEqual(44);
  }
});

test("menu hồ sơ nhân viên không tự đóng khi cuộn drawer mobile và chỉ có một lối vào Backoffice", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"));

  await seedAuthSession(page, {
    displayName: "Nhân viên vận hành",
    permissions: ["backoffice.operations"],
    roles: ["operations_staff"],
    mockMyNotifications: true
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Mở menu điều hướng" }).click();

  const drawer = page.getByRole("dialog", { name: "Điều hướng" });
  const surface = drawer.locator(".ui-overlay-surface");
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Vận hành" }).click();

  const accountMenu = drawer.locator(".account-menu-panel");
  await expect(accountMenu).toBeVisible();
  await expect(accountMenu.getByRole("menuitem", { name: "Thông tin cá nhân" })).toBeVisible();
  await expect(accountMenu.getByRole("menuitem", { name: "Backoffice" })).toHaveCount(1);
  await expect(drawer.locator(".mobile-drawer-actions > .button", { hasText: "Backoffice" })).toHaveCount(0);

  const initialScroll = await surface.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight
  }));
  expect(initialScroll.scrollHeight).toBeGreaterThan(initialScroll.clientHeight);

  await surface.dispatchEvent("pointerdown", {
    bubbles: true,
    pointerType: "touch"
  });
  await expect(accountMenu).toBeVisible();

  const scrollPosition = await surface.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return {
      scrollTop: element.scrollTop,
      surface: element.getBoundingClientRect().toJSON(),
      bookingButton: element.querySelector<HTMLElement>(".mobile-drawer-actions > .button-primary")!.getBoundingClientRect().toJSON()
    };
  });
  expect(scrollPosition.scrollTop).toBeGreaterThan(0);
  expect(scrollPosition.bookingButton.top).toBeGreaterThanOrEqual(scrollPosition.surface.top - 1);
  expect(scrollPosition.bookingButton.bottom).toBeLessThanOrEqual(scrollPosition.surface.bottom + 1);
  await expect(accountMenu).toBeVisible();
});
