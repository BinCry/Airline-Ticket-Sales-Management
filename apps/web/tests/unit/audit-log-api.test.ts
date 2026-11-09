import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { refreshStoredAuthSession } from "@/lib/api-client";
import { loadActiveAuthSession, type AuthSession } from "@/lib/auth-session";
import {
  downloadAuditLogCsv, fetchAuditLogActions, fetchAuditLogs, isAuditLogPage,
  readAuditCsvFilename, startAuditCsvDownload
} from "@/lib/audit-log-api";
import { createDefaultAuditLogFilters } from "@/lib/audit-log-filters";

vi.mock("@/lib/auth-session", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/auth-session")>(), loadActiveAuthSession: vi.fn()
}));
vi.mock("@/lib/api-client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api-client")>(), refreshStoredAuthSession: vi.fn()
}));

const filters = () => createDefaultAuditLogFilters(new Date("2026-10-25T00:00:00Z"));
const item = { id: 1, actorId: null, actorEmail: null, actorName: null, action: "admin.user.update", targetType: "user",
  targetId: "1", detail: "Tiếng Việt %, _ và \\", createdAt: "2026-10-25T00:00:00Z", hidden: false };
const page = { items: [item], page: 0, size: 20, totalElements: 1, totalPages: 1 };
const session: AuthSession = { accessToken: "new-token", refreshToken: "refresh", tokenType: "Bearer",
  accessTokenExpiresAt: "2099-01-01T00:00:00Z", user: { id: 1, email: "admin@example.test", displayName: "Admin",
    phone: null, avatarUrl: null, emailVerified: true, roles: ["operations_staff"], permissions: ["backoffice.admin"] } };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const csv = (headers: Record<string, string> = {}) => new Response(new Uint8Array([239, 187, 191, 65, 44, 66, 13, 10]), {
  headers: { "Content-Type": "text/csv; charset=UTF-8", "X-Export-Truncated": "false", ...headers }
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:18999");
  vi.mocked(loadActiveAuthSession).mockReturnValue(null);
  vi.mocked(refreshStoredAuthSession).mockResolvedValue(null);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); vi.useRealTimers(); });

describe("API danh sách và hành động Audit Log", () => {
  it("truyền nguyên bộ lọc literal và pagination, nhận actor null", async () => {
    vi.mocked(fetch).mockResolvedValue(json(page));
    expect(await fetchAuditLogs("token", { ...filters(), actorId: "none", keyword: "%_\\ &" }, 2, 50)).toEqual(page);
    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(url.origin).toBe("http://127.0.0.1:18999");
    expect(url.searchParams.get("keyword")).toBe("%_\\ &");
    expect(url.searchParams.get("actorId")).toBe("none");
    expect(url.searchParams.get("page")).toBe("2");
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer token");
  });
  it("chấp nhận trang rỗng, từ chối payload/entity sai hợp đồng", () => {
    expect(isAuditLogPage({ ...page, items: [], totalElements: 0, totalPages: 0 })).toBe(true);
    expect(isAuditLogPage({ ...page, items: [{ ...item, actorId: {} }] })).toBe(false);
    expect(isAuditLogPage({ ...page, size: 101 })).toBe(false);
  });
  it("báo lỗi payload hỏng mà không coi là kết quả rỗng", async () => {
    vi.mocked(fetch).mockResolvedValue(json({ content: [] }));
    await expect(fetchAuditLogs("token", filters())).rejects.toMatchObject({ status: 502 });
  });
  it.each([[-1, 20], [0, 0], [0, 101]])("chặn pagination %s/%s trước fetch", async (pageNumber, size) => {
    await expect(fetchAuditLogs("token", filters(), pageNumber, size)).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("actions distinct, sắp xếp ổn định và hỗ trợ rỗng", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json(["ops.update", "admin.export", "ops.update"])).mockResolvedValueOnce(json([]));
    expect(await fetchAuditLogActions("token")).toEqual(["admin.export", "ops.update"]);
    expect(await fetchAuditLogActions("token")).toEqual([]);
  });
  it("từ chối actions sai hợp đồng", async () => {
    vi.mocked(fetch).mockResolvedValue(json([null]));
    await expect(fetchAuditLogActions("token")).rejects.toMatchObject({ status: 502 });
  });
});

