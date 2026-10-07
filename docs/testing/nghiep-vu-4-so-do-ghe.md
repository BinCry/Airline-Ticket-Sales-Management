# Kiểm thử sơ đồ ghế theo tàu bay

## Chuẩn bị

Dùng cơ sở dữ liệu local hoặc cơ sở dữ liệu kiểm thử riêng, không dùng dữ liệu thật. Khởi động lại API sau khi cập nhật mã để Flyway chạy `V32`; giao diện chạy như hướng dẫn local trong README. Không cần biến môi trường mới cho ứng dụng hoặc Coolify.

Đăng nhập tài khoản điều hành có quyền `backoffice.operations`. Mở `/backoffice/operations` → **Tàu bay và sơ đồ ghế**. Có thể sửa loại tàu đang có hoặc tạo loại mới bằng JSON cabin. `totalRows` là số phần tử trong `rows`, không phải số thứ tự hàng cuối. Mỗi hàng có một hạng vé; cột thiếu trong `seats` được render thành khoảng trống.

Ví dụ cabin nhỏ phục vụ kiểm thử, tổng số hàng là `3`:

```json
{
  "columns": ["A", "B", "C", "D", "E", "F"],
  "aislesAfter": ["C"],
  "rows": [
    { "row": 1, "fareFamily": "thuong_gia", "seats": ["A", "C", "D", "F"] },
    { "row": 3, "fareFamily": "pho_thong_linh_hoat", "seats": ["A", "B", "C", "D", "E", "F"] },
    { "row": 12, "fareFamily": "pho_thong_tiet_kiem", "seats": ["A", "B", "C", "D", "E", "F"] }
  ],
  "disabledSeats": ["12F"]
}
```

Tạo tàu vật lý thuộc loại này với trạng thái `ACTIVE`, rồi chọn tàu khi tạo chuyến mới. Giữ nguyên chính sách giá hiện có: giá gốc, linh hoạt cộng 5.000đ, thương gia cộng 10.000đ; chọn ghế không thêm phí.

## Luồng thao tác chính

1. Khách tìm chuyến mới → đặt vé → nhập hành khách → chọn hạng vé và ghế riêng cho từng người, từng chiều. Dùng Tab và Enter/Space để kiểm tra khả năng dùng bàn phím.
2. Giữ chỗ thành công rồi mở trình duyệt/phiên riêng: ghế đã giữ phải không chọn được. Chỉ bấm ghế trên giao diện chưa tạo giữ chỗ; ghế được giữ khi gửi yêu cầu giữ chỗ thành công.
3. Thanh toán bằng cơ chế local hiện có để xuất vé. Vào `/check-in`, xác thực bằng tài khoản hoặc OTP tra cứu.
4. Ghế đã đặt được chọn sẵn. Đổi sang ghế trống cùng hạng rồi hoàn tất làm thủ tục. Thẻ lên máy bay phải ghi đúng ghế mới; ghế cũ trống trở lại. Vé đã có thẻ lên máy bay không được đổi tiếp tại check-in.
5. Thử đổi tàu của chuyến hoặc sửa JSON cabin, bỏ/khóa/đổi hạng của ghế đang giữ: phải bị từ chối và nêu rõ ghế xung đột.

## Đủ 18 kịch bản nghiệm thu

| STT | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Mở đặt vé cho cabin nhỏ phía trên | Sơ đồ đúng JSON, không có 168 ghế cố định; có lối đi, khoảng trống và ghế khóa |
| 2 | Gán một chuyến trống sang tàu có cabin khác | Sơ đồ và số ghế từng hạng thay đổi theo tàu |
| 3 | Chọn `12A` với vé phổ thông tiết kiệm | Giữ chỗ thành công và không đổi giá vì chọn ghế |
| 4 | Gửi API giữ chỗ với ghế không tồn tại | Bị từ chối, không lưu giữ chỗ/selection |
| 5 | Gửi API giữ chỗ ghế thương gia cho vé phổ thông | Bị từ chối; ghế khóa cũng bị từ chối |
| 6 | Hai phiên đồng thời gửi giữ cùng `12A` | Chỉ một thành công, bên còn lại nhận xung đột; UI cập nhật sơ đồ |
| 7 | Đợi giữ chỗ hết hạn rồi mở lại sơ đồ | Ghế được giải phóng; có thể giữ mới |
| 8 | Thanh toán, xuất vé rồi đợi quá hạn giữ chỗ cũ | Ghế của vé còn hợp lệ vẫn bị chiếm |
| 9 | Check-in vé đã chọn `12A` | Ghế `12A` được chọn sẵn, không bị khóa bởi chính vé đó |
| 10 | Check-in booking cũ chưa có selection | Bắt buộc chọn ghế; không phát ghế ngẫu nhiên |
| 11 | Check-in yêu cầu ghế đang bị booking khác giữ | Bị từ chối; không phát thẻ lên máy bay |
| 12 | Đổi ghế trước khi phát thẻ, rồi hoàn tất | Selection và thẻ ghi ghế mới; ghế cũ được giải phóng cùng giao dịch |
| 13 | Đổi aircraft/layout khiến ghế đang giữ mất hoặc khác hạng | Bị chặn, có danh sách ghế xung đột; kiểm tra cả thẻ cũ |
| 14 | Chọn tàu `MAINTENANCE` hoặc `INACTIVE` để gán mới | Không xuất hiện trong chọn tàu mới; gửi API trực tiếp vẫn bị chặn |
| 15 | Kiểm tra phản hồi API seat map không đăng nhập | Không có tên/email/PNR/chủ booking; chỉ cabin và trạng thái ghế |
| 16 | Gán cùng ghế cho hai hành khách trong một booking | UI khóa ghế đã chọn cho người khác; API trực tiếp cũng từ chối |
| 17 | Khứ hồi có hai tàu khác nhau | Mỗi chiều có cabin riêng; selection gắn đúng chặng và hành khách |
| 18 | Chuyến không có `aircraft_id` | Báo lỗi cấu hình rõ ràng, không tự dựng sơ đồ mặc định |

Kiểm tra bổ sung: hủy một phần vé chỉ giải phóng ghế của vé hủy; ghế của vé còn hiệu lực và thẻ lên máy bay vẫn bị chiếm. Hủy chuyến không xóa lịch sử selection.

## Kiểm thử tự động

Chạy backend, web unit test, web build và E2E theo README. Các E2E mới nằm trong `apps/web/tests/e2e/aircraft-seat-map.spec.ts`; các mô phỏng HTTP ở đây kiểm tra hành vi giao diện, không thay thế kiểm thử khóa trên PostgreSQL thật.

Các ca tích hợp PostgreSQL phải chạy với cơ sở dữ liệu kiểm thử riêng và quyền tạo lược đồ. Mỗi lớp kiểm thử tự tạo lược đồ biệt lập và chạy đầy đủ migration. Không dùng địa chỉ cơ sở dữ liệu đang phục vụ ứng dụng hoặc production. Xem mục kiểm thử trước khi giao trong README để cấu hình biến chỉ dành cho kiểm thử.
