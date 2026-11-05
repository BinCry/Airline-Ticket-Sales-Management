import { ApiClientError, requestApi } from "@/lib/api-client";

export interface VoucherStatsSummary {
  totalVouchers: number;
  statusCounts: Record<string, number>;
  usageDenominator: number;
  usageRate: number | null;
  actualDiscountByCurrency: Record<string, number>;
  unmatchedUsedCount: number;
  actualDiscountComplete: boolean;
  operationsHiddenCount: number;
}
export interface VoucherStatsResponse {
  fromDate: string | null;
  toDate: string | null;
  dateBasis: "CREATED_AT";
  timezone: "Asia/Ho_Chi_Minh";
  asOf: string;
  includesHidden: true;
  discountBasis: "BOOKING_RECORDED_DISCOUNT";
  summary: VoucherStatsSummary;
  bySource: { source: string; summary: VoucherStatsSummary }[];
  byMonth: { month: string; summary: VoucherStatsSummary }[];
}
export interface VoucherStatsQuery { fromDate?: string; toDate?: string }

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function amounts(value: unknown): value is Record<string, number> {
  return record(value) && Object.entries(value).every(([key, amount]) => key.trim() && count(amount));
}
function summary(value: unknown): value is VoucherStatsSummary {
  const statuses = record(value) ? value.statusCounts : null;
  return record(value) && count(value.totalVouchers) && amounts(statuses)
    && ["AVAILABLE", "RESERVED", "USED", "EXPIRED", "REVOKED"].every(key => count(statuses[key]))
    && count(value.usageDenominator)
    && (value.usageRate === null || (typeof value.usageRate === "number"
      && Number.isFinite(value.usageRate) && value.usageRate >= 0 && value.usageRate <= 1))
    && amounts(value.actualDiscountByCurrency) && count(value.unmatchedUsedCount)
    && typeof value.actualDiscountComplete === "boolean" && count(value.operationsHiddenCount);
}
function response(value: unknown): value is VoucherStatsResponse {
  if (!record(value)) return false;
  const date = (part: unknown) => part === null || (typeof part === "string" && /^\d{4}-\d{2}-\d{2}$/.test(part));
  return date(value.fromDate) && date(value.toDate) && value.dateBasis === "CREATED_AT"
    && value.timezone === "Asia/Ho_Chi_Minh" && value.includesHidden === true
    && value.discountBasis === "BOOKING_RECORDED_DISCOUNT"
    && typeof value.asOf === "string" && Number.isFinite(Date.parse(value.asOf))
    && summary(value.summary)
    && Array.isArray(value.bySource) && value.bySource.every(item =>
      record(item) && typeof item.source === "string" && item.source.trim() && summary(item.summary))
    && Array.isArray(value.byMonth) && value.byMonth.every(item =>
      record(item) && typeof item.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(item.month) && summary(item.summary));
}
export async function fetchVoucherStats(accessToken: string, query: VoucherStatsQuery = {}, signal?: AbortSignal): Promise<VoucherStatsResponse> {
  const params = new URLSearchParams();
  for (const key of ["fromDate", "toDate"] as const) {
    const value = query[key]?.trim();
    if (value) params.set(key, value);
  }
  const suffix = params.size ? "?" + params.toString() : "";
  const data = await requestApi<unknown>("/api/backoffice/operations/vouchers/stats" + suffix, {
    accessToken, signal, showErrorToast: false,
    fallbackMessage: "Không thể tải thống kê voucher lúc này."
  });
  if (!response(data)) throw new ApiClientError("Dữ liệu thống kê voucher trả về không hợp lệ.", 500);
  return data;
}
export function formatVoucherUsageRate(value: number | null): string {
  return value === null ? "Chưa đủ cơ sở tính" : new Intl.NumberFormat("vi-VN", {
    style: "percent", maximumFractionDigits: 2
  }).format(value);
}
export function formatVoucherStatsMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency, currencyDisplay: "code" }).format(value);
  } catch {
    return new Intl.NumberFormat("vi-VN").format(value) + " " + currency;
  }
}
export function voucherStatusLabel(status: string): string {
  return ({ AVAILABLE: "Khả dụng", RESERVED: "Đang giữ chỗ", USED: "Đã sử dụng",
    EXPIRED: "Hết hạn", REVOKED: "Đã thu hồi" } as Record<string, string>)[status] ?? status;
}
export function getVoucherDisplayStatus(voucher: { status: string; effectiveStatus?: string | null }): string {
  return voucher.effectiveStatus ?? voucher.status;
}
