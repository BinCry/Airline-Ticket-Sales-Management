import type { AncillaryService, FareComparison, QuickService, SupportItem } from "@qlvmb/shared-types";

export interface SiteLink {
  href: string;
  label: string;
}

export interface FooterSection {
  links: SiteLink[];
  title: string;
}

export interface PromotionCard {
  cta: string;
  href: string;
  summary: string;
  tag: string;
  title: string;
}

export interface BookingStep {
  description: string;
  status: "done" | "current" | "upcoming";
  title: string;
}

export interface ManageAction {
  description: string;
  rule: string;
  title: string;
}

export interface FaqEntry {
  answer: string;
  category: string;
  isPopular?: boolean;
  keywords: string[];
  question: string;
}

export interface TravelDestinationSummary {
  airport: string;
  city: string;
  code: string;
  highlights: string[];
  tagline: string;
}

export const utilityLinks: SiteLink[] = [
  { label: "Hỗ trợ", href: "/support" },
  { label: "Quản lý đặt chỗ", href: "/manage-booking" },
  { label: "Làm thủ tục", href: "/check-in" },
  { label: "Tình trạng chuyến bay", href: "/flight-status" }
];

export const mainNavigation: SiteLink[] = [
  { label: "Trang chủ", href: "/" },
  { label: "Tìm chuyến bay", href: "/search" },
  { label: "Đặt vé", href: "/booking" },
  { label: "Quản lý đặt chỗ", href: "/manage-booking" },
  { label: "Cẩm nang", href: "/blog" },
  { label: "Hỗ trợ", href: "/support" }
];

export const footerSections: FooterSection[] = [
  {
    title: "Dành cho hành khách",
    links: [
      { label: "Tìm chuyến bay", href: "/search" },
      { label: "Quản lý đặt chỗ", href: "/manage-booking" },
      { label: "Làm thủ tục trực tuyến", href: "/check-in" },
      { label: "Tình trạng chuyến bay", href: "/flight-status" }
    ]
  },
  {
    title: "Hỗ trợ và chính sách",
    links: [
      { label: "Trung tâm hỗ trợ", href: "/support#lien-he" },
      { label: "Câu hỏi thường gặp", href: "/support#faq" },
      { label: "Điều kiện vé", href: "/support#dieu-kien-ve" },
      { label: "Hành lý", href: "/support#hanh-ly" }
    ]
  },
  {
    title: "Cẩm nang hành trình",
    links: [
      { label: "Bài viết du lịch", href: "/blog#bai-viet" },
      { label: "Gợi ý điểm đến", href: "/#diem-den" },
      { label: "Thông tin sân bay", href: "/support#san-bay" },
      { label: "Kênh liên hệ", href: "/support#lien-he" }
    ]
  }
];

export const heroHighlights = [
  "Tra cứu chuyến bay theo lịch bay và số chỗ còn lại.",
  "Đồng bộ đăng nhập, hồ sơ tài khoản và quên mật khẩu qua OTP email.",
  "Tách rõ khu công khai, tự phục vụ và backoffice theo vai trò."
];

export const quickServices: QuickService[] = [
  {
    title: "Tìm chuyến bay",
    subtitle: "Chọn chặng bay, ngày đi và xem giá mở đầu trước khi sang bước đặt chỗ.",
    href: "/search"
  },
  {
    title: "Quản lý đặt chỗ",
    subtitle: "Tra cứu trạng thái booking và các bước xử lý tiếp theo.",
    href: "/manage-booking"
  },
  {
    title: "Làm thủ tục",
    subtitle: "Xem hướng dẫn check-in trực tuyến và mốc giờ quan trọng.",
    href: "/check-in"
  },
  {
    title: "Trung tâm hỗ trợ",
    subtitle: "Mở nhanh kênh hỗ trợ, câu hỏi thường gặp và thông tin sân bay.",
    href: "/support"
  }
];

export const promotions: PromotionCard[] = [
  {
    tag: "Hành trình phổ biến",
    title: "Chuẩn bị trước hành lý và quyền lợi vé cho chuyến đi cuối tuần",
    summary:
      "Tập trung vào thông tin cần kiểm tra trước khi chốt vé: hành lý, đổi hoặc hoàn và các bước quản lý đặt chỗ.",
    cta: "Xem hướng dẫn",
    href: "/support#luu-y"
  },
  {
    tag: "Tự phục vụ",
    title: "Rút ngắn thao tác sau đặt vé với hồ sơ hành khách và thông báo tập trung",
    summary:
      "Hành khách có thể cập nhật hồ sơ, theo dõi thông báo và xem lại hoạt động tài khoản ngay trên website.",
    cta: "Mở tài khoản",
    href: "/register"
  },
  {
    tag: "Hỗ trợ",
    title: "Tra cứu nhanh điều kiện vé, FAQ và kênh liên hệ trước ngày bay",
    summary:
      "Những thông tin hay phát sinh được gom về một nơi để giảm thời gian tìm kiếm và chờ hỗ trợ.",
    cta: "Mở trung tâm hỗ trợ",
    href: "/support"
  }
];

