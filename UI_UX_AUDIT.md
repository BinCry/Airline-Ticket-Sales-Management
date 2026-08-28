# BÁO CÁO TOÀN DIỆN AUDIT UI/UX VÀ HỆ THỐNG GIAO DIỆN AIRTICKET

> **Dự án**: Hệ thống quản lý bán vé máy bay AirTicket (Mô phỏng dịch vụ Vietnam Airlines)  
> **Website tham chiếu**: `https://airticket.bincrydev.id.vn/`  
> **Mục tiêu**: Behavior-preserving UI/UX Refactor — Nâng cấp giao diện sạch đẹp, thoáng đãng, cân đối, chuẩn hóa màu sắc và khoảng thở, giảm chữ thừa nhưng **bảo toàn 100% nghiệp vụ, API contract, logic và backend**.

---

## 1. QUÉT KIẾN TRÚC FRONTEND & HẠ TẦNG

### 1.1 Công nghệ cốt lõi
- **Framework**: Next.js 16.2.6 (App Router, React 19.2.4, TypeScript 5.9.3).
- **Kiến trúc Monorepo**: `npm workspaces` gồm `apps/web` và `packages/shared-types`.
- **Styling Solution**: Vanilla CSS Module / Global CSS (`globals.css`) kết hợp CSS Custom Properties (Design Tokens), không dùng TailwindCSS.
- **Icon Library**: Pure SVG Components nội bộ (`utility-icons.tsx`), không tải CDN bên ngoài, tối ưu hiệu năng và tải trang cực nhanh.
- **State Management & Data Fetching**: React Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `startTransition`), native `fetch` client thông qua `api-client.ts`, Server Components kết hợp Client Components (`"use client"`).
- **Authentication & Permissions**: JWT Cookie/Session lưu trong `localStorage` / cookie, cơ chế `auth-session.ts` và `access-control.ts` bảo vệ route, RBAC theo vai trò và permission.
- **Testing Suite**: Vitest (156 unit tests), Playwright (E2E tests).

---

## 2. ROUTE INVENTORY THEO VAI TRÒ THỰC TẾ TRONG SOURCE CODE

Dựa trên phân tích `packages/shared-types` (`USER_ROLES`, `STAFF_ROLES`), `apps/web/src/lib/access-control.ts` và `apps/web/src/app/**`:

