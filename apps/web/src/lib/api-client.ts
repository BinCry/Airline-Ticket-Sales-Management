import { pushToast, type ToastTone } from "@/lib/toast";
import {
  clearStoredAuthSession,
  isAuthSessionExpired,
  loadStoredAuthSession,
  parseAuthSession,
  persistAuthSession,
  readAuthSessionFromStorage,
  resolveAuthSessionStores,
  type AuthSession,
  type AuthSessionStores
} from "@/lib/auth-session";

export interface ApiErrorResponse {
  errors?: Record<string, string>;
  message?: string;
  status?: number;
  timestamp?: string;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  accessToken?: string;
  fallbackMessage?: string;
  formData?: FormData;
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

let refreshSessionPromise: Promise<AuthSession | null> | null = null;

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

function resolveStoredAuthSessionSource(stores: AuthSessionStores = resolveAuthSessionStores()) {
  const localAuthSession = readAuthSessionFromStorage(stores.localStorage);

  if (localAuthSession) {
    return {
      authSession: localAuthSession,
      shouldRemember: true,
      stores
    };
  }

  const sessionAuthSession = readAuthSessionFromStorage(stores.sessionStorage);

  if (!sessionAuthSession) {
    return null;
  }

  return {
    authSession: sessionAuthSession,
    shouldRemember: false,
    stores
  };
}

async function refreshStoredAuthSession(): Promise<AuthSession | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  refreshSessionPromise = (async () => {
    const storedSource = resolveStoredAuthSessionSource();

    if (!storedSource) {
      return null;
    }

    let response: Response;
    try {
      response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
        body: JSON.stringify({
          refreshToken: storedSource.authSession.refreshToken
        }),
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        method: "POST"
      });
    } catch {
      return null;
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearStoredAuthSession(storedSource.stores);
      }

      return null;
    }

    let responsePayload: unknown;
    try {
      responsePayload = await response.json();
    } catch {
      clearStoredAuthSession(storedSource.stores);
      return null;
    }

    const refreshedAuthSession = parseAuthSession(JSON.stringify(responsePayload));

    if (!refreshedAuthSession) {
      clearStoredAuthSession(storedSource.stores);
      return null;
    }

    persistAuthSession(
      refreshedAuthSession,
      storedSource.shouldRemember,
      storedSource.stores
    );
    return refreshedAuthSession;
  })();

  try {
    return await refreshSessionPromise;
  } finally {
    refreshSessionPromise = null;
  }
}

async function resolveRequestAccessToken(accessToken: string | undefined): Promise<string | undefined> {
  if (!accessToken || typeof window === "undefined") {
    return accessToken;
  }

  const storedAuthSession = loadStoredAuthSession();

  if (!storedAuthSession) {
    return accessToken;
  }

  if (isAuthSessionExpired(storedAuthSession)) {
    return (await refreshStoredAuthSession())?.accessToken ?? accessToken;
  }

  return storedAuthSession.accessToken;
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
    formData,
    headers,
    json,
    showErrorToast,
    ...requestInit
  } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  let body: BodyInit | undefined;
  if (json !== undefined && formData !== undefined) {
    throw new ApiClientError("Chỉ được gửi một loại nội dung trong mỗi yêu cầu.", 0);
  }

  if (json !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }

  if (formData !== undefined) {
    body = formData;
  }

  const resolvedAccessToken = await resolveRequestAccessToken(accessToken);

  if (resolvedAccessToken) {
    requestHeaders.set("Authorization", `Bearer ${resolvedAccessToken}`);
  }

  let response: Response;

  const executeRequest = () => fetch(`${getApiBaseUrl()}${endpoint}`, {
    ...requestInit,
    body,
    cache: requestInit.cache ?? "no-store",
    headers: requestHeaders
  });

  try {
    response = await executeRequest();
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

  if (!response.ok && response.status === 401 && accessToken) {
    const refreshedAuthSession = await refreshStoredAuthSession();

    if (refreshedAuthSession && refreshedAuthSession.accessToken !== resolvedAccessToken) {
      requestHeaders.set("Authorization", `Bearer ${refreshedAuthSession.accessToken}`);

      try {
        response = await executeRequest();
      } catch {
        const error = new ApiClientError("Không thể kết nối tới máy chủ dịch vụ.", 0);
        if (shouldShowToast(showErrorToast)) {
          pushToast({
            message: error.message,
            tone: "danger",
            title: "Káº¿t ná»‘i tháº¥t báº¡i"
          });
        }
        throw error;
      }
    }
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
