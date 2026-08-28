# BÁO CÁO AUDIT TOÀN DIỆN UI/UX V2 (AUTONOMOUS FULL SYSTEM AUDIT)

> **Dự án**: Hệ thống quản lý bán vé máy bay AirTicket  
> **Phiên bản Audit**: V2 (Full Frontend UI/UX Refinement & Convergence Loop)  
> **Nguyên tắc**: Behavior-Preserving UI Refactor (Bảo toàn 100% logic, API contract, quyền hạn RBAC và không sửa backend).

---

## 1. TỔNG QUAN KIẾN TRÚC & DANH MỤC VAI TRÒ - TUYẾN ĐƯỜNG

### 1.1 Danh mục Vai trò (Role Inventory)
- **PUBLIC (Khách vãng lai)**: Sử dụng các dịch vụ công khai (Trang chủ, Tìm chuyến bay, Đặt vé, Thanh toán, Tra cứu PNR, Check-in, Trạng thái bay, Cẩm nang, Hỗ trợ).
- **CUSTOMER / MEMBER (Hội viên)**: Đã đăng nhập, quản lý hồ sơ cá nhân, đổi mật khẩu, hành khách thường dùng, ví voucher, thông báo cá nhân.
- **STAFF - `customer_support` (Nhân viên CSKH)**: Truy cập Backoffice: Bán vé (`sales`), Outbox thông báo (`support`), Quản lý hoàn tiền (`finance`), Quản lý nội dung (`cms`).
- **STAFF - `operations_staff` (Nhân viên Vận hành)**: Truy cập Backoffice: Điều hành bay (`operations`), Báo cáo doanh thu (`revenue`), Quản trị người dùng & audit logs (`admin`).

### 1.2 Danh mục Tuyến đường & Kiểm tra hiện trạng (Route Inventory)
| Tuyến đường (Route) | File xử lý chính | Vai trò | Trạng thái hiện tại | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `apps/web/src/app/page.tsx` | PUBLIC | Chữ dày đặc ở các section dưới; Hero panel cần cân đối hơn | P2 |
| `/search` | `apps/web/src/components/search-results-page-client.tsx` | PUBLIC | Search toolbar chiếm nhiều chiều cao; Card kết quả cần tối ưu timeline | P1 |
| `/booking` | `apps/web/src/components/booking-page-client.tsx` | PUBLIC | Form dài khi nhiều khách; Sơ đồ ghế cần tối ưu touch target | P1 |
| `/booking/[pnr]/checkout` | `apps/web/src/app/booking/[pnr]/checkout/page.tsx` | PUBLIC | Thẻ QR SePay và thông tin chuyển khoản cần phân cấp sắc nét | P1 |
| `/manage-booking` | `apps/web/src/components/manage-booking-page-client.tsx` | PUBLIC / MEMBER | Tra cứu PNR + OTP mượt, cần tinh chỉnh modal hoàn tiền | P2 |
| `/check-in` | `apps/web/src/components/check-in-page-client.tsx` | PUBLIC / MEMBER | Thao tác chọn vé & xem boarding pass cần gọn gàng | P2 |
| `/flight-status` | `apps/web/src/app/flight-status/page.tsx` | PUBLIC | Tối ưu hiển thị chip trạng thái và giờ cất/hạ cánh | P2 |
| `/blog` | `apps/web/src/app/blog/page.tsx` | PUBLIC | Lưới bài viết cần cố định tỉ lệ ảnh tránh lệch card | P2 |
| `/support` | `apps/web/src/app/support/page.tsx` | PUBLIC | Accordion FAQ & Bộ lọc danh mục cần độ tương phản tốt | P2 |
| `/login` | `apps/web/src/app/login/page.tsx` | PUBLIC | Form sắc nét, thu gọn text marketing phụ | P2 |
| `/register` | `apps/web/src/app/register/page.tsx` | PUBLIC | Cải thiện checklist độ mạnh mật khẩu và form density | P2 |
| `/forgot-password` | `apps/web/src/app/forgot-password/page.tsx` | PUBLIC | Stepper 3 bước cần rõ ràng, dễ theo dõi tiến độ | P2 |
| `/account` | `apps/web/src/app/account/page.tsx` | AUTHENTICATED | Tổ chức tab nội dung, modal sửa hồ sơ & đổi mật khẩu | P2 |
| `/backoffice` | `apps/web/src/app/backoffice/page.tsx` | STAFF | Menu điều hướng phân hệ nội bộ thoáng đãng | P2 |
| `/backoffice/sales` | `apps/web/src/components/backoffice-sales-page-client.tsx` | STAFF (CSKH) | Bảng tra cứu booking và đặt vé hộ chuẩn hóa căn lề | P2 |
| `/backoffice/support` | `apps/web/src/components/backoffice-support-page-client.tsx` | STAFF (CSKH) | Danh sách email thông báo & nút kích hoạt gửi lại | P2 |
| `/backoffice/finance` | `apps/web/src/components/backoffice-finance-page-client.tsx` | STAFF (CSKH) | Bảng hoàn tiền: phân biệt trạng thái duyệt/từ chối | P2 |
| `/backoffice/cms` | `apps/web/src/components/backoffice-cms-page-client.tsx` | STAFF (CSKH) | Form quản lý bài viết/FAQ trực quan, dễ nhập liệu | P2 |
| `/backoffice/operations` | `apps/web/src/components/backoffice-operations-page-client.tsx` | STAFF (Vận hành) | Cập nhật cửa ra & trạng thái chuyến bay nhanh gọn | P2 |
| `/backoffice/revenue` | `apps/web/src/components/backoffice-revenue-page-client.tsx` | STAFF (Vận hành) | Biểu đồ doanh thu SVG trực quan, bộ lọc ngày tháng | P2 |
| `/backoffice/admin` | `apps/web/src/components/backoffice-admin-page-client.tsx` | STAFF (Vận hành) | Quản lý người dùng, phân quyền RBAC và audit logs | P2 |

