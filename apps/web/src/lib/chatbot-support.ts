import { supportChannels, supportFaqs } from "@/lib/public-content";
import { findMatchingFaqs } from "@/lib/support-faq-utils";

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

function getFaqActions(category: string): ChatbotAction[] {
  const faqAction = { href: "/support#faq", label: "Xem FAQ" };

  switch (category) {
    case "Voucher":
      return [faqAction, { href: "/account", label: "Mở tài khoản" }];
    case "Check-in":
      return [faqAction, { href: "/check-in", label: "Làm thủ tục" }];
    case "Hỗ trợ đặc biệt":
      return [faqAction, { href: "/support", label: "Liên hệ hỗ trợ" }];
    case "Đặt vé":
      return [faqAction, { href: "/search", label: "Tìm chuyến bay" }];
    case "Thanh toán":
    case "Tra cứu":
    case "OTP":
    case "Hoàn vé":
    case "Hành lý":
    case "Vé điện tử":
      return [faqAction, { href: "/manage-booking", label: "Quản lý đặt chỗ" }];
    default:
      return [faqAction, { href: "/support", label: "Liên hệ hỗ trợ" }];
  }
}

function findRelatedFaqs(text: string) {
  const results = findMatchingFaqs(supportFaqs, text, 3);

  if ((results[0]?.score ?? 0) < 10) {
    return [];
  }

  return results.filter((result) => result.score >= 5);
}