| Vai trò (Role) | Tuyến đường (Route) | Page Component / Client Handler | Shared Layout / Shell | Chức năng chính |
| :--- | :--- | :--- | :--- | :--- |
| **PUBLIC (Khách vãng lai / Guest)** | `/` | `apps/web/src/app/page.tsx` (`HomePage`) | `RootLayout` (`SiteHeader`, `SiteFooter`, `ChatbotWidget`) | Trang chủ, banner thương hiệu, tìm kiếm chuyến bay nhanh, trạng thái vận hành, tiện ích, ưu đãi, tin tức du lịch, cẩm nang |
| **PUBLIC** | `/search` | `apps/web/src/components/search-results-page-client.tsx` | `RootLayout` | Tìm kiếm chuyến bay, lọc kết quả (giờ bay, ngân sách, số ghế), so sánh 3 hạng vé (Tiết kiệm, Linh hoạt, Thương gia), chuyển tiếp đặt vé |
| **PUBLIC** | `/booking` | `apps/web/src/components/booking-page-client.tsx` | `RootLayout` | Đặt vé hành khách: tóm tắt chuyến đi, nhập thông tin liên hệ, danh sách hành khách, chọn hạng vé và sơ đồ ghế ngồi từng chặng |
| **PUBLIC** | `/booking/[pnr]/checkout` | `apps/web/src/app/booking/[pnr]/checkout/page.tsx` | `RootLayout` | Thanh toán đặt chỗ: đếm ngược giữ chỗ 15 phút, hiển thị mã QR SePay, áp mã voucher hội viên, xác nhận chuyển khoản |
| **PUBLIC** | `/manage-booking` | `apps/web/src/components/manage-booking-page-client.tsx` | `RootLayout` | Quản lý đặt chỗ: tra cứu PNR + email/OTP, xem chi tiết hành trình, vé, thẻ lên máy bay, gửi yêu cầu hoàn vé |
| **PUBLIC** | `/check-in` | `apps/web/src/components/check-in-page-client.tsx` | `RootLayout` | Làm thủ tục trực tuyến: tra cứu mã đặt chỗ, chọn vé check-in, xuất thẻ lên tàu (Boarding Pass) PDF |
| **PUBLIC** | `/flight-status` | `apps/web/src/app/flight-status/page.tsx` | `RootLayout` | Tra cứu trạng thái chuyến bay: tìm theo số hiệu chuyến bay / ngày, xem lịch cất cánh, hạ cánh, cửa ra máy bay |
| **PUBLIC** | `/blog` | `apps/web/src/app/blog/page.tsx` | `RootLayout` | Cẩm nang du lịch: danh sách bài báo du lịch tiếng Việt, thẻ ưu đãi theo mùa |
| **PUBLIC** | `/support` | `apps/web/src/app/support/page.tsx` | `RootLayout` | Trung tâm hỗ trợ: tìm kiếm FAQ theo danh mục/từ khóa, quy định hành lý, điều kiện vé, thông tin sân bay |
| **AUTH (Khách / Hội viên)** | `/login` | `apps/web/src/app/login/page.tsx` | `AuthShell` + `RootLayout` | Đăng nhập tài khoản mật khẩu / OAuth Google |
| **AUTH (Khách)** | `/register` | `apps/web/src/app/register/page.tsx` | `AuthShell` + `RootLayout` | Đăng ký tài khoản khách hàng mới, kiểm tra độ mạnh mật khẩu |
| **AUTH (Khách)** | `/forgot-password` | `apps/web/src/app/forgot-password/page.tsx` | `AuthShell` + `RootLayout` | Quên mật khẩu: luồng 3 bước (Email -> OTP -> Đặt mật khẩu mới) |
| **AUTH (Khách)** | `/oauth/callback` | `apps/web/src/app/oauth/callback/page.tsx` | `RootLayout` | Xử lý token chuyển tiếp sau đăng nhập Google/OAuth |
| **AUTHENTICATED (Customer / Member)** | `/account` | `apps/web/src/app/account/page.tsx` | `RootLayout` | Hồ sơ cá nhân: đổi thông tin, tải avatar, đổi mật khẩu, danh sách hành khách thường dùng, điểm thưởng/hội viên Lotusmiles, danh sách voucher, thông báo cá nhân |
| **STAFF (CSKH / Vận hành)** | `/backoffice` | `apps/web/src/app/backoffice/page.tsx` | `RootLayout` (`SiteHeader-staff`) | Tổng quan phân hệ nội bộ được cấp quyền trong phiên |
| **STAFF (`customer_support`)** | `/backoffice/sales` | `apps/web/src/components/backoffice-sales-page-client.tsx` | `RootLayout` | Đặt vé hộ khách, tra cứu booking, phát hành vé hộ |
| **STAFF (`customer_support`)** | `/backoffice/support` | `apps/web/src/components/backoffice-support-page-client.tsx` | `RootLayout` | Notification Outbox: danh sách email vé, kiểm tra trạng thái và kích hoạt gửi lại email lỗi |
| **STAFF (`customer_support`)** | `/backoffice/finance` | `apps/web/src/components/backoffice-finance-page-client.tsx` | `RootLayout` | Quản lý hoàn tiền: duyệt hoặc từ chối yêu cầu hoàn vé, ẩn yêu cầu đã giải quyết |
| **STAFF (`customer_support`)** | `/backoffice/cms` | `apps/web/src/components/backoffice-cms-page-client.tsx` | `RootLayout` | Quản lý nội dung công khai: banner, bài viết, câu hỏi thường gặp |
| **STAFF (`operations_staff`)** | `/backoffice/operations` | `apps/web/src/components/backoffice-operations-page-client.tsx` | `RootLayout` | Điều hành bay: cập nhật trạng thái bay, cửa ra máy bay, quản lý kho voucher khuyến mãi |
| **STAFF (`operations_staff`)** | `/backoffice/revenue` | `apps/web/src/components/backoffice-revenue-page-client.tsx` | `RootLayout` | Báo cáo doanh thu: biểu đồ doanh thu theo ngày/tháng, số vé bán/hoàn, doanh thu thuần |
| **STAFF (`operations_staff`)** | `/backoffice/admin` | `apps/web/src/components/backoffice-admin-page-client.tsx` | `RootLayout` | Quản trị hệ thống: phân quyền vai trò người dùng, khóa/mở tài khoản, xem audit log |

