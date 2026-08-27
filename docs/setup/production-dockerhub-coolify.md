# Lên production bằng Docker Hub và Coolify

## Mục tiêu

- GitHub Actions chạy kiểm thử và biên dịch trước khi phát hành.
- GitHub Actions build một lần rồi đẩy image lên Docker Hub.
- Coolify chỉ kéo image đã phát hành và khởi động lại ứng dụng.
- Mỗi commit có tag riêng để có thể quay lại phiên bản cũ.

## Luồng triển khai

1. Thay đổi được hợp nhất vào `main`.
2. Workflow `deploy-production` chạy kiểm thử API và web.
3. Workflow biên dịch API, web và kiểm tra cấu hình production.
4. Workflow build và đẩy hai image lên Docker Hub.
5. Workflow gọi webhook của API trước, sau đó gọi webhook của web.

## Image được phát hành

### Web

- `kietphan24/airline-ticket-web:production`
- `kietphan24/airline-ticket-web:production-<short-sha>`

### API

- `kietphan24/airline-ticket-api:production`
- `kietphan24/airline-ticket-api:production-<short-sha>`

Tag `production` luôn trỏ tới bản mới nhất. Tag có mã commit được giữ để phục vụ rollback.

## GitHub Secrets bắt buộc

Tạo năm repository secret trong GitHub:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `COOLIFY_WEB_PRODUCTION_WEBHOOK_URL`
- `COOLIFY_API_PRODUCTION_WEBHOOK_URL`
- `COOLIFY_TOKEN`

`DOCKERHUB_TOKEN` nên là access token chỉ có quyền đọc và ghi image cần thiết, không dùng mật khẩu tài khoản.

Webhook Coolify phải là URL deploy đầy đủ do Coolify tạo. Tạo API token trong `Keys & Tokens` với quyền `deploy`, rồi lưu token đó vào `COOLIFY_TOKEN`. Workflow gửi token bằng Bearer header và không ghi token vào mã nguồn.

## Chuẩn bị Docker Hub

1. Tạo repository `kietphan24/airline-ticket-web`.
2. Tạo repository `kietphan24/airline-ticket-api`.
3. Chọn public hoặc private cho cả hai repository.
4. Nếu dùng private repository, cấu hình Docker Hub credential trong Coolify để có quyền kéo image.

## Cấu hình ứng dụng API trong Coolify

1. Chuyển nguồn triển khai sang Docker Image.
2. Dùng image `kietphan24/airline-ticket-api:production`.
3. Giữ cổng nội bộ `8080`.
4. Giữ health check `/api/meta/health`.
5. Giữ domain `https://airticket.api.bincrydev.id.vn`.
6. Giữ toàn bộ biến môi trường API hiện tại.
7. Tạo deploy webhook và lưu URL vào `COOLIFY_API_PRODUCTION_WEBHOOK_URL`.

## Cấu hình ứng dụng web trong Coolify

1. Chuyển nguồn triển khai sang Docker Image.
2. Dùng image `kietphan24/airline-ticket-web:production`.
3. Giữ cổng nội bộ `3000`.
4. Giữ domain `https://airticket.bincrydev.id.vn`.
5. Giữ toàn bộ biến môi trường web hiện tại.
6. Tạo deploy webhook và lưu URL vào `COOLIFY_WEB_PRODUCTION_WEBHOOK_URL`.

`NEXT_PUBLIC_API_BASE_URL` được đóng vào image web lúc build với giá trị `https://airticket.api.bincrydev.id.vn`.

## Cutover an toàn

1. Tạo hai repository và năm GitHub Secrets trước.
2. Chạy workflow thủ công từ nhánh `main` với lựa chọn `deploy` tắt để chỉ publish và xác nhận hai image.
3. Chuyển API trên Coolify sang image và kiểm tra health check.
4. Chuyển web trên Coolify sang image và kiểm tra trang chính.
5. Chạy lại workflow thủ công với lựa chọn `deploy` bật để kiểm tra hai webhook.
6. Tắt cơ chế tự build source từ nhánh `deploy` sau khi cả hai dịch vụ ổn định.

Không xóa nhánh `deploy`. Pipeline vẫn đồng bộ `main` sang nhánh này theo quy ước dự án, nhưng Coolify không còn dùng nhánh đó để build source.

## Kiểm tra sau triển khai

- `https://airticket.api.bincrydev.id.vn/api/meta/health` trả trạng thái thành công.
- `https://airticket.bincrydev.id.vn` tải được và gọi đúng API production.
- Luồng đăng nhập, đặt vé, thanh toán và gửi email hoạt động.
- Hai image có cả tag `production` và tag theo commit trên Docker Hub.

## Rollback

1. Tìm tag `production-<short-sha>` gần nhất đã hoạt động ổn định.
2. Đổi image của dịch vụ lỗi trong Coolify sang tag đó.
3. Redeploy dịch vụ.
4. Kiểm tra health check và luồng nghiệp vụ liên quan.

Việc rollback image không tự hoàn tác migration cơ sở dữ liệu. Phải đánh giá tương thích dữ liệu trước khi quay lại API cũ.
