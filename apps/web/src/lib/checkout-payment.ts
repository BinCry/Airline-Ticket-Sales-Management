import type { ApiPaymentSessionResponse } from "@qlvmb/shared-types";

export function coTheXacNhanThanhToanThuCong(
  session: ApiPaymentSessionResponse | null
): boolean {
  if (!session) {
    return false;
  }

  return session.sessionMode === "local" && session.paymentStatus === "pending";
}