---

## 3. FUNCTION INVENTORY CHI TIẾT THEO TỪNG MÀN HÌNH

| Màn hình (Route) | Controls & Interactive UI Elements | API / Mutation / Triggers | Ràng buộc nghiệp vụ cần bảo toàn |
| :--- | :--- | :--- | :--- |
| **Trang chủ (`/`)** | Panel tìm chuyến bay (`FlightSearchPanel`), tab Một chiều/Khứ hồi, gợi ý sân bay, bộ đếm hành khách, links điều hướng nhanh, thẻ bài viết, thẻ ưu đãi, chatbot widget | `GET /api/airports`, `GET /api/public-content`, `GET /api/articles` | Không đổi params URL tìm kiếm, giữ nguyên bộ dữ liệu và hành động đặt vé/tra cứu |
| **Tìm kiếm (`/search`)** | Toolbar cập nhật hành trình, chọn nhanh tuyến/sân bay, bộ đếm hành khách (1-9 khách, tỷ lệ em bé $\le$ người lớn), filter giờ bay, filter khoảng giá, filter số ghế, chọn chuyến đi, chọn chuyến về, CTA "Chọn chuyến này" | `GET /api/flights/search`, URL Sync qua Query String | Giữ nguyên logic filter `locDanhSachChuyenBay`, handoff URL sang `/booking`, hỗ trợ tham số `backofficeSalesFlow` |
| **Đặt vé (`/booking`)** | Form người liên hệ (họ tên, email, SĐT), danh sách form hành khách (CCCD, Hộ chiếu, Giấy khai sinh, ngày sinh), tabs chọn hành khách từng chặng, thẻ chọn 3 hạng vé, sơ đồ ghế cabin máy bay (ghế hợp lệ, ghế đã đặt, ghế hành khách khác chọn), tính tổng tiền realtime, nút "Tiếp tục / Giữ chỗ", nút "Xác nhận đặt vé hộ" (dành cho CSKH) | `GET /api/flights/[id]/booking-options`, `POST /api/bookings/hold` | Giữ nguyên payload đặt vé, validation giấy tờ, logic chọn ghế và phân quyền đặt vé hộ |
| **Thanh toán (`/booking/[pnr]/checkout`)** | Bộ đếm ngược giữ chỗ 15 phút, hiển thị mã QR SePay, mã chuyển khoản, nút "Tôi đã hoàn tất thanh toán", ô nhập mã voucher, danh sách voucher hội viên kèm nút "Áp voucher" / "Bỏ voucher", xử lý khi hết hạn giữ chỗ | `GET /api/bookings/[pnr]/payment-session`, `POST /api/bookings/[pnr]/voucher`, `DELETE /api/bookings/[pnr]/voucher`, `POST /api/bookings/[pnr]/confirm-local-payment` | Giữ nguyên luồng thanh toán SePay, cơ chế auto-poll / callback, quy tắc áp voucher |
| **Quản lý vé (`/manage-booking`)** | Form tra cứu mã PNR + email, gửi mã OTP email, xác thực OTP, xem tóm tắt booking, danh sách vé, nút "Gửi yêu cầu hoàn vé", modal nhập lý do hoàn tiền | `GET /api/manage-booking/[pnr]`, `POST /api/manage-booking/otp/request`, `POST /api/manage-booking/otp/verify`, `POST /api/bookings/refund-request` | Giữ nguyên trạng thái booking, phân biệt có session / khách tra cứu bằng OTP |
| **Làm thủ tục (`/check-in`)** | Form tra cứu PNR + email/OTP, danh sách vé đủ điều kiện check-in, checkbox chọn vé, nút "Xác nhận làm thủ tục", danh sách Boarding Pass, nút "Tải Boarding Pass (PDF)" | `POST /api/checkin`, `xuatBoardingPassPdf` | Giữ nguyên điều kiện check-in 24h trước giờ bay, logic sinh mã vạch và tải file PDF |
| **Trạng thái bay (`/flight-status`)** | Form tra cứu số hiệu chuyến bay, chọn ngày, nút tra cứu nhanh chuyến bay hôm nay, danh sách thẻ trạng thái bay | `GET /api/flights/status` | Giữ nguyên chip trạng thái, giờ khởi hành/hạ cánh, cửa ra tàu |
| **Tài khoản (`/account`)** | Chỉnh sửa tên hiển thị + SĐT, modal tải ảnh đại diện (avatar), form đổi mật khẩu với `PasswordChecklist`, CRUD hành khách thường dùng, xem điểm Lotusmiles, danh sách voucher (nút ẩn voucher đã dùng), danh sách thông báo cá nhân | `GET /api/my-account/profile`, `PUT /api/my-account/profile`, `POST /api/my-account/avatar`, `PUT /api/my-account/password`, CRUD `/api/my-account/passengers`, `GET /api/my-account/notifications` | Bảo toàn toàn bộ policy mật khẩu (10+ ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt, không chứa thông tin cá nhân) |
| **Backoffice modules** | Các bảng dữ liệu (Users, Flights, Vouchers, Refunds, Notifications, Bookings), các modal thao tác, form tạo mới/chỉnh sửa, các action duyệt/hủy/gửi lại/xóa | Toàn bộ API Client tương ứng trong `lib/backoffice-*-api.ts` | Giữ nguyên RBAC, quyền hạn từng vai trò, không đổi endpoint hay payload |

