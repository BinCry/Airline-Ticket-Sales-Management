import {
  ApiClientError,
  requestApi,
  resolveApiClientErrorMessage
} from "@/lib/api-client";
import { presentUserDisplayName } from "@/lib/present-user-label";

export interface MyProfile {
  id: number;
  email: string;
  displayName: string;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  status: string;
  roles: string[];
}

export interface UpdateMyProfilePayload {
  displayName: string;
  phone: string;
}

export interface ChangeMyPasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface MyPassenger {
  id: number;
  fullName: string;
  passengerType: string;
  dateOfBirth: string;
  documentType: string;
  documentNumber: string;
  isPrimary: boolean;
}

export interface MyLoyaltyLedgerItem {
  entryType: string;
  pointsDelta: number;
  balanceAfter: number;
  bookingCode: string | null;
  description: string;
  createdAt: string;
}

export interface MyLoyalty {
  membershipTier: string;
  pointBalance: number;
  lifetimePoints: number;
  availableVoucherCount: number;
  recentEntries: MyLoyaltyLedgerItem[];
}

export interface MyVoucher {
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

export interface UpsertMyPassengerPayload {
  fullName: string;
  passengerType: string;
  dateOfBirth: string;
  documentType: string;
  documentNumber: string;
  isPrimary: boolean;
}

export class MyAccountApiError extends ApiClientError {
  constructor(
    message: string,
    status: number,
    errors: Record<string, string> = {},
    timestamp: string | null = null
  ) {
    super(message, status, errors, timestamp);
    this.name = "MyAccountApiError";
  }
}

function toMyAccountApiError(error: unknown): never {
  if (error instanceof ApiClientError) {
    throw new MyAccountApiError(error.message, error.status, error.errors, error.timestamp);
  }

  throw error;
}

function sanitizeRoles(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function isMyProfile(value: unknown): value is MyProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<MyProfile>;

  return (
    typeof profile.id === "number" &&
    typeof profile.email === "string" &&
    typeof profile.displayName === "string" &&
    (profile.phone === null || typeof profile.phone === "string" || typeof profile.phone === "undefined") &&
    (profile.avatarUrl === null || typeof profile.avatarUrl === "string" || typeof profile.avatarUrl === "undefined") &&
    typeof profile.emailVerified === "boolean" &&
    typeof profile.status === "string" &&
    Array.isArray(profile.roles)
  );
}

function isMyPassenger(value: unknown): value is MyPassenger {
  if (!value || typeof value !== "object") {
    return false;
  }

  const passenger = value as Partial<MyPassenger>;

  return (
    typeof passenger.id === "number" &&
    typeof passenger.fullName === "string" &&
    typeof passenger.passengerType === "string" &&
    typeof passenger.dateOfBirth === "string" &&
    typeof passenger.documentType === "string" &&
    typeof passenger.documentNumber === "string" &&
    typeof passenger.isPrimary === "boolean"
  );
}

function isMyPassengerList(value: unknown): value is MyPassenger[] {
  return Array.isArray(value) && value.every((item) => isMyPassenger(item));
}

function isMyLoyaltyLedgerItem(value: unknown): value is MyLoyaltyLedgerItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const ledgerItem = value as Partial<MyLoyaltyLedgerItem>;

  return (
    typeof ledgerItem.entryType === "string" &&
    typeof ledgerItem.pointsDelta === "number" &&
    typeof ledgerItem.balanceAfter === "number" &&
    (ledgerItem.bookingCode === null ||
      typeof ledgerItem.bookingCode === "string" ||
      typeof ledgerItem.bookingCode === "undefined") &&
    typeof ledgerItem.description === "string" &&
    typeof ledgerItem.createdAt === "string"
  );
}

function isMyLoyalty(value: unknown): value is MyLoyalty {
  if (!value || typeof value !== "object") {
    return false;
  }

  const loyalty = value as Partial<MyLoyalty>;

  return (
    typeof loyalty.membershipTier === "string" &&
    typeof loyalty.pointBalance === "number" &&
    typeof loyalty.lifetimePoints === "number" &&
    typeof loyalty.availableVoucherCount === "number" &&
    Array.isArray(loyalty.recentEntries) &&
    loyalty.recentEntries.every((item) => isMyLoyaltyLedgerItem(item))
  );
}

function isMyVoucher(value: unknown): value is MyVoucher {
  if (!value || typeof value !== "object") {
    return false;
  }

  const voucher = value as Partial<MyVoucher>;

  return (
    typeof voucher.voucherCode === "string" &&
    typeof voucher.title === "string" &&
    typeof voucher.description === "string" &&
    typeof voucher.discountAmount === "number" &&
    typeof voucher.currency === "string" &&
    typeof voucher.status === "string" &&
    typeof voucher.expiresAt === "string" &&
    (voucher.usedAt === null || typeof voucher.usedAt === "string" || typeof voucher.usedAt === "undefined") &&
    (voucher.bookingCode === null ||
      typeof voucher.bookingCode === "string" ||
      typeof voucher.bookingCode === "undefined")
  );
}

function isMyVoucherList(value: unknown): value is MyVoucher[] {
  return Array.isArray(value) && value.every((item) => isMyVoucher(item));
}

function normalizeMyProfile(payload: MyProfile): MyProfile {
  return {
    ...payload,
    displayName: presentUserDisplayName(payload.displayName),
    phone: payload.phone ?? null,
    avatarUrl: payload.avatarUrl ?? null,
    roles: sanitizeRoles(payload.roles)
  };
}

