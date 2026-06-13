import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiClientError,
  requestApi,
  resolveApiClientErrorMessage
} from "@/lib/api-client";
import {
  AUTH_SESSION_STORAGE_KEY,
  type AuthSession
} from "@/lib/auth-session";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  global.fetch = originalFetch;
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function createAuthSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: "access-token-cu",
    refreshToken: "refresh-token-cu",
    tokenType: "Bearer",
    accessTokenExpiresAt: "2099-01-01T00:00:00Z",
    user: {
      id: 101,
      email: "khach@example.com",
      displayName: "Khach Hang",
      phone: "0909123456",
      avatarUrl: null,
      emailVerified: true,
      roles: ["customer"],
      permissions: ["customer.self_service"]
    },
    ...overrides
  };
}

function setupWindowStorage(authSession: AuthSession) {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(authSession));
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    localStorage,
    sessionStorage
  });
  return {
    localStorage,
    sessionStorage
  };
}

describe("api-client", () => {
  it("giu nguyen message json khi backend tra loi loi", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 403,
          message: "Bạn không có quyền truy cập khu vực này.",
          errors: {
            role: "Thiếu vai trò phù hợp."
          }
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      requestApi("/api/backoffice/admin", {
        method: "GET",
        showErrorToast: false
      })
    ).rejects.toMatchObject({
      name: "ApiClientError",
      status: 403,
      message: "Bạn không có quyền truy cập khu vực này."
    });
  });

  it("tra message ket noi khi khong goi duoc may chu", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as typeof fetch;

    await expect(
      requestApi("/api/flights/search", {
        method: "GET",
        showErrorToast: false
      })
    ).rejects.toMatchObject({
      name: "ApiClientError",
      status: 0,
      message: "Không thể kết nối tới máy chủ dịch vụ."
    });
  });

  it("uu tien loi field dau tien khi hien thi message", () => {
    const error = new ApiClientError("Thong bao tong quat", 400, {
      email: "Email khong hop le."
    });

    expect(
      resolveApiClientErrorMessage(error, "Khong the xu ly yeu cau.")
    ).toBe("Email khong hop le.");
  });

  it("lam moi access token het han truoc khi goi api can xac thuc", async () => {
    const stores = setupWindowStorage(createAuthSession({
      accessTokenExpiresAt: "2000-01-01T00:00:00Z"
    }));
    const refreshedAuthSession = createAuthSession({
      accessToken: "access-token-moi",
      refreshToken: "refresh-token-moi",
      accessTokenExpiresAt: "2099-01-01T00:00:00Z"
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(refreshedAuthSession), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }));

    global.fetch = fetchMock as typeof fetch;

    await expect(
      requestApi<{ ok: boolean }>("/api/me/profile", {
        accessToken: "access-token-cu",
        method: "GET",
        showErrorToast: false
      })
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/api/auth/refresh",
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: "refresh-token-cu" }),
        method: "POST"
      })
    );
    const requestHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Headers;
    expect(requestHeaders.get("Authorization")).toBe("Bearer access-token-moi");
    expect(stores.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toContain("access-token-moi");
  });

  it("retry mot lan bang access token moi khi api bao 401", async () => {
    setupWindowStorage(createAuthSession());
    const refreshedAuthSession = createAuthSession({
      accessToken: "access-token-moi",
      refreshToken: "refresh-token-moi"
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Token het han." }), {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(refreshedAuthSession), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }));

    global.fetch = fetchMock as typeof fetch;

    await expect(
      requestApi<{ ok: boolean }>("/api/me/profile", {
        accessToken: "access-token-cu",
        method: "GET",
        showErrorToast: false
      })
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retriedHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Headers;
    expect(retriedHeaders.get("Authorization")).toBe("Bearer access-token-moi");
  });
});
