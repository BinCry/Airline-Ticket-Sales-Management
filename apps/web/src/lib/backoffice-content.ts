import type { BackofficeModuleKey } from "@/lib/access-control";

export interface BackofficeModuleSummary {
  key: BackofficeModuleKey;
  title: string;
  summary: string;
  href: string;
  highlights: string[];
  roles: string[];
}

export interface BackofficeModuleDetail {
  title: string;
  summary: string;
  panels: Array<{
    title: string;
    items: string[];
  }>;
}

export const backofficeModules: BackofficeModuleSummary[] = [
  {
    key: "sales",
    title: "Bán vé nội bộ",
    summary: "Hỗ trợ nhân viên xử lý yêu cầu đặt chỗ và thao tác sau bán cho khách.",
    href: "/backoffice/sales",
    highlights: [
      "Tra cứu booking có xác minh",
      "Giữ chỗ và cập nhật liên hệ",
      "Theo dõi trạng thái thanh toán"
    ],
    roles: ["customer_support"]
  },
  {
    key: "support",
    title: "Chăm sóc khách hàng",
    summary: "Tiếp nhận yêu cầu hỗ trợ và phản hồi theo SLA nội bộ.",
    href: "/backoffice/support",
    highlights: [
      "Tạo và theo dõi yêu cầu hỗ trợ",
      "Lưu lịch sử trao đổi với khách",
      "Phân loại mức độ ưu tiên"
    ],
    roles: ["customer_support"]
  },
  {
    key: "finance",
    title: "Đối soát và hoàn tiền",
    summary: "Kiểm soát giao dịch và theo dõi trạng thái hoàn tiền cho booking đủ điều kiện.",
    href: "/backoffice/finance",
    highlights: [
      "Theo dõi giao dịch thanh toán",
      "Kiểm tra yêu cầu hoàn tiền",
      "Đối chiếu trạng thái callback"
    ],
    roles: ["customer_support"]
  },
  {
    key: "cms",
    title: "Nội dung công khai",
    summary: "Quản lý FAQ, hướng dẫn và nội dung hiển thị cho khu vực khách hàng.",
    href: "/backoffice/cms",
    highlights: [
      "Cập nhật FAQ hỗ trợ",
      "Kiểm tra nội dung trước khi phát hành",
      "Theo dõi lịch sử thay đổi"
    ],
    roles: ["customer_support"]
  },
  {
    key: "operations",
    title: "Điều hành chuyến bay",
    summary: "Quản lý giá, lịch bay, tồn ghế và trạng thái khai thác theo kế hoạch vận hành.",
    href: "/backoffice/operations",
    highlights: [
      "Điều chỉnh giá theo hạng vé",
      "Theo dõi tình trạng tồn ghế",
      "Cập nhật trạng thái chuyến bay"
    ],
    roles: ["operations_staff"]
  },
  {
    key: "admin",
    title: "Kiểm soát hệ thống",
    summary: "Theo dõi cấu hình phân quyền và nhật ký các thao tác nhạy cảm.",
    href: "/backoffice/admin",
    highlights: [
      "Kiểm tra quyền truy cập",
      "Xem nhật ký thao tác",
      "Kiểm soát cấu hình vận hành"
    ],
    roles: ["operations_staff"]
  }
];

export const backofficeModuleDetails: Record<BackofficeModuleKey, BackofficeModuleDetail> = {
  sales: {
    title: "Bán vé nội bộ",
    summary: "Phân hệ phục vụ nhân viên xử lý đặt chỗ thay mặt khách hàng.",
    panels: [
      {
        title: "Tác vụ hiện có",
        items: [
          "Tra cứu booking theo mã",
          "Xem trạng thái thanh toán",
          "Theo dõi lịch sử cập nhật liên hệ"
        ]
      }
    ]
  },
  support: {
    title: "Chăm sóc khách hàng",
    summary: "Phân hệ tiếp nhận và theo dõi yêu cầu hỗ trợ sau bán.",
    panels: [
      {
        title: "Tác vụ hiện có",
        items: [
          "Tiếp nhận yêu cầu hỗ trợ",
          "Theo dõi SLA phản hồi",
          "Ghi nhận trạng thái xử lý"
        ]
      }
    ]
  },
  finance: {
    title: "Đối soát và hoàn tiền",
    summary: "Phân hệ theo dõi giao dịch, đối soát callback và yêu cầu hoàn tiền.",
    panels: [
      {
        title: "Tác vụ hiện có",
        items: [
          "Xem giao dịch theo mã booking",
          "Kiểm tra callback thanh toán",
          "Theo dõi tiến trình hoàn tiền"
        ]
      }
    ]
  },
  cms: {
    title: "Nội dung công khai",
    summary: "Phân hệ quản lý nội dung FAQ và hướng dẫn cho khách hàng.",
    panels: [
      {
        title: "Tác vụ hiện có",
        items: [
          "Cập nhật FAQ hỗ trợ",
          "Điều chỉnh nội dung hướng dẫn",
          "Kiểm tra trạng thái phát hành"
        ]
      }
    ]
  },
  operations: {
    title: "Điều hành chuyến bay",
    summary: "Phân hệ phục vụ cập nhật kế hoạch khai thác và tồn ghế.",
    panels: [
      {
        title: "Tác vụ hiện có",
        items: [
          "Điều chỉnh giá theo chặng",
          "Theo dõi tồn ghế theo hạng",
          "Cập nhật trạng thái chuyến bay"
        ]
      }
    ]
  },
  admin: {
    title: "Kiểm soát hệ thống",
    summary: "Phân hệ giám sát quyền truy cập và nhật ký vận hành.",
    panels: [
      {
        title: "Tác vụ hiện có",
        items: [
          "Xem quyền truy cập theo vai trò",
          "Theo dõi nhật ký thao tác",
          "Kiểm tra cấu hình hệ thống"
        ]
      }
    ]
  }
};