describe("Tải CSV có xác thực", () => {
  it("giữ nguyên BOM/bytes, không gửi pagination hoặc token trong URL", async () => {
    vi.mocked(fetch).mockResolvedValue(csv({ "Content-Disposition": 'attachment; filename="nhat-ky.csv"' }));
    const file = await downloadAuditLogCsv("token", { ...filters(), actorId: "none", includeHidden: true });
    expect(Array.from(new Uint8Array(await file.blob.arrayBuffer()))).toEqual([239, 187, 191, 65, 44, 66, 13, 10]);
    expect(file).toMatchObject({ filename: "nhat-ky.csv", truncated: false, warning: null });
    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]));
    expect(url.pathname).toBe("/api/admin/audit-logs/export");
    expect(url.searchParams.has("page")).toBe(false);
    expect(url.searchParams.has("size")).toBe(false);
    expect(url.searchParams.has("token")).toBe(false);
    expect(url.searchParams.get("actorId")).toBe("none");
    expect(url.searchParams.get("includeHidden")).toBe("true");
  });
  it("đọc header bị cắt ở 10.000 dòng", async () => {
    vi.mocked(fetch).mockResolvedValue(csv({ "X-Export-Truncated": "true", "X-Export-Warning": "truncated-at-10000-rows" }));
    expect(await downloadAuditLogCsv("token", filters())).toMatchObject({ truncated: true, warning: "truncated-at-10000-rows" });
  });
  it("refresh sau 401 đúng một lần rồi dùng token mới", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(csv());
    vi.mocked(refreshStoredAuthSession).mockResolvedValue(session);
    await downloadAuditLogCsv("old-token", filters());
    expect(refreshStoredAuthSession).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[1][1]?.headers).toMatchObject({ Authorization: "Bearer new-token" });
  });
  it("không retry vô hạn nếu token mới vẫn bị từ chối", async () => {
    vi.mocked(fetch).mockResolvedValue(json({ message: "Phiên hết hạn" }, 401));
    vi.mocked(refreshStoredAuthSession).mockResolvedValue(session);
    await expect(downloadAuditLogCsv("old-token", filters())).rejects.toMatchObject({ status: 401 });
    expect(refreshStoredAuthSession).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("refresh chủ động bằng cơ chế session hiện có", async () => {
    vi.mocked(loadActiveAuthSession).mockReturnValue({ ...session, accessTokenExpiresAt: "2000-01-01T00:00:00Z" });
    vi.mocked(refreshStoredAuthSession).mockResolvedValue(session);
    vi.mocked(fetch).mockResolvedValue(csv());
    await downloadAuditLogCsv("old-token", filters());
    expect(refreshStoredAuthSession).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer new-token" });
  });
  it("không gửi request khi refresh làm mất quyền admin", async () => {
    vi.mocked(fetch).mockResolvedValue(json({}, 401));
    vi.mocked(refreshStoredAuthSession).mockResolvedValue({ ...session, user: { ...session.user, permissions: ["backoffice.operations"] } });
    await expect(downloadAuditLogCsv("token", filters())).rejects.toMatchObject({ status: 403 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([400, 403, 500])("giữ thông báo HTTP %s; không retry hoặc biến JSON lỗi thành CSV", async (status) => {
    vi.mocked(fetch).mockResolvedValue(json({ message: "Bộ lọc vượt giới hạn metadata" }, status));
    await expect(downloadAuditLogCsv("token", filters())).rejects.toMatchObject({ status, message: "Bộ lọc vượt giới hạn metadata" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(refreshStoredAuthSession).not.toHaveBeenCalled();
  });
  it("chặn HTML/JSON có status 200 trước khi tải Blob", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("<html>Lỗi</html>", { headers: { "Content-Type": "text/html" } }));
    await expect(downloadAuditLogCsv("token", filters())).rejects.toMatchObject({ status: 502 });
  });
  it("báo lỗi mạng riêng với lỗi backend", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(downloadAuditLogCsv("token", filters())).rejects.toMatchObject({ status: 0 });
  });
  it("chặn thiếu ngày và quá 90 ngày trước request", async () => {
    await expect(downloadAuditLogCsv("token", { ...filters(), from: "" })).rejects.toMatchObject({ status: 400 });
    await expect(downloadAuditLogCsv("token", { ...filters(), from: "2026-01-01", to: "2026-04-01" })).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("chặn session không có admin và request đã hủy", async () => {
    vi.mocked(loadActiveAuthSession).mockReturnValue({ ...session, user: { ...session.user, permissions: [] } });
    await expect(downloadAuditLogCsv("token", filters())).rejects.toMatchObject({ status: 403 });
    const controller = new AbortController(); controller.abort();
    await expect(downloadAuditLogCsv("token", filters(), controller.signal)).rejects.toBeInstanceOf(Error);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("cảnh báo nếu CORS không expose header giới hạn", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("a,b", { headers: { "Content-Type": "text/csv" } }));
    expect((await downloadAuditLogCsv("token", filters())).warning).toContain("CORS");
  });
  it("tạo và thu hồi object URL sau khi bắt đầu tải", () => {
    vi.useFakeTimers();
    const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal("document", { createElement: vi.fn(() => link), body: { appendChild: vi.fn() } });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    startAuditCsvDownload({ blob: new Blob(["csv"]), filename: "audit.csv", truncated: false, warning: null });
    expect(link.download).toBe("audit.csv");
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(link.remove).toHaveBeenCalledTimes(1);
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith("blob:test");
  });
});

describe("Tên file CSV an toàn", () => {
  it.each([
    ['attachment; filename="../../audit.csv"', "audit.csv"],
    ["attachment; filename*=UTF-8''nh%E1%BA%ADt-k%C3%BD.csv", "nhật-ký.csv"],
    ['attachment; filename="error.html"', "fallback.csv"],
    ["attachment; filename*=UTF-8''%ZZ.csv", "fallback.csv"],
    [null, "fallback.csv"]
  ])("xử lý header %s", (header, expected) => {
    expect(readAuditCsvFilename(header, "fallback.csv")).toBe(expected);
  });
});