async function sendProfileMutation(
  accessToken: string,
  endpoint: string,
  method: "GET" | "PATCH",
  payload?: UpdateMyProfilePayload
): Promise<MyProfile> {
  let result: unknown;

  try {
    result = await requestApi<unknown>(endpoint, {
      accessToken,
      fallbackMessage:
        method === "GET"
          ? "Không thể tải dữ liệu tài khoản lúc này."
          : "Không thể cập nhật hồ sơ tài khoản lúc này.",
      json: payload,
      method
    });
  } catch (error) {
    return toMyAccountApiError(error);
  }

  if (!isMyProfile(result)) {
    throw new MyAccountApiError("Dữ liệu hồ sơ trả về không hợp lệ.", 500);
  }

  return normalizeMyProfile(result);
}

export function fetchMyProfile(accessToken: string): Promise<MyProfile> {
  return sendProfileMutation(accessToken, "/api/me/profile", "GET");
}

export function updateMyProfile(
  accessToken: string,
  payload: UpdateMyProfilePayload
): Promise<MyProfile> {
  return sendProfileMutation(accessToken, "/api/me/profile", "PATCH", payload);
}

export async function changeMyPassword(
  accessToken: string,
  payload: ChangeMyPasswordPayload
): Promise<void> {
  try {
    await requestApi<void>("/api/me/change-password", {
      accessToken,
      fallbackMessage: "Không thể đổi mật khẩu lúc này.",
      json: payload,
      method: "POST"
    });
  } catch (error) {
    return toMyAccountApiError(error);
  }
}

export async function uploadMyAvatar(
  accessToken: string,
  avatar: File
): Promise<MyProfile> {
  const formData = new FormData();
  formData.set("avatar", avatar);

  let result: unknown;
  try {
    result = await requestApi<unknown>("/api/me/avatar", {
      accessToken,
      fallbackMessage: "Không thể cập nhật ảnh đại diện lúc này.",
      formData,
      method: "POST"
    });
  } catch (error) {
    return toMyAccountApiError(error);
  }

  if (!isMyProfile(result)) {
    throw new MyAccountApiError("Dữ liệu hồ sơ trả về không hợp lệ.", 500);
  }

  return normalizeMyProfile(result);
}

export async function fetchMyPassengers(accessToken: string): Promise<MyPassenger[]> {
  let payload: unknown;

  try {
    payload = await requestApi<unknown>("/api/me/passengers", {
      accessToken,
      fallbackMessage: "Không thể tải danh sách hành khách lúc này.",
      method: "GET"
    });
  } catch (error) {
    return toMyAccountApiError(error);
  }

  if (!isMyPassengerList(payload)) {
    throw new MyAccountApiError("Dữ liệu hành khách trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function fetchMyLoyalty(accessToken: string): Promise<MyLoyalty> {
  let payload: unknown;

  try {
    payload = await requestApi<unknown>("/api/me/loyalty", {
      accessToken,
      fallbackMessage: "Không thể tải dữ liệu hội viên lúc này.",
      method: "GET"
    });
  } catch (error) {
    return toMyAccountApiError(error);
  }

  if (!isMyLoyalty(payload)) {
    throw new MyAccountApiError("Dữ liệu hội viên trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function fetchMyVouchers(accessToken: string): Promise<MyVoucher[]> {
  let payload: unknown;

  try {
    payload = await requestApi<unknown>("/api/me/vouchers", {
      accessToken,
      fallbackMessage: "Không thể tải danh sách voucher lúc này.",
      method: "GET"
    });
  } catch (error) {
    return toMyAccountApiError(error);
  }

  if (!isMyVoucherList(payload)) {
    throw new MyAccountApiError("Dữ liệu voucher trả về không hợp lệ.", 500);
  }

  return payload;
}

export async function deleteMyVoucherHistory(
  accessToken: string,
  voucherCode: string
): Promise<void> {
  try {
    await requestApi<void>(`/api/me/vouchers/${voucherCode}/history`, {
      accessToken,
      fallbackMessage: "Không thể ẩn lịch sử voucher lúc này.",
      method: "DELETE"
    });
  } catch (error) {
    return toMyAccountApiError(error);
  }
}

async function sendPassengerMutation(
  accessToken: string,
  endpoint: string,
  method: "POST" | "PATCH",
  payload: UpsertMyPassengerPayload
): Promise<MyPassenger> {
  let result: unknown;

  try {
    result = await requestApi<unknown>(endpoint, {
      accessToken,
      fallbackMessage: "Không thể lưu hành khách lúc này.",
      json: payload,
      method
    });
  } catch (error) {
    return toMyAccountApiError(error);
  }

  if (!isMyPassenger(result)) {
    throw new MyAccountApiError("Dữ liệu hành khách trả về không hợp lệ.", 500);
  }

  return result;
}

export function createMyPassenger(
  accessToken: string,
  payload: UpsertMyPassengerPayload
): Promise<MyPassenger> {
  return sendPassengerMutation(accessToken, "/api/me/passengers", "POST", payload);
}

export function updateMyPassenger(
  accessToken: string,
  passengerId: number,
  payload: UpsertMyPassengerPayload
): Promise<MyPassenger> {
  return sendPassengerMutation(accessToken, `/api/me/passengers/${passengerId}`, "PATCH", payload);
}

export async function deleteMyPassenger(
  accessToken: string,
  passengerId: number
): Promise<void> {
  try {
    await requestApi<void>(`/api/me/passengers/${passengerId}`, {
      accessToken,
      fallbackMessage: "Không thể xóa hành khách lúc này.",
      method: "DELETE"
    });
  } catch (error) {
    return toMyAccountApiError(error);
  }
}

export function resolveMyAccountErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  return resolveApiClientErrorMessage(error, fallbackMessage);
}
