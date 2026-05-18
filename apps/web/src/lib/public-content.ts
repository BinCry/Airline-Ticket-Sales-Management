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
  { label: "Tìm chuyến bay", href: "/search" },
  { label: "Đặt vé", href: "/search#dat-ve" },
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
    subtitle: "Chọn chặng bay, ngày đi và hạng vé theo nhu cầu thực tế.",
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
    cta: "Xem hướng dẫn"
  },
  {
    tag: "Tự phục vụ",
    title: "Rút ngắn thao tác sau đặt vé với hồ sơ hành khách và thông báo tập trung",
    summary:
      "Hành khách có thể cập nhật hồ sơ, theo dõi thông báo và xem lại hoạt động tài khoản ngay trên website.",
    cta: "Mở tài khoản"
  },
  {
    tag: "Hỗ trợ",
    title: "Tra cứu nhanh điều kiện vé, FAQ và kênh liên hệ trước ngày bay",
    summary:
      "Những thông tin hay phát sinh được gom về một nơi để giảm thời gian tìm kiếm và chờ hỗ trợ.",
    cta: "Mở trung tâm hỗ trợ"
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
    question: "Tôi có thể đổi chuyến sau khi đã thanh toán không?",
    answer:
      "Có. Hệ thống sẽ kiểm tra điều kiện vé, chênh lệch giá và thời hạn xử lý trước khi cho phép xác nhận."
  },
  {
    question: "Nếu thanh toán bị gián đoạn thì booking có bị tạo trùng không?",
    answer:
      "Luồng xử lý hiện tại ưu tiên tránh ghi nhận trùng giao dịch. Khi có bất thường, bạn nên kiểm tra lại mã đặt chỗ hoặc liên hệ hỗ trợ."
  },
  {
    question: "Khi nào nên đến sân bay thay vì chỉ làm thủ tục trực tuyến?",
    answer:
      "Bạn nên đến sớm nếu có hành lý ký gửi, cần hỗ trợ đặc biệt, đổi giấy tờ hoặc có thay đổi bất thường về chuyến bay."
  }
];

export const bookingSteps: BookingStep[] = [
  {
    title: "Chọn chuyến bay",
    description: "Tìm chặng bay phù hợp theo ngày đi, điểm đến và hạng vé.",
    status: "done"
  },
  {
    title: "Thông tin hành khách",
    description: "Nhập thông tin liên hệ và hồ sơ hành khách cần sử dụng cho booking.",
    status: "current"
  },
  {
    title: "Dịch vụ bổ trợ",
    description: "Bổ sung hành lý, chỗ ngồi và các tiện ích trước khi thanh toán.",
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
    code: "SEAT_PLUS",
    name: "Ghế hàng đầu",
    description: "Tăng không gian để chân và thuận tiện hơn khi lên hoặc xuống tàu bay.",
    price: 320000
  },
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
