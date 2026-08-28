# Checklist triển khai production với Coolify

Mục tiêu: đưa `web + api` lên production, kết nối PostgreSQL trên Coolify, bật domain HTTPS và xác nhận các luồng nghiệp vụ quan trọng.

## Trạng thái thực tế ngày 13/08/2026

- [x] PostgreSQL `air-ticket-db` đang healthy trên Coolify.
- [x] API `air-ticket-api` nhánh `deploy` đã rollout healthy; Flyway xác nhận 29 migration và `GET /api/meta/health` trả `status=ok`.
- [x] Web `air-ticket-web` nhánh `deploy` đã rollout healthy; health check phải dùng `127.0.0.1:3000/`, không dùng `localhost`.
- [x] Cutover sang `https://ats.bincrydev.id.vn` và `https://api.bincrydev.id.vn`; API/web đều rollout healthy trên Coolify.
- [x] DNS authoritative, Cloudflare DNS và Google DNS đều trả `157.66.80.113` cho hai hostname mới; chỉ thêm bản ghi `ats` và `api`, không xóa hoặc sửa các bản ghi portfolio/tarot hiện có.
- [x] Kiểm tra trực tiếp qua IP Coolify và đúng Host/SNI: web HTTP 200, API HTTP 200 với `status=ok`, CORS cho phép đúng origin web, HTTP chuyển sang HTTPS.
- [x] Let's Encrypt đã cấp chứng chỉ tin cậy riêng cho cả hai hostname mới.
- [x] Google OAuth dùng project riêng `Air Ticket` (`air-ticket-505317`), Web Client production và callback trên domain mới; đăng nhập end-to-end đã thành công.
- [ ] Deployment hiện chạy commit `017e957884d37ab5f872908b4216070c6c2f44c2`; các thay đổi local chưa được commit/push.
- [ ] `npm ci` của image web báo 7 lỗ hổng dependency (1 low, 5 high, 1 critical); cần chạy audit, đánh giá và nâng cấp có kiểm thử.

## 0. Chốt phạm vi và thông tin đầu vào

- [x] Xác nhận domain production: `ats.bincrydev.id.vn` và `api.bincrydev.id.vn`.
- [ ] Xác nhận Azure subscription, resource group, region và người chịu trách nhiệm vận hành.
- [x] Xác nhận tài khoản GitHub và quyền quản trị Coolify.
- [ ] Xác nhận quyền quản trị DNS.
- [ ] Chuẩn bị kênh SMTP production và tài khoản SePay production.
- [x] Tạo project Google Cloud và OAuth Web Client production riêng cho Air Ticket.
- [ ] Quyết định có bật chatbot Gemini, thời tiết và tin tức hay để trống các API key.

## 1. Audit mã nguồn và pipeline

- [x] Đọc lại [README.md](../../README.md), [AGENTS.md](../../AGENTS.md) và tài liệu production.
- [x] Chạy `npm ci`.
- [x] Kiểm tra backend: repository thiếu Maven Wrapper JAR nên không chạy được `cd apps/api; .\mvnw.cmd test`; đã chạy `mvn test` trong image Java 21 và pass.
- [x] Chạy `npm run test:web` — 30 file test, 148 test pass.
- [x] Chạy `npm run build:web` với `NEXT_PUBLIC_API_BASE_URL=https://api.bincrydev.id.vn`.
- [x] Kiểm tra production config: Docker Compose pass và Bicep CLI validate pass; script đầy đủ vẫn cần Azure CLI để kiểm tra trên máy có Azure tooling.
- [x] Build thử hai image theo [deploy.yml](../../.github/workflows/deploy.yml).
- [x] Bổ sung bước workflow gọi `COOLIFY_PRODUCTION_WEBHOOK_URL` sau khi test/build/verify thành công.
- [x] Không thấy `.env`, khóa `.pem/.key` hoặc file credentials trong danh sách file được Git track; file tham số Azure vẫn chỉ là bản example placeholder.

## 2. Tạo hạ tầng Azure

