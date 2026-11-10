import { ApiClientError, getApiBaseUrl, refreshStoredAuthSession, requestApi } from "@/lib/api-client";
import {
  AUTH_SESSION_REFRESH_WINDOW_MS, loadActiveAuthSession, willAuthSessionExpireWithin
} from "@/lib/auth-session";
import { buildAuditLogSearchParams, validateAuditLogFilters, type AuditLogFilters } from "@/lib/audit-log-filters";

export interface AuditLogItem {
  id: number;
  actorId: number | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string;
  hidden: boolean;
}

export interface AuditLogPage {
  items: AuditLogItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuditLogCsvDownload {
  blob: Blob;
  filename: string;
  truncated: boolean;
  warning: string | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isInteger(value: unknown, minimum: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}

function isAuditLogItem(value: unknown): value is AuditLogItem {
  return isObject(value) && isInteger(value.id, 1)
    && (value.actorId === null || isInteger(value.actorId, 1))
    && (value.actorEmail === null || typeof value.actorEmail === "string")
    && (value.actorName === null || typeof value.actorName === "string")
    && ["action", "targetType", "targetId", "detail", "createdAt"].every((key) => typeof value[key] === "string")
    && typeof value.hidden === "boolean";
}

export function isAuditLogPage(value: unknown): value is AuditLogPage {
  return isObject(value) && Array.isArray(value.items) && value.items.every(isAuditLogItem)
    && isInteger(value.page, 0) && isInteger(value.size, 1) && (value.size as number) <= 100
    && isInteger(value.totalElements, 0) && isInteger(value.totalPages, 0);
}

export async function fetchAuditLogs(accessToken: string, filters: AuditLogFilters,
  page = 0, size = 20, signal?: AbortSignal): Promise<AuditLogPage> {
  const error = validateAuditLogFilters(filters);
  if (error) throw new ApiClientError(error, 400);
  if (!Number.isSafeInteger(page) || page < 0 || !Number.isSafeInteger(size) || size < 1 || size > 100) {
    throw new ApiClientError("Trang hoặc số dòng mỗi trang không hợp lệ.", 400);
  }
  const payload = await requestApi<unknown>(`/api/admin/audit-logs?${buildAuditLogSearchParams(filters, { page, size })}`, {
    accessToken, signal, showErrorToast: false, fallbackMessage: "Không thể tải nhật ký kiểm toán."
  });
  if (!isAuditLogPage(payload)) throw new ApiClientError("Dữ liệu nhật ký kiểm toán trả về không hợp lệ.", 502);
  return payload;
}

export async function fetchAuditLogActions(accessToken: string, signal?: AbortSignal): Promise<string[]> {
  const payload = await requestApi<unknown>("/api/admin/audit-logs/actions", {
    accessToken, signal, showErrorToast: false, fallbackMessage: "Không thể tải danh sách hành động."
  });
  if (!Array.isArray(payload) || !payload.every((action) => typeof action === "string")) {
    throw new ApiClientError("Danh sách hành động trả về không hợp lệ.", 502);
  }
  return [...new Set(payload)].sort();
}

export function readAuditCsvFilename(header: string | null, fallback: string) {
  let candidate = header?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (candidate) {
    try { candidate = decodeURIComponent(candidate); } catch { return fallback; }
  } else {
    candidate = header?.match(/filename\s*=\s*"([^"]+)"/i)?.[1]
      ?? header?.match(/filename\s*=\s*([^;]+)/i)?.[1];
  }
  const safe = candidate?.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "_").trim();
  return safe && safe.length <= 180 && !safe.startsWith(".") && /\.csv$/i.test(safe) ? safe : fallback;
}

async function csvError(response: Response) {
  let payload: unknown = null;
  if (response.headers.get("Content-Type")?.toLowerCase().includes("application/json")) {
    try { payload = await response.json(); } catch { /* Giữ lỗi HTTP nếu body không đọc được. */ }
  }
  return new ApiClientError(isObject(payload) && typeof payload.message === "string"
    ? payload.message : "Không thể tải tệp nhật ký kiểm toán.", response.status,
  isObject(payload) && isObject(payload.errors)
    ? Object.fromEntries(Object.entries(payload.errors).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {});
}

export async function downloadAuditLogCsv(accessToken: string, filters: AuditLogFilters,
  signal?: AbortSignal): Promise<AuditLogCsvDownload> {
  const error = validateAuditLogFilters(filters, true);
  if (error) throw new ApiClientError(error, 400);
  signal?.throwIfAborted();
  const stored = loadActiveAuthSession();
  let token = stored?.accessToken ?? accessToken;
  if (stored && !stored.user.permissions.includes("backoffice.admin")) {
    throw new ApiClientError("Bạn không có quyền xem nhật ký kiểm toán.", 403);
  }
  if (stored && willAuthSessionExpireWithin(stored, AUTH_SESSION_REFRESH_WINDOW_MS)) {
    const refreshed = await refreshStoredAuthSession();
    if (!refreshed) throw new ApiClientError("Phiên đăng nhập cần được xác thực lại.", 401);
    if (!refreshed.user.permissions.includes("backoffice.admin")) throw new ApiClientError("Bạn không có quyền xem nhật ký kiểm toán.", 403);
    token = refreshed.accessToken;
  }
  const url = `${getApiBaseUrl()}/api/admin/audit-logs/export?${buildAuditLogSearchParams(filters)}`;
  const execute = async () => {
    signal?.throwIfAborted();
    try {
      return await fetch(url, { headers: { Accept: "text/csv", Authorization: `Bearer ${token}` }, cache: "no-store", signal });
    } catch (failure) {
      if (signal?.aborted) throw failure;
      throw new ApiClientError("Không thể kết nối để tải CSV. Hãy thử lại khi mạng ổn định.", 0);
    }
  };
  let response = await execute();
  if (response.status === 401) {
    const refreshed = await refreshStoredAuthSession();
    if (refreshed) {
      if (!refreshed.user.permissions.includes("backoffice.admin")) throw new ApiClientError("Bạn không có quyền xem nhật ký kiểm toán.", 403);
      token = refreshed.accessToken;
      response = await execute();
    }
  }
  if (!response.ok) throw await csvError(response);
  if (response.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "text/csv") {
    throw new ApiClientError("Máy chủ không trả về tệp CSV hợp lệ; không tải nội dung lỗi.", 502);
  }
  let blob: Blob;
  try { blob = await response.blob(); } catch {
    throw new ApiClientError("Tệp CSV chưa được nhận đầy đủ. Vui lòng kiểm tra kết nối trước khi tải lại.", 0);
  }
  signal?.throwIfAborted();
  const truncatedHeader = response.headers.get("X-Export-Truncated");
  return {
    blob,
    filename: readAuditCsvFilename(response.headers.get("Content-Disposition"), `audit-logs-${filters.from}_${filters.to}.csv`),
    truncated: truncatedHeader === "true",
    warning: response.headers.get("X-Export-Warning")
      ?? (truncatedHeader !== "true" && truncatedHeader !== "false" ? "Không đọc được thông tin giới hạn CSV; hãy kiểm tra cấu hình CORS." : null)
  };
}

export function startAuditCsvDownload(file: AuditLogCsvDownload) {
  const url = URL.createObjectURL(file.blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); }
  } finally {
    // Thu hồi sau sự kiện click để trình duyệt có thể bắt đầu đọc Blob.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
