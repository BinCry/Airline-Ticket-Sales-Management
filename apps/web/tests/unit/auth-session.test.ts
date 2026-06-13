import { describe, expect, it } from "vitest";

import {
  AUTH_SESSION_STORAGE_KEY,
  loadActiveAuthSession,
  parseAuthSession,
  persistAuthSession,
  type AuthSession,
  type AuthSessionStores
} from "@/lib/auth-session";

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

function createStores(): AuthSessionStores {
  return {
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage()
  };
}

function createAuthSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: "access-token",
    refreshToken: "refresh-token",
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

describe("auth-session", () => {
  it("luu phien vao localStorage khi ghi nho thiet bi", () => {
    const stores = createStores();
    const authSession = createAuthSession();

    persistAuthSession(authSession, true, stores);

    expect(stores.localStorage?.getItem(AUTH_SESSION_STORAGE_KEY)).not.toBeNull();
    expect(stores.sessionStorage?.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(loadActiveAuthSession(stores)).toEqual(authSession);
  });

  it("luu phien vao sessionStorage khi khong ghi nho thiet bi", () => {
    const stores = createStores();
    const authSession = createAuthSession();

    persistAuthSession(authSession, false, stores);

    expect(stores.localStorage?.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(stores.sessionStorage?.getItem(AUTH_SESSION_STORAGE_KEY)).not.toBeNull();
    expect(loadActiveAuthSession(stores)).toEqual(authSession);
  });

  it("giu phien het han de co the lam moi bang refresh token", () => {
    const stores = createStores();
    const authSession = createAuthSession({
      accessTokenExpiresAt: "2000-01-01T00:00:00Z"
    });

    persistAuthSession(authSession, true, stores);

    expect(loadActiveAuthSession(stores)).toEqual(authSession);
    expect(stores.localStorage?.getItem(AUTH_SESSION_STORAGE_KEY)).not.toBeNull();
  });

  it("bo qua du lieu phien khong hop le", () => {
    expect(parseAuthSession("{khong-hop-le")).toBeNull();
  });
});