function buildRelatedFaqReply(results: ReturnType<typeof findRelatedFaqs>) {
  const intro =
    results.length >= 3
      ? "Mình tìm thấy 3 FAQ liên quan nhất:"
      : `Mình tìm thấy ${results.length} FAQ liên quan:`;

  return [
    intro,
    ...results.map((result, index) => {
      return `${index + 1}. ${result.faq.question}\n${result.faq.answer}`;
    })
  ].join("\n\n");
}

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
      { href: "/search", label: "Tìm chuyến bay" },
      { href: "/flight-status", label: "Tình trạng chuyến bay" }
    ],
    id: "route-and-schedule-search",
    keywords: [
      "lich bay",
      "lich trinh bay",
      "chuyen bay noi dia",
      "chang bay",
      "tuyen bay",
      "san bay di",
      "san bay den",
      "noi bai",
      "tan son nhat",
      "da nang",
      "phu quoc",
      "nha trang",
      "cam ranh",
      "hue",
      "can tho",
      "tp hcm",
      "sai gon",
      "ha noi"
    ],
    priority: 8,
    title: "Lịch bay và chặng bay",
    reply:
      "Bạn có thể tìm theo sân bay đi, sân bay đến, ngày bay và loại hành trình để xem các chuyến bay nội địa phù hợp. Nếu đã có mã chuyến bay, hãy mở trang tình trạng chuyến bay để kiểm tra giờ khởi hành, giờ hạ cánh và trạng thái khai thác.\n\nKhi không thấy chặng mong muốn, nên thử đổi ngày bay hoặc kiểm tra lại cách nhập tên thành phố, mã sân bay như HAN, SGN, DAD, PQC."
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
      { href: "/booking", label: "Tiếp tục đặt vé" },
      { href: "/manage-booking", label: "Kiểm tra giữ chỗ" }
    ],
    id: "seat-selection",
    keywords: [
      "chon ghe",
      "so do ghe",
      "ghe ngoi",
      "so ghe",
      "bi trung",
      "ghe trung",
      "trung ghe",
      "ghe bi trung",
      "ghe da co nguoi chon",
      "ghe khong kha dung",
      "khong kha dung",
      "bao khong kha dung",
      "doi ghe",
      "seat",
      "seat map",
      "window seat",
      "aisle seat",
      "gan cua so",
      "gan loi di",
      "giu ghe",
      "khoa ghe"
    ],
    priority: 8,
    title: "Chọn ghế",
    reply:
      "Khi chọn ghế, hệ thống kiểm tra sơ đồ ghế theo từng chặng bay và từng hành khách. Nếu ghế đã được người khác giữ hoặc không còn khả dụng, bạn cần chọn ghế khác trước khi tạo giữ chỗ.\n\nSau khi booking được tạo, hãy tra cứu lại mã đặt chỗ để kiểm tra danh sách ghế đã ghi nhận. Nếu trạng thái ghế không khớp, nên liên hệ hỗ trợ kèm mã đặt chỗ để nhân viên kiểm tra dữ liệu."
  },
  {
    actions: [
      { href: "/booking", label: "Nhập hành khách" },
      { href: "/support", label: "Xem lưu ý giấy tờ" }
    ],
    id: "passenger-documents",
    keywords: [
      "thong tin hanh khach",
      "sai ten",
      "sua ten",
      "ho ten",
      "ngay sinh",
      "gioi tinh",
      "so giay to",
      "cccd",
      "cmnd",
      "ho chieu",
      "passport",
      "giay khai sinh",
      "tre em",
      "em be",
      "infant",
      "child",
      "nguoi lon",
      "hanh khach di cung",
      "lien he dat ve"
    ],
    priority: 9,
    title: "Thông tin hành khách và giấy tờ",
    reply:
      "Thông tin hành khách cần khớp với giấy tờ dùng khi làm thủ tục. Với trẻ em hoặc em bé, nên kiểm tra ngày sinh và giấy tờ phù hợp trước khi thanh toán để tránh phải sửa booking sau đó.\n\nNếu đã nhập sai họ tên, ngày sinh hoặc giấy tờ, bạn nên tra cứu mã đặt chỗ rồi liên hệ hỗ trợ sớm. Nhân viên sẽ kiểm tra trạng thái vé và điều kiện xử lý theo từng hạng vé."
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
      "phien thanh toan",
      "thanh toan het han"
    ],
    priority: 10,
    title: "Thanh toán và xuất vé",
    reply:
      `${supportFaqs[1]?.answer ?? "Nếu thanh toán bị gián đoạn, bạn nên kiểm tra lại mã đặt chỗ trước khi thanh toán lại để tránh giao dịch trùng."}\n\n` +
      "Nếu hệ thống đã tạo mã đặt chỗ, hãy tra cứu lại booking trước khi thao tác tiếp để hạn chế rủi ro giao dịch trùng. Khi cần nhân viên kiểm tra thanh toán hoặc email vé, bạn có thể chuẩn bị mã đặt chỗ và liên hệ kênh hỗ trợ."
  },
  {
    actions: [
      { href: "/manage-booking", label: "Kiểm tra thanh toán" },
      { href: "/support", label: "Liên hệ hỗ trợ" }
    ],
    id: "payment-methods",
    keywords: [
      "phuong thuc thanh toan",
      "the ngan hang",
      "the tin dung",
      "chuyen khoan",
      "qr",
      "ma qr",
      "vi dien tu",
      "sepay",
      "webhook",
      "ma giao dich",
      "transaction",
      "cong thanh toan",
      "thanh toan bi loi",
      "bi loi thanh toan",
      "thanh toan that bai",
      "thanh toan thanh cong",
      "cho xac nhan",
      "cho thanh toan",
      "da tru tien",
      "chua cap nhat thanh toan",
      "khong cap nhat thanh toan"
    ],
    priority: 13,
    title: "Phương thức thanh toán",
    reply:
      "Nếu đã bị trừ tiền nhưng booking chưa cập nhật, bạn không nên tạo thêm giao dịch mới ngay. Hãy tra cứu mã đặt chỗ để kiểm tra trạng thái thanh toán và chuẩn bị mã giao dịch, thời gian thanh toán hoặc ảnh biên nhận khi liên hệ hỗ trợ.\n\nTrường hợp thanh toán thất bại hoặc hết thời gian giữ chỗ, hệ thống có thể yêu cầu tạo phiên thanh toán mới hoặc chọn lại chuyến bay tùy trạng thái booking."
  },
  {
    actions: [
      { href: "/manage-booking", label: "Tra cứu OTP" },
      { href: "/support", label: "Cần hỗ trợ thêm" }
    ],
    id: "booking-lookup-otp",
    keywords: [
      "otp tra cuu",
      "ma otp tra cuu",
      "otp booking",
      "otp dat cho",
      "xac minh booking",
      "xac minh dat cho",
      "email lien he",
      "khong nhan duoc otp",
      "otp het han",
      "otp sai",
      "gui lai otp",
      "lookup token",
      "token tra cuu",
      "khach chua dang nhap",
      "tra cuu bang email",
      "ma dat cho va email"
    ],
    priority: 10,
    title: "OTP tra cứu đặt chỗ",
    reply:
      "Khách chưa đăng nhập cần nhập mã đặt chỗ và email liên hệ để nhận OTP tra cứu. Sau khi xác minh OTP, hệ thống tạo token tra cứu tạm thời để bạn xem booking hoặc thao tác tự phục vụ trong thời gian cho phép.\n\nNếu không nhận được OTP, hãy kiểm tra email liên hệ trên booking, thư rác và thao tác gửi lại sau ít phút. Nếu OTP hết hạn hoặc nhập sai nhiều lần, bạn cần yêu cầu mã mới."
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
      { href: "/manage-booking", label: "Yêu cầu hoàn vé" },
      { href: "/support", label: "Liên hệ hỗ trợ" }
    ],
    id: "refund-and-cancel",
    keywords: [
      "hoan ve",
      "huy ve",
      "huy dat cho",
      "hoan tien",
      "refund",
      "cancel booking",
      "yeu cau hoan",
      "phi hoan",
      "phi huy",
      "khong bay nua",
      "doi lich",
      "doi ngay bay",
      "doi chuyen",
      "chuyen bay bi huy",
      "khach muon huy",
      "trang thai hoan tien"
    ],
    priority: 10,
    title: "Hoàn vé và hủy đặt chỗ",
    reply:
      "Hoàn vé hoặc hủy đặt chỗ phụ thuộc vào trạng thái thanh toán, trạng thái xuất vé và điều kiện hạng vé. Bạn nên tra cứu mã đặt chỗ trước để xem booking còn giữ chỗ, đã thanh toán hay đã xuất vé.\n\nKhi gửi yêu cầu hoàn vé, hãy chuẩn bị mã đặt chỗ, lý do hoàn/hủy và thông tin giao dịch nếu đã thanh toán. Nhân viên sẽ kiểm tra phí hoàn, điều kiện đổi hoàn và cập nhật trạng thái xử lý."
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
      { href: "/check-in", label: "Mở check-in" },
      { href: "/flight-status", label: "Kiểm tra chuyến bay" }
    ],
    id: "boarding-and-airport",
    keywords: [
      "ra san bay",
      "den san bay",
      "may gio ra san bay",
      "cong len may bay",
      "gate",
      "boarding time",
      "boarding pass",
      "the len may bay",
      "hanh ly ky gui tai san bay",
      "quay thu tuc",
      "quay check in",
      "an ninh soi chieu",
      "giay to len may bay",
      "di noi dia can giay to gi",
      "truoc gio bay",
      "dong quay"
    ],
    priority: 9,
    title: "Ra sân bay và lên máy bay",
    reply:
      "Trước khi ra sân bay, bạn nên kiểm tra tình trạng chuyến bay, chuẩn bị giấy tờ tùy thân và mã đặt chỗ hoặc thẻ lên máy bay. Nếu có hành lý ký gửi, cần đến sớm hơn để làm thủ tục tại quầy.\n\nSau khi check-in, hãy theo dõi cổng lên máy bay, thời gian boarding và thông báo thay đổi giờ bay để tránh lỡ chuyến."
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
      { href: "/manage-booking", label: "Xem email vé" },
      { href: "/support", label: "Gửi yêu cầu hỗ trợ" }
    ],
    id: "ticket-email-and-invoice",
    keywords: [
      "email ve",
      "gui lai ve",
      "chua nhan ve",
      "ve dien tu",
      "ma ve",
      "so ve",
      "ticket",
      "e ticket",
      "hoa don",
      "xuat hoa don",
      "bien lai",
      "invoice",
      "receipt",
      "file ve",
      "khong thay email",
      "mail ve",
      "thong bao ve"
    ],
    priority: 10,
    title: "Email vé và hóa đơn",
    reply:
      "Nếu chưa nhận được vé điện tử, hãy kiểm tra lại trạng thái thanh toán trong trang quản lý đặt chỗ và tìm trong hộp thư rác của email liên hệ. Khi thanh toán đã thành công nhưng email vé chưa về, bạn nên liên hệ hỗ trợ kèm mã đặt chỗ.\n\nVới yêu cầu hóa đơn hoặc biên nhận, hãy chuẩn bị thông tin booking, email nhận hóa đơn và thông tin thanh toán để nhân viên đối soát nhanh hơn."
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
      { href: "/account", label: "Mở voucher" },
      { href: "/manage-booking", label: "Áp dụng mã" }
    ],
    id: "voucher-and-loyalty",
    keywords: [
      "voucher",
      "ma giam gia",
      "coupon",
      "khuyen mai",
      "uu dai",
      "diem thuong",
      "tich diem",
      "hoi vien",
      "hang thanh vien",
      "loyalty",
      "member",
      "voucher cua toi",
      "an voucher",
      "ma voucher",
      "ap dung voucher",
      "khong dung duoc ma giam gia"
    ],
    priority: 9,
    title: "Voucher và hội viên",
    reply:
      "Voucher và ưu đãi thường phụ thuộc vào tài khoản, thời hạn sử dụng, hạng vé và trạng thái booking. Bạn nên đăng nhập, kiểm tra khu vực tài khoản và chỉ áp dụng mã khi booking còn đủ điều kiện.\n\nNếu mã giảm giá không dùng được, hãy kiểm tra ngày hết hạn, điều kiện chặng bay, giá trị tối thiểu và việc voucher đã được dùng hoặc bị ẩn khỏi tài khoản hay chưa."
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
    actions: [
      { href: "/manage-booking", label: "Xem dịch vụ" },
      { href: "/support", label: "Hỏi hỗ trợ" }
    ],
    id: "ancillary-services",
    keywords: [
      "dich vu bo tro",
      "dich vu them",
      "mua them dich vu",
      "suat an",
      "meal",
      "hanh ly them",
      "bag 23",
      "bag_23",
      "cho ngoi",
      "seat plus",
      "uu tien",
      "phong cho",
      "bao hiem",
      "them hanh ly sau khi dat",
      "doi dich vu",
      "huy dich vu bo tro"
    ],
    priority: 8,
    title: "Dịch vụ bổ trợ",
    reply:
      "Dịch vụ bổ trợ như hành lý ký gửi, suất ăn hoặc tiện ích đi kèm cần được kiểm tra theo từng booking và từng chặng bay. Một số dịch vụ chỉ áp dụng trước khi thanh toán hoặc trước mốc giờ làm thủ tục.\n\nNếu muốn thêm, đổi hoặc hủy dịch vụ bổ trợ sau khi đặt vé, hãy tra cứu mã đặt chỗ để xem dịch vụ đã ghi nhận và liên hệ hỗ trợ nếu hệ thống chưa cho thao tác trực tiếp."
  },
  {
    actions: [
      { href: "/support", label: "Mở trang hỗ trợ" },
      { href: "/manage-booking", label: "Tra cứu booking" }
    ],
    id: "special-assistance",
    keywords: [
      "ho tro dac biet",
      "xe lan",
      "nguoi khuyet tat",
      "phu nu mang thai",
      "me bau",
      "nguoi cao tuoi",
      "tre em di mot minh",
      "unaccompanied minor",
      "thu cung",
      "vat nuoi",
      "y te",
      "can oxy",
      "di cung em be",
      "ho tro tai san bay",
      "can nhan vien ho tro"
    ],
    priority: 9,
    title: "Hỗ trợ đặc biệt",
    reply:
      "Các yêu cầu hỗ trợ đặc biệt như xe lăn, trẻ em đi một mình, phụ nữ mang thai, hành khách cần hỗ trợ y tế hoặc hỗ trợ tại sân bay nên được báo sớm trước giờ bay.\n\nBạn hãy chuẩn bị mã đặt chỗ, thông tin hành khách cần hỗ trợ và mô tả nhu cầu cụ thể. Nhân viên sẽ kiểm tra điều kiện phục vụ theo chuyến bay và hướng dẫn bước tiếp theo."
  },
  {
    actions: [
      { href: "/account", label: "Mở tài khoản" },
      { href: "/support", label: "Báo sự cố" }
    ],
    id: "security-and-notifications",
    keywords: [
      "bao mat",
      "xac thuc",
      "ma xac minh",
      "otp dang nhap",
      "otp quen mat khau",
      "khong nhan duoc email",
      "email xac minh",
      "thong bao",
      "notification",
      "phien dang nhap",
      "dang xuat",
      "tai khoan bi khoa",
      "khong vao duoc tai khoan",
      "loi dang nhap",
      "doi email",
      "doi so dien thoai"
    ],
    priority: 8,
    title: "Bảo mật tài khoản và thông báo",
    reply:
      "Nếu gặp lỗi đăng nhập, không nhận được mã xác minh hoặc nghi ngờ tài khoản bị truy cập bất thường, bạn nên đổi mật khẩu và kiểm tra lại email, số điện thoại trong hồ sơ tài khoản.\n\nKhông chia sẻ OTP cho người khác. Khi cần hỗ trợ, hãy gửi yêu cầu kèm email tài khoản và mô tả lỗi, nhưng không gửi mật khẩu hoặc mã OTP đang còn hiệu lực."
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
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("vi-VN");

  return expandCommonShortcuts(normalized);
}

