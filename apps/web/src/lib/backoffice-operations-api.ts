import { ApiClientError, requestApi } from "@/lib/api-client";
import { presentUserDisplayName } from "@/lib/present-user-label";

export interface BackofficeOperationsFlightQuery {
  code?: string;
  date?: string;
}

export interface BackofficeOperationsUpdateInput {
  status: string;
  gate: string | null;
  note: string | null;
  salesOpen: boolean;
}

export interface BackofficeFlightFareInventoryInput {
  fareFamily: string;
  totalSeats: number;
  price: number;
}

export interface BackofficeOperationsFlightCreateInput {
  code: string;
  originCode: string;
  destinationCode: string;
  departureAt: string;
  arrivalAt: string;
  gate: string;
  note: string;
  salesOpen: boolean;
  fareInventories: BackofficeFlightFareInventoryInput[];
}

export interface BackofficeOperationsFlightItem {
  flightId: number;
  code: string;
  from: string;
  to: string;
  originCode: string;
  destinationCode: string;
  departureAt: string;
  arrivalAt: string;
  status: string;
  statusLabel: string;
  gate: string;
  note: string;
  salesOpen: boolean;
}

export interface BackofficeOperationsFlightsResponse {
  queryCode: string | null;
  queryDate: string | null;
  flights: BackofficeOperationsFlightItem[];
}

export interface BackofficeVoucherQuery {
  email?: string;
  code?: string;
  status?: string | null;
}

export interface BackofficeVoucherCreateInput {
  memberEmail: string;
  voucherCode: string;
  title: string;
  description: string;
  discountAmount: number;
  currency: string;
  expiresAt: string;
}

export interface BackofficeVoucherUpdateInput {
  title: string;
  description: string;
  discountAmount: number;
  currency: string;
  status: string;
  expiresAt: string;
}

export interface BackofficeVoucherItem {
  voucherId: number;
  userId: number;
  memberEmail: string;
  memberDisplayName: string;
  voucherCode: string;
  title: string;
  description: string;
  discountAmount: number;
  currency: string;
  status: string;
  expiresAt: string;
  usedAt: string | null;
  bookingCode: string | null;
}

export interface BackofficeVoucherResponse {
  queryEmail: string | null;
  queryCode: string | null;
  queryStatus: string | null;
  vouchers: BackofficeVoucherItem[];
}

