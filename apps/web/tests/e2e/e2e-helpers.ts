import type { Page } from "@playwright/test";

const AUTH_SESSION_STORAGE_KEY = "qlvmb.auth.session";

type SeedAuthSessionOptions = {
  roles: string[];
  permissions: string[];
  userId?: number;
  email?: string;
  displayName?: string;
  phone?: string | null;
};

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function createAccessToken(roles: string[], permissions: string[]) {
  const header = encodeBase64Url(JSON.stringify({
    alg: "none",
    typ: "JWT"
  }));
  const payload = encodeBase64Url(JSON.stringify({
    type: "access",
    exp: Math.floor(Date.now() / 1000) + 60 * 30,
    roles,
    permissions
  }));
  return `${header}.${payload}.signature`;
}

export function jsonResponse(payload: unknown, status = 200) {
  return {
    status,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  };
}

export async function seedAuthSession(page: Page, options: SeedAuthSessionOptions) {
  const accessToken = createAccessToken(options.roles, options.permissions);
  const authSession = {
    accessToken,
    refreshToken: "refresh-token",
    tokenType: "Bearer",
    accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    user: {
      id: options.userId ?? 1,
      email: options.email ?? "staff@vietnam-airlines.vn",
      displayName: options.displayName ?? "Nhân viên backoffice",
      phone: options.phone ?? "0900000001",
      avatarUrl: null,
      emailVerified: true,
      roles: options.roles,
      permissions: options.permissions
    }
  };

  await page.addInitScript(
    ({ serializedSession, storageKey }) => {
      window.localStorage.setItem(storageKey, serializedSession);
    },
    {
      serializedSession: JSON.stringify(authSession),
      storageKey: AUTH_SESSION_STORAGE_KEY
    }
  );

  await page.context().addCookies([
    {
      name: "qlvmb.access_token",
      value: accessToken,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 30
    }
  ]);

  return authSession;
}

export function taoThoiDiemTuongLai(soPhutCong: number) {
  return new Date(Date.now() + soPhutCong * 60 * 1000).toISOString();
}
