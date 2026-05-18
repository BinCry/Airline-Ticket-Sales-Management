import { ApiClientError, requestApi } from "@/lib/api-client";

export interface BackofficeNotificationItem {
  id: number;
  type: string;
  bookingCode: string | null;
  recipientEmail: string;
  subject: string;
  status: string;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isNotificationItem(value: unknown): value is BackofficeNotificationItem {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.type === "string" &&
    (value.bookingCode === null || typeof value.bookingCode === "string") &&
    typeof value.recipientEmail === "string" &&
    typeof value.subject === "string" &&
    typeof value.status === "string" &&
    typeof value.retryCount === "number" &&
    (value.lastError === null || typeof value.lastError === "string") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.sentAt === null || typeof value.sentAt === "string")
  );
}

export async function fetchBackofficeNotifications(
  accessToken: string
): Promise<BackofficeNotificationItem[]> {
  const payload = await requestApi<unknown>("/api/backoffice/support/notifications", {
    accessToken,
    fallbackMessage: "Không thể tải danh sách email vé lúc này."
  });

  if (!Array.isArray(payload) || !payload.every(isNotificationItem)) {
    throw new ApiClientError("Dữ liệu email vé trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function retryBackofficeNotification(
  notificationId: number,
  accessToken: string
): Promise<BackofficeNotificationItem> {
  const payload = await requestApi<unknown>(
    `/api/backoffice/support/notifications/${notificationId}/retry`,
    {
      accessToken,
      method: "POST",
      fallbackMessage: "Không thể gửi lại email vé lúc này."
    }
  );

  if (!isNotificationItem(payload)) {
    throw new ApiClientError("Dữ liệu email vé trả về không hợp lệ.", 500);
  }

  return payload;
}
