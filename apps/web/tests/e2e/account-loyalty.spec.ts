import { expect, test } from "@playwright/test";

import { jsonResponse, seedAuthSession } from "./e2e-helpers";

for (const highestTier of [false, true]) {
  test(highestTier ? "hội viên đạt hạng cao nhất" : "hội viên xem điểm và tiến độ sau nâng hạng", async ({ page }) => {
    const session = await seedAuthSession(page, {
      roles: ["member"], permissions: ["member.loyalty", "customer.self_service"],
      email: "member@example.com", displayName: "Hội viên thử nghiệm"
    });
    await page.route("**/api/me/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/me/profile") {
        await route.fulfill(jsonResponse({ ...session.user, status: "active" }));
      } else if (path === "/api/me/loyalty") {
        await route.fulfill(jsonResponse({
          membershipTier: highestTier ? "Hội viên Bạch Kim" : "Hội viên Vàng",
          pointBalance: highestTier ? 40000 : 20500,
          lifetimePoints: highestTier ? 40000 : 20500,
          availableVoucherCount: 0,
          nextTier: highestTier ? null : "Hội viên Bạch Kim",
          nextTierMinPoints: highestTier ? null : 40000,
          pointsToNextTier: highestTier ? 0 : 19500,
          progressPercent: highestTier ? 100 : 51.25,
          recentEntries: [{
            entryType: "TIER_UPGRADE", pointsDelta: 0, balanceAfter: 20500,
            bookingCode: "QC5001", description: "Hội viên Bạc → Hội viên Vàng",
            createdAt: new Date().toISOString()
          }, {
            entryType: "FLIGHT_EARN", pointsDelta: 1000, balanceAfter: 20500,
            bookingCode: "QC5001", description: "Hoàn tất chuyến VN5201 - SGN → HAN",
            createdAt: new Date().toISOString()
          }]
        }));
      } else {
        await route.fulfill(jsonResponse([]));
      }
    });

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Voucher và điểm thưởng" })).toBeVisible();
    await expect(page.getByRole("heading", {
      name: `Tổng điểm tích lũy: ${highestTier ? "40.000" : "20.500"} điểm`
    })).toBeVisible();
    await expect(page.getByText("Nâng hạng hội viên", { exact: true })).toBeVisible();
    await expect(page.getByText("Hội viên Bạc → Hội viên Vàng", { exact: true })).toBeVisible();
    await expect(page.getByText("+1.000 điểm", { exact: true })).toBeVisible();
    if (highestTier) {
      await expect(page.getByText("Bạn đã đạt hạng hội viên cao nhất.", { exact: true })).toBeVisible();
      await expect(page.getByRole("progressbar")).toHaveCount(0);
    } else {
      await expect(page.getByRole("progressbar", { name: "Tiến độ tới Hội viên Bạch Kim" }))
        .toHaveAttribute("value", "51.25");
      await expect(page.getByText(/Còn 19.500 điểm/)).toBeVisible();
    }
  });
}
