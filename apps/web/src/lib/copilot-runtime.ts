export interface CopilotContextPayload {
  authMode: string;
  user: {
    id: number | null;
    email: string | null;
    displayName: string | null;
  } | null;
  roles: string[];
  permissions: string[];
  allowedAgentScopes: string[];
  bookingRules: {
    holdMinutes: number;
    paymentProvider: string;
    supportsGuestBooking: boolean;
    supportsQrCode: boolean;
    requiresUserPaymentConfirmation: boolean;
    seatConflictMessage: string;
  };
}

const DEFAULT_COPILOT_MODEL = "google/gemini-2.5-flash";

function readServerEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeModel(model: string) {
  const trimmedModel = model.trim();

  if (!trimmedModel) {
    return DEFAULT_COPILOT_MODEL;
  }

  if (trimmedModel.includes("/") || trimmedModel.includes(":")) {
    return trimmedModel.replace(":", "/");
  }

  return `google/${trimmedModel}`;
}

function getApiBaseUrl() {
  return readServerEnv(["NEXT_PUBLIC_API_BASE_URL"]) || "http://localhost:8080";
}

function normalizeCopilotContext(
  payload: Partial<CopilotContextPayload> | null | undefined
): CopilotContextPayload {
  if (!payload || typeof payload !== "object") {
    return createFallbackCopilotContext();
  }

  const user =
    payload.user && typeof payload.user === "object"
      ? {
          id: typeof payload.user.id === "number" ? payload.user.id : null,
          email:
            typeof payload.user.email === "string" ? payload.user.email : null,
          displayName:
            typeof payload.user.displayName === "string"
              ? payload.user.displayName
              : null
        }
      : null;

  const bookingRules =
    payload.bookingRules && typeof payload.bookingRules === "object"
      ? {
          holdMinutes:
            typeof payload.bookingRules.holdMinutes === "number"
              ? payload.bookingRules.holdMinutes
              : 15,
          paymentProvider:
            typeof payload.bookingRules.paymentProvider === "string"
              ? payload.bookingRules.paymentProvider
              : "sepay",
          supportsGuestBooking:
            payload.bookingRules.supportsGuestBooking !== false,
          supportsQrCode: payload.bookingRules.supportsQrCode !== false,
          requiresUserPaymentConfirmation:
            payload.bookingRules.requiresUserPaymentConfirmation !== false,
          seatConflictMessage:
            typeof payload.bookingRules.seatConflictMessage === "string"
              ? payload.bookingRules.seatConflictMessage
              : "Ghế này đã có người khác chọn"
        }
      : createFallbackCopilotContext().bookingRules;

  return {
    authMode:
      typeof payload.authMode === "string" && payload.authMode.trim()
        ? payload.authMode
        : "guest",
    user,
    roles: normalizeStringList(payload.roles),
    permissions: normalizeStringList(payload.permissions),
    allowedAgentScopes: normalizeStringList(payload.allowedAgentScopes),
    bookingRules
  };
}

export function createFallbackCopilotContext(): CopilotContextPayload {
  return {
    authMode: "guest",
    user: null,
    roles: [],
    permissions: [],
    allowedAgentScopes: [
      "booking.public_search",
      "booking.seat_map_readonly",
      "booking.payment_guidance"
    ],
    bookingRules: {
      holdMinutes: 15,
      paymentProvider: "sepay",
      supportsGuestBooking: true,
      supportsQrCode: true,
      requiresUserPaymentConfirmation: true,
      seatConflictMessage: "Ghế này đã có người khác chọn"
    }
  };
}

export function getCopilotGoogleApiKey() {
  return readServerEnv([
    "GOOGLE_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY"
  ]);
}

export function getCopilotModel() {
  return normalizeModel(
    readServerEnv(["COPILOTKIT_MODEL", "GEMINI_MODEL"]) ||
      DEFAULT_COPILOT_MODEL
  );
}

export async function fetchCopilotContext(
  authorizationHeader?: string | null
): Promise<CopilotContextPayload> {
  const headers = new Headers({
    Accept: "application/json"
  });

  if (authorizationHeader) {
    headers.set("Authorization", authorizationHeader);
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/public/copilot/context`, {
      cache: "no-store",
      headers
    });

    if (!response.ok) {
      return createFallbackCopilotContext();
    }

    const payload = (await response.json()) as Partial<CopilotContextPayload>;
    return normalizeCopilotContext(payload);
  } catch {
    return createFallbackCopilotContext();
  }
}

export function buildCopilotPrompt(context: CopilotContextPayload) {
  const userSummary = context.user
    ? `${context.user.displayName ?? "Người dùng"} (${context.user.email ?? "không có email"})`
    : "Khách vãng lai";
  const roles = context.roles.length > 0 ? context.roles.join(", ") : "guest";
  const permissions =
    context.permissions.length > 0 ? context.permissions.join(", ") : "không có";
  const scopes =
    context.allowedAgentScopes.length > 0
      ? context.allowedAgentScopes.join(", ")
      : "không có";

  return [
    "Bạn là trợ lý AI của hệ thống Airline Ticket Sales Management.",
    "Bạn chỉ hỗ trợ người dùng cuối trong luồng tự phục vụ đặt vé.",
    `Trạng thái xác thực: ${context.authMode}.`,
    `Người dùng hiện tại: ${userSummary}.`,
    `Vai trò hiện tại: ${roles}.`,
    `Quyền self-service hiển thị cho agent: ${permissions}.`,
    `Phạm vi agent được phép thao tác: ${scopes}.`,
    `Thời gian giữ chỗ mặc định: ${context.bookingRules.holdMinutes} phút.`,
    `Nhà cung cấp thanh toán: ${context.bookingRules.paymentProvider}.`,
    `Thông điệp xung đột ghế bắt buộc: "${context.bookingRules.seatConflictMessage}".`,
    "Chỉ hỗ trợ các chủ đề như tra cứu chuyến bay, giải thích ghế trống, điền thông tin hành khách, chọn ghế hợp lệ và chuẩn bị thanh toán bằng QR.",
    "Không được gọi, mô tả như đã gọi hay hướng dẫn sử dụng các chức năng backoffice, admin, CMS, tài chính nội bộ, doanh thu, hỗ trợ nội bộ hoặc vận hành.",
    "Khi có frontend tool phù hợp, hãy ưu tiên dùng tool để cập nhật giao diện thay vì chỉ mô tả bằng lời.",
    "Không được khẳng định đã giữ ghế, đã xuất vé, đã thanh toán hay đã thay đổi dữ liệu khi giao diện chưa cho thấy bằng chứng rõ ràng.",
    "Sau khi tạo phiên thanh toán QR, phải nhắc người dùng tự quét mã và tự xác nhận giao dịch.",
    "Nếu dữ liệu trên màn hình chưa đủ thì phải nói rõ đang thiếu dữ liệu và yêu cầu người dùng kiểm tra hoặc cung cấp thêm.",
    "Tuyệt đối không dùng tool self-service để vượt quyền member, customer hay gọi chức năng backoffice."
  ].join("\n");
}