---

## 4. CHI TIẾT CÁC ĐIỂM CẦN CẢI THIỆN (UI/UX AUDIT & PROBLEM MAPPING)

### 4.1 Trang chủ (Homepage) & Navigation
- **Vấn đề 1: Trọng lượng chữ quá dày đặc**: Các section như "Điểm đến & chiến dịch", "Chuẩn bị trước giờ bay" có nhiều tầng tiêu đề (Eyebrow + Heading to + Description 2-3 câu + Card Heading + Card Description + List highlights).
- **Vấn đề 2: Hero Section mất tập trung**: Bảng thông số `heroStats` và thẻ hình ảnh máy bay chiếm nhiều không gian bên trái, cạnh tranh mạnh mẽ với `FlightSearchPanel` bên phải.
- **Vấn đề 3: Card Spacing & Nhịp điệu trực quan**: Khoảng cách giữa các khối `tien-ich-card`, `spotlight-card` chưa đồng nhất về độ thở; một số nút CTA và chip bị rải rác.
- **Giải pháp**: Tinh chỉnh typography, làm gọn các đoạn copy mô tả hiển nhiên, tăng độ nổi bật cho `FlightSearchPanel`, chuẩn hóa nhịp padding/margin hệ 8-point.

### 4.2 Trang Tìm kiếm & Kết quả (`/search`)
- **Vấn đề 1: Search Toolbar quá cao**: Chiếm tới 70-80% màn hình đầu tiên trên Desktop do có cả "Điểm đi phổ biến" (6 chips), "Điểm đến phổ biến" (6 chips) và 9 nút "Tuyến phổ biến", đẩy danh sách chuyến bay xuống dưới nếp gấp màn hình (fold).
- **Vấn đề 2: Card lặp thông báo dư thừa**: Thẻ `"{flights.length} chuyến bay phù hợp"` được tạo như một card riêng đứng độc lập trước danh sách thẻ chuyến bay.
- **Vấn đề 3: Thẻ kết quả chuyến bay chứa hình ảnh minh họa nhỏ không cần thiết**: Thẻ kết quả chèn ảnh `ticket.jpg` và `pho-thong-tiet-kiem...` bên trong metric card nhỏ, làm chật chội và rối mắt.
- **Giải pháp**: Tối ưu layout Search Toolbar gọn gàng, đưa kết quả chuyến bay lên cao hơn; loại bỏ ảnh thu nhỏ trong metric card chuyến bay; hiển thị rõ ràng timeline khởi hành/hạ cánh và 3 hạng vé.

