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

function phanDoanKhongHopLeChoCheckin(
  segment: ApiManageBookingSegment | null,
  thamChieuMiliGiay: number
): boolean {
  return (
    segment === null ||
    biChanTheoTrangThai(segment, TRANG_THAI_CHAN_CHECKIN) ||
    daQuaGioKhoiHanh(segment, thamChieuMiliGiay)
  );
}

function phanDoanKhongHopLeChoHoanVe(
  segment: ApiManageBookingSegment | null,
  thamChieuMiliGiay: number
): boolean {
  return (
    segment === null ||
    biChanTheoTrangThai(segment, TRANG_THAI_CHAN_HOAN_VE) ||
    daQuaGioKhoiHanh(segment, thamChieuMiliGiay)
  );
}

export function timPhanDoanChoVe(
  bookingOverview: ApiManageBookingOverview,
  ticket: ApiManageBookingTicket
): ApiManageBookingSegment | null {
  if (typeof ticket.inventoryId === "number") {
    return bookingOverview.segments.find((segment) => segment.inventoryId === ticket.inventoryId) ?? null;
  }

  return bookingOverview.segments.length === 1 ? bookingOverview.segments[0] : null;
}

export function layVeCoTheCheckin(
  bookingOverview: ApiManageBookingOverview,
  thamChieuThoiGian: Date = new Date()
): ApiManageBookingTicket[] {
  if (bookingOverview.status !== "ticketed") {
    return [];
  }

  return bookingOverview.tickets.filter((ticket) => {
    if (ticket.status !== "issued") {
      return false;
    }

    return !phanDoanKhongHopLeChoCheckin(
      timPhanDoanChoVe(bookingOverview, ticket),
      thamChieuThoiGian.getTime()
    );
  });
}

export function layVeCoTheYeuCauHoan(
  bookingOverview: ApiManageBookingOverview,
  thamChieuThoiGian: Date = new Date()
): ApiManageBookingTicket[] {
  const laBookingBiHuyDaThanhToan =
    bookingOverview.status === "cancelled" && bookingOverview.paymentStatus === "paid";

  if (bookingOverview.status !== "ticketed" && !laBookingBiHuyDaThanhToan) {
    return [];
  }

  if (bookingOverview.refundRequest?.status === "pending") {
    return [];
  }

  if (laBookingBiHuyDaThanhToan) {
    return bookingOverview.tickets.filter((ticket) => ticket.status !== "checked_in");
  }

  return bookingOverview.tickets.filter((ticket) => {
    if (ticket.status !== "issued") {
      return false;
    }

    return !phanDoanKhongHopLeChoHoanVe(
      timPhanDoanChoVe(bookingOverview, ticket),
      thamChieuThoiGian.getTime()
    );
  });
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
  return layVeCoTheYeuCauHoan(bookingOverview, thamChieuThoiGian).length > 0;
}
