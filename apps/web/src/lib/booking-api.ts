import type {
  ApiApplyVoucherRequest,
  ApiBoardingPass,
  ApiBookingHoldResponse,
  ApiCheckinCompleteRequest,
  ApiCheckinCompleteResponse,
  ApiCreateBookingHoldRequest,
  ApiFlightBookingOptionsResponse,
  ApiManageBookingOverview,
  ApiPaymentCallbackRequest,
  ApiPaymentSessionResponse,
  ApiRefundRequest
} from "@qlvmb/shared-types";

import { ApiClientError, requestApi } from "@/lib/api-client";

const BOOKING_LOOKUP_TOKEN_HEADER = "X-Booking-Lookup-Token";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isBoardingPass(value: unknown): value is ApiBoardingPass {
  if (!isObject(value)) {
    return false;
  }

  return (
    (value.inventoryId === undefined || typeof value.inventoryId === "number") &&
    typeof value.ticketNumber === "string" &&
    typeof value.passengerName === "string" &&
    typeof value.seatNumber === "string" &&
    typeof value.gate === "string" &&
    typeof value.boardingTime === "string" &&
    typeof value.barcode === "string"
  );
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

function isPaymentSessionResponse(value: unknown): value is ApiPaymentSessionResponse {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.bookingCode === "string" &&
    typeof value.provider === "string" &&
    typeof value.sessionMode === "string" &&
    (value.paymentUrl === null || typeof value.paymentUrl === "string") &&
    typeof value.paymentStatus === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.referenceCode === "string" &&
    typeof value.amount === "number" &&
    (value.bankName === null || typeof value.bankName === "string") &&
    (value.accountNumber === null || typeof value.accountNumber === "string") &&
    (value.accountHolderName === null || typeof value.accountHolderName === "string") &&
    (value.qrCodeUrl === null || typeof value.qrCodeUrl === "string") &&
    (value.qrCodeDataUrl === null || typeof value.qrCodeDataUrl === "string") &&
    typeof value.discountAmount === "number" &&
    (value.appliedVoucherCode === null || typeof value.appliedVoucherCode === "string")
  );
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

function isFlightBookingSeatItem(value: unknown): value is ApiFlightBookingOptionsResponse["seats"][number] {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.seatNumber === "string" &&
    typeof value.fareFamily === "string" &&
    typeof value.occupied === "boolean"
  );
}

function isFlightBookingFareOption(
  value: unknown
): value is ApiFlightBookingOptionsResponse["fareOptions"][number] {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.inventoryId === "number" &&
    typeof value.fareFamily === "string" &&
    typeof value.title === "string" &&
    typeof value.price === "number" &&
    typeof value.seatsLeft === "number" &&
    typeof value.totalSeats === "number" &&
    typeof value.rowStart === "number" &&
    typeof value.rowEnd === "number"
  );
}

function isFlightBookingOptionsResponse(value: unknown): value is ApiFlightBookingOptionsResponse {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.flightId === "number" &&
    typeof value.code === "string" &&
    typeof value.originCode === "string" &&
    typeof value.destinationCode === "string" &&
    typeof value.from === "string" &&
    typeof value.to === "string" &&
    typeof value.departureAt === "string" &&
    typeof value.arrivalAt === "string" &&
    typeof value.baseFare === "number" &&
    Array.isArray(value.fareOptions) &&
    value.fareOptions.every(isFlightBookingFareOption) &&
    Array.isArray(value.seats) &&
    value.seats.every(isFlightBookingSeatItem)
  );
}

function isCheckinResponse(value: unknown): value is ApiCheckinCompleteResponse {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.bookingCode === "string" &&
    isStringArray(value.ticketNumbers) &&
    Array.isArray(value.boardingPasses) &&
    value.boardingPasses.every(isBoardingPass)
  );
}

export async function createBookingHold(
  payload: ApiCreateBookingHoldRequest,
  accessToken?: string
): Promise<ApiBookingHoldResponse> {
  const response = await requestApi<unknown>("/api/bookings/holds", {
    accessToken,
    fallbackMessage: "Kh\u00f4ng th\u1ec3 gi\u1eef ch\u1ed7 l\u00fac n\u00e0y.",
    json: payload,
    method: "POST"
  });

  if (!isHoldResponse(response)) {
    throw new ApiClientError("D\u1eef li\u1ec7u gi\u1eef ch\u1ed7 tr\u1ea3 v\u1ec1 kh\u00f4ng h\u1ee3p l\u1ec7.", 500);
  }

  return response;
}

export async function fetchFlightBookingOptions(flightId: number): Promise<ApiFlightBookingOptionsResponse> {
  const response = await requestApi<unknown>(`/api/flights/${flightId}/booking-options`, {
    fallbackMessage: "Không thể tải lựa chọn hạng vé và sơ đồ ghế lúc này."
  });

  if (!isFlightBookingOptionsResponse(response)) {
    throw new ApiClientError("Dữ liệu lựa chọn hạng vé và ghế trả về không hợp lệ.", 500);
  }

  return response;
}

