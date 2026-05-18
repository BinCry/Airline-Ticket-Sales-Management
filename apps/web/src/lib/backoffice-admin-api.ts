import { ApiClientError, requestApi } from "@/lib/api-client";
import { isLegacySeedEmail, presentUserDisplayName } from "@/lib/present-user-label";

export interface BackofficeAdminMetric {
  label: string;
  value: string;
  trend: string;
}

export interface BackofficeAdminModuleCard {
  key: string;
  title: string;
  summary: string;
  roles: string[];
}

export interface BackofficeAdminAuditCard {
  id: number;
  actor: string;
  action: string;
  target: string;
  time: string;
}

export interface BackofficeAdminDashboard {
  metrics: BackofficeAdminMetric[];
  modules: BackofficeAdminModuleCard[];
  auditTrail: BackofficeAdminAuditCard[];
}

export interface BackofficeAdminUser {
  id: number;
  email: string;
  displayName: string;
  phone: string | null;
  status: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  lockedAt: string | null;
  lastLoginAt: string | null;
  roles: string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isMetric(value: unknown): value is BackofficeAdminMetric {
  return (
    isObject(value) &&
    typeof value.label === "string" &&
    typeof value.value === "string" &&
    typeof value.trend === "string"
  );
}

function isModuleCard(value: unknown): value is BackofficeAdminModuleCard {
  return (
    isObject(value) &&
    typeof value.key === "string" &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    isStringArray(value.roles)
  );
}

function isAuditCard(value: unknown): value is BackofficeAdminAuditCard {
  return (
    isObject(value) &&
    typeof value.id === "number" &&
    typeof value.actor === "string" &&
    typeof value.action === "string" &&
    typeof value.target === "string" &&
    typeof value.time === "string"
  );
}

function isAdminDashboard(value: unknown): value is BackofficeAdminDashboard {
  return (
    isObject(value) &&
    Array.isArray(value.metrics) &&
    value.metrics.every(isMetric) &&
    Array.isArray(value.modules) &&
    value.modules.every(isModuleCard) &&
    Array.isArray(value.auditTrail) &&
    value.auditTrail.every(isAuditCard)
  );
}

function isAdminUser(value: unknown): value is BackofficeAdminUser {
  return (
    isObject(value) &&
    typeof value.id === "number" &&
    typeof value.email === "string" &&
    typeof value.displayName === "string" &&
    (value.phone === null || typeof value.phone === "string") &&
    typeof value.status === "string" &&
    typeof value.emailVerified === "boolean" &&
    (value.avatarUrl === null || typeof value.avatarUrl === "string") &&
    (value.lockedAt === null || typeof value.lockedAt === "string") &&
    (value.lastLoginAt === null || typeof value.lastLoginAt === "string") &&
    isStringArray(value.roles)
  );
}

export async function fetchBackofficeDashboard(
  accessToken: string
): Promise<BackofficeAdminDashboard> {
  const payload = await requestApi<unknown>("/api/admin/dashboard", {
    accessToken,
    fallbackMessage: "Không thể tải số liệu quản trị lúc này."
  });

  if (!isAdminDashboard(payload)) {
    throw new ApiClientError("Dữ liệu dashboard quản trị trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function fetchBackofficeUsers(
  accessToken: string
): Promise<BackofficeAdminUser[]> {
  const payload = await requestApi<unknown>("/api/admin/users", {
    accessToken,
    fallbackMessage: "Không thể tải danh sách tài khoản nội bộ lúc này."
  });

  if (!Array.isArray(payload) || !payload.every(isAdminUser)) {
    throw new ApiClientError("Dữ liệu tài khoản nội bộ trả về không hợp lệ.", 500);
  }

  return payload
    .filter((user) => !isLegacySeedEmail(user.email))
    .map((user) => ({
      ...user,
      displayName: presentUserDisplayName(user.displayName)
    }));
}

export async function updateBackofficeUserRoles(
  userId: number,
  roles: string[],
  accessToken: string
): Promise<BackofficeAdminUser> {
  const payload = await requestApi<unknown>(`/api/admin/users/${userId}/roles`, {
    accessToken,
    method: "PATCH",
    json: { roles },
    fallbackMessage: "Không thể cập nhật vai trò người dùng lúc này."
  });

  if (!isAdminUser(payload)) {
    throw new ApiClientError("Dữ liệu tài khoản nội bộ trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function updateBackofficeUserStatus(
  userId: number,
  status: string,
  accessToken: string
): Promise<BackofficeAdminUser> {
  const payload = await requestApi<unknown>(`/api/admin/users/${userId}/status`, {
    accessToken,
    method: "PATCH",
    json: { status },
    fallbackMessage: "Không thể cập nhật trạng thái tài khoản lúc này."
  });

  if (!isAdminUser(payload)) {
    throw new ApiClientError("Dữ liệu tài khoản nội bộ trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function deleteBackofficeAuditLog(
  auditLogId: number,
  accessToken: string
): Promise<void> {
  await requestApi<void>(`/api/admin/audit-logs/${auditLogId}`, {
    accessToken,
    method: "DELETE",
    fallbackMessage: "Không thể xóa nhật ký thao tác lúc này."
  });
}