export const destinations: TravelDestinationSummary[] = [
  {
    code: "SGN",
    city: "Thành phố Hồ Chí Minh",
    airport: "Tân Sơn Nhất",
    tagline: "Điểm đi linh hoạt cho nhiều hành trình nội địa",
    highlights: ["Lịch bay dày", "Nhiều khung giờ", "Thuận tiện nối chuyến"]
  },
  {
    code: "DAD",
    city: "Đà Nẵng",
    airport: "Đà Nẵng",
    tagline: "Phù hợp kỳ nghỉ ngắn ngày và đi cuối tuần",
    highlights: ["Biển", "Gia đình", "Ẩm thực địa phương"]
  },
  {
    code: "HAN",
    city: "Hà Nội",
    airport: "Nội Bài",
    tagline: "Thuận tiện cho công tác và khám phá văn hóa",
    highlights: ["Thành phố lớn", "Ẩm thực", "Di chuyển dễ"]
  },
  {
    code: "PQC",
    city: "Phú Quốc",
    airport: "Phú Quốc",
    tagline: "Ưu tiên nghỉ dưỡng và hành trình thư giãn",
    highlights: ["Biển đảo", "Nghỉ dưỡng", "Cặp đôi"]
  }
];

export const supportChannels: SupportItem[] = [
  {
    title: "Tổng đài hỗ trợ",
    description: "Phù hợp khi cần xác minh nhanh tình trạng đặt chỗ, đổi hoặc hoàn vé.",
    channel: "1900 6868"
  },
  {
    title: "Email hỗ trợ",
    description: "Gửi yêu cầu cần lưu vết hoặc đính kèm thông tin liên quan đến hành trình.",
    channel: "support@vietnam-airlines.vn"
  },
  {
    title: "Trung tâm hỗ trợ trên web",
    description: "Tra cứu nhanh FAQ, quy trình tự phục vụ và các lưu ý trước giờ bay.",
    channel: "Truy cập trên website"
  }
];

export const supportFaqs: FaqEntry[] = [
  {
    category: "Đặt vé",
    keywords: ["đổi chuyến", "đổi vé", "chênh lệch giá", "điều kiện vé"],
    question: "Tôi có thể đổi chuyến sau khi đã thanh toán không?",
    answer:
      "Có. Hệ thống sẽ kiểm tra điều kiện vé, chênh lệch giá và thời hạn xử lý trước khi cho phép xác nhận."
  },
  {
    category: "Thanh toán",
    isPopular: true,
    keywords: ["thanh toán", "giao dịch trùng", "booking trùng", "thanh toán lại"],
    question: "Nếu thanh toán bị gián đoạn thì booking có bị tạo trùng không?",
    answer:
      "Luồng xử lý hiện tại ưu tiên tránh giao dịch trùng hoặc ghi nhận trùng giao dịch. Khi có bất thường, bạn nên kiểm tra lại mã đặt chỗ hoặc liên hệ hỗ trợ."
  },
  {
    category: "Check-in",
    keywords: ["check-in", "làm thủ tục", "sân bay", "hành lý ký gửi"],
    question: "Khi nào nên đến sân bay thay vì chỉ làm thủ tục trực tuyến?",
    answer:
      "Bạn nên đến sớm nếu có hành lý ký gửi, cần hỗ trợ đặc biệt, đổi giấy tờ hoặc có thay đổi bất thường về chuyến bay."
  },
  {
    category: "Tra cứu",
    isPopular: true,
    keywords: ["mã đặt chỗ", "PNR", "tra cứu", "email liên hệ", "OTP"],
    question: "Tôi cần thông tin gì để tra cứu mã đặt chỗ?",
    answer:
      "Bạn cần nhập đúng mã đặt chỗ và email liên hệ đã dùng khi đặt vé. Nếu chưa đăng nhập, hệ thống có thể yêu cầu OTP để xác minh quyền xem booking."
  },
  {
    category: "OTP",
    isPopular: true,
    keywords: ["OTP", "không nhận được OTP", "mã xác minh", "hết hạn"],
    question: "Không nhận được OTP tra cứu thì xử lý thế nào?",
    answer:
      "Hãy kiểm tra email liên hệ, thư rác và thử gửi lại sau ít phút. Nếu OTP đã hết hạn hoặc nhập sai nhiều lần, bạn cần yêu cầu mã mới."
  },
  {
    category: "Hoàn vé",
    isPopular: true,
    keywords: ["hoàn vé", "hủy vé", "hoàn tiền", "phí hoàn", "trạng thái hoàn tiền"],
    question: "Tôi muốn hoàn vé hoặc hủy đặt chỗ thì cần làm gì?",
    answer:
      "Bạn nên tra cứu mã đặt chỗ để kiểm tra trạng thái vé, sau đó gửi yêu cầu hoàn/hủy kèm lý do và thông tin giao dịch nếu đã thanh toán."
  },
  {
    category: "Hành lý",
    keywords: ["hành lý", "hành lý ký gửi", "hành lý xách tay", "quá cân", "mua thêm hành lý"],
    question: "Tôi có thể mua thêm hành lý sau khi đặt vé không?",
    answer:
      "Có thể bổ sung hành lý nếu booking còn đủ điều kiện và chưa quá mốc xử lý. Hãy mở trang quản lý đặt chỗ để kiểm tra dịch vụ còn áp dụng."
  },
  {
    category: "Vé điện tử",
    isPopular: true,
    keywords: ["email vé", "vé điện tử", "hóa đơn", "biên nhận", "chưa nhận vé"],
    question: "Đã thanh toán nhưng chưa nhận email vé thì sao?",
    answer:
      "Bạn nên kiểm tra trạng thái thanh toán trong trang quản lý đặt chỗ và hộp thư rác. Nếu thanh toán đã thành công nhưng email vé điện tử hoặc hóa đơn chưa về, hãy liên hệ hỗ trợ kèm mã đặt chỗ."
  },
  {
    category: "Voucher",
    keywords: ["voucher", "mã giảm giá", "ưu đãi", "hội viên", "khuyến mãi"],
    question: "Vì sao mã giảm giá hoặc voucher không dùng được?",
    answer:
      "Voucher có thể phụ thuộc vào thời hạn sử dụng, tài khoản, hạng vé, chặng bay và trạng thái booking. Hãy kiểm tra điều kiện áp dụng trước khi thanh toán."
  },
  {
    category: "Hỗ trợ đặc biệt",
    keywords: ["xe lăn", "hỗ trợ đặc biệt", "phụ nữ mang thai", "trẻ em đi một mình", "y tế"],
    question: "Tôi cần hỗ trợ đặc biệt tại sân bay thì báo ở đâu?",
    answer:
      "Bạn nên liên hệ hỗ trợ đặc biệt càng sớm càng tốt, cung cấp mã đặt chỗ, thông tin hành khách cần hỗ trợ và mô tả nhu cầu cụ thể."
  }
];