function laBanGhi(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function laChuoi(value: unknown): value is string {
  return typeof value === "string";
}

function laSo(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function laBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function laFlightItem(value: unknown): value is BackofficeOperationsFlightItem {
  return (
    laBanGhi(value) &&
    laSo(value.flightId) &&
    laChuoi(value.code) &&
    laChuoi(value.from) &&
    laChuoi(value.to) &&
    laChuoi(value.originCode) &&
    laChuoi(value.destinationCode) &&
    laChuoi(value.departureAt) &&
    laChuoi(value.arrivalAt) &&
    laChuoi(value.status) &&
    laChuoi(value.statusLabel) &&
    laChuoi(value.gate) &&
    laChuoi(value.note) &&
    laBoolean(value.salesOpen)
  );
}

function laDanhSachFlight(value: unknown): value is BackofficeOperationsFlightItem[] {
  return Array.isArray(value) && value.every(laFlightItem);
}

function laFlightResponse(value: unknown): value is BackofficeOperationsFlightsResponse {
  return (
    laBanGhi(value) &&
    (value.queryCode === null || laChuoi(value.queryCode)) &&
    (value.queryDate === null || laChuoi(value.queryDate)) &&
    laDanhSachFlight(value.flights)
  );
}

function laVoucherItem(value: unknown): value is BackofficeVoucherItem {
  return (
    laBanGhi(value) &&
    laSo(value.voucherId) &&
    laSo(value.userId) &&
    laChuoi(value.memberEmail) &&
    laChuoi(value.memberDisplayName) &&
    laChuoi(value.voucherCode) &&
    laChuoi(value.title) &&
    laChuoi(value.description) &&
    laSo(value.discountAmount) &&
    laChuoi(value.currency) &&
    laChuoi(value.status) &&
    laChuoi(value.expiresAt) &&
    (value.usedAt === null || laChuoi(value.usedAt)) &&
    (value.bookingCode === null || laChuoi(value.bookingCode))
  );
}

function laDanhSachVoucher(value: unknown): value is BackofficeVoucherItem[] {
  return Array.isArray(value) && value.every(laVoucherItem);
}

function laVoucherResponse(value: unknown): value is BackofficeVoucherResponse {
  return (
    laBanGhi(value) &&
    (value.queryEmail === null || laChuoi(value.queryEmail)) &&
    (value.queryCode === null || laChuoi(value.queryCode)) &&
    (value.queryStatus === null || laChuoi(value.queryStatus)) &&
    laDanhSachVoucher(value.vouchers)
  );
}

function chuanHoaVoucher(voucher: BackofficeVoucherItem): BackofficeVoucherItem {
  return {
    ...voucher,
    memberDisplayName: presentUserDisplayName(voucher.memberDisplayName)
  };
}

function taoQueryString(params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(params)) {
    const value = rawValue?.trim();
    if (value) {
      query.set(key, value);
    }
  }
  const normalizedQuery = query.toString();
  return normalizedQuery ? `?${normalizedQuery}` : "";
}

async function guiYeuCauVoucher(
  endpoint: string,
  accessToken: string,
  method: "POST" | "PATCH",
  payload: BackofficeVoucherCreateInput | BackofficeVoucherUpdateInput
): Promise<BackofficeVoucherItem> {
  const result = await requestApi<unknown>(endpoint, {
    accessToken,
    method,
    json: payload,
    fallbackMessage:
      method === "POST"
        ? "Không thể cấp voucher cho hội viên lúc này."
        : "Không thể cập nhật voucher vận hành lúc này."
  });

  if (!laVoucherItem(result)) {
    throw new ApiClientError("Dữ liệu voucher vận hành trả về không hợp lệ.", 500);
  }

  return chuanHoaVoucher(result);
}

export async function fetchBackofficeOperationsFlights(
  accessToken: string,
  query: BackofficeOperationsFlightQuery = {}
): Promise<BackofficeOperationsFlightsResponse> {
  const payload = await requestApi<unknown>(
    `/api/backoffice/operations/flights${taoQueryString({
      code: query.code ?? null,
      date: query.date ?? null
    })}`,
    {
      accessToken,
      fallbackMessage: "Không thể tải dữ liệu chuyến bay vận hành lúc này."
    }
  );

  if (!laFlightResponse(payload)) {
    throw new ApiClientError("Dữ liệu chuyến bay vận hành trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function createBackofficeOperationsFlight(
  payload: BackofficeOperationsFlightCreateInput,
  accessToken: string
): Promise<BackofficeOperationsFlightItem> {
  const result = await requestApi<unknown>("/api/backoffice/operations/flights", {
    accessToken,
    method: "POST",
    json: payload,
    fallbackMessage: "Không thể tạo chuyến bay mới lúc này."
  });

  if (!laFlightItem(result)) {
    throw new ApiClientError("Dữ liệu chuyến bay mới trả về không hợp lệ.", 500);
  }

  return result;
}

export async function updateBackofficeOperationsFlight(
  flightId: number,
  payload: BackofficeOperationsUpdateInput,
  accessToken: string
): Promise<BackofficeOperationsFlightItem> {
  const result = await requestApi<unknown>(`/api/backoffice/operations/flights/${flightId}`, {
    accessToken,
    method: "PATCH",
    json: payload,
    fallbackMessage: "Không thể cập nhật chuyến bay vận hành lúc này."
  });

  if (!laFlightItem(result)) {
    throw new ApiClientError("Dữ liệu chuyến bay vận hành trả về không hợp lệ.", 500);
  }

  return result;
}

export async function cancelBackofficeOperationsFlight(
  flightId: number,
  accessToken: string
): Promise<BackofficeOperationsFlightItem> {
  const result = await requestApi<unknown>(`/api/backoffice/operations/flights/${flightId}/cancel`, {
    accessToken,
    method: "POST",
    fallbackMessage: "Không thể hủy chuyến bay lúc này."
  });

  if (!laFlightItem(result)) {
    throw new ApiClientError("Dữ liệu chuyến bay sau khi hủy không hợp lệ.", 500);
  }

  return result;
}

export async function hideCancelledBackofficeOperationsFlight(
  flightId: number,
  accessToken: string
): Promise<void> {
  await requestApi<void>(`/api/backoffice/operations/flights/${flightId}`, {
    accessToken,
    method: "DELETE",
    fallbackMessage: "Không thể ẩn chuyến bay đã hủy khỏi giao diện lúc này."
  });
}

export async function fetchBackofficeOperationsVouchers(
  accessToken: string,
  query: BackofficeVoucherQuery = {}
): Promise<BackofficeVoucherResponse> {
  const payload = await requestApi<unknown>(
    `/api/backoffice/operations/vouchers${taoQueryString({
      email: query.email ?? null,
      code: query.code ?? null,
      status: query.status ?? null
    })}`,
    {
      accessToken,
      fallbackMessage: "Không thể tải danh sách voucher vận hành lúc này."
    }
  );

  if (!laVoucherResponse(payload)) {
    throw new ApiClientError("Dữ liệu voucher vận hành trả về không hợp lệ.", 500);
  }

  return {
    ...payload,
    vouchers: payload.vouchers.map(chuanHoaVoucher)
  };
}

export function createBackofficeOperationsVoucher(
  payload: BackofficeVoucherCreateInput,
  accessToken: string
): Promise<BackofficeVoucherItem> {
  return guiYeuCauVoucher("/api/backoffice/operations/vouchers", accessToken, "POST", payload);
}

export function updateBackofficeOperationsVoucher(
  voucherId: number,
  payload: BackofficeVoucherUpdateInput,
  accessToken: string
): Promise<BackofficeVoucherItem> {
  return guiYeuCauVoucher(
    `/api/backoffice/operations/vouchers/${voucherId}`,
    accessToken,
    "PATCH",
    payload
  );
}

export async function revokeBackofficeOperationsVoucher(
  voucherId: number,
  accessToken: string
): Promise<BackofficeVoucherItem> {
  const result = await requestApi<unknown>(`/api/backoffice/operations/vouchers/${voucherId}/revoke`, {
    accessToken,
    method: "POST",
    fallbackMessage: "Không thể thu hồi voucher vận hành lúc này."
  });

  if (!laVoucherItem(result)) {
    throw new ApiClientError("Dữ liệu voucher sau khi thu hồi không hợp lệ.", 500);
  }

  return chuanHoaVoucher(result);
}

export async function hideBackofficeOperationsVoucher(
  voucherId: number,
  accessToken: string
): Promise<void> {
  await requestApi<void>(`/api/backoffice/operations/vouchers/${voucherId}`, {
    accessToken,
    method: "DELETE",
    fallbackMessage: "Không thể ẩn voucher khỏi danh sách vận hành lúc này."
  });
}