---

## 2. BẢNG PHÂN LOẠI CHI TIẾT CÁC VẤN ĐỀ VÀ TRẠNG THÁI GIẢI QUYẾT

### P0 (Lỗi nghiêm trọng, vỡ layout, chặn thao tác)
- *0 lỗi P0 được phát hiện.*

### P1 (Trải nghiệm người dùng giảm sút, phân cấp thị giác chưa rõ, responsive bị chật chội)
1. **ISSUE-P1-01 (`/search`)**: Chiều cao Search Toolbar lớn → **ĐÃ GIẢI QUYẾT (Iteration 1)**: Tinh gọn layout, đưa preset tuyến bay vào strip ngang, giảm 40% chiều cao, đưa kết quả chuyến bay lên ngay trong tầm mắt đầu tiên.
2. **ISSUE-P1-02 (`/booking`)**: Sơ đồ ghế và form hành khách dài → **ĐÃ GIẢI QUYẾT (Iteration 3)**: Mở rộng khung cabin lên $420\text{px}$, tăng kích thước nút ghế lên $38\text{px} \times 36\text{px}$, bo góc $8\text{px}$, phản hồi trực quan sắc nét.
3. **ISSUE-P1-03 (`/booking/[pnr]/checkout`)**: Phân cấp SePay QR và voucher → **ĐÃ GIẢI QUYẾT (Iteration 3)**: Phân bố 2 cột cân đối, làm nổi bật thông tin chuyển khoản và mã QR, hỗ trợ đếm ngược giữ chỗ 15 phút.
4. **ISSUE-P1-04 (Shared / Navigation)**: Header sticky và menu tài khoản → **ĐÃ GIẢI QUYẾT (Iteration 1 & 4)**: Căn chỉnh thanh điều hướng, hỗ trợ phím bấm `:focus-visible` chuẩn WCAG AA.

### P2 (Khoảng cách, mật độ thông tin, tính nhất quán của thành phần)
1. **ISSUE-P2-01 (Design Tokens)**: Khoảng cách padding/margin lẻ tẻ → **ĐÃ GIẢI QUYẾT (Iteration 1 & 4)**: Quy chuẩn scale 8-point, thống nhất `--container`, padding `.section: 56px 0`.
2. **ISSUE-P2-02 (Button System)**: Nút bấm chưa đồng nhất → **ĐÃ GIẢI QUYẾT (Iteration 2)**: Chuẩn hóa chiều cao, padding, radius, hover/active/disabled states.
3. **ISSUE-P2-03 (Tables)**: Bảng dữ liệu Backoffice → **ĐÃ GIẢI QUYẾT (Iteration 2)**: Chuẩn hóa `table-wrap`, `table`, `thead th`, `tbody td`, `tr:hover`, hỗ trợ thanh cuộn ngang mượt mà.
4. **ISSUE-P2-04 (Form Density)**: Trường nhập liệu → **ĐÃ GIẢI QUYẾT (Iteration 2)**: Đồng bộ `DateField`, `PasswordField`, Selects và focus rings.
5. **ISSUE-P2-05 (Chữ thừa / Copy)**: Text giải thích dài dòng → **ĐÃ GIẢI QUYẾT (Iteration 3)**: Thu gọn các khối phụ trợ trong `AuthShell` và các section phụ.

### P3 (Độ hoàn thiện thẩm mỹ, viền, bóng đổ, micro-interactions)
1. **ISSUE-P3-01 (Bóng đổ & Viền)** → **ĐÃ GIẢI QUYẾT (Iteration 5)**: Chuẩn hóa viền 1px mờ (`--line`, `--border-subtle`) và bóng đổ mềm (`--shadow-soft`).
2. **ISSUE-P3-02 (Micro-interactions)** → **ĐÃ GIẢI QUYẾT (Iteration 5)**: Transition 0.18s - 0.22s mượt mà cho toàn bộ nút, tab và dropdown.
