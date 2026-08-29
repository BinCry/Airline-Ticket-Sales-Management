import { expect, test } from "@playwright/test";

import { seedAuthSession } from "./e2e-helpers";

const staffCases = [
  {
    displayName: "Nhân viên vận hành",
    permissions: ["backoffice.operations"],
    role: "operations_staff",
    title: "operator"
  },
  {
    displayName: "Nhân viên chăm sóc khách hàng",
    permissions: ["backoffice.support"],
    role: "customer_support",
    title: "chăm sóc khách hàng"
  }
];

for (const staffCase of staffCases) {
  test(`${staffCase.title} chỉ thấy thông tin cá nhân và backoffice trong menu tài khoản`, async ({ page }) => {
    await seedAuthSession(page, {
      displayName: staffCase.displayName,
      permissions: staffCase.permissions,
      roles: [staffCase.role]
    });

    await page.goto("/");
    await page.locator(".account-menu-trigger:visible").click();

    const menu = page.locator(".account-menu-panel:visible");
    await expect(menu.getByRole("menuitem", { name: "Thông tin cá nhân" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Backoffice" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Hành khách" })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: "Thông báo" })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: "Voucher / Điểm thưởng" })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: "Vé của tôi" })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: "Làm thủ tục" })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: "Trạng thái chuyến bay" })).toHaveCount(0);
  });
}

test("khách hàng không thấy hành khách, thông báo và điểm thưởng trong menu tài khoản", async ({ page }) => {
  await seedAuthSession(page, {
    displayName: "Đinh Thị Quỳnh Hương",
    permissions: [],
    roles: ["customer"]
  });

  await page.goto("/");
  await page.locator(".account-menu-trigger:visible").click();

  const menu = page.locator(".account-menu-panel:visible");
  await expect(menu.getByRole("menuitem", { name: "Thông tin cá nhân" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Vé của tôi" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Làm thủ tục" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Trạng thái chuyến bay" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Hành khách" })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: "Thông báo" })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: "Voucher / Điểm thưởng" })).toHaveCount(0);
});