### 4.3 Trang Đặt vé (`/booking`) & Thanh toán (`/checkout`)
- **Vấn đề 1: Độ dài biểu mẫu hành khách**: Khi chọn 3-4 hành khách khứ hồi, trang trở nên cực kỳ dài do lặp lại các form card và sơ đồ ghế máy bay.
- **Vấn đề 2: Sơ đồ ghế (Seat Map)**: Khung cabin máy bay trực quan nhưng cần padding và khoảng cách bấm ghế trên Mobile/Tablet chuẩn hơn để không bị lệch ngón tay.
- **Vấn đề 3: Checkout Page**: Thẻ đếm ngược nổi `HoldCountdown` và khối QR SePay cần phân cấp thị giác rõ: Số tiền cần thanh toán + Mã QR + Mã chuyển khoản là trọng tâm, danh sách voucher là thứ cấp.
- **Giải pháp**: Tăng tính nhóm gộp cho form hành khách, cải thiện visual hierarchy thanh toán, tối ưu touch-target cho sơ đồ ghế.

### 4.4 Các trang Xác thực (Login / Register / Forgot Password)
- **Vấn đề 1: Side content lấn át Form**: Cột bên trái của `AuthShell` chứa quá nhiều nội dung (3 Stat cards + 1 Security Card to + Trust points), làm lu mờ biểu mẫu thao tác chính ở cột bên phải.
- **Vấn đề 2: Hộp hỗ trợ dư thừa**: Bên dưới form đăng nhập/đăng ký lại có thêm một hộp `auth-support-box` to chiếm diện tích.
- **Vấn đề 3: Stepper Forgot Password**: Cần hiển thị tiến trình gọn gàng, rõ ràng hơn để người dùng biết mình đang ở bước nào (Nhập Email -> Nhập OTP -> Đặt lại Mật khẩu).
- **Giải pháp**: Thu gọn nội dung phụ trợ của `AuthShell`, biến form thành trung tâm thị giác, chuẩn hóa `PasswordChecklist` sắc nét, dễ scan.

### 4.5 Trang Tài khoản (`/account`) & Quản lý
- **Vấn đề 1: Bố cục dài và nhiều tầng**: Trang tài khoản chứa đồng thời thông tin cá nhân, avatar, đổi mật khẩu, hành khách thường dùng, hội viên và thông báo.
- **Vấn đề 2: Modal cập nhật**: Modal đổi mật khẩu và sửa hồ sơ cần căn chỉnh backdrop và chiều cao tối đa phù hợp trên màn hình nhỏ.
- **Giải pháp**: Chuẩn hóa card layout, nhóm các tác vụ hợp lý, tinh chỉnh responsive modal.

### 4.6 Các trang Backoffice / Quản trị nội bộ
- **Vấn đề 1: Bảng dữ liệu (Data Tables)**: Một số cột hành động dồn nhiều button kích thước lớn; cần chuẩn hóa padding cell, căn phải cho số tiền/doanh thu, căn giữa cho trạng thái.
- **Vấn đề 2: Dashboard Grid & Metric Cards**: Các thẻ thống kê đôi khi có chiều cao không đều, tạo khoảng trắng trống không tự nhiên.
- **Giải pháp**: Chuẩn hóa chuẩn bảng dữ liệu (Header gọn, row height cân đối, numeric right-aligned), chuẩn hóa CSS Grid cho Dashboard KPI metrics.

