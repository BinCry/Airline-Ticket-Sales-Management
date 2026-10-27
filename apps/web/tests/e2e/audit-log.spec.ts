import { expect, test, type Page, type Route } from "@playwright/test";

import { jsonResponse, seedAuthSession } from "./e2e-helpers";

// Chặn service worker để request API luôn qua mock của bài test.
test.use({ serviceWorkers: "block" });

const systemLog = { id: 2, actorId: null, actorEmail: null, actorName: null, action: "system.update", targetType: "system",
  targetId: "job-1", detail: "Hệ thống cập nhật <script>alert(1)</script> %, _ và \\", createdAt: "2026-10-24T17:01:00Z", hidden: true };
const userLog = { ...systemLog, id: 1, actorId: 7, actorEmail: "nguyen@example.test", actorName: "Nguyễn An",
  action: "admin.user.update", targetType: "user", targetId: "7", detail: "Đổi thông tin người dùng", hidden: false };
const records = (items = [systemLog, userLog], page = 0, totalElements = items.length) =>
  ({ items, page, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) });
type ApiHandler = (route: Route, url: URL) => Promise<void>;

function resolveExpectedApiOrigin(configuredBaseUrl: string | undefined): string {
  if (!configuredBaseUrl?.trim()) {
    throw new Error("Thiếu API base URL trong cấu hình webServer của Playwright.");
  }
  const url = new URL(configuredBaseUrl);
  if (!["http:", "https:"].includes(url.protocol)
      || !["127.0.0.1", "localhost"].includes(url.hostname)
      || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Audit E2E chỉ chấp nhận API origin loopback, không có credential hoặc đường dẫn phụ.");
  }
  return url.origin;
}

test("API origin khớp cấu hình mặc định và cấu hình Audit riêng", () => {
  for (const origin of ["http://127.0.0.1:8080", "http://127.0.0.1:18999"]) {
    expect(resolveExpectedApiOrigin(origin)).toBe(origin);
  }
});

test("API origin thiếu hoặc ngoài loopback bị từ chối", () => {
  for (const origin of [undefined, "", "not-a-url", "/api", "https://example.test",
    "http://localhost.example.test:8080", "ftp://127.0.0.1:8080", "http://user:dummy@127.0.0.1:8080",
    "http://127.0.0.1:8080/api", "http://127.0.0.1:8080?target=other", "http://127.0.0.1:8080#other"]) {
    expect(() => resolveExpectedApiOrigin(origin)).toThrow();
  }
});

async function isolateApi(page: Page, handler?: ApiHandler) {
  const expectedApiOrigin = resolveExpectedApiOrigin(
    test.info().config.webServer?.env?.NEXT_PUBLIC_API_BASE_URL
  );
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) { await route.abort(); return; }
    if (!url.pathname.startsWith("/api/")) { await route.continue(); return; }
    // Không cho request API nào thoát ra dịch vụ thật, kể cả khi thiếu mock.
    if (url.origin !== expectedApiOrigin) {
      await route.abort();
      expect(url.origin).toBe(expectedApiOrigin);
      return;
    }
    expect(url.origin).toBe(expectedApiOrigin);
    if (url.pathname === "/api/admin/audit-logs/actions") {
      await route.fulfill(jsonResponse(["admin.user.update", "system.update", "administrator.other", "admin.audit.export"])); return;
    }
    if (url.pathname === "/api/me/notifications") { await route.fulfill(jsonResponse([])); return; }
    if (handler) { await handler(route, url); return; }
    if (url.pathname === "/api/admin/audit-logs") { await route.fulfill(jsonResponse(records())); return; }
    await route.fulfill(jsonResponse({ message: "API không thuộc kịch bản kiểm thử" }, 404));
  });
}

async function openAudit(page: Page, handler?: ApiHandler) {
  await isolateApi(page, handler);
  await seedAuthSession(page, { roles: ["operations_staff"], permissions: ["backoffice.admin"] });
  await page.goto("/backoffice/audit");
}

