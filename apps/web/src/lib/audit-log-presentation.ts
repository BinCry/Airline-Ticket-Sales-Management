import type { AuditLogItem } from "@/lib/audit-log-api";
import { formatDate } from "@/lib/format";

const actionLabels = new Map([
  ["admin.audit.export", "Xuất nhật ký kiểm toán"],
  ["admin.user.roles.update", "Đổi vai trò tài khoản"],
  ["admin.user.status.update", "Đổi trạng thái tài khoản"],
  ["operations.flight.create", "Tạo chuyến bay"],
  ["operations.flight.update", "Cập nhật chuyến bay"],
  ["operations.flight.cancel", "Hủy chuyến bay"],
  ["operations.flight.hide", "Ẩn chuyến bay đã hủy"],
  ["operations.voucher.create", "Tạo voucher cho hội viên"],
  ["operations.voucher.update", "Cập nhật voucher hội viên"],
  ["operations.voucher.revoke", "Thu hồi voucher hội viên"],
  ["operations.voucher.hide_used_history", "Ẩn lịch sử voucher đã dùng"],
  ["operations.voucher.hide_revoked", "Ẩn voucher đã thu hồi"],
  ["operations.baggage.accept", "Nhận hành lý ký gửi"],
  ["operations.baggage.load", "Bốc xếp hành lý"],
  ["operations.baggage.deliver", "Trả hành lý"],
  ["sales.booking.create", "Hỗ trợ tạo giữ chỗ"],
  ["sales.booking.issue_ticket", "Xuất vé cho đặt chỗ"],
  ["cms.homepage.create", "Tạo nội dung trang chủ"],
  ["cms.homepage.update", "Cập nhật nội dung trang chủ"],
  ["cms.homepage.publish", "Phát hành nội dung trang chủ"],
  ["cms.homepage.archive", "Lưu trữ nội dung trang chủ"],
  ["member.voucher.hide_history", "Hội viên ẩn lịch sử voucher đã dùng"],
  ["member.loyalty.tier_upgrade", "Tự động nâng hạng hội viên"]
]);

const targetLabels = new Map([
  ["audit_log", "Nhật ký kiểm toán"],
  ["user_account", "Tài khoản người dùng"],
  ["flight", "Chuyến bay"],
  ["booking", "Đặt chỗ"],
  ["member_voucher", "Voucher hội viên"],
  ["baggage", "Hành lý ký gửi"],
  ["cms_homepage_entry", "Nội dung trang chủ"],
  ["member_loyalty_account", "Tài khoản hội viên thân thiết"]
]);

const jsonFallback = "Chưa có bản diễn giải cho nội dung này. Bạn vẫn có thể xem dữ liệu gốc.";

const roleLabels = new Map([
  ["guest", "Khách vãng lai"], ["customer", "Khách hàng"], ["member", "Hội viên"],
  ["customer_support", "Chăm sóc khách hàng"], ["operations_staff", "Vận hành"]
]);
const accountStatusLabels = new Map([
  ["active", "Đang hoạt động"], ["locked", "Đã khóa"], ["suspended", "Tạm dừng"]
]);
const baggageChanges = new Map([
  ["operations.baggage.accept:REGISTERED -> ACCEPTED", "Đã đăng ký → Đã nhận ký gửi"],
  ["operations.baggage.load:ACCEPTED -> LOADED", "Đã nhận ký gửi → Đã bốc xếp"],
  ["operations.baggage.deliver:LOADED -> DELIVERED", "Đã bốc xếp → Đã trả hành lý"],
  ["operations.baggage.deliver:RETURN_PENDING -> DELIVERED", "Chờ trả hành lý → Đã trả hành lý"]
]);

type AuditDetailItem = Pick<AuditLogItem, "action" | "targetType"> & { detail: string | null | undefined };

export interface AuditDetailPresentation {
  summary: string;
  warnings: { tone: "error" | "warning"; message: string }[];
}

export function getAuditActionLabel(action: string): string {
  return actionLabels.get(action) ?? action;
}

export function getAuditTargetLabel(targetType: string): string {
  return targetLabels.get(targetType) ?? targetType;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function recordedDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return formatDate(value);
}

