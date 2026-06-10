import type { AuthSession } from "@/lib/auth-session";
import {
  ApiClientError,
  requestApi,
  resolveApiClientErrorMessage
} from "@/lib/api-client";

export interface AuthLoginPayload {
  email: string;
  password: string;
}

export interface AuthRegisterPayload {
  displayName: string;
  email: string;
  phone: string;
  password: string;
}

export interface ForgotPasswordOtpResponse {
  status: string;
  message: string;
}

export interface ForgotPasswordOtpVerifyResponse {
  verified: boolean;
  message: string;
}

export class AuthApiError extends ApiClientError {
  constructor(
    message: string,
    status: number,
    errors: Record<string, string> = {},
    timestamp: string | null = null
  ) {
    super(message, status, errors, timestamp);
    this.name = "AuthApiError";
  }
}

function toAuthApiError(error: unknown): never {
  if (error instanceof ApiClientError) {
    throw new AuthApiError(error.message, error.status, error.errors, error.timestamp);
  }

  throw error;
}

async function postAuthJson<TResponse>(
  endpoint: string,
  payload: unknown,
  fallbackMessage: string
): Promise<TResponse> {
  try {
    return await requestApi<TResponse>(endpoint, {
      fallbackMessage,
      json: payload,
      method: "POST"
    });
  } catch (error) {
    return toAuthApiError(error);
  }
}

export function getAuthApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim()?.replace(/\/+$/, "") ?? "http://localhost:8080";
}

export function loginWithPassword(
  payload: AuthLoginPayload
): Promise<AuthSession> {
  return postAuthJson<AuthSession>(
    "/api/auth/login",
    payload,
    "Không thể hoàn tất yêu cầu xác thực."
  );
}

export function registerAccount(
  payload: AuthRegisterPayload
): Promise<AuthSession> {
  return postAuthJson<AuthSession>(
    "/api/auth/register",
    payload,
    "Không thể hoàn tất yêu cầu xác thực."
  );
}

export function refreshAuthSession(refreshToken: string): Promise<AuthSession> {
  return postAuthJson<AuthSession>(
    "/api/auth/refresh",
    { refreshToken },
    "Không thể hoàn tất yêu cầu xác thực."
  );
}

export function logoutAuthSession(refreshToken: string): Promise<void> {
  return postAuthJson<void>(
    "/api/auth/logout",
    { refreshToken },
    "Không thể hoàn tất yêu cầu đăng xuất."
  );
}

export function buildGoogleOAuthLoginUrl(redirectTo?: string | null): string {
  const searchParams = new URLSearchParams();
  const safeRedirectTo = redirectTo?.trim();
  if (safeRedirectTo && safeRedirectTo.startsWith("/") && !safeRedirectTo.startsWith("//")) {
    searchParams.set("redirectTo", safeRedirectTo);
  }

  const queryString = searchParams.toString();
  return `${getAuthApiBaseUrl()}/api/auth/oauth/google/start${queryString ? `?${queryString}` : ""}`;
}

export function exchangeOAuthCode(code: string): Promise<AuthSession> {
  return postAuthJson<AuthSession>(
    "/api/auth/oauth/exchange",
    { code },
    "Không thể hoàn tất đăng nhập Google."
  );
}

export function requestForgotPasswordOtp(
  email: string
): Promise<ForgotPasswordOtpResponse> {
  return postAuthJson<ForgotPasswordOtpResponse>(
    "/api/auth/forgot-password/request-otp",
    { email },
    "Không thể gửi mã OTP lúc này."
  );
}

export function verifyForgotPasswordOtp(
  email: string,
  otp: string
): Promise<ForgotPasswordOtpVerifyResponse> {
  return postAuthJson<ForgotPasswordOtpVerifyResponse>(
    "/api/auth/forgot-password/verify-otp",
    {
      email,
      otp
    },
    "Không thể xác minh mã OTP lúc này."
  );
}

export function resetForgottenPassword(
  email: string,
  otp: string,
  newPassword: string
): Promise<void> {
  return postAuthJson<void>(
    "/api/auth/reset-password",
    {
      email,
      newPassword,
      otp
    },
    "Không thể đặt lại mật khẩu lúc này."
  );
}

export function resolveAuthErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  return resolveApiClientErrorMessage(error, fallbackMessage);
}