export async function createPaymentSession(
  bookingCode: string,
  accessToken?: string
): Promise<ApiPaymentSessionResponse> {
  const response = await requestApi<unknown>(
    `/api/bookings/${encodeURIComponent(bookingCode.trim())}/payments/session`,
    {
      accessToken,
      fallbackMessage: "Kh\u00f4ng th\u1ec3 kh\u1edfi t\u1ea1o phi\u00ean thanh to\u00e1n l\u00fac n\u00e0y.",
      method: "POST"
    }
  );

  if (!isPaymentSessionResponse(response)) {
    throw new ApiClientError("D\u1eef li\u1ec7u phi\u00ean thanh to\u00e1n tr\u1ea3 v\u1ec1 kh\u00f4ng h\u1ee3p l\u1ec7.", 500);
  }

  return response;
}

export async function applyVoucherToBooking(
  bookingCode: string,
  payload: ApiApplyVoucherRequest,
  accessToken?: string
): Promise<ApiManageBookingOverview> {
  const response = await requestApi<unknown>(
    `/api/bookings/${encodeURIComponent(bookingCode.trim())}/apply-voucher`,
    {
      accessToken,
      fallbackMessage: "Không thể áp voucher cho booking này lúc này.",
      json: payload,
      method: "POST"
    }
  );

  if (!isManageOverview(response)) {
    throw new ApiClientError("Dữ liệu voucher trả về không hợp lệ.", 500);
  }

  return response;
}

export async function cancelAppliedVoucherForBooking(
  bookingCode: string,
  accessToken?: string
): Promise<ApiManageBookingOverview> {
  const response = await requestApi<unknown>(
    `/api/bookings/${encodeURIComponent(bookingCode.trim())}/apply-voucher`,
    {
      accessToken,
      fallbackMessage: "Không thể xóa áp dụng voucher cho booking này lúc này.",
      method: "DELETE"
    }
  );

  if (!isManageOverview(response)) {
    throw new ApiClientError("Dữ liệu voucher trả về không hợp lệ.", 500);
  }

  return response;
}

export async function confirmLocalPayment(
  payload: ApiPaymentCallbackRequest,
  accessToken?: string
): Promise<ApiManageBookingOverview> {
  const response = await requestApi<unknown>("/api/payments/callback", {
    accessToken,
    fallbackMessage: "Kh\u00f4ng th\u1ec3 x\u00e1c nh\u1eadn thanh to\u00e1n l\u00fac n\u00e0y.",
    json: payload,
    method: "POST"
  });

  if (!isManageOverview(response)) {
    throw new ApiClientError("D\u1eef li\u1ec7u thanh to\u00e1n tr\u1ea3 v\u1ec1 kh\u00f4ng h\u1ee3p l\u1ec7.", 500);
  }

  return response;
}

export const submitSandboxPayment = confirmLocalPayment;

export async function completeCheckin(
  payload: ApiCheckinCompleteRequest,
  accessToken?: string,
  lookupToken?: string
): Promise<ApiCheckinCompleteResponse> {
  const response = await requestApi<unknown>("/api/check-in/complete", {
    accessToken,
    headers: lookupToken
      ? {
          [BOOKING_LOOKUP_TOKEN_HEADER]: lookupToken
        }
      : undefined,
    fallbackMessage: "Kh\u00f4ng th\u1ec3 ho\u00e0n t\u1ea5t l\u00e0m th\u1ee7 t\u1ee5c tr\u1ef1c tuy\u1ebfn l\u00fac n\u00e0y.",
    json: payload,
    method: "POST"
  });

  if (!isCheckinResponse(response)) {
    throw new ApiClientError("D\u1eef li\u1ec7u l\u00e0m th\u1ee7 t\u1ee5c tr\u1ef1c tuy\u1ebfn tr\u1ea3 v\u1ec1 kh\u00f4ng h\u1ee3p l\u1ec7.", 500);
  }

  return response;
}

export async function createRefundRequest(
  bookingCode: string,
  payload: ApiRefundRequest,
  accessToken?: string,
  lookupToken?: string
): Promise<ApiManageBookingOverview> {
  const response = await requestApi<unknown>(
    `/api/bookings/${encodeURIComponent(bookingCode.trim())}/refund-request`,
    {
      accessToken,
      headers: lookupToken
        ? {
            [BOOKING_LOOKUP_TOKEN_HEADER]: lookupToken
          }
        : undefined,
      fallbackMessage: "Kh\u00f4ng th\u1ec3 g\u1eedi y\u00eau c\u1ea7u ho\u00e0n v\u00e9 l\u00fac n\u00e0y.",
      json: payload,
      method: "POST"
    }
  );

  if (!isManageOverview(response)) {
    throw new ApiClientError("D\u1eef li\u1ec7u ho\u00e0n v\u00e9 tr\u1ea3 v\u1ec1 kh\u00f4ng h\u1ee3p l\u1ec7.", 500);
  }

  return response;
}