test("Admin xem đầy đủ thông tin, actor null, nhãn ẩn và text an toàn", async ({ page }) => {
  await openAudit(page);
  await expect(page.getByRole("heading", { name: "Nhật ký kiểm toán", exact: true })).toBeVisible();
  await expect(page.locator("tbody")).toContainText("Hệ thống/không rõ");
  await expect(page.locator("tbody")).toContainText("Nguyễn An");
  await expect(page.locator("tbody")).toContainText("Đã ẩn");
  await expect(page.locator("time").first()).toContainText("25/10/2026");
  await page.locator("details summary").first().click();
  await expect(page.locator(".audit-log-detail-full").first()).toHaveText(systemLog.detail);
  await expect(page.locator("tbody script")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /xóa|khôi phục/i })).toHaveCount(0);
});

test("khóa Áp dụng và Xuất CSV trong lần tải danh sách đầu tiên", async ({ page }) => {
  let releaseList!: () => void;
  const listReady = new Promise<void>((resolve) => { releaseList = resolve; });
  let started = false;
  await openAudit(page, async (route, url) => {
    if (url.pathname === "/api/admin/audit-logs") {
      started = true;
      await listReady;
      await route.fulfill(jsonResponse(records())); return;
    }
    await route.fulfill(jsonResponse({}, 404));
  });
  await expect.poll(() => started).toBe(true);
  await expect(page.getByRole("button", { name: "Áp dụng", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Xuất CSV", exact: true })).toBeDisabled();
  releaseList();
  await expect(page.locator("tbody")).toContainText("Nguyễn An");
  await expect(page.getByRole("button", { name: "Áp dụng", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Xuất CSV", exact: true })).toBeEnabled();
});

test("áp dụng bộ lọc kết hợp, literal, pagination và đặt lại bảy ngày Việt Nam", async ({ page }) => {
  const queries: URLSearchParams[] = [];
  await openAudit(page, async (route, url) => {
    if (url.pathname === "/api/admin/audit-logs") {
      queries.push(url.searchParams);
      await route.fulfill(jsonResponse(records([userLog], Number(url.searchParams.get("page")), 41))); return;
    }
    await route.fulfill(jsonResponse({}, 404));
  });
  await expect(page.locator("tbody")).toContainText("Nguyễn An");
  const initial = queries[0];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  expect(initial.get("to")).toBe(today);
  expect((Date.parse(initial.get("to")!) - Date.parse(initial.get("from")!)) / 86400000).toBe(6);
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.getByText("Trang 2 / 3", { exact: true })).toBeVisible();
  await page.getByLabel("Tìm email hoặc tên người thao tác").fill("nguyen@example.test");
  await page.getByLabel("Nhóm hành động", { exact: true }).selectOption("admin");
  await expect(page.getByLabel("Hành động cụ thể").locator("option")).toHaveCount(3);
  await page.getByLabel("Hành động cụ thể").selectOption("admin.user.update");
  await page.getByLabel("Loại đối tượng").fill("user");
  await page.getByLabel("Mã đối tượng").fill("%_\\");
  await page.getByLabel("Từ khóa trong chi tiết").fill("50%_\\");
  await page.getByLabel("Hiện cả bản ghi đã ẩn").check();
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.get("keyword")).toBe("50%_\\");
  expect(Object.fromEntries(queries.at(-1)!)).toMatchObject({ page: "0", size: "20", actorKeyword: "nguyen@example.test",
    actionPrefix: "admin", action: "admin.user.update", targetType: "user", targetId: "%_\\", includeHidden: "true" });
  await expect(page.getByText("Trang 1 / 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.has("keyword")).toBe(false);
  await page.getByLabel("Người thao tác trong kết quả đã tải").selectOption("none");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.get("actorId")).toBe("none");
  expect(queries.at(-1)?.has("actorKeyword")).toBe(false);
  await page.getByLabel("Người thao tác trong kết quả đã tải").selectOption("7");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.get("actorId")).toBe("7");
});

test("giữ kết quả cũ khi lỗi mạng và CSV vẫn dùng bộ lọc của kết quả đó", async ({ page }) => {
  let exported: URL | null = null;
  await openAudit(page, async (route, url) => {
    if (url.pathname.endsWith("/export")) {
      exported = url;
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/csv; charset=UTF-8", "Content-Disposition": 'attachment; filename="audit.csv"',
        "X-Export-Truncated": "true", "X-Export-Warning": "truncated-at-10000-rows",
        "Access-Control-Expose-Headers": "Content-Disposition, X-Export-Truncated, X-Export-Warning" }, body: Buffer.from("\uFEFFthời gian,chi tiết\r\n") }); return;
    }
    if (url.pathname === "/api/admin/audit-logs") {
      if (url.searchParams.get("keyword") === "mới") { await route.abort(); return; }
      await route.fulfill(jsonResponse(records())); return;
    }
    await route.fulfill(jsonResponse({}, 404));
  });
  await expect(page.locator("tbody")).toContainText("Nguyễn An");
  await page.getByLabel("Từ khóa trong chi tiết").fill("mới");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(page.getByText("Đang giữ kết quả tải thành công trước đó và bộ lọc tương ứng.")).toBeVisible();
  await expect(page.locator("tbody")).toContainText("Nguyễn An");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("audit.csv");
  expect(exported).not.toBeNull();
  expect(exported!.searchParams.has("keyword")).toBe(false);
  expect(exported!.searchParams.has("page")).toBe(false);
  await expect(page.getByText("Kết quả đã bị cắt ở 10.000 dòng. Hãy thu hẹp bộ lọc.")).toBeVisible();
});

test("retry đúng truy vấn thất bại B, giữ kết quả A và CSV A trước khi B thành công", async ({ page }) => {
  const queries: URLSearchParams[] = [];
  const exports: URLSearchParams[] = [];
  let bCalls = 0;
  let releaseRetry!: () => void;
  const retryReady = new Promise<void>((resolve) => { releaseRetry = resolve; });
  await openAudit(page, async (route, url) => {
    if (url.pathname.endsWith("/export")) {
      exports.push(url.searchParams);
      await route.fulfill({ headers: { "Content-Type": "text/csv", "X-Export-Truncated": "false",
        "Access-Control-Expose-Headers": "Content-Disposition, X-Export-Truncated, X-Export-Warning" }, body: Buffer.from("\uFEFFCSV A") }); return;
    }
    if (url.pathname === "/api/admin/audit-logs") {
      queries.push(url.searchParams);
      const isB = url.searchParams.get("keyword") === "B";
      if (isB) {
        bCalls++;
        if (bCalls === 1) { await route.abort(); return; }
        await retryReady;
      }
      await route.fulfill(jsonResponse({ ...records([{ ...userLog, detail: isB ? "Kết quả B" : "Kết quả A" }]),
        size: Number(url.searchParams.get("size")) })); return;
    }
    await route.fulfill(jsonResponse({}, 404));
  });
  await expect(page.locator("tbody")).toContainText("Kết quả A");
  await page.getByLabel("Số dòng mỗi trang").selectOption("50");
  await expect(page.getByRole("button", { name: "Tải lại", exact: true })).toBeEnabled();
  const queryA = Object.fromEntries(queries.at(-1)!);
  expect(queryA.size).toBe("50");
  await page.getByLabel("Từ khóa trong chi tiết").fill("B");
  await page.getByLabel("Mã đối tượng").fill("%_\\");
  await page.getByLabel("Người thao tác trong kết quả đã tải").selectOption("none");
  await page.getByLabel("Hiện cả bản ghi đã ẩn").check();
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toBeVisible();
  const queryB = Object.fromEntries(queries.at(-1)!);
  expect(queryB).toMatchObject({ keyword: "B", page: "0", size: "50", actorId: "none", targetId: "%_\\", includeHidden: "true" });
  await expect(page.locator("tbody")).toContainText("Kết quả A");
  await page.getByLabel("Từ khóa trong chi tiết").fill("C chưa áp dụng");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  await download;
  const { page: pageA, size: sizeA, ...filtersA } = queryA;
  expect(pageA).toBe("0");
  expect(sizeA).toBe("50");
  expect(Object.fromEntries(exports.at(-1)!)).toEqual(filtersA);
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect.poll(() => Object.fromEntries(queries.at(-1)!)).toEqual(queryB);
  await expect.poll(() => bCalls).toBe(2);
  await expect(page.locator("tbody")).toContainText("Kết quả A");
  releaseRetry();
  await expect(page.locator("tbody")).toContainText("Kết quả B");
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toHaveCount(0);
});

test("retry cũ được xóa khi Tải lại A; CSV vẫn dùng A trong lúc B chưa thành công", async ({ page }) => {
  const queries: URLSearchParams[] = [];
  const exports: URLSearchParams[] = [];
  await openAudit(page, async (route, url) => {
    if (url.pathname.endsWith("/export")) {
      exports.push(url.searchParams);
      await route.fulfill({ headers: { "Content-Type": "text/csv", "X-Export-Truncated": "false",
        "Access-Control-Expose-Headers": "Content-Disposition, X-Export-Truncated, X-Export-Warning" }, body: Buffer.from("\uFEFFCSV A") }); return;
    }
    if (url.pathname === "/api/admin/audit-logs") {
      queries.push(url.searchParams);
      if (url.searchParams.get("keyword") === "B") { await route.abort(); return; }
      await route.fulfill(jsonResponse(records([{ ...userLog, detail: "Kết quả A" }]))); return;
    }
    await route.fulfill(jsonResponse({}, 404));
  });
  await expect(page.locator("tbody")).toContainText("Kết quả A");
  const queryA = Object.fromEntries(queries.at(-1)!);
  await page.getByLabel("Từ khóa trong chi tiết").fill("B");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  await expect.poll(() => Object.fromEntries(queries.at(-1)!)).toEqual(queryA);
  await expect(page.getByRole("button", { name: "Tải lại", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toHaveCount(0);
  await expect(page.locator("tbody")).toContainText("Kết quả A");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  await download;
  expect(exports.at(-1)!.has("keyword")).toBe(false);
  expect(queries.filter((query) => query.get("keyword") === "B")).toHaveLength(1);
});

test("retry trang thất bại giữ đúng page và size, không tải lại trang đang hiển thị", async ({ page }) => {
  const queries: URLSearchParams[] = [];
  let nextPageCalls = 0;
  await openAudit(page, async (route, url) => {
    if (url.pathname === "/api/admin/audit-logs") {
      queries.push(url.searchParams);
      const pageNumber = Number(url.searchParams.get("page"));
      const size = Number(url.searchParams.get("size"));
      if (pageNumber === 1 && ++nextPageCalls === 1) { await route.abort(); return; }
      await route.fulfill(jsonResponse({ ...records([{ ...userLog, detail: `Kết quả trang ${pageNumber + 1}` }], pageNumber, 101),
        size, totalPages: Math.ceil(101 / size) })); return;
    }
    await route.fulfill(jsonResponse({}, 404));
  });
  await expect(page.locator("tbody")).toContainText("Kết quả trang 1");
  await page.getByLabel("Số dòng mỗi trang").selectOption("50");
  await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toBeVisible();
  const failed = Object.fromEntries(queries.at(-1)!);
  expect(failed).toMatchObject({ page: "1", size: "50" });
  await expect(page.getByText("Trang 1 / 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Kết quả trang 2");
  expect(Object.fromEntries(queries.at(-1)!)).toEqual(failed);
  await expect(page.getByText("Trang 2 / 3", { exact: true })).toBeVisible();
});

for (const oldStatus of [200, 500]) {
test(`response cũ ${oldStatus} không ghi đè kết quả mới, loading và lỗi hiện tại`, async ({ page }) => {
  let releaseOld!: () => void;
  const oldReady = new Promise<void>((resolve) => { releaseOld = resolve; });
  let releaseNew!: () => void;
  const newReady = new Promise<void>((resolve) => { releaseNew = resolve; });
  let oldStarted = false;
  let oldFinished = false;
  let newStarted = false;
  await openAudit(page, async (route, url) => {
    if (url.pathname === "/api/admin/audit-logs") {
      if (url.searchParams.get("keyword") === "cũ") {
        oldStarted = true;
        await oldReady;
        await route.fulfill(jsonResponse(oldStatus === 200 ? records([{ ...userLog, detail: "KẾT QUẢ CŨ" }]) : { message: "LỖI CŨ" }, oldStatus)).catch(() => {});
        oldFinished = true; return;
      }
      if (oldStarted) { newStarted = true; await newReady; }
      await route.fulfill(jsonResponse(records([{ ...userLog, detail: oldStarted ? "KẾT QUẢ MỚI" : "Ban đầu" }]))); return;
    }
    await route.fulfill(jsonResponse({}, 404));
  });
  await expect(page.locator("tbody")).toContainText("Ban đầu");
  await page.getByLabel("Từ khóa trong chi tiết").fill("cũ");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect.poll(() => oldStarted).toBe(true);
  await expect(page.getByRole("button", { name: "Áp dụng", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Xuất CSV", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await expect.poll(() => newStarted).toBe(true);
  releaseOld();
  await expect.poll(() => oldFinished).toBe(true);
  await expect(page.getByText("Đang tải kết quả mới...")).toBeVisible();
  await expect(page.getByRole("button", { name: "Áp dụng", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Xuất CSV", exact: true })).toBeDisabled();
  await expect(page.locator("tbody")).toContainText("Ban đầu");
  await expect(page.getByText("LỖI CŨ", { exact: true })).toHaveCount(0);
  releaseNew();
  await expect(page.locator("tbody")).toContainText("KẾT QUẢ MỚI");
  await expect(page.getByText("Đang tải kết quả mới...")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Áp dụng", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Xuất CSV", exact: true })).toBeEnabled();
  await expect(page.locator("tbody")).not.toContainText("KẾT QUẢ CŨ");
  await expect(page.getByText("LỖI CŨ", { exact: true })).toHaveCount(0);
});
}

test("CSV refresh một lần bằng session chung và không tải JSON lỗi", async ({ page }) => {
  let exportCalls = 0;
  let refreshCalls = 0;
  let errorStatus = 0;
  let refreshedSession: Awaited<ReturnType<typeof seedAuthSession>>;
  await isolateApi(page, async (route, url) => {
    if (url.pathname === "/api/auth/refresh") {
      refreshCalls++;
      await route.fulfill(jsonResponse({ ...refreshedSession, accessToken: "refreshed-token" })); return;
    }
    if (url.pathname.endsWith("/export")) {
      exportCalls++;
      if (errorStatus) { await route.fulfill(jsonResponse({ message: "Bộ lọc vượt giới hạn metadata" }, errorStatus)); return; }
      if (exportCalls === 1) { await route.fulfill(jsonResponse({}, 401)); return; }
      expect(route.request().headers().authorization).toBe("Bearer refreshed-token");
      await route.fulfill({ headers: { "Content-Type": "text/csv", "X-Export-Truncated": "false",
        "Access-Control-Expose-Headers": "Content-Disposition, X-Export-Truncated, X-Export-Warning" }, body: Buffer.from("\uFEFFCSV") }); return;
    }
    if (url.pathname === "/api/admin/audit-logs") { await route.fulfill(jsonResponse(records())); return; }
    await route.fulfill(jsonResponse({}, 404));
  });
  refreshedSession = await seedAuthSession(page, { roles: ["operations_staff"], permissions: ["backoffice.admin"] });
  await page.goto("/backoffice/audit");
  await expect(page.locator("tbody")).toContainText("Nguyễn An");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  await download;
  expect(exportCalls).toBe(2);
  expect(refreshCalls).toBe(1);
  for (const status of [400, 500]) {
    errorStatus = status;
    let badDownload = false;
    const listener = () => { badDownload = true; };
    page.on("download", listener);
    await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
    await expect(page.getByText("Bộ lọc vượt giới hạn metadata", { exact: true })).toBeVisible();
    expect(badDownload).toBe(false);
    page.off("download", listener);
  }
  expect(refreshCalls).toBe(1);
});

test("danh sách không giới hạn 90 ngày nhưng CSV chặn 91 ngày", async ({ page }) => {
  const queries: URL[] = [];
  await openAudit(page, async (route, url) => { queries.push(url); await route.fulfill(jsonResponse(records())); });
  await expect(page.locator("tbody")).toContainText("Nguyễn An");
  await page.getByRole("textbox", { name: "Từ ngày", exact: true }).fill("01/01/2026");
  await page.getByRole("textbox", { name: "Đến ngày", exact: true }).fill("01/04/2026");
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.searchParams.get("to")).toBe("2026-04-01");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  await expect(page.getByText("Mỗi lần xuất CSV tối đa 90 ngày, tính cả ngày đầu và ngày cuối.", { exact: true })).toBeVisible();
  expect(queries.some((url) => url.pathname.endsWith("/export"))).toBe(false);
});

test("xóa dữ liệu nhạy cảm khi mất session hoặc quyền trên client", async ({ page }) => {
  await openAudit(page);
  await expect(page.locator("tbody")).toContainText("Nguyễn An");
  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("qlvmb.auth.session")!);
    session.user.permissions = ["backoffice.operations"];
    localStorage.setItem("qlvmb.auth.session", JSON.stringify(session));
    window.dispatchEvent(new Event("qlvmb:auth-session-updated"));
  });
  await expect(page.getByText("Bạn không có quyền xem nhật ký kiểm toán.")).toBeVisible();
  await expect(page.locator("tbody")).toHaveCount(0);
  await page.evaluate(() => {
    localStorage.removeItem("qlvmb.auth.session");
    window.dispatchEvent(new Event("qlvmb:auth-session-updated"));
  });
  await expect(page.getByText("Bạn cần đăng nhập lại để xem nhật ký kiểm toán.")).toBeVisible();
});

test("direct navigation chặn người thiếu quyền và không gọi API Audit", async ({ page }) => {
  let calls = 0;
  await isolateApi(page, async (route, url) => { if (url.pathname.includes("audit-logs")) calls++; await route.fulfill(jsonResponse([])); });
  await seedAuthSession(page, { roles: ["operations_staff"], permissions: ["backoffice.operations"] });
  await page.goto("/backoffice/audit");
  await expect(page).toHaveURL(/\/backoffice$/);
  await expect(page.getByRole("link", { name: "Nhật ký kiểm toán", exact: true })).toHaveCount(0);
  expect(calls).toBe(0);
});

test("empty khác lỗi API; 403 xóa kết quả đang hiển thị", async ({ page }) => {
  let denied = false;
  await openAudit(page, async (route, url) => {
    if (url.pathname === "/api/admin/audit-logs") {
      await route.fulfill(denied ? jsonResponse({ message: "Không đủ quyền" }, 403) : jsonResponse(records([], 0, 0))); return;
    }
    await route.fulfill(jsonResponse({}, 404));
  });
  await expect(page.getByText("Không có bản ghi khớp bộ lọc")).toBeVisible();
  await expect(page.getByText("Không có trang kết quả", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeDisabled();
  denied = true;
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  await expect(page.getByText("Bạn không có quyền xem nhật ký kiểm toán.")).toBeVisible();
  await expect(page.locator("tbody")).toHaveCount(0);
});

test("responsive ở các biên đang dùng, detail dài không làm tràn trang", async ({ page }, testInfo) => {
  await openAudit(page, async (route, url) => {
    if (url.pathname === "/api/admin/audit-logs") {
      await route.fulfill(jsonResponse(records([{ ...userLog, actorEmail: "a".repeat(120) + "@example.test", action: "admin." + "a".repeat(100),
        targetId: "x".repeat(120), detail: "Dữ liệu dài " + "A".repeat(900) }]))); return;
    }
    await route.fulfill(jsonResponse({}, 404));
  });
  await expect(page.locator("tbody")).toContainText("Nguyễn An");
  for (const width of [1440, 880, 768, 640, 480, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("button", { name: "Xuất CSV", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Áp dụng", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Tràn ngang ở ${width}px`).toBe(true);
    if (width <= 768) {
      const gap = await page.locator(".audit-log-page .finance-table-head").evaluate((head) => {
        const summary = head.querySelector("div:first-child p:last-child")!.getBoundingClientRect();
        const actions = head.querySelector(".finance-action-row")!.getBoundingClientRect();
        return actions.top - summary.bottom;
      });
      expect(gap, `Khoảng cách thanh công cụ ở ${width}px`).toBeLessThanOrEqual(32);
    }
    if ([1440, 768, 390].includes(width)) {
      await page.screenshot({ path: testInfo.outputPath(`audit-${width}.png`), fullPage: true });
    }
  }
});

test("Dashboard có liên kết hoạt động, giữ thao tác ẩn nhật ký cũ", async ({ page }) => {
  let deleted = false;
  await isolateApi(page, async (route, url) => {
    if (url.pathname === "/api/admin/dashboard") {
      await route.fulfill(jsonResponse({ metrics: [], modules: [], auditTrail: deleted ? [] : [{ id: 81, actor: "Admin", action: "Thao tác cũ", target: "user-7", time: "22:00" }] })); return;
    }
    if (url.pathname === "/api/admin/users") { await route.fulfill(jsonResponse([])); return; }
    if (url.pathname === "/api/admin/audit-logs/81" && route.request().method() === "DELETE") {
      deleted = true; await route.fulfill({ status: 204 }); return;
    }
    if (url.pathname === "/api/admin/audit-logs") { await route.fulfill(jsonResponse(records())); return; }
    await route.fulfill(jsonResponse({}, 404));
  });
  await seedAuthSession(page, { roles: ["operations_staff"], permissions: ["backoffice.admin", "backoffice.operations"] });
  await page.goto("/backoffice");
  await expect(page.locator(".module-grid .module-card")).toHaveCount(3);
  await page.locator(".module-grid").getByRole("link", { name: /Quản trị hệ thống/ }).click();
  const moduleNav = page.getByRole("navigation", { name: "Điều hướng phân hệ backoffice" });
  await expect(moduleNav.locator(".backoffice-module-nav-links a")).toHaveCount(3);
  for (const [name, href] of [["Điều hành chuyến bay và voucher", "/backoffice/operations"],
    ["Quản lý doanh thu", "/backoffice/revenue"], ["Quản trị hệ thống", "/backoffice/admin"]]) {
    await expect(moduleNav.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
  await expect(moduleNav.getByRole("link", { name: "Nhật ký kiểm toán", exact: true })).toHaveCount(0);
  await expect(page.getByText("Thao tác cũ", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".admin-audit-delete-button").click();
  await expect.poll(() => deleted).toBe(true);
  await expect(page.getByText("Thao tác cũ", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Xem toàn bộ nhật ký", exact: true }).click();
  await expect(page).toHaveURL(/\/backoffice\/audit$/);
  await expect(page.locator("tbody")).toContainText("Nguyễn An");
});