export const supportFaqCategories = [
  "Tất cả",
  ...Array.from(new Set(supportFaqs.map((faq) => faq.category)))
];

export const bookingSteps: BookingStep[] = [
  {
    title: "Chọn chuyến bay",
    description: "Tìm chặng bay phù hợp theo ngày đi, điểm đến và giá mở đầu của hành trình.",
    status: "done"
  },
  {
    title: "Thông tin hành khách",
    description: "Nhập thông tin liên hệ và hồ sơ hành khách cần sử dụng cho booking.",
    status: "current"
  },
  {
    title: "Dịch vụ bổ trợ",
    description: "Bổ sung hành lý và kiểm tra các tiện ích còn được áp dụng trước khi thanh toán.",
    status: "upcoming"
  },
  {
    title: "Thanh toán và xuất vé",
    description: "Kiểm tra tổng tiền, phương thức thanh toán và trạng thái giữ chỗ.",
    status: "upcoming"
  }
];

export const fareComparisons: FareComparison[] = [
  {
    fareFamily: "pho_thong_tiet_kiem",
    title: "Phổ thông tiết kiệm",
    price: 1490000,
    perks: ["7kg hành lý xách tay", "Đổi vé có điều kiện", "Chọn ghế theo chính sách giá vé"]
  },
  {
    fareFamily: "pho_thong_linh_hoat",
    title: "Phổ thông linh hoạt",
    price: 1890000,
    perks: ["1 kiện 23kg", "Đổi vé linh hoạt hơn", "Ưu tiên giữ giá trong thời gian ngắn"]
  },
  {
    fareFamily: "thuong_gia",
    title: "Thương gia",
    price: 3490000,
    perks: ["2 kiện 32kg", "Phòng chờ", "Hoàn đổi linh hoạt"]
  }
];

export const ancillaries: AncillaryService[] = [
  {
    code: "BAG_23",
    name: "Hành lý ký gửi 23kg",
    description: "Mua trước trong luồng đặt vé hoặc bổ sung khi quản lý đặt chỗ.",
    price: 290000
  },
  {
    code: "MEAL_VN",
    name: "Suất ăn",
    description: "Bổ sung suất ăn phù hợp với hành trình và thời gian bay.",
    price: 180000
  }
];

export const manageActions: ManageAction[] = [
  {
    title: "Tra cứu tình trạng booking",
    description: "Xem lại mã đặt chỗ, trạng thái giữ chỗ và các bước cần xử lý tiếp theo.",
    rule: "Tra cứu theo mã đặt chỗ để xem trạng thái giữ chỗ, thanh toán và vé."
  },
  {
    title: "Kiểm tra dịch vụ đã chọn",
    description: "Xem lại các dịch vụ bổ trợ đã có trong booking như hành lý hoặc chỗ ngồi.",
    rule: "Chỉ hiển thị dịch vụ đã được ghi nhận trong mã đặt chỗ."
  },
  {
    title: "Theo dõi phương thức thanh toán",
    description: "Xem trạng thái thanh toán và các bước cần xử lý tiếp theo.",
    rule: "Yêu cầu hoàn vé được ghi nhận để nhân sự kiểm tra và phản hồi."
  }
];
