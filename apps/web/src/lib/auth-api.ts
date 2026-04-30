import type { AuthSession } from "@/lib/auth-session";

interface ApiErrorResponse {
  status?: number;
  message?: string;
  errors?: Record<string, string>;
  timestamp?: string;
}

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

export class AuthApiError extends Error {
  status: number;
  errors: Record<string, string>;

  constructor(message: string, status: number, errors: Record<string, string> = {}) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.errors = errors;
  }
}

function sanitizeApiErrors(errors: unknown): Record<string, string> {
  if (!errors || typeof errors !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(errors).filter(
      ([fieldName, fieldMessage]) =>
        typeof fieldName === "string" && typeof fieldMessage === "string"
    )
  );
}

export function getAuthApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return "http://localhost:8080";
  }

  return configuredBaseUrl.replace(/\/+$/, "");
}

async function buildAuthApiError(response: Response): Promise<AuthApiError> {
  let apiError: ApiErrorResponse | null = null;

  try {
    apiError = (await response.json()) as ApiErrorResponse;
  } catch {
    apiError = null;
  }

  const fallbackMessage =
    response.status >= 500
      ? "Hệ thống xác thực đang tạm thời gián đoạn."
      : "Không thể hoàn tất yêu cầu xác thực.";

  const message =
    typeof apiError?.message === "string" && apiError.message.trim()
      ? apiError.message
      : fallbackMessage;

  return new AuthApiError(message, response.status, sanitizeApiErrors(apiError?.errors));
}

async function postAuthJson<TResponse>(
  endpoint: string,
  payload: unknown
): Promise<TResponse> {
  let response: Response;

  try {
    response = await fetch(`${getAuthApiBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
  } catch {
    throw new AuthApiError("Không thể kết nối tới máy chủ xác thực.", 0);
  }

  if (!response.ok) {
    throw await buildAuthApiError(response);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export function loginWithPassword(
  payload: AuthLoginPayload
): Promise<AuthSession> {
  return postAuthJson<AuthSession>("/api/auth/login", payload);
}

export function registerAccount(
  payload: AuthRegisterPayload
): Promise<AuthSession> {
  return postAuthJson<AuthSession>("/api/auth/register", payload);
}

export function refreshAuthSession(refreshToken: string): Promise<AuthSession> {
  return postAuthJson<AuthSession>("/api/auth/refresh", { refreshToken });
}

export function logoutAuthSession(refreshToken: string): Promise<void> {
  return postAuthJson<void>("/api/auth/logout", { refreshToken });
}

export function requestForgotPasswordOtp(
  email: string
): Promise<ForgotPasswordOtpResponse> {
  return postAuthJson<ForgotPasswordOtpResponse>("/api/auth/forgot-password/request-otp", {
    email
  });
}

export function verifyForgotPasswordOtp(
  email: string,
  otp: string
): Promise<ForgotPasswordOtpVerifyResponse> {
  return postAuthJson<ForgotPasswordOtpVerifyResponse>("/api/auth/forgot-password/verify-otp", {
    email,
    otp
  });
}

export function resetForgottenPassword(
  email: string,
  otp: string,
  newPassword: string
): Promise<void> {
  return postAuthJson<void>("/api/auth/reset-password", {
    email,
    otp,
    newPassword
  });
}

export function resolveAuthErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (error instanceof AuthApiError) {
    const firstFieldError = Object.values(error.errors)[0];
    return firstFieldError ?? error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}
