import type { ApiPaymentSessionResponse } from "@qlvmb/shared-types";

// Quyền mà API /api/payments/callback yêu cầu (SecurityConfig phía backend).
export const QUYEN_XAC_NHAN_THANH_TOAN_THU_CONG = "backoffice.sales";

export function laPhienThanhToanLocalDangCho(session: ApiPaymentSessionResponse | null): boolean {
  return Boolean(session) && session!.sessionMode === "local" && session!.paymentStatus === "pending";
}

// Thay thế: trước đây chỉ xét phiên local nên khách cũng thấy nút nhưng API luôn trả 401/403;
// nay chỉ nhân viên có quyền bán vé mới được xác nhận thanh toán thủ công.
export function coTheXacNhanThanhToanThuCong(
  session: ApiPaymentSessionResponse | null,
  permissions: readonly string[] = []
): boolean {
  return laPhienThanhToanLocalDangCho(session) && permissions.includes(QUYEN_XAC_NHAN_THANH_TOAN_THU_CONG);
}
