export interface VoucherPresentation {
  status: string;
  source?: string | null;
  effectiveStatus?: string | null;
  expiresAt?: string | null;
  bookingCode?: string | null;
  conditionsValid?: boolean;
  discountAmount?: number;
  currency?: string;
}

export function getVoucherSource(source: unknown): "MANUAL" | "BIRTHDAY" | "UNKNOWN" {
  return source === "MANUAL" || source === "BIRTHDAY" ? source : "UNKNOWN";
}

export function voucherExpiryMillis(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!parts) return null;
  const [year, month, day, hour, minute, second] = [
    Number(parts[1]), Number(parts[2]), Number(parts[3]),
    Number(parts[4]), Number(parts[5]), Number(parts[6] ?? 0)
  ];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31 ||
      hour > 23 || minute > 59 || second > 59 ||
      Number(parts[9] ?? 0) > 18 || Number(parts[10] ?? 0) > 59 ||
      (Number(parts[9]) === 18 && Number(parts[10]) !== 0)) return null;
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 ||
      calendar.getUTCDate() !== day) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  // Không kết luận hết hạn sớm khi Backend trả phần lẻ nhỏ hơn một mili giây.
  return parsed + (Number(parts[7]?.slice(3) ?? 0) > 0 ? 1 : 0);
}

// Giữ chữ ký và hành vi cũ cho caller nhận trạng thái trình bày từ Backend.
export function getVoucherDisplayStatus(voucher: { status: string; effectiveStatus?: string | null }): string {
  return voucher.effectiveStatus ?? voucher.status;
}

export function getEffectiveVoucherStatus(voucher: VoucherPresentation, asOf: number): string {
  if (voucher.status !== "AVAILABLE") return voucher.status;
  if (voucher.effectiveStatus === "EXPIRED") return "EXPIRED";
  if (voucher.effectiveStatus != null && voucher.effectiveStatus !== "AVAILABLE") return "UNVERIFIED";
  const expiry = voucherExpiryMillis(voucher.expiresAt);
  if (expiry === null || !Number.isFinite(asOf)) return "UNVERIFIED";
  return expiry <= asOf ? "EXPIRED" : "AVAILABLE";
}

export function getReadyVoucherCount(
  vouchers: readonly VoucherPresentation[] | null | undefined, confirmed: boolean, asOf: number
): number | null {
  if (!confirmed || !vouchers || !Number.isFinite(asOf)) return null;
  let count = 0;
  for (const voucher of vouchers) {
    if (!voucher || typeof voucher.status !== "string" || !voucher.status ||
        voucherExpiryMillis(voucher.expiresAt) === null) return null;
    if (getEffectiveVoucherStatus(voucher, asOf) === "UNVERIFIED") return null;
    if (getEffectiveVoucherStatus(voucher, asOf) === "AVAILABLE") count++;
  }
  return count;
}

export function canOfferVoucher(voucher: VoucherPresentation, bookingCode: string, asOf: number): boolean {
  if (voucher.status === "RESERVED") return Boolean(bookingCode) && voucher.bookingCode === bookingCode;
  return voucher.status === "AVAILABLE" && getEffectiveVoucherStatus(voucher, asOf) === "AVAILABLE";
}

export function canEditVoucherMetadata(voucher: VoucherPresentation): boolean {
  if (voucher.status === "USED" || voucher.status === "RESERVED") return false;
  if (getVoucherSource(voucher.source) !== "BIRTHDAY") return true;
  return voucher.conditionsValid === true && voucherExpiryMillis(voucher.expiresAt) !== null &&
    typeof voucher.discountAmount === "number" && Number.isSafeInteger(voucher.discountAmount) &&
    voucher.discountAmount > 0 && typeof voucher.currency === "string" && voucher.currency.trim().length > 0;
}

export function canEditVoucherPolicy(voucher: VoucherPresentation): boolean {
  return getVoucherSource(voucher.source) !== "BIRTHDAY" && canEditVoucherMetadata(voucher);
}
