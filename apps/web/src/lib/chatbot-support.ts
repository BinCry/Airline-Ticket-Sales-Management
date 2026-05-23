import { supportChannels, supportFaqs } from "@/lib/public-content";

import type { ChatbotAction, ChatbotApiMessage } from "@/lib/chatbot-shared";

interface SupportReply {
  actions?: ChatbotAction[];
  reply: string;
}

interface SupportKnowledgeItem {
  actions?: ChatbotAction[];
  id: string;
  keywords: string[];
  priority: number;
  reply: string;
  title: string;
}

const hotline =
  supportChannels.find((channel) => channel.channel.includes("1900"))?.channel ??
  "1900 6868";

const supportEmail =
  supportChannels.find((channel) => channel.channel.includes("@"))?.channel ??
  "support@vietnam-airlines.vn";

const supportKnowledge: SupportKnowledgeItem[] = [
  {
    actions: [
      { href: "/search", label: "Tìm chuyến bay" },
      { href: "/support", label: "Xem hỗ trợ" }
    ],
    id: "flight-search",
    keywords: [
      "tim chuyen bay",
      "tim ve",
      "ve may bay",
      "diem di",
      "diem den",
      "ngay bay",
      "khu hoi",
      "mot chieu",
      "hanh khach",
      "gia mo dau",
      "tuyen pho bien"
    ],
    priority: 8,
    title: "Tìm chuyến bay",
    reply:
      "Bạn có thể vào trang tìm chuyến bay để chọn điểm đi, điểm đến, ngày bay, loại hành trình một chiều hoặc khứ hồi và số lượng hành khách.\n\nSau khi có kết quả, hệ thống hiển thị giờ bay, giá mở đầu, số ghế còn bán và ba hạng vé để bạn so sánh trước khi chuyển sang bước đặt vé."
  },
  {
    actions: [
      { href: "/search", label: "Chọn chuyến bay" },
      { href: "/booking", label: "Tiếp tục đặt vé" }
    ],
    id: "booking-flow",
    keywords: [
      "dat ve",
      "dat cho",
      "chon chuyen",
      "chon hang ve",
      "chon ghe",
      "so do ghe",
      "thong tin hanh khach",
      "nguoi lien he",
      "giu cho",
      "hang ghe"
    ],
    priority: 9,
    title: "Đặt vé",
    reply:
      "Luồng đặt vé bắt đầu từ việc chọn chuyến bay, sau đó nhập thông tin liên hệ và hành khách, chọn hạng vé, chọn ghế cho từng người rồi giữ chỗ trước khi thanh toán.\n\nMỗi hành khách cần có thông tin giấy tờ cơ bản. Giá vé thay đổi theo hạng vé; chọn ghế trong vùng hạng vé tương ứng không làm tăng thêm giá."
  },
  {
    actions: [
      { href: "/booking", label: "Quay lại thanh toán" },
      { href: "/manage-booking", label: "Kiểm tra đặt chỗ" }
    ],
    id: "payment",
    keywords: [
      "thanh toan",
      "thanh toan lai",
      "loi thanh toan",
      "treo thanh toan",
      "giao dich trung",
      "xuat ve",
      "giu cho 15 phut",
      "hoa don",
      "chua nhan ve",
      "ve dien tu"
    ],
    priority: 10,
    title: "Thanh toán và xuất vé",
    reply:
      `${supportFaqs[1]?.answer ?? "Nếu thanh toán bị gián đoạn, bạn nên kiểm tra lại mã đặt chỗ trước khi thanh toán lại để tránh giao dịch trùng."}\n\n` +
      "Nếu hệ thống đã tạo mã đặt chỗ, hãy tra cứu lại booking trước khi thao tác tiếp để hạn chế rủi ro giao dịch trùng. Khi cần nhân viên kiểm tra thanh toán hoặc email vé, bạn có thể chuẩn bị mã đặt chỗ và liên hệ kênh hỗ trợ."
  },
  {
    actions: [
      { href: "/manage-booking", label: "Tra cứu đặt chỗ" },
      { href: "/support", label: "Liên hệ hỗ trợ" }
    ],
    id: "manage-booking",
    keywords: [
      "ma dat cho",
      "pnr",
      "tra cuu",
      "quan ly dat cho",
      "hanh trinh",
      "ve cua toi",
      "dich vu bo tro",
      "voucher",
      "ma giam gia",
      "an booking",
      "ho ten"
    ],
    priority: 9,
    title: "Quản lý đặt chỗ",
    reply:
      "Để tra cứu đặt chỗ, bạn cần mã đặt chỗ và họ tên hành khách đúng như trên vé. Trang quản lý đặt chỗ giúp xem lại hành trình, trạng thái vé, dịch vụ bổ trợ và các bước cần làm tiếp theo.\n\nNếu không tìm thấy booking, hãy kiểm tra lại cách nhập họ tên, mã đặt chỗ hoặc liên hệ hỗ trợ để nhân viên kiểm tra thêm."
  },
  {
    actions: [
      { href: "/check-in", label: "Làm thủ tục" },
      { href: "/manage-booking", label: "Tra cứu đặt chỗ" }
    ],
    id: "check-in",
    keywords: [
      "check in",
      "check-in",
      "lam thu tuc",
      "lam thu tuc truc tuyen",
      "online",
      "otp",
      "lookup token",
      "boarding pass",
      "the len may bay",
      "24 gio",
      "60 phut"
    ],
    priority: 10,
    title: "Làm thủ tục trực tuyến",
    reply:
      `${supportFaqs[2]?.answer ?? "Bạn nên đến sân bay sớm nếu có hành lý ký gửi, cần hỗ trợ đặc biệt hoặc có thay đổi bất thường về chuyến bay."}\n\n` +
      "Với làm thủ tục trực tuyến, hãy chuẩn bị mã đặt chỗ, họ tên hành khách và mã OTP nếu hệ thống yêu cầu xác minh. Sau khi hoàn tất, bạn có thể xem thông tin boarding pass theo trạng thái mà hệ thống trả về."
  },
  {
    actions: [
      { href: "/flight-status", label: "Xem tình trạng chuyến bay" },
      { href: "/support", label: "Liên hệ hỗ trợ" }
    ],
    id: "flight-status",
    keywords: [
      "tinh trang chuyen bay",
      "ma chuyen bay",
      "gio bay",
      "tre",
      "delay",
      "cham",
      "huy",
      "doi gio",
      "ha canh",
      "khoi hanh",
      "boarding"
    ],
    priority: 9,
    title: "Tình trạng chuyến bay",
    reply:
      "Bạn có thể tra cứu tình trạng chuyến bay theo mã chuyến hoặc thông tin hành trình để xem giờ khởi hành, giờ hạ cánh và trạng thái khai thác mới nhất.\n\nNếu chuyến bay bị chậm, hủy hoặc đổi giờ, hãy kiểm tra lại trang tình trạng chuyến bay trước khi ra sân bay và liên hệ hỗ trợ nếu cần đổi kế hoạch."
  },
  {
    actions: [
      { href: "/account", label: "Mở tài khoản" },
      { href: "/forgot-password", label: "Quên mật khẩu" }
    ],
    id: "account",
    keywords: [
      "tai khoan",
      "dang nhap",
      "dang ky",
      "quen mat khau",
      "doi mat khau",
      "ho so ca nhan",
      "hanh khach da luu",
      "khach da luu",
      "thong tin ca nhan",
      "voucher cua toi",
      "hoi vien"
    ],
    priority: 8,
    title: "Tài khoản khách hàng",
    reply:
      "Khu vực tài khoản giúp bạn quản lý hồ sơ cá nhân, hành khách đã lưu, voucher và một số thông tin hội viên. Nếu quên mật khẩu, hãy dùng luồng quên mật khẩu để nhận mã xác minh và đặt lại mật khẩu.\n\nKhi cập nhật thông tin cá nhân, nên kiểm tra kỹ họ tên, email và số điện thoại để tránh sai lệch khi đặt vé hoặc nhận thông báo."
  },
  {
    actions: [
      { href: "/search", label: "Xem hạng vé" },
      { href: "/manage-booking", label: "Quản lý đặt chỗ" }
    ],
    id: "fare-and-baggage",
    keywords: [
      "hang ve",
      "pho thong tiet kiem",
      "pho thong linh hoat",
      "thuong gia",
      "dieu kien ve",
      "hanh ly",
      "hanh ly xach tay",
      "hanh ly ky gui",
      "mua them hanh ly",
      "qua can",
      "doi ve"
    ],
    priority: 9,
    title: "Hạng vé và hành lý",
    reply:
      `${supportFaqs[0]?.answer ?? "Bạn có thể đổi chuyến sau khi thanh toán nếu điều kiện vé cho phép."}\n\n` +
      "Hệ thống đang dùng ba hạng vé chính: Phổ thông tiết kiệm, Phổ thông linh hoạt và Thương gia. Khi cần mua thêm hành lý ký gửi hoặc kiểm tra điều kiện đổi vé, bạn nên tra cứu lại mã đặt chỗ để hệ thống xác định đúng hạng vé và dịch vụ còn áp dụng."
  },
  {
    actions: [{ href: "/support", label: "Mở trang hỗ trợ" }],
    id: "direct-support",
    keywords: [
      "hotline",
      "tong dai",
      "nhan vien",
      "lien he",
      "email",
      "khieu nai",
      "ho tro",
      "faq",
      "yeu cau ho tro",
      "cham soc khach hang"
    ],
    priority: 7,
    title: "Liên hệ hỗ trợ",
    reply:
      `Nếu bạn cần nhân viên hỗ trợ trực tiếp, bạn có thể gọi tổng đài ${hotline} hoặc gửi email tới ${supportEmail}.\n\nTrường hợp cần đổi vé, hoàn vé, kiểm tra thanh toán, chuyến bay chậm hoặc yêu cầu xác minh thêm, hãy chuẩn bị sẵn mã đặt chỗ để nhân viên hỗ trợ nhanh hơn.`
  },
  {
    id: "travel-mode",
    keywords: ["dia diem", "du lich", "di dau", "goi y", "lich trinh", "nghi duong"],
    priority: 4,
    title: "Gợi ý du lịch",
    reply:
      "Nội dung này hợp với chế độ gợi ý du lịch hơn. Bạn hãy chuyển sang tab gợi ý du lịch rồi nói rõ ngân sách, số ngày và điểm khởi hành để mình đề xuất điểm đến sát nhu cầu hơn."
  }
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("vi-VN");
}

