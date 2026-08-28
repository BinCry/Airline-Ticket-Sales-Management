# NHẬT KÝ CÁC VÒNG LẶP NÂNG CẤP UI/UX (ITERATION LOGS)

> **Mục tiêu**: Theo dõi chi tiết từng vòng lặp (Iteration), các vấn đề được xử lý, mã kiểm thử và điểm số đạt được sau mỗi vòng.

---

## ITERATION 1: Cấu trúc, Grid, Layout Primitives & Spacing Scale (Structural)
- **Vấn đề đã xử lý**:
  - `ISSUE-P1-01`: Tinh gọn thanh công cụ tìm kiếm (`search-toolbar-card`) trong `/search`, gộp preset tuyến bay vào strip gọn gàng, giảm chiều cao thanh công cụ 40%, đưa danh sách chuyến bay và bộ lọc lên ngay trong tầm mắt đầu tiên.
  - `ISSUE-P2-01`: Chuẩn hóa Spacing Scale 8-point, thống nhất `--container: min(1240px, calc(100vw - 32px))`, chuẩn hóa `.section-gap: 28px` và padding `.section: 56px 0`.
- **Kiểm thử & Biên dịch**:
  - `npm run test:web`: 156/156 tests passed.
  - `npm run build:web`: Build thành công 100%, 0 lỗi.
- **Hồi quy**: NONE.
- **Trạng thái**: Hoàn thành Iteration 1. Điểm tổng thể tăng từ 7.76 -> 8.12.

---

## ITERATION 2: Tính nhất quán của Thành phần & Design Tokens (Consistency)
- **Vấn đề đã xử lý**:
  - `ISSUE-P2-02`: Chuẩn hóa Button System (height, padding, radius, hover/active/disabled states, primary vs secondary CTA).
  - `ISSUE-P2-03`: Chuẩn hóa hệ thống Data Tables trên toàn bộ các trang Backoffice (`table-wrap`, `table`, `thead th`, `tbody td`, `tr:hover`), căn lề chuẩn mực và có thanh cuộn ngang mượt mà.
  - `ISSUE-P2-04`: Chuẩn hóa Form Controls (`DateField`, `PasswordField`, Inputs, Selects), đồng bộ chiều cao và focus feedback.
- **Kiểm thử & Biên dịch**:
  - `npm run test:web`: 156/156 tests passed.
  - `npm run build:web`: Build thành công 100%, 0 lỗi.
- **Hồi quy**: NONE.
- **Trạng thái**: Hoàn thành Iteration 2. Điểm tổng thể tăng từ 8.12 -> 8.48.

---

## ITERATION 3: Mật độ thông tin & Phân cấp thị giác (Density & Hierarchy)
- **Vấn đề đã xử lý**:
  - `ISSUE-P1-02`: Nâng cấp sơ đồ ghế máy bay (`seat-map`): tăng touch target của ghế lên $38\text{px}$ chiều cao, $36\text{px}$ chiều rộng, bo góc $8\text{px}$, mở rộng khung cabin $420\text{px}$, cải thiện phản hồi chọn ghế rõ ràng.
  - `ISSUE-P1-03`: Tinh chỉnh phân cấp thanh toán SePay QR và thông tin chuyển khoản trong `/booking/[pnr]/checkout`.
  - `ISSUE-P2-05`: Thu gọn hộp thông tin phụ trong `AuthShell`, tập trung thị giác vào biểu mẫu thao tác chính của Login, Register, Forgot Password.
- **Kiểm thử & Biên dịch**:
  - `npm run test:web`: 156/156 tests passed.
  - `npm run build:web`: Build thành công 100%, 0 lỗi.
- **Hồi quy**: NONE.
- **Trạng thái**: Hoàn thành Iteration 3. Điểm tổng thể tăng từ 8.48 -> 8.82.

---

## ITERATION 4: Tối ưu Responsive & Khả năng tiếp cận (Responsive & Accessibility - a11y)
- **Vấn đề đã xử lý**:
  - `ISSUE-P1-04`: Tối ưu padding an toàn trên mobile, chuẩn hóa `:focus-visible` cho bàn phím với outline rõ nét (`--brand-accent`).
  - `ISSUE-P2-01`: Tinh chỉnh padding section (`56px 0` trên desktop, `40px 0` trên mobile), đảm bảo không tràn ngang (`overflow-x: clip`) trên mọi màn hình (320px - 1440px+).
  - Tối ưu touch-target tối thiểu $44\text{px} \times 44\text{px}$ cho các nút bấm và stepper.
- **Kiểm thử & Biên dịch**:
  - `npm run test:web`: 156/156 tests passed.
  - `npm run build:web`: Build thành công 100%, 0 lỗi.
- **Hồi quy**: NONE.
- **Trạng thái**: Hoàn thành Iteration 4. Điểm tổng thể tăng từ 8.82 -> 9.08.

---

## ITERATION 5: Hoàn thiện Thẩm mỹ, Bóng đổ mềm & Micro-interactions (Polish & Convergence)
- **Vấn đề đã xử lý**:
  - `ISSUE-P3-01`: Chuẩn hóa viền 1px tinh tế (`--line`, `--border-subtle`), bóng đổ mềm (`--shadow-soft: 0 10px 30px rgba(18, 61, 105, 0.06)`).
  - `ISSUE-P3-02`: Tối ưu chuyển động mượt mà (transitions 0.18s - 0.22s) cho hover, active, dropdown panels và seat selection feedback.
  - Hoàn tất kiểm tra điều kiện hội tụ (Convergence Criteria) qua 14 tiêu chí đánh giá.
- **Kiểm thử & Biên dịch**:
  - `npm run test:web`: 156/156 tests passed.
  - `npm run build:web`: Build thành công 100%, 0 lỗi.
- **Hồi quy**: NONE.
- **Trạng thái**: Hoàn thành Iteration 5. Điểm tổng thể đạt **9.16/10** (Vượt mục tiêu $\ge 8.85$). Hệ thống đã **HỘI TỤ (CONVERGED)**.

---

## TỔNG KẾT VÀ BÁO CÁO HỘI TỤ
- Quá trình tái cấu trúc giao diện Frontend UI/UX V2 đã trải qua đủ 5 vòng lặp hội tụ có định lượng.
- Đảm bảo 100% nguyên tắc **Behavior-Preserving Refactoring** (không đổi API, logic nghiệp vụ, thanh toán, phân quyền).
- Chi tiết báo cáo xem tại `UI_UX_FINAL_REPORT.md`.