- [ ] Điền file tham số riêng từ `infra/azure/production.parameters.example.json`; không commit file chứa secret.
- [ ] Chạy `infra/scripts/provision-azure-production.ps1`.
- [ ] Lưu lại an toàn: public IP VM, hostname PostgreSQL, SSH command và thông tin resource group.
- [x] Review template NSG: chỉ khai báo SSH, HTTP/HTTPS và cổng Coolify `8000` cho giai đoạn bootstrap; cần giới hạn nguồn/đóng `8000` sau setup.
- [x] Review template PostgreSQL: firewall chỉ trỏ đến public IP VM; cần xác nhận lại trên Azure sau provision.
- [x] Review cấu hình backup: retention 7 ngày, geo-redundant backup tắt; cảnh báo tài nguyên vẫn cần cấu hình trên Azure.

## 3. Khởi tạo và hardening Coolify

- [x] Truy cập Coolify qua IP VM và xác nhận tài khoản quản trị hoạt động.
- [ ] Gắn domain quản trị Coolify riêng nếu cần; bật HTTPS.
- [x] Tạo project/environment production.
- [x] Kết nối GitHub repository `BinCry/Airline-Ticket-Sales-Management` bằng GitHub App `air-ticket-source`.
- [ ] Tạo deploy webhook cho ứng dụng production.
- [ ] Giới hạn hoặc đóng cổng bootstrap `8000` sau khi hoàn tất cấu hình.
- [x] Bật log và health check cho API/web.
- [ ] Xác nhận restart policy và backup cấu hình Coolify.

## 4. Cấu hình ứng dụng `api` trên Coolify

- [x] Source branch: `deploy`.
- [x] Dockerfile: `/apps/api/Dockerfile`, base directory `/apps/api`.
- [x] Internal port: `8080`.
- [x] Public domain: `https://api.bincrydev.id.vn`.
- [x] Health check: `127.0.0.1:8080/api/meta/health`.
- [x] Điền `SPRING_DATASOURCE_URL` tới PostgreSQL `air-ticket-db` trong mạng Coolify.
- [x] Điền username/password PostgreSQL production dưới dạng secret runtime.
- [x] Bật `SPRING_FLYWAY_ENABLED=true`.
- [x] Tạo `APP_AUTH_JWT_SECRET` mới, đủ dài và không dùng giá trị mẫu.
- [x] Cấu hình `APP_CORS_ALLOWED_ORIGIN_PATTERNS=https://ats.bincrydev.id.vn`.
- [ ] Cấu hình SMTP và `APP_MAIL_ENABLED=true` sau khi kiểm tra gửi thử.
- [ ] Cấu hình SePay: token, bank account ID, webhook API key, tên ngân hàng và tài khoản nhận tiền.
- [x] Đặt `APP_AUTH_OAUTH_FRONTEND_CALLBACK_URL` và `GOOGLE_OAUTH_REDIRECT_URI` đúng domain HTTPS.
- [x] Lưu `GOOGLE_OAUTH_CLIENT_ID` và `GOOGLE_OAUTH_CLIENT_SECRET` dưới dạng runtime secret, redeploy API và xác nhận endpoint OAuth chuyển hướng đúng sang Google.
- [x] Deploy API và kiểm tra log Flyway, kết nối database, health check.

## 5. Cấu hình ứng dụng `web` trên Coolify

- [x] Source branch: `deploy`.
- [x] Dockerfile: `/apps/web/Dockerfile`.
- [x] Build context: thư mục gốc repository.
- [x] Internal port: `3000`.
- [x] Public domain: `https://ats.bincrydev.id.vn`.
- [x] Buildtime/runtime env `NEXT_PUBLIC_API_BASE_URL=https://api.bincrydev.id.vn` cho Production và Preview.
- [ ] Cấu hình `GEMINI_MODEL=gemini-2.5-flash` nếu bật chatbot.
- [ ] Chỉ thêm OpenWeather/NewsData key khi thực sự sử dụng.
- [x] Deploy web, kiểm tra build Next.js standalone và health check `127.0.0.1:3000/`.

## 6. DNS và HTTPS

