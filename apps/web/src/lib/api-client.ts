import { pushToast, type ToastTone } from "@/lib/toast";

export interface ApiErrorResponse {
  errors?: Record<string, string>;
  message?: string;
  status?: number;
  timestamp?: string;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  accessToken?: string;
  fallbackMessage?: string;
  json?: unknown;
  showErrorToast?: boolean;
}

export class ApiClientError extends Error {
  errors: Record<string, string>;
  status: number;
  timestamp: string | null;

  constructor(
      message: string,
      status: number,
      errors: Record<string, string> = {},
      timestamp: string | null = null
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = errors;
    this.timestamp = timestamp;
  }
}

function sanitizeApiErrors(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([fieldName, fieldMessage]) =>
        typeof fieldName === "string" && typeof fieldMessage === "string"
    )
  );
}

export function getApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return "http://localhost:8080";
  }

  return configuredBaseUrl.replace(/\/+$/, "");
}

export function resolveApiClientErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  if (error instanceof ApiClientError) {
    const firstFieldError = Object.values(error.errors)[0];
    return firstFieldError ?? error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

function resolveToastTone(status: number): ToastTone {
  if (status >= 500) {
    return "danger";
  }

  if (status === 401 || status === 403) {
    return "warning";
  }

  if (status >= 400) {
    return "info";
  }

  return "success";
}

function shouldShowToast(showErrorToast: boolean | undefined) {
  if (typeof window === "undefined") {
    return false;
  }

  return showErrorToast ?? true;
}

async function readJsonSafely(response: Response): Promise<unknown> {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function buildApiClientError(
  response: Response,
  fallbackMessage: string
): Promise<ApiClientError> {
  const payload = (await readJsonSafely(response)) as ApiErrorResponse | null;
  const message =
    typeof payload?.message === "string" && payload.message.trim()
      ? payload.message
      : fallbackMessage;

  return new ApiClientError(
    message,
    response.status,
    sanitizeApiErrors(payload?.errors),
    typeof payload?.timestamp === "string" ? payload.timestamp : null
  );
}

export async function requestApi<TResponse>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const {
    accessToken,
    fallbackMessage = "Không thể hoàn tất yêu cầu lúc này.",
    headers,
    json,
    showErrorToast,
    ...requestInit
  } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  let body: BodyInit | undefined;
  if (json !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...requestInit,
      body,
      cache: requestInit.cache ?? "no-store",
      headers: requestHeaders
    });
  } catch {
    const error = new ApiClientError("Không thể kết nối tới máy chủ dịch vụ.", 0);
    if (shouldShowToast(showErrorToast)) {
      pushToast({
        message: error.message,
        tone: "danger",
        title: "Kết nối thất bại"
      });
    }
    throw error;
  }

  if (!response.ok) {
    const error = await buildApiClientError(response, fallbackMessage);
    if (shouldShowToast(showErrorToast)) {
      pushToast({
        message: resolveApiClientErrorMessage(error, fallbackMessage),
        tone: resolveToastTone(error.status),
        title: error.status >= 500 ? "Hệ thống gặp sự cố" : "Không thể xử lý yêu cầu"
      });
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}
