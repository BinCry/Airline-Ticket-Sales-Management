import type {
  ApiBookingHoldResponse,
  ApiCreateBookingHoldRequest,
  ApiManageBookingOverview
} from "@qlvmb/shared-types";

import { ApiClientError, requestApi } from "@/lib/api-client";

type SalesBookingQuery = {
  bookingCode?: string;
  email?: string;
  limit?: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isManageOverview(value: unknown): value is ApiManageBookingOverview {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.bookingCode === "string" &&
    typeof value.status === "string" &&
    typeof value.paymentStatus === "string" &&
    (value.holdExpiresAt === null || typeof value.holdExpiresAt === "string") &&
    (value.ticketedAt === null || typeof value.ticketedAt === "string") &&
    typeof value.tripType === "string" &&
    Array.isArray(value.steps) &&
    Array.isArray(value.segments) &&
    Array.isArray(value.passengers) &&
    Array.isArray(value.ancillaries) &&
    Array.isArray(value.seatSelections) &&
    Array.isArray(value.tickets) &&
    Array.isArray(value.boardingPasses) &&
    (value.refundRequest === null || isObject(value.refundRequest)) &&
    Array.isArray(value.paymentMethods) &&
    isStringArray(value.paymentMethods) &&
    isObject(value.priceSummary)
  );
}

function isManageOverviewList(value: unknown): value is ApiManageBookingOverview[] {
  return Array.isArray(value) && value.every(isManageOverview);
}

function isHoldResponse(value: unknown): value is ApiBookingHoldResponse {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.bookingCode === "string" &&
    typeof value.status === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.tripType === "string" &&
    isObject(value.contact) &&
    Array.isArray(value.passengers) &&
    Array.isArray(value.selectedSegments) &&
    Array.isArray(value.selectedAncillaries) &&
    isObject(value.priceSummary)
  );
}

function toQueryString(query: SalesBookingQuery) {
  const params = new URLSearchParams();
  if (query.bookingCode?.trim()) {
    params.set("bookingCode", query.bookingCode.trim().toUpperCase());
  }
  if (query.email?.trim()) {
    params.set("email", query.email.trim().toLowerCase());
  }
  if (typeof query.limit === "number" && Number.isFinite(query.limit)) {
    params.set("limit", String(query.limit));
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function fetchBackofficeSalesBookings(
  accessToken: string,
  query: SalesBookingQuery
): Promise<ApiManageBookingOverview[]> {
  const payload = await requestApi<unknown>(
    `/api/backoffice/sales/bookings${toQueryString(query)}`,
    {
      accessToken,
      fallbackMessage: "Không thể tải danh sách booking nội bộ lúc này."
    }
  );

  if (!isManageOverviewList(payload)) {
    throw new ApiClientError("Dữ liệu booking nội bộ trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function createBackofficeSalesBooking(
  accessToken: string,
  payload: ApiCreateBookingHoldRequest
): Promise<ApiBookingHoldResponse> {
  const result = await requestApi<unknown>("/api/backoffice/sales/bookings", {
    accessToken,
    method: "POST",
    json: payload,
    fallbackMessage: "Không thể tạo giữ chỗ hộ lúc này."
  });

  if (!isHoldResponse(result)) {
    throw new ApiClientError("Dữ liệu giữ chỗ hộ trả về không hợp lệ.", 500);
  }

  return result;
}

export async function issueBackofficeSalesTicket(
  accessToken: string,
  bookingCode: string
): Promise<ApiManageBookingOverview> {
  const payload = await requestApi<unknown>(
    `/api/backoffice/sales/bookings/${encodeURIComponent(bookingCode.trim().toUpperCase())}/issue-ticket`,
    {
      accessToken,
      method: "POST",
      fallbackMessage: "Không thể xuất vé hộ lúc này."
    }
  );

  if (!isManageOverview(payload)) {
    throw new ApiClientError("Dữ liệu xuất vé hộ trả về không hợp lệ.", 500);
  }

  return payload;
}
