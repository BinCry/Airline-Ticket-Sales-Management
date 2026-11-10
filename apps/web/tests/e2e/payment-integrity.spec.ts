import { test as base, expect, type Page, type BrowserContext, type TestInfo } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

// CI dùng Chromium của Playwright; Chrome local chỉ được chọn khi chỉ định rõ đường dẫn.
const chromeExecutable = process.env.PAYMENT_TEST_CHROME_EXECUTABLE;
const test = chromeExecutable ? base.extend({
  browser: [async ({ playwright }, use, workerInfo) => {
    const output = process.env.PAYMENT_TEST_ARTIFACT_DIR ?? workerInfo.project.outputDir;
    const profile = path.join(output, "profile-" + workerInfo.workerIndex);
    for (const dir of ["home/AppData/Local", "home/AppData/Roaming", "temp"]) mkdirSync(path.join(profile, dir), { recursive: true });
    const browser = await playwright.chromium.launch({
      executablePath: chromeExecutable,
      headless: true, timeout: 30000,
      env: { ...process.env, HOME: path.join(profile, "home"), USERPROFILE: path.join(profile, "home"),
        LOCALAPPDATA: path.join(profile, "home/AppData/Local"), APPDATA: path.join(profile, "home/AppData/Roaming"),
        TEMP: path.join(profile, "temp"), TMP: path.join(profile, "temp") }
    });
    try { await use(browser); } finally { await browser.close(); }
  }, { scope: "worker" }]
}) : base;

function localOrigin(value: string | undefined, name: string): string {
  if (!value) throw new Error("Thiếu cấu hình " + name);
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)
      || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      || url.username || url.password) {
    throw new Error(name + " chỉ được dùng URL loopback hợp lệ.");
  }
  return url.origin;
}

function mockApiOrigins(origin: string, info: TestInfo): string[] {
  const servers = info.config.webServer
    ? Array.isArray(info.config.webServer) ? info.config.webServer : [info.config.webServer]
    : [];
  const api = process.env.NEXT_PUBLIC_API_BASE_URL
    ?? servers.find(server => server.env?.NEXT_PUBLIC_API_BASE_URL)?.env?.NEXT_PUBLIC_API_BASE_URL;
  return api ? [origin, localOrigin(api, "NEXT_PUBLIC_API_BASE_URL")] : [origin];
}

test.use({ serviceWorkers: "block" });

