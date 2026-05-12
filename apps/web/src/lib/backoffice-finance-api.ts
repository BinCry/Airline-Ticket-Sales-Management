import type { ApiBackofficeRefundItem } from "@qlvmb/shared-types";

import { ApiClientError, requestApi } from "@/lib/api-client";

export type BackofficeRefundItem = ApiBackofficeRefundItem;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isBackofficeRefundItem(value: unknown): value is BackofficeRefundItem {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.bookingCode === "string" &&
    typeof value.bookingStatus === "string" &&
    typeof value.contactName === "string" &&
    typeof value.reason === "string" &&
    typeof value.refundAmount === "number" &&
    typeof value.status === "string" &&
    typeof value.createdAt === "string"
  );
}

export async function fetchBackofficeRefunds(accessToken: string): Promise<BackofficeRefundItem[]> {
  const payload = await requestApi<unknown>("/api/backoffice/finance/refunds", {
    accessToken,
    fallbackMessage: "Không thể tải danh sách yêu cầu hoàn vé lúc này."
  });

  if (!Array.isArray(payload) || !payload.every(isBackofficeRefundItem)) {
    throw new ApiClientError("Dữ liệu yêu cầu hoàn vé trả về không hợp lệ.", 500);
  }

  return payload;
}

async function mutateRefund(
  refundRequestId: number,
  endpoint: "approve" | "reject",
  accessToken: string
): Promise<BackofficeRefundItem> {
  const payload = await requestApi<unknown>(
    `/api/backoffice/finance/refunds/${refundRequestId}/${endpoint}`,
    {
      accessToken,
      fallbackMessage:
        endpoint === "approve"
          ? "Không thể duyệt hoàn tiền lúc này."
          : "Không thể từ chối yêu cầu hoàn vé lúc này.",
      method: "POST"
    }
  );

  if (!isBackofficeRefundItem(payload)) {
    throw new ApiClientError("Dữ liệu yêu cầu hoàn vé trả về không hợp lệ.", 500);
  }

  return payload;
}

export function approveBackofficeRefund(
  refundRequestId: number,
  accessToken: string
): Promise<BackofficeRefundItem> {
  return mutateRefund(refundRequestId, "approve", accessToken);
}

export function rejectBackofficeRefund(
  refundRequestId: number,
  accessToken: string
): Promise<BackofficeRefundItem> {
  return mutateRefund(refundRequestId, "reject", accessToken);
}