---

## 5. AUDIT HỆ THỐNG MÀU SẮC (COLOR SYSTEM AUDIT)

### 5.1 Nhận diện thương hiệu cốt lõi (Preserve Brand Identity)
Website mang nhận diện hàng không Việt Nam (Vietnam Airlines):
- **Màu thương hiệu chính (Brand Primary)**: Xanh dương đậm truyền thống Vietnam Airlines:
  - Deep Navy Primary: `#123d69` / `#0c223d` / `#1a588b`
- **Màu nhấn thương hiệu (Brand Accent)**: Vàng kim hoa sen:
  - Lotus Gold Accent: `#caa45f` / `#e1c381` / `#b8924b`
- **Nền & Bề mặt (Surface & Background)**:
  - Background sáng thoáng: `#fbfaf6` -> `#f4f2eb` -> `#ffffff`
  - Deep Dark Navy (cho Hero/Footer/Banner tối): `#081b32` -> `#0c223d` -> `#133357`
- **Chữ & Văn bản (Typography Colors)**:
  - Text Primary (Độ tương phản cao, dễ đọc): `#13243b` (Tương phản > 10:1 trên nền trắng, đạt chuẩn WCAG AAA)
  - Text Muted / Secondary: `#5e6b7c` -> `#4a5768` (Đạt chuẩn WCAG AA > 4.5:1)
  - Text Light (trên nền dark): `#f7f3ea` / `#ffffff`

### 5.2 Màu sắc hạng vé (Fare Families)
- **Phổ thông tiết kiệm**: `#2f7d72` (Teal Green)
- **Phổ thông linh hoạt**: `#496f9f` (Steel Blue)
- **Thương gia (Business)**: `#a77b34` (Royal Gold/Bronze)

### 5.3 Màu trạng thái nghiệp vụ (Semantic Status Colors)
- **Thành công (Success / Đã thanh toán / Đã xuất vé / Đúng giờ)**: `#0f8b60` / Nền soft: `rgba(15, 139, 96, 0.12)`
- **Cảnh báo (Warning / Đang chờ duyệt / Giữ chỗ / Chậm chuyến)**: `#c77b15` / Nền soft: `rgba(199, 123, 21, 0.12)`
- **Lỗi / Nguy hiểm (Danger / Đã hủy / Hết hạn / Thất bại)**: `#c24f4f` / Nền soft: `rgba(194, 79, 79, 0.12)`
- **Thông tin (Info / Lên lịch / Đang lên máy bay)**: `#1464b1` / Nền soft: `rgba(20, 100, 177, 0.12)`
- **Trung tính (Neutral / Khách vãng lai / Scheduled)**: `#5e6b7c` / Nền soft: `rgba(94, 107, 124, 0.12)`

### 5.4 Kết quả rà soát màu sắc:
- **Preserved**: Xanh navy thương hiệu, vàng hoa sen accent, màu 3 hạng vé đặc trưng.
- **Normalized**: Loại bỏ các sắc độ xám/xanh hardcode rải rác (`rgba(14, 40, 69, 0.78)`, `rgba(7, 29, 50, 0.97)`), gom về hệ token chuẩn `--text-primary`, `--text-secondary`, `--text-muted`, `--border-subtle`, `--border-strong`.
- **Improved Contrast**: Nâng độ đậm của các đoạn text nhỏ từ `#5e6b7c` lên `#475569` khi nằm trên nền xám nhạt để vượt chuẩn WCAG AA (4.5:1).

---

## 6. AUDIT & NÂNG CẤP FOOTER + MẠNG XÃ HỘI CHÍNH THỨC VIETNAM AIRLINES

### 6.1 Hiện trạng Footer
- Footer hiện tại có bố cục: Intro (Logo + mô tả ngắn + 3 chips) + 3 cột links + Dòng bản quyền.
- Chưa có phần liên kết mạng xã hội chính thức của hãng.

