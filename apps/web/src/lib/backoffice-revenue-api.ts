import type {
  ApiBackofficeRevenueBucket,
  ApiBackofficeRevenueDashboard,
  ApiBackofficeRevenueGranularity
} from "@qlvmb/shared-types";

import { ApiClientError, requestApi } from "@/lib/api-client";

export type BackofficeRevenueGranularity = ApiBackofficeRevenueGranularity;
export type BackofficeRevenueBucket = ApiBackofficeRevenueBucket;
export type BackofficeRevenueDashboard = ApiBackofficeRevenueDashboard;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isRevenueBucket(value: unknown): value is BackofficeRevenueBucket {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    typeof value.paidAmount === "number" &&
    typeof value.refundedAmount === "number" &&
    typeof value.netRevenue === "number" &&
    typeof value.soldTicketCount === "number" &&
    typeof value.refundedTicketCount === "number"
  );
}

function isRevenueDashboard(value: unknown): value is BackofficeRevenueDashboard {
  if (!isObject(value)) {
    return false;
  }

  return (
    (value.granularity === "day" || value.granularity === "month") &&
    typeof value.periodLabel === "string" &&
    typeof value.generatedAt === "string" &&
    typeof value.totalRevenue === "number" &&
    typeof value.paidAmount === "number" &&
    typeof value.refundedAmount === "number" &&
    typeof value.soldTicketCount === "number" &&
    typeof value.refundedTicketCount === "number" &&
    Array.isArray(value.buckets) &&
    value.buckets.every(isRevenueBucket)
  );
}

export async function fetchBackofficeRevenueDashboard(
  accessToken: string,
  granularity: BackofficeRevenueGranularity,
  period?: string
): Promise<BackofficeRevenueDashboard> {
  const searchParams = new URLSearchParams({ granularity });
  if (granularity === "day" && period) {
    searchParams.set("period", period);
  }

  const payload = await requestApi<unknown>(
    `/api/backoffice/operations/revenue?${searchParams.toString()}`,
    {
      accessToken,
      fallbackMessage: "Không thể tải dashboard doanh thu lúc này."
    }
  );

  if (!isRevenueDashboard(payload)) {
    throw new ApiClientError("Dữ liệu dashboard doanh thu trả về không hợp lệ.", 500);
  }

  return payload;
}