for (const action of ["apply", "remove"] as const) {
  for (const failure of ["none", "http500", "network"] as const) {
    test((failure === "none" ? "CONTROL" : "RED") + " " + action + " then session refresh " + failure,
      async ({ page, context, baseURL }, testInfo) => {
      const origin = localOrigin(baseURL, "baseURL");
      const apiOrigins = mockApiOrigins(origin, testInfo);
      const expiresAt = new Date(Date.now() + 3600000).toISOString();
      const user = { id: 151, email: "member@example.test", displayName: "Hội viên thử nghiệm",
        phone: null, avatarUrl: null, emailVerified: true, roles: ["member"], permissions: ["member.loyalty"] };
      const token = "mock." + Buffer.from(JSON.stringify({ type: "access", sub: "151",
        exp: Math.floor(Date.now() / 1000) + 3600, roles: user.roles, permissions: user.permissions })).toString("base64url") + ".mock";
      await context.addCookies([{ name: "qlvmb.access_token", value: token, url: origin }]);
      await context.addInitScript(session => localStorage.setItem("qlvmb.auth.session", JSON.stringify(session)), {
        accessToken: token, refreshToken: "mock-only", tokenType: "Bearer", accessTokenExpiresAt: expiresAt, user
      });
      let applied: string | null = "OLD", amount = 700000, changed = false, refreshFailures = 0;
      const requests: { method: string; path: string }[] = [], unexpected: string[] = [], errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      const pay = () => ({ bookingCode: "P6TEST", provider: "sepay", sessionMode: "live", paymentUrl: null,
        paymentStatus: "pending", expiresAt, referenceCode: "SEPAY-000000000001", amount,
        bankName: "BIDV", accountNumber: "0000000000", accountHolderName: "MOCK ONLY",
        qrCodeUrl: origin + "/6p01-qr?amount=" + amount, qrCodeDataUrl: null,
        discountAmount: 1200000 - amount, appliedVoucherCode: applied });
      const overview = () => ({ bookingCode: "P6TEST", status: "held", paymentStatus: "pending",
        holdExpiresAt: expiresAt, ticketedAt: null, tripType: "one_way", steps: [], segments: [],
        passengers: [], ancillaries: [], seatSelections: [], tickets: [], boardingPasses: [],
        refundRequest: null, paymentMethods: [], priceSummary: { baseAmount: 1000000, ancillaryAmount: 200000,
          discountAmount: 1200000 - amount, totalAmount: amount, appliedVoucherCode: applied } });
      await context.route("**/*", async route => {
        const request = route.request(), url = new URL(request.url()), method = request.method();
        if (url.origin === origin && url.pathname === "/6p01-qr") {
          return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><text x="5" y="60">MOCK QR</text></svg>' });
        }
        if (url.pathname.startsWith("/api/") && apiOrigins.includes(url.origin)) {
          requests.push({ method, path: url.pathname });
          const headers = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true",
            "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "GET,POST,DELETE,OPTIONS" };
          const send = (data: unknown, status = 200) => route.fulfill({ status, headers, contentType: "application/json", body: JSON.stringify(data) });
          if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
          if (url.pathname === "/api/bookings/P6TEST/payments/session") {
            if (changed && failure !== "none") {
              refreshFailures++;
              if (failure === "network") return route.abort("failed");
              return send({ message: "Mock session refresh unavailable" }, 500);
            }
            return send(pay());
          }
          if (url.pathname === "/api/bookings/P6TEST/apply-voucher" && method === "POST") {
            expect(request.postDataJSON()).toEqual({ voucherCode: "NEW" });
            applied = "NEW"; amount = 1000000; changed = true;
            return send(overview());
          }
          if (url.pathname === "/api/bookings/P6TEST/voucher" && method === "DELETE") {
            applied = null; amount = 1200000; changed = true;
            return send(overview());
          }
          if (url.pathname === "/api/me/vouchers") return send([]);
          if (url.pathname === "/api/me/profile") return send({ ...user, status: "active" });
          if (url.pathname === "/api/me/notifications" || url.pathname === "/api/me/passengers") return send([]);
          if (url.pathname === "/api/me/loyalty") return send({ membershipTier: "Hội viên", pointBalance: 0, lifetimePoints: 0, availableVoucherCount: 0, recentEntries: [] });
          if (url.pathname === "/api/notifications/stream") return send({ message: "Mock SSE" }, 401);
          unexpected.push(method + " " + url.pathname);
          return route.abort();
        }
        if (url.origin === origin && method === "GET" && !url.pathname.startsWith("/api/")) return route.continue();
        unexpected.push(method + " " + url.origin + url.pathname);
        return route.abort();
      });
      await page.goto("/booking/P6TEST/checkout");
      const panel = page.locator("article.booking-payment-card").filter({ has: page.getByRole("heading", { name: "Voucher hội viên", exact: true }) });
      const detail = page.locator(".booking-payment-detail-list");
      const link = page.getByRole("link", { name: "Mở mã QR / liên kết thanh toán", exact: true });
      await expect(detail).toContainText("OLD");
      await expect(detail).toContainText("700.000");
      await expect(link).toHaveAttribute("href", origin + "/6p01-qr?amount=700000");
      if (action === "apply") {
        await panel.getByRole("textbox", { name: "Mã voucher", exact: true }).fill("NEW");
        await panel.getByRole("button", { name: "Áp voucher", exact: true }).click();
      } else {
        await panel.getByRole("button", { name: "Bỏ voucher", exact: true }).click();
      }
      try {
        await expect.poll(() => changed).toBe(true);
        if (failure === "none") {
          await expect(detail).toContainText(action === "apply" ? "1.000.000" : "1.200.000");
          await expect(link).toHaveAttribute("href", origin + "/6p01-qr?amount=" + amount);
          await expect(detail).toContainText(action === "apply" ? "NEW" : "Chưa áp dụng");
        } else {
          await expect.poll(() => refreshFailures).toBeGreaterThan(0);
          await expect(panel.locator("[role=alert]")).toBeVisible();
          // Ghi nhận lỗi hiện tại trước khi kiểm tra bất biến fail-closed, không đổi kỳ vọng thành PASS.
          await testInfo.attach("stale-payment-observed", { body: JSON.stringify({
            mutationSucceeded: changed, backendAmount: amount, backendVoucher: applied,
            displayedDetail: await detail.count() ? await detail.innerText() : null,
            qrVisible: await link.isVisible(),
            displayedQr: await link.count() ? await link.getAttribute("href") : null
          }, null, 2), contentType: "application/json" });
          await testInfo.attach("stale-payment-screen", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
          expect(unexpected).toEqual([]);
          expect(errors).toEqual([]);
          await expect(link, "Không được cho dùng QR cũ khi session mới chưa xác nhận").toBeHidden();
        }
        expect(unexpected).toEqual([]);
        expect(errors).toEqual([]);
      } finally {
        await testInfo.attach("mock-requests", { body: JSON.stringify({ requests, unexpected, errors, changed, amount, applied, refreshFailures }, null, 2), contentType: "application/json" });
      }
    });
  }
}


type IntegrityScenario = "rejected" | "rejected-changed" | "uncertain" | "late-poll" | "list-error" | "local-payment" | "local-voucher";

async function setupIntegrityScenario(page: Page, context: BrowserContext, mode: IntegrityScenario, info: TestInfo) {
  const origin = localOrigin(info.project.use.baseURL, "baseURL");
  const apiOrigins = mockApiOrigins(origin, info);
  const expiresAt = new Date(Date.now() + 3600000).toISOString();
  const user = { id: 151, email: "member@example.test", displayName: "Hội viên thử nghiệm", phone: null,
    avatarUrl: null, emailVerified: true, roles: ["member"], permissions: ["member.loyalty"] };
  const token = "mock." + Buffer.from(JSON.stringify({ type: "access", sub: "151", roles: user.roles,
    permissions: user.permissions, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".mock";
  await context.addCookies([{ name: "qlvmb.access_token", value: token, url: origin }]);
  await context.addInitScript(session => localStorage.setItem("qlvmb.auth.session", JSON.stringify(session)), {
    accessToken: token, refreshToken: "mock-only", tokenType: "Bearer", accessTokenExpiresAt: expiresAt, user
  });
  let applied: string | null = "OLD", amount = 700000, changed = false, pollArmed = false;
  const counts = { mutation: 0, payment: 0, sessions: 0, overview: 0, pendingPoll: 0, returnedPoll: 0 };
  const requests: string[] = [], unexpected: string[] = [], errors: string[] = [];
  let releasePoll!: () => void, releaseMutation!: () => void, releasePayment!: () => void, releaseList!: () => void;
  const pollGate = new Promise<void>(resolve => { releasePoll = resolve; });
  const mutationGate = new Promise<void>(resolve => { releaseMutation = resolve; });
  const paymentGate = new Promise<void>(resolve => { releasePayment = resolve; });
  const listGate = new Promise<void>(resolve => { releaseList = resolve; });
  page.on("pageerror", error => errors.push(error.message));
  const local = mode.startsWith("local-");
  const pay = () => ({ bookingCode: "P6TEST", provider: "sepay", sessionMode: local ? "local" : "live",
    paymentUrl: null, paymentStatus: "pending", expiresAt, referenceCode: "SEPAY-000000000001", amount,
    bankName: local ? null : "BIDV", accountNumber: local ? null : "0000000000",
    accountHolderName: local ? null : "MOCK ONLY", qrCodeUrl: local ? null : origin + "/6p01-qr?amount=" + amount,
    qrCodeDataUrl: null, discountAmount: 1200000 - amount, appliedVoucherCode: applied });
  const overview = () => ({ bookingCode: "P6TEST", status: "held", paymentStatus: "pending",
    holdExpiresAt: expiresAt, ticketedAt: null, tripType: "one_way", steps: [], segments: [], contact: null,
    passengers: [], ancillaries: [], seatSelections: [], tickets: [], boardingPasses: [], refundRequest: null,
    paymentMethods: [], priceSummary: { baseAmount: 1000000, ancillaryAmount: 200000, currency: "VND",
      discountAmount: 1200000 - amount, totalAmount: amount, appliedVoucherCode: applied } });
  await context.route("**/*", async route => {
    const r = route.request(), url = new URL(r.url()), method = r.method();
    if (url.origin === origin && url.pathname === "/6p01-qr") return route.fulfill({
      contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><text x="5" y="60">MOCK QR</text></svg>'
    });
    if (url.pathname.startsWith("/api/") && apiOrigins.includes(url.origin)) {
      requests.push(method + " " + url.pathname);
      const headers = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true",
        "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "GET,POST,DELETE,OPTIONS" };
      const send = (data: unknown, status = 200) => route.fulfill({ status, headers,
        contentType: "application/json", body: JSON.stringify(data) });
      if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (url.pathname === "/api/bookings/P6TEST/payments/session") {
        counts.sessions++;
        if (mode === "late-poll" && pollArmed && !changed) {
          pollArmed = false; counts.pendingPoll++; const previous = pay();
          await pollGate; await send(previous); counts.returnedPoll++; return;
        }
        if (mode === "late-poll" && changed) return send({ message: "Mock refresh failed" }, 500);
        return send(pay());
      }
      if (url.pathname === "/api/bookings/P6TEST/apply-voucher" && method === "POST") {
        counts.mutation++;
        expect(r.postDataJSON()).toEqual({ voucherCode: "NEW" });
        if (mode === "rejected") return send({ message: "Booking chưa đáp ứng điều kiện voucher." }, 400);
        applied = "NEW"; amount = 1000000; changed = true;
        if (mode === "rejected-changed") return send({ message: "Mock ambiguous rejection" }, 400);
        if (mode === "uncertain") return route.abort("failed");
        if (mode === "local-voucher") await mutationGate;
        return send(overview());
      }
      if (url.pathname === "/api/bookings/P6TEST/voucher" && method === "DELETE") {
        counts.mutation++; applied = null; amount = 1200000; changed = true; return send(overview());
      }
      if (url.pathname === "/api/bookings/manage/P6TEST" && method === "GET") counts.overview++;
      if (url.pathname === "/api/payments/callback" && method === "POST") {
        counts.payment++; await paymentGate; return send({ message: "Mock local confirmation unavailable" }, 500);
      }
      if (url.pathname === "/api/me/vouchers") {
        if (mode === "list-error" && changed) {
          await listGate;
          return send({ message: "Mock voucher list unavailable" }, 500);
        }
        return send([]);
      }
      if (url.pathname === "/api/me/notifications" || url.pathname === "/api/me/passengers") return send([]);
      if (url.pathname === "/api/me/profile") return send({ ...user, status: "active" });
      if (url.pathname === "/api/me/loyalty") return send({ membershipTier: "Hội viên", pointBalance: 0, lifetimePoints: 0, availableVoucherCount: 0, recentEntries: [] });
      if (url.pathname === "/api/notifications/stream") return send({ message: "Mock SSE" }, 401);
      unexpected.push(method + " " + url.pathname); return route.abort();
    }
    if (url.origin === origin && method === "GET" && !url.pathname.startsWith("/api/")) return route.continue();
    unexpected.push(method + " " + url.origin + url.pathname); return route.abort();
  });
  await page.goto("/booking/P6TEST/checkout");
  const panel = page.locator("article.booking-payment-card").filter({ has: page.getByRole("heading", { name: "Voucher hội viên", exact: true }) });
  const detail = page.locator(".booking-payment-detail-list");
  const link = page.getByRole("link", { name: "Mở mã QR / liên kết thanh toán", exact: true });
  await expect(detail).toContainText("OLD");
  await expect(detail).toContainText("700.000");
  await page.waitForLoadState("networkidle");
  return { origin, panel, detail, link, counts, armPoll: () => { pollArmed = true; }, releasePoll, releaseMutation, releasePayment,
    releaseList,
    apply: async () => {
      await panel.getByRole("textbox", { name: "Mã voucher", exact: true }).fill("NEW");
      await panel.getByRole("button", { name: "Áp voucher", exact: true }).click();
    },
    finish: async (info: TestInfo) => {
      releasePoll(); releaseMutation(); releasePayment(); releaseList();
      await info.attach("6p02-requests", { body: JSON.stringify({ counts, requests, unexpected, errors, changed, amount, applied }), contentType: "application/json" });
      expect(unexpected).toEqual([]); expect(errors).toEqual([]);
    }
  };
}

test("6P02 remains closed after HTTP 400 even when booking is unchanged", async ({ page, context }, info) => {
  const f = await setupIntegrityScenario(page, context, "rejected", info);
  try {
    const sessions = f.counts.sessions; await f.apply();
    await expect(f.panel.getByRole("alert")).toBeVisible();
    await expect(f.link).toBeHidden();
    await expect(f.detail).toBeHidden();
    await expect(page.getByText("Sẵn sàng thanh toán", { exact: true })).toBeHidden();
    await expect(page.getByRole("link", { name: "Kiểm tra đặt chỗ", exact: true })).toHaveAttribute("href", "/manage-booking?bookingCode=P6TEST");
    await expect(f.panel.getByRole("button", { name: "Áp voucher", exact: true })).toBeDisabled();
    expect(f.counts.overview).toBe(0);
    expect(f.counts.sessions).toBe(sessions);
  } finally { await f.finish(info); }
});

for (const mode of ["rejected-changed", "uncertain"] as const) {
  test("6P02 remains closed for " + mode, async ({ page, context }, info) => {
    const f = await setupIntegrityScenario(page, context, mode, info);
    try {
      const sessions = f.counts.sessions; await f.apply();
      await expect(f.panel.getByRole("alert")).toBeVisible();
      await expect(f.link).toBeHidden();
      await expect(f.detail).toBeHidden();
      await expect(page.getByText("Sẵn sàng thanh toán", { exact: true })).toBeHidden();
      await expect(page.getByRole("link", { name: "Kiểm tra đặt chỗ", exact: true })).toHaveAttribute("href", "/manage-booking?bookingCode=P6TEST");
      await expect(f.panel.getByRole("button", { name: "Áp voucher", exact: true })).toBeDisabled();
      expect(f.counts.overview).toBe(0);
      expect(f.counts.sessions).toBe(sessions);
    } finally { await f.finish(info); }
  });
}

test("6P02 discards a late polling session after failed voucher refresh", async ({ page, context }, info) => {
  await page.clock.install();
  const f = await setupIntegrityScenario(page, context, "late-poll", info);
  try {
    f.armPoll(); await page.clock.runFor(15010);
    await expect.poll(() => f.counts.pendingPoll).toBe(1);
    await f.apply(); await expect(f.panel.getByRole("alert")).toBeVisible();
    f.releasePoll(); await expect.poll(() => f.counts.returnedPoll).toBe(1);
    await page.clock.runFor(1000);
    await expect(f.link).toBeHidden(); await expect(f.detail).toBeHidden();
    await expect(page.getByRole("heading", { name: "Chưa xác minh thanh toán", exact: true })).toBeVisible();
  } finally { await f.finish(info); }
});

test("6P02 voucher list failure preserves the newly confirmed remove session", async ({ page, context }, info) => {
  const f = await setupIntegrityScenario(page, context, "list-error", info);
  try {
    await f.panel.getByRole("button", { name: "Bỏ voucher", exact: true }).click();
    await expect(f.detail).toContainText("1.200.000");
    await expect(f.detail).toContainText("Chưa áp dụng");
    await expect(f.link).toHaveAttribute("href", f.origin + "/6p01-qr?amount=1200000");
    await expect(f.panel.getByRole("textbox", { name: "Mã voucher", exact: true })).toBeEnabled();
    await expect(f.panel).toContainText("Đang tải");
    f.releaseList();
    await expect(f.panel.getByRole("alert")).toContainText("chưa tải lại được danh sách voucher");
    await expect(f.panel).toContainText("Chưa xác minh danh sách voucher");
  } finally { await f.finish(info); }
});

test("6P02 locks voucher mutation during local confirmation in the same turn", async ({ page, context }, info) => {
  const f = await setupIntegrityScenario(page, context, "local-payment", info);
  try {
    await f.panel.getByRole("textbox", { name: "Mã voucher", exact: true }).fill("NEW");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const pay = buttons.find(b => b.textContent?.trim() === "Tôi đã hoàn tất thanh toán")!;
      const apply = buttons.find(b => b.textContent?.trim() === "Áp voucher")!;
      pay.click(); apply.click(); pay.click();
    });
    await expect.poll(() => f.counts.payment).toBe(1);
    await expect(f.panel.getByRole("button", { name: "Áp voucher", exact: true })).toBeDisabled();
    expect(f.counts.mutation).toBe(0);
    f.releasePayment();
  } finally { await f.finish(info); }
});

test("6P02 hides local confirmation before voucher mutation resolves", async ({ page, context }, info) => {
  const f = await setupIntegrityScenario(page, context, "local-voucher", info);
  try {
    await f.panel.getByRole("textbox", { name: "Mã voucher", exact: true }).fill("NEW");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
      const pay = buttons.find(b => b.textContent?.trim() === "Tôi đã hoàn tất thanh toán")!;
      const apply = buttons.find(b => b.textContent?.trim() === "Áp voucher")!;
      apply.click(); pay.click(); apply.click();
    });
    await expect.poll(() => f.counts.mutation).toBe(1);
    await expect(page.getByRole("button", { name: "Tôi đã hoàn tất thanh toán", exact: true })).toBeHidden();
    await expect(f.detail).toBeHidden();
    expect(f.counts.payment).toBe(0);
    f.releaseMutation();
    await expect(f.detail).toContainText("1.000.000");
    await expect(page.getByRole("button", { name: "Tôi đã hoàn tất thanh toán", exact: true })).toBeEnabled();
  } finally { await f.finish(info); }
});
