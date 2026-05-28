export type ChatMode = "support" | "travel";

export type ChatAuthor = "user" | "assistant";

export interface ChatbotAction {
  href: string;
  label: string;
}

export interface ChatbotApiMessage {
  content: string;
  role: ChatAuthor;
}

export interface ChatbotApiRequest {
  messages: ChatbotApiMessage[];
  mode: ChatMode;
}

export interface ChatbotApiResponse {
  actions?: ChatbotAction[];
  reply: string;
}

export const chatbotModeOrder: ChatMode[] = ["support", "travel"];

export const chatbotModeConfig = {
  support: {
    description: "Tra cứu nhanh các luồng khách hàng: tìm chuyến, đặt vé, thanh toán, OTP, hoàn vé, check-in và tài khoản",
    emptyLabel:
      "Bạn có thể hỏi về tìm chuyến, đặt vé, thanh toán, OTP tra cứu, hoàn vé, voucher, email vé, check-in, hạng vé hoặc tài khoản.",
    label: "Hỗ trợ khách hàng",
    placeholder: "Ví dụ: Tôi cần tra cứu OTP đặt chỗ",
    prompts: [
      "Tôi muốn tra cứu mã đặt chỗ",
      "Tôi cần thanh toán lại",
      "Tôi muốn hoàn vé hoặc đổi ngày bay",
      "Tôi chưa nhận được email vé"
    ],
    submitLabel: "Gửi hỗ trợ",
    welcome:
      "Xin chào, mình đang ở chế độ hỗ trợ khách hàng. Bạn cứ hỏi về tìm chuyến, đặt vé, thanh toán, OTP tra cứu, hoàn vé, check-in, email vé, voucher, hạng vé, hành lý, tài khoản hoặc cách liên hệ nhân viên hỗ trợ nhé."
  },
  travel: {
    description: "Gợi ý điểm đến, lịch trình và ý tưởng nghỉ ngơi theo nhu cầu của bạn",
    emptyLabel:
      "Hãy nói điểm đi, ngân sách, số ngày hoặc kiểu trải nghiệm bạn muốn để mình gợi ý sát hơn.",
    label: "Gợi ý du lịch",
    placeholder: "Ví dụ: Đi biển 3N2Đ từ TP.HCM",
    prompts: [
      "Gợi ý đi biển 3 ngày 2 đêm từ TP.HCM",
      "Đi đâu ở miền Bắc vào tháng 4 cho cặp đôi?",
      "Gợi ý điểm đến trong nước dưới 5 triệu/người",
      "Nơi phù hợp cho gia đình có trẻ nhỏ dịp cuối tuần"
    ],
    submitLabel: "Nhờ AI gợi ý",
    welcome:
      "Mình đang ở chế độ gợi ý du lịch. Bạn có thể nói ngân sách, số ngày, điểm khởi hành hoặc kiểu trải nghiệm mong muốn để mình đề xuất điểm đến phù hợp."
  }
} as const satisfies Record<
  ChatMode,
  {
    description: string;
    emptyLabel: string;
    label: string;
    placeholder: string;
    prompts: string[];
    submitLabel: string;
    welcome: string;
  }
>;
