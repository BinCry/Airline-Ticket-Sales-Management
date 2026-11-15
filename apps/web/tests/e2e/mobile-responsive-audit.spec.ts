import { expect, test, type Page } from "@playwright/test";

import { seedAuthSession } from "./e2e-helpers";

const guestRoutes = [
  "/",
  "/search",
  "/blog",
  "/support",
  "/login",
  "/register",
  "/forgot-password",
  "/manage-booking",
  "/check-in",
  "/flight-status",
  "/booking"
];

const staffRoutes = [
  "/account",
  "/backoffice",
  "/backoffice/operations",
  "/backoffice/sales",
  "/backoffice/support",
  "/backoffice/finance",
  "/backoffice/audit"
];

const phoneViewports = [
  { width: 320, height: 720 },
  { width: 360, height: 780 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 844, height: 390 }
];

async function inspectMobilePage(page: Page, route: string, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();

  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && !element.closest("details:not([open])")
        && rect.width > 0
        && rect.height > 0;
    };
    const horizontalScrollContainer = (element: Element) => {
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        if (["auto", "scroll"].includes(style.overflowX) && parent.scrollWidth > parent.clientWidth + 1) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };
    const controls = Array.from(document.querySelectorAll<HTMLElement>(
      "main a, main button, main input, main select, main textarea, main [role='button']"
    )).filter(visible).filter((element) => !element.matches(
      "[aria-hidden='true'], input[type='hidden'], input[type='checkbox'], .date-input-native-proxy"
    ));
    const clippedControls = controls.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (horizontalScrollContainer(element)) return [];
      if (rect.left < -1 || rect.right > viewportWidth + 1) {
        const label = (element.getAttribute("aria-label") || element.innerText || element.tagName).trim().replace(/\s+/g, " ").slice(0, 70);
        return [{ label, left: Math.round(rect.left), right: Math.round(rect.right) }];
      }
      return [];
    });
    const smallTargets = controls.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width >= 44 && rect.height >= 44) return [];
      const label = (element.getAttribute("aria-label") || element.innerText || element.tagName).trim().replace(/\s+/g, " ").slice(0, 50);
      return [{
        label,
        tag: element.tagName.toLowerCase(),
        type: element instanceof HTMLInputElement ? element.type : "",
        className: typeof element.className === "string" ? element.className : "",
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }];
    });
    const actionableControls = Array.from(document.querySelectorAll<HTMLElement>(
      "main a, main button, main [role='button']"
    )).filter(visible);
    const overlappingControls: string[] = [];
    for (let leftIndex = 0; leftIndex < actionableControls.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < actionableControls.length; rightIndex += 1) {
        const left = actionableControls[leftIndex];
        const right = actionableControls[rightIndex];
        if (left.contains(right) || right.contains(left) || horizontalScrollContainer(left) || horizontalScrollContainer(right)) continue;
        const leftRect = left.getBoundingClientRect();
        const rightRect = right.getBoundingClientRect();
        const overlapWidth = Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left);
        const overlapHeight = Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top);
        if (overlapWidth > 3 && overlapHeight > 3) {
          const leftLabel = (left.getAttribute("aria-label") || left.innerText || left.tagName).trim().replace(/\s+/g, " ").slice(0, 24);
          const rightLabel = (right.getAttribute("aria-label") || right.innerText || right.tagName).trim().replace(/\s+/g, " ").slice(0, 24);
          const leftArticle = left.closest("article");
          const rightArticle = right.closest("article");
          overlappingControls.push(
            `${leftLabel} (${leftArticle?.id || left.className || left.tagName.toLowerCase()}) ↔ ${rightLabel} (${rightArticle?.id || right.className || right.tagName.toLowerCase()})`
          );
        }
      }
    }
    const clippedText = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2, main h3, main p, main label > span, main summary"))
      .filter(visible)
      .filter((element) => element.textContent?.trim())
      .filter((element) => element.scrollWidth > element.clientWidth + 3)
      .map((element) => ({
        text: element.innerText.trim().replace(/\s+/g, " ").slice(0, 48),
        className: typeof element.className === "string" ? element.className : "",
        width: Math.round(element.clientWidth),
        contentWidth: element.scrollWidth,
        whiteSpace: getComputedStyle(element).whiteSpace
      }));

    return {
      viewportWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      clippedControls,
      smallTargets,
      overlappingControls,
      clippedText
    };
  });
}

test("các màn khách vãng lai không tràn ngang hoặc cắt nút ở nhiều cỡ mobile", async ({ page }) => {
  test.setTimeout(180_000);

  for (const route of guestRoutes) {
    for (const viewport of phoneViewports) {
      const metrics = await inspectMobilePage(page, route, viewport);
      expect(metrics.documentWidth, `${route} tràn trang ở ${viewport.width}px`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
      expect(metrics.bodyWidth, `${route} tràn body ở ${viewport.width}px`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
      expect(metrics.clippedControls, `${route} có nút/đường dẫn nằm ngoài khung ở ${viewport.width}px`).toEqual([]);
      expect(metrics.smallTargets, `${route} có vùng chạm nhỏ ở ${viewport.width}px`).toEqual([]);
      expect(metrics.overlappingControls, `${route} có điều khiển chồng nhau ở ${viewport.width}px`).toEqual([]);
      expect(metrics.clippedText, `${route} có text bị cắt ngang ở ${viewport.width}px`).toEqual([]);
    }
  }
});

test("các màn tài khoản và backoffice không tràn mobile khi đã đăng nhập", async ({ page }) => {
  test.setTimeout(180_000);

  await seedAuthSession(page, {
    displayName: "Nhân viên vận hành",
    email: "bincry2006@gmail.com",
    permissions: [
      "backoffice.operations",
      "backoffice.sales",
      "backoffice.support",
      "backoffice.finance",
      "backoffice.admin",
      "backoffice.cms"
    ],
    roles: ["operations_staff"],
    mockMyNotifications: true
  });

  for (const route of staffRoutes) {
    for (const viewport of phoneViewports) {
      const metrics = await inspectMobilePage(page, route, viewport);
      expect(metrics.documentWidth, `${route} tràn trang ở ${viewport.width}px`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
      expect(metrics.bodyWidth, `${route} tràn body ở ${viewport.width}px`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
      expect(metrics.clippedControls, `${route} có nút/đường dẫn nằm ngoài khung ở ${viewport.width}px`).toEqual([]);
      expect(metrics.smallTargets, `${route} có vùng chạm nhỏ ở ${viewport.width}px`).toEqual([]);
      expect(metrics.overlappingControls, `${route} có điều khiển chồng nhau ở ${viewport.width}px`).toEqual([]);
      expect(metrics.clippedText, `${route} có text bị cắt ngang ở ${viewport.width}px`).toEqual([]);
    }
  }
});
