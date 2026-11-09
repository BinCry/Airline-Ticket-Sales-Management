import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

function request(path: string, permissions?: string[], roles = ["operations_staff"], expired = false) {
  const token = permissions ? [Buffer.from('{"alg":"none"}').toString("base64url"),
    Buffer.from(JSON.stringify({ type: "access", exp: Math.floor(Date.now() / 1000) + (expired ? -60 : 3600), permissions, roles })).toString("base64url"), "test"].join(".") : "";
  return new NextRequest(`http://127.0.0.1:3101${path}`, { headers: token ? { cookie: `qlvmb.access_token=${token}` } : {} });
}

describe("Bảo vệ route Audit bằng permission hiện có", () => {
  it.each(["/backoffice/audit", "/backoffice/audit/details"])("cho admin truy cập %s", (path) => {
    expect(proxy(request(path, ["backoffice.admin"])).headers.get("x-middleware-next")).toBe("1");
  });
  it.each([["backoffice.operations"], ["backoffice.support"], ["backoffice.sales"]])("chặn quyền %s dù có role vận hành", (...permissions) => {
    expect(new URL(proxy(request("/backoffice/audit", permissions)).headers.get("location")!).pathname).toBe("/backoffice");
  });
  it("chặn customer và người không đăng nhập", () => {
    expect(proxy(request("/backoffice/audit", ["customer.self_service"], ["customer"])).headers.get("location")).toContain("/account");
    const redirect = new URL(proxy(request("/backoffice/audit?keyword=test")).headers.get("location")!);
    expect(redirect.pathname).toBe("/login");
    expect(redirect.searchParams.get("redirectTo")).toBe("/backoffice/audit?keyword=test");
  });
  it("chặn token hết hạn", () => {
    expect(proxy(request("/backoffice/audit", ["backoffice.admin"], [], true)).headers.get("location")).toContain("/login");
  });
  it("giữ nguyên quyền các module cũ", () => {
    expect(proxy(request("/backoffice/operations", ["backoffice.operations"])).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(request("/backoffice/admin", ["backoffice.operations"])).headers.get("location")).toContain("/backoffice");
    expect(proxy(request("/backoffice/admin", ["backoffice.admin"])).headers.get("x-middleware-next")).toBe("1");
  });
});
