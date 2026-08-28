# KẾ HOẠCH TỔNG THỂ REFACTOR UI/UX HỆ THỐNG AIRTICKET

> **Nguyên tắc xuyên suốt**: Behavior-preserving UI refactor. Giữ nguyên 100% logic, hợp đồng API, RBAC, flow đặt vé, thanh toán, check-in, đổi/trả vé và xác thực. Không sửa backend.

---

## 1. LỘ TRÌNH TRIỂN KHAI THEO HỆ THỐNG (PHASE ROADMAP)

### Phase 1: Design Tokens, Layout Primitives & Color System Standardization
- **Mục tiêu**: Chuẩn hóa CSS Variables trong `apps/web/src/app/globals.css`:
  - Semantic Color Tokens: `--brand-primary`, `--brand-primary-hover`, `--brand-accent`, `--surface`, `--surface-muted`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-subtle`, `--border-strong`.
  - Semantic Status Tokens: `--status-success`, `--status-warning`, `--status-danger`, `--status-info`.
  - Spacing & Rhythm System: scale 8-point chuẩn (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `40px`, `48px`, `64px`).
  - Container & Max-width: Thống nhất `--container: min(1240px, calc(100vw - 32px))`, loại bỏ các max-width tùy tiện.
  - Typography scale: Tối ưu `clamp()` font-size cho heading và body, tăng tính phân cấp, đảm bảo WCAG AA contrast.

### Phase 2: Shared Layout, Navigation & Upgraded Footer
- **Mục tiêu**: Cải thiện Header, Main Navigation, Footer và các Shared Components:
  - `SiteHeader`: Tinh chỉnh topbar, navigation pill bar, menu tài khoản/avatar dropdown mượt mà, sticky header nhẹ nhàng.
  - `SiteFooter`:
    - Tái cấu trúc thông tin gọn gàng, thông thoáng.
    - **Tích hợp Kênh truyền thông Vietnam Airlines chính thức**: Facebook, Instagram, YouTube, TikTok, Zalo OA với SVG icons đẹp mắt, accessible `aria-label`, tooltip và `rel="noreferrer noopener"`.
    - Thêm disclaimer unobtrusive nếu cần, giữ trọn nhận diện thương hiệu.
  - Shared Components: `SectionHeading`, `StatusChip`, `HoldCountdown`, `DateField`, `PasswordField`, `ToastProvider`.

### Phase 3: Public Transactional Pages (Tìm kiếm & Đặt vé & Thanh toán)
- **Mục tiêu**: Nâng cấp trải nghiệm tìm chuyến, đặt vé và checkout:
  - **Trang Tìm kiếm & Kết quả (`/search`, `search-results-page-client.tsx`)**:
    - Tối ưu Search Toolbar gọn gàng, đưa kết quả chuyến bay lên ngay trong tầm mắt đầu tiên.
    - Làm sạch thẻ kết quả chuyến bay: loại bỏ ảnh icon nhỏ gây nhiễu, làm nổi bật timeline giờ bay, giá mở đầu và 3 hạng vé rõ ràng.
    - Bộ lọc (`filter-card`): sắp xếp nhóm giờ bay, ngân sách, số ghế dễ thao tác, có khoảng thở.
  - **Trang Đặt vé (`/booking`, `booking-page-client.tsx`)**:
    - Nhóm thông tin người liên hệ và hành khách trực quan.
    - Sơ đồ ghế cabin (`seat-map`): Căn chỉnh padding, kích thước nút ghế tối ưu cho cảm ứng và chuột, màu sắc vùng ghế theo từng hạng vé rõ ràng.
    - Thanh tổng tiền tạm tính và nút submit hành động nổi bật.
  - **Trang Thanh toán (`/booking/[pnr]/checkout/page.tsx`)**:
    - Bố cục thanh toán 2 cột cân đối: Cột chính hiển thị thông tin thanh toán, mã PNR, mã QR SePay, mã chuyển khoản; Cột phụ hiển thị voucher hội viên và ưu đãi.
    - Tối ưu thẻ đếm ngược giữ chỗ 15 phút.

### Phase 4: Auth & Account Flow (Login, Register, Forgot Password, My Account)
- **Mục tiêu**: Biến Form thành tâm điểm, giảm thiểu text phụ trợ rườm rà:
  - `AuthShell`: Giảm bớt các khối text marketing filler bên cột aside, tôn vinh form chính.
  - `LoginPage`: Form đăng nhập mật khẩu / Google OAuth sắc nét, thông báo lỗi/thành công trang nhã.
  - `RegisterPage`: Đăng ký tài khoản với `PasswordChecklist` sắc nét, dễ scan.
  - `ForgotPasswordPage`: Stepper 3 bước (Email -> OTP -> Mật khẩu mới) rõ ràng, hiển thị trạng thái từng bước mạch lạc.
  - `AccountPage (`/account`)`:
    - Tổ chức tab/section khoa học: Hồ sơ cá nhân, Đổi mật khẩu, Hành khách thường dùng, Hội viên Lotusmiles, Thông báo cá nhân.
    - Modal cập nhật hồ sơ và ảnh đại diện thân thiện, responsive.

### Phase 5: Self-Service Pages (Quản lý đặt chỗ, Check-in, Trạng thái bay, Support, Blog)
- **Mục tiêu**: Tinh gọn các trang tự phục vụ:
  - `ManageBookingPageClient`: Bố cục tra cứu PNR + OTP mượt mà; hiển thị chi tiết vé, thẻ lên tàu và modal yêu cầu hoàn vé chuyên nghiệp.
  - `CheckInPageClient`: Quy trình 2 bước tra cứu -> chọn vé check-in -> xem và tải Boarding Pass PDF nhanh chóng, không bị vỡ layout.
  - `FlightStatusPage`: Form tra cứu nhanh số hiệu chuyến bay / ngày, danh sách thẻ trạng thái bay phân cấp rõ ràng (Khởi hành, Đến, Cửa ra tàu, Trạng thái).
  - `SupportPage` & `SupportFaqSearch`: Tìm kiếm FAQ theo từ khóa/danh mục thông minh, accordion mở câu trả lời mượt mà, lưu ý trước giờ bay gọn gàng.
  - `BlogPage`: Lưới bài viết tin tức du lịch có tỉ lệ ảnh đồng nhất, thẻ tin tức cân đối, không bị lệch chiều cao.
  - `HomePage (`/`)`: Tinh chỉnh các section tiện ích, điểm đến, ưu đãi theo mùa với tỷ lệ cân đối, bỏ các đoạn text giải thích thừa thãi.

### Phase 6: Staff & Backoffice Experience (Bán vé, Hỗ trợ, Hoàn tiền, Vận hành, Doanh thu, CMS, Admin)
- **Mục tiêu**: Chuẩn hóa phong cách backoffice chuyên nghiệp, tinh tế, tiện dụng:
  - Thống nhất bảng dữ liệu (Data Tables): Header rõ, cell padding thoáng, số tiền căn phải, ngày tháng/trạng thái căn giữa, hành động gọn gàng.
  - Dashboard Metrics: Lưới KPI cards đồng đều chiều cao, nhịp điệu typography cân đối.
  - `BackofficeSalesPageClient`: Tra cứu booking và xuất vé hộ nhanh gọn.
  - `BackofficeFinancePageClient`: Quản lý yêu cầu hoàn vé với bảng phê duyệt/từ chối rõ ràng.
  - `BackofficeRevenuePageClient`: Tối ưu biểu đồ doanh thu SVG (Line chart / Bar chart), bộ lọc khoảng ngày/năm mượt mà.
  - `BackofficeOperationsPageClient` & `BackofficeAdminPageClient`: Phân quyền vai trò, quản lý trạng thái tài khoản, audit logs sạch sẽ.

### Phase 7: Responsive, Accessibility & Visual Polish
- **Mục tiêu**: Rà soát đa thiết bị và khả năng tiếp cận:
  - Kiểm tra 320px, 375px, 768px, 1024px, 1440px+: không tràn ngang, touch-target $\ge 44\text{px}$.
  - Hỗ trợ keyboard navigation (`focus-visible`), aria labels, semantic HTML.
  - Loại bỏ layout shift, tối ưu font rendering.

### Phase 8: Regression Testing & Build Verification
- **Mục tiêu**:
  - Chạy toàn bộ test suite (`npm run test:web` - 156 tests).
  - Kiểm tra build sản phẩm (`npm run build:web`).
  - Đảm bảo git diff **chỉ chứa frontend**, 0 file backend bị thay đổi, 0 contract API bị lệch.

---

## 2. QUY TẮC AN TOÀN CHO TỪNG BƯỚC THAY ĐỔI
1. Không sửa đổi tên component, props, hooks, event handlers (`onClick`, `onChange`, `onSubmit`), router hooks.
2. Không thay đổi endpoint URL, query parameter names, payload keys, local storage keys.
3. Sau mỗi phase thực hiện build và test để phát hiện lỗi ngay lập tức.
4. Mọi commit / báo cáo tuân thủ nghiêm ngặt quy tắc trong `AGENTS.md`.
