import { ApiClientError, resolveApiClientErrorMessage } from "@/lib/api-client";

export const VOUCHER_FARES = [
  { value: "pho_thong_tiet_kiem", label: "Phổ thông tiết kiệm" },
  { value: "pho_thong_linh_hoat", label: "Phổ thông linh hoạt" },
  { value: "thuong_gia", label: "Thương gia" }
] as const;

export interface VoucherConditions {
  routes?: { from: string; to: string }[];
  fareFamilies?: string[];
  departureFrom?: string | null;
  departureTo?: string | null;
  minAmount?: number | null;
}

export interface VoucherConditionInfo {
  conditions?: VoucherConditions | null;
  conditionSummary?: string;
  conditionsValid?: boolean;
}

export interface VoucherConditionDraft {
  routes: { from: string; to: string }[];
  fareFamilies: string[];
  departureFrom: string;
  departureTo: string;
  minAmount: string;
}

const CONFIG_ERROR = "Voucher đang cấu hình lỗi, vui lòng liên hệ hỗ trợ.";
const CODE = /^[A-Z0-9]{1,8}$/;
const FARES = new Set<string>(VOUCHER_FARES.map((fare) => fare.value));
function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isVoucherConditions(value: unknown): value is VoucherConditions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (Object.keys(item).some((key) => !["routes", "fareFamilies", "departureFrom", "departureTo", "minAmount"].includes(key))) return false;
  return (item.routes == null || (Array.isArray(item.routes) && item.routes.every((route) =>
    route && typeof route === "object" && Object.keys(route).every((key) => ["from", "to"].includes(key)) &&
    typeof route.from === "string" && CODE.test(route.from) && typeof route.to === "string" &&
    CODE.test(route.to) && route.from !== route.to))) &&
    (item.fareFamilies == null || (Array.isArray(item.fareFamilies) && item.fareFamilies.every((fare) => FARES.has(fare)))) &&
    (item.departureFrom == null || isDate(item.departureFrom)) &&
    (item.departureTo == null || isDate(item.departureTo)) &&
    (!item.departureFrom || !item.departureTo || String(item.departureFrom) <= String(item.departureTo)) &&
    (item.minAmount == null || (Number.isSafeInteger(item.minAmount) && Number(item.minAmount) >= 0));
}

export function normalizeVoucherConditionInfo(value: VoucherConditionInfo): Required<VoucherConditionInfo> {
  const valid = value.conditionsValid === true &&
    (value.conditions === null || isVoucherConditions(value.conditions)) &&
    typeof value.conditionSummary === "string" && value.conditionSummary.trim().length > 0;
  return {
    conditions: valid ? value.conditions! : null,
    conditionsValid: valid,
    conditionSummary: valid ? value.conditionSummary! : CONFIG_ERROR
  };
}

export function createVoucherConditionDraft(conditions?: VoucherConditions | null): VoucherConditionDraft {
  return {
    routes: conditions?.routes?.map((route) => ({ ...route })) ?? [],
    fareFamilies: [...(conditions?.fareFamilies ?? [])],
    departureFrom: conditions?.departureFrom ?? "",
    departureTo: conditions?.departureTo ?? "",
    minAmount: conditions?.minAmount == null ? "" : String(conditions.minAmount)
  };
}

export function buildVoucherConditions(draft: VoucherConditionDraft): VoucherConditions | null {
  const routes = draft.routes.map((route) => ({ from: route.from.trim().toUpperCase(), to: route.to.trim().toUpperCase() }));
  if (routes.some((route) => !CODE.test(route.from) || !CODE.test(route.to) || route.from === route.to)) {
    throw new Error("Mỗi tuyến cần mã sân bay đi và đến khác nhau. Chọn gợi ý hoặc nhập mã sân bay hợp lệ.");
  }
  if (draft.fareFamilies.some((fare) => !FARES.has(fare))) throw new Error("Hạng vé không hợp lệ.");
  if ((draft.departureFrom && !isDate(draft.departureFrom)) || (draft.departureTo && !isDate(draft.departureTo))) {
    throw new Error("Ngày khởi hành không hợp lệ.");
  }
  if (draft.departureFrom && draft.departureTo && draft.departureFrom > draft.departureTo) {
    throw new Error("Ngày khởi hành kết thúc phải từ ngày bắt đầu trở đi.");
  }
  const minAmount = draft.minAmount.trim();
  if (minAmount && (!/^\d+$/.test(minAmount) || !Number.isSafeInteger(Number(minAmount)))) {
    throw new Error("Giá trị booking tối thiểu phải là số nguyên không âm trong phạm vi được hỗ trợ.");
  }
  const conditions: VoucherConditions = {};
  if (routes.length) conditions.routes = routes.filter((route, index) =>
    routes.findIndex((candidate) => candidate.from === route.from && candidate.to === route.to) === index);
  if (draft.fareFamilies.length) conditions.fareFamilies = [...new Set(draft.fareFamilies)];
  if (draft.departureFrom) conditions.departureFrom = draft.departureFrom;
  if (draft.departureTo) conditions.departureTo = draft.departureTo;
  if (minAmount) conditions.minAmount = Number(minAmount);
  return Object.keys(conditions).length ? conditions : null;
}

export function describeVoucherApplyError(error: unknown, appliedCode?: string | null): string {
  if (error instanceof ApiClientError && error.status === 400) {
    return resolveApiClientErrorMessage(error, "Booking chưa đáp ứng điều kiện voucher.") +
      (appliedCode ? ` Voucher ${appliedCode} và tổng tiền đang hiển thị được giữ nguyên.` : "");
  }
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
    return "Phiên đăng nhập hoặc quyền truy cập không còn phù hợp. Vui lòng đăng nhập lại.";
  }
  return "Chưa xác nhận được kết quả áp voucher do lỗi kết nối hoặc hệ thống. Vui lòng tải lại thông tin booking trước khi thanh toán; không cần áp lại liên tục.";
}
