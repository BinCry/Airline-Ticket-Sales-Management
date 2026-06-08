import type { BackofficeModuleKey } from "@/lib/access-control";

export interface BackofficeModuleSummary {
  key: BackofficeModuleKey;
  title: string;
  summary: string;
  href: string;
  highlights: string[];
  roles: string[];
}

export const backofficeModules: BackofficeModuleSummary[] = [
  {
    key: "sales",
    title: "Bán vé nội bộ",
    summary: "Tra cứu đặt chỗ nội bộ, xem nhanh trạng thái thanh toán, vé và hồ sơ hành khách.",
    href: "/backoffice/sales",
    highlights: [
      "Tra cứu booking theo mã PNR",
      "Theo dõi trạng thái thanh toán",
      "Mở nhanh hồ sơ hành trình của khách"
    ],
    roles: ["customer_support"]
  },
  {
    key: "support",
    title: "Chăm sóc khách hàng",
    summary: "Theo dõi notification outbox, kiểm tra email vé lỗi và gửi lại khi cần.",
    href: "/backoffice/support",
    highlights: [
      "Xem danh sách email vé đã gửi",
      "Ưu tiên xử lý email lỗi",
      "Gửi lại email ngay từ backoffice"
    ],
    roles: ["customer_support"]
  },
  {
    key: "finance",
    title: "Đối soát và hoàn tiền",
    summary: "Duyệt hoàn vé, kiểm tra số tiền hoàn và tình trạng xử lý của từng yêu cầu.",
    href: "/backoffice/finance",
    highlights: [
      "Kiểm tra yêu cầu hoàn vé",
      "Duyệt hoặc từ chối theo hồ sơ thật",
      "Theo dõi trạng thái sau xử lý"
    ],
    roles: ["customer_support"]
  },
  {
    key: "cms",
    title: "Nội dung công khai",
    summary: "Rà soát các khối nội dung công khai đang phát hành trên trang chủ, hỗ trợ và cẩm nang.",
    href: "/backoffice/cms",
    highlights: [
      "Kiểm tra điều hướng công khai",
      "Rà soát FAQ và ưu đãi đang hiển thị",
      "Mở nhanh liên kết cuối trang"
    ],
    roles: ["customer_support"]
  },
  {
    key: "operations",
    title: "Điều hành chuyến bay và voucher",
    summary: "Theo dõi tình trạng chuyến bay, xử lý sự cố khai thác và quản lý voucher hội viên thuộc phạm vi vận hành.",
    href: "/backoffice/operations",
    highlights: [
      "Tra cứu chuyến bay theo mã hoặc ngày",
      "Kiểm tra trạng thái khai thác và mở bán",
      "Cấp, sửa hoặc thu hồi voucher hội viên"
    ],
    roles: ["operations_staff"]
  },
  {
    key: "revenue",
    title: "Quản lý doanh thu",
    summary: "Theo dõi doanh thu thực, số vé bán và số vé hoàn theo từng nhóm thời gian.",
    href: "/backoffice/revenue",
    highlights: [
      "Tổng hợp doanh thu đã thanh toán",
      "Trừ hoàn tiền đã duyệt",
      "Xem biểu đồ cột theo ngày hoặc tháng"
    ],
    roles: ["operations_staff"]
  },
  {
    key: "admin",
    title: "Quản trị hệ thống",
    summary: "Theo dõi số liệu thật, nhật ký thao tác và quản lý role, trạng thái tài khoản nội bộ.",
    href: "/backoffice/admin",
    highlights: [
      "Xem số liệu vận hành thật",
      "Cập nhật vai trò nhân sự",
      "Khóa hoặc mở khóa tài khoản"
    ],
    roles: ["operations_staff"]
  }
];
