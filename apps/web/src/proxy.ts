import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  canAccessBackofficeModule,
  hasAnyBackofficeAccess,
  isBackofficeModuleKey,
  sanitizeUserRoles
} from "@/lib/access-control";
import { parseJwtPayload, readJwtExpirationSeconds, readJwtStringArray } from "@/lib/jwt";

const ACCESS_TOKEN_COOKIE = "qlvmb.access_token";

function buildLoginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("redirectTo", currentPath);
  return NextResponse.redirect(loginUrl);
}

function buildHomeRedirect(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/", request.url));
}

function buildAccountRedirect(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/account", request.url));
}

function buildBackofficeRedirect(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/backoffice", request.url));
}

function sanitizeRedirectTarget(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  if (trimmed.startsWith("/login") || trimmed.startsWith("/register")) {
    return null;
  }

  return trimmed;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? "";

  if (isAuthPage && !token) {
    return NextResponse.next();
  }

  if (!token) {
    return isAuthPage ? NextResponse.next() : buildLoginRedirect(request);
  }

  let decodedToken = "";
  try {
    decodedToken = decodeURIComponent(token);
  } catch {
    decodedToken = token;
  }

  const payload = parseJwtPayload(decodedToken);
  if (!payload || payload.type !== "access") {
    if (isAuthPage) {
      return NextResponse.next();
    }
    return buildLoginRedirect(request);
  }

  const exp = readJwtExpirationSeconds(payload);
  if (exp !== null) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (exp <= nowSeconds) {
      if (isAuthPage) {
        return NextResponse.next();
      }
      return buildLoginRedirect(request);
    }
  }

  if (isAuthPage) {
    const redirectTo = sanitizeRedirectTarget(request.nextUrl.searchParams.get("redirectTo"));
    return NextResponse.redirect(new URL(redirectTo ?? "/account", request.url));
  }

  if (!pathname.startsWith("/backoffice")) {
    return NextResponse.next();
  }

  const roles = sanitizeUserRoles(readJwtStringArray(payload, "roles"));
  const permissions = sanitizeUserRoles(readJwtStringArray(payload, "permissions"));

  if (!hasAnyBackofficeAccess(permissions)) {
    return roles.length > 0 ? buildAccountRedirect(request) : buildHomeRedirect(request);
  }

  const moduleKey = pathname.split("/")[2]?.trim() ?? "";
  if (!moduleKey) {
    return NextResponse.next();
  }

  if (!isBackofficeModuleKey(moduleKey)) {
    return NextResponse.next();
  }

  if (canAccessBackofficeModule(permissions, moduleKey)) {
    return NextResponse.next();
  }

  return buildBackofficeRedirect(request);
}

export const config = {
  matcher: ["/account/:path*", "/backoffice/:path*", "/login", "/register"]
};