### 6.2 Nâng cấp thiết kế Footer & Tích hợp Social Channels:
- **Tổ chức thông tin**:
  1. **Brand Identity**: Logo Vietnam Airlines chính xác, tóm tắt dịch vụ nội địa ngắn gọn, tinh tế.
  2. **Điều hướng tiện ích**: Chia 3 nhóm liên kết rõ ràng (Hành trình & Đặt chỗ, Quy định & Hỗ trợ, Khám phá & Cẩm nang).
  3. **Khu vực Kênh truyền thông Vietnam Airlines (Official Social Media)**:
     - Tiêu đề: **Kênh truyền thông Vietnam Airlines**
     - Kênh Facebook: `https://www.facebook.com/VietnamAirlines`
     - Kênh Instagram: `https://www.instagram.com/vietnamairlines`
     - Kênh YouTube: `https://www.youtube.com/c/VietnamAirlines`
     - Kênh TikTok: `https://www.tiktok.com/@vietnam_airlines`
     - Kênh Zalo: `https://zalo.me/vietnamairlines` (hoặc `https://oa.zalo.me/3149253679280388721`)
     - Định dạng: Icon SVG sắc nét, accessible label (tooltip / `aria-label`), màu sắc hòa hợp nhận diện brand ở trạng thái default, hover tinh tế, mở tab mới an toàn với `target="_blank"` và `rel="noreferrer noopener"`.
  4. **Legal & Disclaimer**: Dòng bản quyền sạch sẽ, ghi rõ phạm vi mô phỏng phục vụ khai thác đường bay nội địa.

---

## 7. BẢNG TỔNG HỢP VẤN ĐỀ THEO MỨC ĐỘ ƯU TIÊN (SEVERITY MATRIX)

| Mã | Phạm vi | Vấn đề UI/UX | Mức độ (Severity) | Giữ lại (Keep) | Cải tiến (Improve) | Rủi ro nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P1-01** | Public / Search | Search Toolbar quá nhiều chips làm che khuất kết quả chuyến bay | **P1 (Major UX)** | Logic tìm kiếm, lọc, sort, handoff state | Thu gọn toolbar, đưa kết quả lên cao, tăng độ thoáng | Không có |
| **P1-02** | Public / Booking | Card chuyến bay có ảnh nhỏ trong metric gây chật chội và cạnh tranh thị giác | **P1 (Major UX)** | Giá vé, số ghế, timeline bay, hạng vé | Bỏ ảnh con trong metric, căn chỉnh timeline thoáng đãng | Không có |
| **P1-03** | Auth / Login, Register, Forgot | Quá nhiều chữ mô tả và stat cards làm loãng form thao tác chính | **P1 (Major UX)** | Form binding, validation, OAuth, OTP flow | Tinh gọn aside, đưa Form thành trung tâm, làm rõ Stepper | Không có |
| **P2-01** | Homepage | Nhiều section dài liên tiếp có cùng cấp độ thị giác, chữ giải thích lặp | **P2 (Consistency)** | Các section cốt lõi, dữ liệu thật | Giảm copy thừa, tăng nhịp thở và phân cấp Primary/Secondary | Không có |
| **P2-02** | Footer | Chưa có social media chính thức của Vietnam Airlines | **P2 (Brand/UX)** | Cấu trúc footer gọn gàng | Thêm khu vực "Kênh truyền thông Vietnam Airlines" đầy đủ 5 kênh chính thức | Không có |
| **P2-03** | Backoffice | Bảng dữ liệu và Dashboard cards có spacing chưa nhất quán | **P2 (Consistency)** | Toàn bộ bảng, CRUD, logic phân quyền | Chuẩn hóa table padding, align số liệu, metric card grid | Không có |
| **P3-01** | Global | Hệ thống màu và khoảng cách spacing chưa được quy hoạch thành token chuẩn | **P3 (Polish)** | Bảng màu Vietnam Airlines hiện có | Chuẩn hóa biến CSS tokens, kiểm tra tương phản WCAG AA | Không có |