- [x] Thêm bản ghi A `ats.bincrydev.id.vn` → `157.66.80.113`, TTL 3600.
- [x] Thêm bản ghi A `api.bincrydev.id.vn` → `157.66.80.113`, TTL 3600.
- [x] Xác nhận DNS công khai trên authoritative DNS, Cloudflare DNS và Google DNS.
- [x] Cấp chứng chỉ Let's Encrypt hợp lệ cho cả hai domain trên Coolify.
- [x] Kiểm tra redirect HTTP → HTTPS, web/API HTTP 200 và CORS từ web sang API sau cutover.

## 7. CI/CD và redeploy

- [ ] Thêm GitHub Secret `COOLIFY_PRODUCTION_WEBHOOK_URL`.
- [x] Bổ sung bước gọi webhook vào workflow sau khi toàn bộ test/build/image verification thành công.
- [ ] Chạy workflow bằng `workflow_dispatch`.
- [ ] Xác nhận API và web được redeploy đúng commit trên `main`.
- [ ] Xác nhận deploy lỗi không tự động thay thế phiên bản đang ổn định.
- [ ] Kiểm tra chiến lược rollback về deployment trước đó trong Coolify.

## 8. Smoke test sau deploy

- [x] Gọi API trực tiếp qua IP Coolify với SNI `api.bincrydev.id.vn`: HTTP 200 và `status=ok`.
- [x] `GET https://api.bincrydev.id.vn/api/meta/health` trả HTTP 200, TLS hợp lệ và `status=ok`.
- [x] Trang chủ `https://ats.bincrydev.id.vn` tải thành công, TLS hợp lệ và hiển thị giao diện tìm chuyến bay.
- [ ] Kiểm thử tương tác tìm chuyến bay và trang trạng thái chuyến bay với dữ liệu production.
- [ ] Tạo booking hold và xác nhận ghế/inventory được giữ đúng thời hạn.
- [ ] Kiểm tra checkout local/session thanh toán.
- [ ] Kiểm tra SePay live: tạo giao dịch, nhận webhook và cập nhật trạng thái booking.
- [ ] Kiểm tra email OTP, email xác nhận và email vé.
- [ ] Kiểm tra đăng ký, đăng nhập, refresh token, logout và quên mật khẩu.
- [ ] Kiểm tra guest lookup booking bằng OTP.
- [ ] Kiểm tra customer/member: booking, loyalty, voucher và quản lý tài khoản.
- [ ] Kiểm tra customer support: bán vé nội bộ, support notification và CMS nếu được cấp quyền.
- [ ] Kiểm tra operations staff: chuyến bay, trạng thái, gate, ghi chú và voucher.
- [ ] Kiểm tra finance/admin theo ma trận quyền trong `docs/architecture`.
- [ ] Kiểm tra check-in và xuất boarding pass PDF.
- [ ] Kiểm tra không endpoint backoffice nào truy cập được khi thiếu permission.

## 9. Go-live và vận hành

- [ ] Chụp lại cấu hình/env hiện tại trước cutover.
- [ ] Ghi nhận commit, image tag và thời điểm go-live.
- [ ] Xác nhận backup database và cách khôi phục đã thử nghiệm.
- [ ] Theo dõi log API/web, health check, CPU/RAM/disk và lỗi 4xx/5xx trong 24 giờ đầu.
- [ ] Kiểm tra webhook SePay và SMTP sau khi cấu hình credentials production.
- [x] Kiểm tra Google OAuth sau DNS/HTTPS: consent, callback, tạo phiên và hiển thị tài khoản trên web đều thành công.
- [ ] Cập nhật [risk-register.md](./risk-register.md) và đánh dấu các mục đã đóng.
- [ ] Cập nhật [plan.md](./plan.md) và checklist này với bằng chứng deploy thực tế.
- [ ] Viết runbook rollback: chọn deployment ổn định, khôi phục env, redeploy và xác nhận health check.

## Điều kiện hoàn tất

- [x] Hai domain HTTPS hoạt động và có chứng chỉ tin cậy.
- [x] API kết nối PostgreSQL production và Flyway hoàn tất.
- [ ] CI kiểm thử/build thành công và trigger được Coolify.
- [ ] Các smoke test nghiệp vụ, thanh toán, email và phân quyền đã pass.
- [ ] Có backup, monitoring tối thiểu và rollback procedure được kiểm chứng.