function expandCommonShortcuts(value: string) {
  return value
    .replace(/\b(k|ko|khg|khongg)\b/g, "khong")
    .replace(/\bdc\b/g, "duoc")
    .replace(/\bmk\b/g, "mat khau")
    .replace(/\btk\b/g, "tai khoan")
    .replace(/\btt\b/g, "thanh toan")
    .replace(/\bhd\b/g, "hoa don");
}

function tokenize(value: string) {
  return value.split(/[\s-]+/).filter(Boolean);
}

function getAllowedTokenDistance(token: string) {
  if (token.length >= 7) {
    return 2;
  }

  if (token.length >= 4) {
    return 1;
  }

  return 0;
}

function hasSingleAdjacentTransposition(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length - 1; index++) {
    if (
      left[index] !== right[index] &&
      left[index] === right[index + 1] &&
      left[index + 1] === right[index]
    ) {
      return (
        left.slice(0, index) === right.slice(0, index) &&
        left.slice(index + 2) === right.slice(index + 2)
      );
    }
  }

  return false;
}

function getEditDistanceWithinLimit(left: string, right: string, limit: number) {
  if (Math.abs(left.length - right.length) > limit) {
    return limit + 1;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    let rowMinimum = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const distance = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost
      );

      current[rightIndex] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > limit) {
      return limit + 1;
    }

    for (let index = 0; index < current.length; index++) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function isCloseToken(keywordToken: string, textToken: string) {
  if (keywordToken === textToken) {
    return true;
  }

  const allowedDistance = getAllowedTokenDistance(keywordToken);

  if (allowedDistance === 0 || textToken.length < 4) {
    return false;
  }

  if (hasSingleAdjacentTransposition(keywordToken, textToken)) {
    return true;
  }

  return getEditDistanceWithinLimit(keywordToken, textToken, allowedDistance) <= allowedDistance;
}