function scoreKeyword(keyword: string, text: string) {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword || !text.includes(normalizedKeyword)) {
    return 0;
  }

  return 1 + Math.min(4, normalizedKeyword.split(" ").length) + normalizedKeyword.length / 40;
}

function scoreKnowledgeItem(item: SupportKnowledgeItem, text: string) {
  const keywordScore = item.keywords.reduce((score, keyword) => {
    return score + scoreKeyword(keyword, text);
  }, 0);

  if (keywordScore === 0) {
    return 0;
  }

  return keywordScore + item.priority / 10;
}

function findBestKnowledgeItem(text: string) {
  let bestItem: SupportKnowledgeItem | null = null;
  let bestScore = 0;

  for (const item of supportKnowledge) {
    const currentScore = scoreKnowledgeItem(item, text);

    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestItem = item;
    }
  }

  return bestItem && bestScore >= 1.8 ? bestItem : null;
}

function getLatestUserMessage(messages: ChatbotApiMessage[]) {
  return (
    messages
      .slice()
      .reverse()
      .find((message) => message.role === "user")?.content ?? ""
  );
}

export function buildSupportReply(messages: ChatbotApiMessage[]): SupportReply {
  const latestUserMessage = getLatestUserMessage(messages);
  const recentUserMessages = messages
    .filter((message) => message.role === "user")
    .slice(-4)
    .map((message) => message.content)
    .join(" ");

  const bestItem =
    findBestKnowledgeItem(normalizeText(latestUserMessage)) ??
    findBestKnowledgeItem(normalizeText(recentUserMessages));

  if (bestItem) {
    return {
      actions: bestItem.actions?.slice(0, 2),
      reply: bestItem.reply
    };
  }

  return {
    actions: [
      { href: "/support", label: "Xem trang hỗ trợ" },
      { href: "/search", label: "Tìm chuyến bay" }
    ],
    reply:
      `Mình đã đọc câu hỏi của bạn nhưng chưa đủ chắc để hướng dẫn chi tiết ngay.\n\nBạn có thể hỏi rõ hơn theo nhóm như tìm chuyến bay, đặt vé, thanh toán, tra cứu mã đặt chỗ, check-in, tình trạng chuyến bay, tài khoản, hạng vé hoặc hành lý. Nếu cần nhân viên hỗ trợ trực tiếp, bạn có thể gọi ${hotline} hoặc gửi email tới ${supportEmail}.`
  };
}
