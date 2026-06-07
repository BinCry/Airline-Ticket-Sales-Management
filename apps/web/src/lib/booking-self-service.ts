import type { ApiManageBookingOverview, ApiManageBookingSegment, ApiManageBookingTicket } from "@qlvmb/shared-types";

const TRANG_THAI_CHAN_CHECKIN = new Set(["boarding", "departed", "landed", "cancelled"]);
const TRANG_THAI_CHAN_HOAN_VE = new Set(["boarding", "departed", "landed"]);

function layTrangThaiPhanDoan(segment: ApiManageBookingSegment): string | null {
  if (!segment.status) {
    return null;
  }

  return segment.status.trim().toLowerCase();
}

function daQuaGioKhoiHanh(segment: ApiManageBookingSegment, thamChieuMiliGiay: number): boolean {
  const departureAt = Date.parse(segment.departureAt);
  return Number.isFinite(departureAt) && departureAt <= thamChieuMiliGiay;
}

function biChanTheoTrangThai(
  segment: ApiManageBookingSegment,
  danhSachTrangThai: Set<string>
): boolean {
  const status = layTrangThaiPhanDoan(segment);
  return status !== null && danhSachTrangThai.has(status);
}

function hanhTrinhKhongConHopLeChoCheckin(
  segments: ApiManageBookingSegment[],
  thamChieuMiliGiay: number
): boolean {
  return (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        biChanTheoTrangThai(segment, TRANG_THAI_CHAN_CHECKIN) ||
        daQuaGioKhoiHanh(segment, thamChieuMiliGiay)
    )
  );
}

function hanhTrinhDaBatDauChoHoanVe(
  segments: ApiManageBookingSegment[],
  thamChieuMiliGiay: number
): boolean {
  return segments.some(
    (segment) =>
      biChanTheoTrangThai(segment, TRANG_THAI_CHAN_HOAN_VE) ||
      daQuaGioKhoiHanh(segment, thamChieuMiliGiay)
  );
}

export function layVeCoTheCheckin(
  bookingOverview: ApiManageBookingOverview,
  thamChieuThoiGian: Date = new Date()
): ApiManageBookingTicket[] {
  if (bookingOverview.tripType !== "one_way") {
    return [];
  }

  if (bookingOverview.status !== "ticketed") {
    return [];
  }

  if (hanhTrinhKhongConHopLeChoCheckin(bookingOverview.segments, thamChieuThoiGian.getTime())) {
    return [];
  }

  return bookingOverview.tickets.filter((ticket) => ticket.status === "issued");
}

export function coTheLamThuTuc(
  bookingOverview: ApiManageBookingOverview,
  thamChieuThoiGian: Date = new Date()
): boolean {
  return layVeCoTheCheckin(bookingOverview, thamChieuThoiGian).length > 0;
}

export function coTheYeuCauHoanVe(
  bookingOverview: ApiManageBookingOverview,
  thamChieuThoiGian: Date = new Date()
): boolean {
  const laBookingBiHuyDaThanhToan =
    bookingOverview.status === "cancelled" && bookingOverview.paymentStatus === "paid";

  if (bookingOverview.status !== "ticketed" && !laBookingBiHuyDaThanhToan) {
    return false;
  }

  if (bookingOverview.refundRequest?.status === "pending") {
    return false;
  }

  if (bookingOverview.tickets.some((ticket) => ticket.status === "checked_in")) {
    return false;
  }

  if (!laBookingBiHuyDaThanhToan) {
    if (bookingOverview.segments.length === 0) {
      return false;
    }

    if (hanhTrinhDaBatDauChoHoanVe(bookingOverview.segments, thamChieuThoiGian.getTime())) {
      return false;
    }
  }

  return true;
}