function describeBusinessDetail(item: AuditDetailItem): string | null {
  const detail = item.detail ?? "";
  if (item.targetType === "baggage") {
    const change = baggageChanges.get(`${item.action}:${detail}`);
    return change ? `Trạng thái hành lý: ${change}` : null;
  }
  if (item.targetType !== "user_account") return null;

  // Thay mã bằng nhãn chỉ khi toàn bộ mẫu do AdminUserService ghi khớp chính xác.
  if (item.action === "admin.user.roles.update") {
    const match = /^Đổi role từ \[([a-z_]+(?:,[a-z_]+)*)\] sang \[([a-z_]+(?:,[a-z_]+)*)\]$/.exec(detail);
    if (!match || match[0] !== detail) return null;
    const lists = [match[1].split(","), match[2].split(",")];
    if (lists.some((roles) => new Set(roles).size !== roles.length || roles.some((role) => !roleLabels.has(role)))) return null;
    const [before, after] = lists.map((roles) => roles.map((role) => roleLabels.get(role)).join(", "));
    return `Vai trò: ${before} → ${after}`;
  }
  if (item.action === "admin.user.status.update") {
    const match = /^Đổi trạng thái từ ([a-z_]+) sang ([a-z_]+)$/.exec(detail);
    if (!match || match[0] !== detail) return null;
    const before = accountStatusLabels.get(match[1]);
    const after = accountStatusLabels.get(match[2]);
    return before && after ? `Trạng thái tài khoản: ${before} → ${after}` : null;
  }
  return null;
}

export function getAuditDetailPresentation(item: AuditDetailItem): AuditDetailPresentation {
  const plain = (summary: string): AuditDetailPresentation => ({ summary, warnings: [] });
  if (!item.detail?.trim()) return plain("Không có nội dung chi tiết");
  let value: unknown;
  try {
    value = JSON.parse(item.detail);
  } catch {
    return plain(describeBusinessDetail(item) ?? item.detail);
  }

  // Chỉ diễn giải cấu trúc do AuditLogExportService ghi; JSON khác vẫn giữ bản gốc.
  if (item.action !== "admin.audit.export" || item.targetType !== "audit_log"
      || !isRecord(value) || !isRecord(value.filters)
      || !Number.isSafeInteger(value.rowsPrepared) || (value.rowsPrepared as number) < 0
      || typeof value.truncated !== "boolean") return plain(jsonFallback);

  const from = recordedDate(value.filters.from);
  const to = recordedDate(value.filters.to);
  if (!from || !to) return plain(jsonFallback);

  // Tách cảnh báo khỏi phần ba dòng; lỗi ghi response không phải lỗi lưu sự kiện Audit.
  const warnings: AuditDetailPresentation["warnings"] = [];
  if (value.status === "SERVER_WRITE_FAILED") {
    warnings.push({ tone: "error", message: "Máy chủ gặp lỗi khi ghi CSV." });
  }
  if (value.truncated) {
    warnings.push({ tone: "warning", message: value.rowsPrepared === 10000
      ? "Dữ liệu chuẩn bị cho CSV bị giới hạn ở 10.000 dòng; còn bản ghi chưa được đưa vào CSV."
      : "Dữ liệu bị cắt theo giới hạn xuất." });
  }
  const summary = [
    `Số dòng chuẩn bị: ${value.rowsPrepared}`,
    `Từ ${from} đến ${to}`
  ];
  if (!value.truncated) summary.push("Không bị cắt");
  if (typeof value.filters.includeHidden === "boolean") {
    summary.push(value.filters.includeHidden ? "Gồm bản ghi đã ẩn" : "Không gồm bản ghi đã ẩn");
  }
  // Trạng thái này chỉ phản ánh việc ghi response, không xác nhận người dùng đã nhận file.
  if (value.status === "SERVER_WRITE_COMPLETED") summary.push("Máy chủ đã ghi xong CSV");
  return { summary: summary.join(" · "), warnings };
}

export function getAuditDetailSummary(item: AuditDetailItem): string {
  return getAuditDetailPresentation(item).summary;
}