function countCloseTokens(keywordTokens: string[], textTokens: string[]) {
  return keywordTokens.filter((keywordToken) =>
    textTokens.some((textToken) => isCloseToken(keywordToken, textToken))
  ).length;
}

function scoreFuzzyKeyword(normalizedKeyword: string, text: string) {
  const keywordTokens = tokenize(normalizedKeyword);
  const textTokens = tokenize(text);

  if (keywordTokens.length === 0 || textTokens.length === 0) {
    return 0;
  }

  const matchedTokenCount = countCloseTokens(keywordTokens, textTokens);
  const significantTokens = keywordTokens.filter((token) => token.length >= 4);
  const matchedSignificantTokenCount = countCloseTokens(significantTokens, textTokens);
  const hasFirstTokenMatch = textTokens.some((textToken) =>
    isCloseToken(keywordTokens[0], textToken)
  );

  if (matchedTokenCount === keywordTokens.length) {
    return 0.85 + Math.min(3, keywordTokens.length) + normalizedKeyword.length / 80;
  }

  if (
    keywordTokens.length >= 3 &&
    hasFirstTokenMatch &&
    matchedTokenCount >= keywordTokens.length - 1 &&
    (significantTokens.length === 0 || matchedSignificantTokenCount >= 1)
  ) {
    return 0.65 + Math.min(2, matchedTokenCount) + normalizedKeyword.length / 120;
  }

  if (
    significantTokens.length >= 2 &&
    hasFirstTokenMatch &&
    matchedSignificantTokenCount === significantTokens.length
  ) {
    return 0.75 + Math.min(2, matchedSignificantTokenCount) + normalizedKeyword.length / 120;
  }

  if (
    keywordTokens.length === 1 &&
    significantTokens.length === 1 &&
    matchedSignificantTokenCount === 1
  ) {
    return 0.75 + normalizedKeyword.length / 80;
  }

  return 0;
}

function scoreKeyword(keyword: string, text: string) {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) {
    return 0;
  }

  if (text.includes(normalizedKeyword)) {
    return 1 + Math.min(4, normalizedKeyword.split(" ").length) + normalizedKeyword.length / 40;
  }

  return scoreFuzzyKeyword(normalizedKeyword, text);
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

  const relatedFaqs = findRelatedFaqs(latestUserMessage);

  if (relatedFaqs.length > 0) {
    return {
      actions: getFaqActions(relatedFaqs[0].faq.category).slice(0, 2),
      reply: buildRelatedFaqReply(relatedFaqs)
    };
  }

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
