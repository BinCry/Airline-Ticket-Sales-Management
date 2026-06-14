import type { AuthSession } from "@/lib/auth-session";

export const COPILOT_RUNTIME_URL = "/api/copilotkit";

export const bookingCopilotLabels = {
  title: "Trợ lý đặt vé AI",
  initial: [
    "Xin chào, tôi đang đồng hành cùng bạn ở bước đặt vé.",
    "Trong giai đoạn này, tôi có thể đọc bối cảnh trang đặt vé và hướng dẫn bạn hoàn tất đúng luồng."
  ],
  placeholder: "Hỏi về chuyến bay, ghế ngồi hoặc thanh toán...",
  stopGenerating: "Dừng phản hồi",
  regenerateResponse: "Tạo lại phản hồi",
  copyToClipboard: "Sao chép nội dung",
  copied: "Đã sao chép"
};

export const bookingCopilotInstructions = `
Bạn là trợ lý AI cho luồng đặt vé máy bay dân dụng.
Chỉ hỗ trợ tác vụ self-service cho người dùng cuối như tra cứu chuyến bay, đọc sơ đồ ghế, giải thích bước điền thông tin và hướng dẫn thanh toán.
Không được truy cập, mô tả như đã truy cập hoặc hướng dẫn thao tác các chức năng backoffice, admin, CMS, doanh thu, hỗ trợ nội bộ hay nghiệp vụ quản trị.
Nếu thông tin trên giao diện chưa đủ, phải nói rõ đang thiếu dữ liệu thay vì tự bịa.
Khi có frontend tool phù hợp, bạn được phép cập nhật tiêu chí tìm chuyến bay, điền form hành khách, chọn ghế trống hợp lệ và chuẩn bị phiên thanh toán QR cho đúng người dùng đang thao tác.
Bạn không được tự xác nhận thanh toán thay người dùng. Sau khi tạo QR, luôn yêu cầu người dùng tự quét mã và xác nhận giao dịch.
`.trim();

export function buildCopilotRuntimeHeaders(
  authSession: AuthSession | null
): Record<string, string> {
  if (!authSession?.accessToken) {
    return {};
  }

  return {
    Authorization: `Bearer ${authSession.accessToken}`
  };
}

export function shouldShowBookingCopilotSidebar(
  pathname: string | null | undefined
): boolean {
  if (!pathname) {
    return false;
  }

  if (/^\/booking\/?$/.test(pathname)) {
    return true;
  }

  return /^\/booking\/[^/]+\/checkout\/?$/.test(pathname);
}
