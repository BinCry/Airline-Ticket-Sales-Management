# Lên production với Azure, Coolify và Azure Database for PostgreSQL

> Lưu ý
> Flow trong tài liệu này là hướng `source-build` cũ. Với VPS `4GB RAM`, hãy ưu tiên flow image registry trong [docs/setup/production-ghcr-coolify.md](production-ghcr-coolify.md) để tránh `OOM` và `504 Gateway Time-out`.

## Mục tiêu
- Chạy `web` và `api` trên một máy ảo Azure có cài `Coolify`.
- Dùng `Azure Database for PostgreSQL Flexible Server` làm cơ sở dữ liệu production.
- Quản lý toàn bộ biến môi trường ở `Coolify`.
- Tự động redeploy khi `main` có thay đổi và pipeline thành công.
- Nếu VPS chỉ có `4GB RAM`, nên chuyển sang deploy bằng image registry thay vì để `Coolify` tự build source.
- Domain production đã chốt:
  - `https://airplane.id.vn`
  - `https://api.airplane.id.vn`

## Thành phần trong repo
- `infra/azure/main.bicep`: tạo máy ảo, mạng, IP tĩnh và PostgreSQL Flexible Server.
- `infra/azure/cloud-init-coolify.yml`: cài `Coolify` tự động trên Ubuntu `22.04 LTS`.
- `infra/azure/production.parameters.example.json`: mẫu tham số triển khai Azure.
- `infra/scripts/provision-azure-production.ps1`: chạy `Bicep` bằng `Azure CLI`.
- `docker-compose.prod.yml`: định nghĩa `web`, `api` và `postgres` tùy chọn cho local.

## Chuẩn bị trước khi triển khai
- Tài khoản Azure có quyền tạo:
  - Resource Group
  - Virtual Machine
  - Public IP
  - Network Security Group
  - Azure Database for PostgreSQL Flexible Server
- `Azure CLI` đã đăng nhập.
- Một khóa SSH công khai cho máy ảo.
- Domain production trỏ về IP public của máy ảo.
- Cấu hình DNS tối thiểu:
  - `airplane.id.vn` trỏ về web trên Coolify
  - `api.airplane.id.vn` trỏ về API trên Coolify
- Các khóa production:
  - `APP_AUTH_JWT_SECRET`
  - `SPRING_MAIL_*`
  - `APP_MAIL_*`
  - `APP_PAYMENT_SEPAY_*`
  - `NEXT_PUBLIC_API_BASE_URL`
  - khóa `Gemini`, `OpenWeather`, `NewsData` nếu muốn bật đủ trợ lý AI
- Các giá trị ngoài repo còn phải điền thủ công trước cutover:
  - `APP_PAYMENT_SEPAY_BANK_ACCOUNT_ID`
  - `APP_PAYMENT_SEPAY_WEBHOOK_API_KEY`
  - webhook public thật `https://api.airplane.id.vn/api/payments/webhooks/sepay`
  - domain production và DNS
  - `COOLIFY_WEB_PRODUCTION_WEBHOOK_URL`
  - `COOLIFY_API_PRODUCTION_WEBHOOK_URL`

## Kiểm tra cấu hình production trước khi cutover
- Chạy nhanh tại thư mục gốc repo:

```powershell
npm run validate:production:config
```

- Lệnh này sẽ:
  - kiểm tra cú pháp `docker-compose.prod.yml`
  - kiểm tra biên dịch `infra/azure/main.bicep`

## Bước 1. Tạo hạ tầng Azure
1. Sao chép `infra/azure/production.parameters.example.json` thành file riêng, ví dụ `infra/azure/production.parameters.json`.
2. Thay toàn bộ giá trị mẫu bằng thông tin thật.
3. Chọn đúng cặp:
   - `postgresqlSku`
   - `postgresqlTier`
   
   Ví dụ:
   - `Standard_B1ms` đi với `Burstable`
   - `Standard_D2ds_v4` đi với `GeneralPurpose`
   - `Standard_E2ds_v4` đi với `MemoryOptimized`
4. Chạy:

```powershell
pwsh -File .\infra\scripts\provision-azure-production.ps1 `
  -SubscriptionId "<subscription-id>" `
  -ResourceGroupName "rg-qlvmb-prod" `
  -Location "southeastasia" `
  -ParametersFile "infra/azure/production.parameters.json"
```

## Bước 2. Truy cập Coolify lần đầu
- `Bicep` trả ra:
  - địa chỉ `http://<ip>:8000`
  - lệnh SSH vào máy
  - hostname PostgreSQL
- Truy cập `http://<ip>:8000` ngay sau khi cài xong để tạo tài khoản quản trị đầu tiên.
- Sau khi đăng nhập, thêm domain production và bật HTTPS trên Coolify.

## Bước 3. Tạo 2 ứng dụng trong Coolify
### 1. Ứng dụng `api`
- Nguồn: repo GitHub hiện tại
- Nhánh: `main`
- Dockerfile: `apps/api/Dockerfile`
- Build context: `apps/api`
- Cổng nội bộ: `8080`
- Health check: `/api/meta/health`
- Domain công khai: `api.airplane.id.vn`

### 2. Ứng dụng `web`
- Nguồn: repo GitHub hiện tại
- Nhánh: `main`
- Dockerfile: `apps/web/Dockerfile`
- Build context: thư mục gốc repo
- Cổng nội bộ: `3000`
- Domain công khai: `airplane.id.vn`

## Bước 4. Nhập biến môi trường vào Coolify
### Nhóm `api`
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_FLYWAY_ENABLED=true`
- `APP_AUTH_JWT_SECRET`
- `APP_AUTH_JWT_ISSUER`
- `APP_AUTH_JWT_ACCESS_TOKEN_TTL_SECONDS`
- `APP_AUTH_JWT_REFRESH_TOKEN_TTL_SECONDS`
- `APP_CORS_ALLOWED_ORIGIN_PATTERNS`
- `SPRING_MAIL_HOST`
- `SPRING_MAIL_PORT`
- `SPRING_MAIL_USERNAME`
- `SPRING_MAIL_PASSWORD`
- `SPRING_MAIL_SMTP_AUTH`
- `SPRING_MAIL_SMTP_STARTTLS_ENABLE`
- `APP_MAIL_ENABLED`
- `APP_MAIL_FROM_EMAIL`
- `APP_PAYMENT_SEPAY_TOKEN`
- `APP_PAYMENT_SEPAY_BANK_ACCOUNT_ID`
- `APP_PAYMENT_SEPAY_WEBHOOK_API_KEY`
- `APP_PAYMENT_SEPAY_BANK_NAME`
- `APP_PAYMENT_SEPAY_ACCOUNT_NUMBER`
- `APP_PAYMENT_SEPAY_ACCOUNT_HOLDER_NAME`
- `APP_PAYMENT_SEPAY_ORDER_DURATION_SECONDS`
- `APP_UPLOAD_AVATAR_DIR`
- `GEMINI_API_KEY` hoặc `GOOGLE_GENERATIVE_AI_API_KEY` nếu muốn bật AI ở backend về sau

### Nhóm `web`
- `NEXT_PUBLIC_API_BASE_URL`
- `GEMINI_API_KEY` hoặc `GOOGLE_GENERATIVE_AI_API_KEY`
- `GEMINI_MODEL`
- `OPENWEATHER_API_KEY`
- `NEWSDATA_API_KEY` hoặc `NEWSDATAIO_API_KEY`

## Dữ liệu hội viên có sẵn để test local
- `nnn045856@gmail.com` có:
  - 1 tài khoản loyalty thật
  - lịch sử điểm gần đây
  - voucher khả dụng và voucher đã dùng để kiểm tra hiển thị
- API đã sẵn sàng:
  - `GET /api/me/loyalty`
  - `GET /api/me/vouchers`
- Hai endpoint này chỉ mở cho vai trò `member`.

## Bước 5. Kết nối Azure Database for PostgreSQL
- Dùng output `postgresqlHost` từ `Bicep`.
- Chuỗi JDBC mẫu:

```text
jdbc:postgresql://<postgres-host>:5432/airticket?sslmode=require
```

- Chỉ nhập chuỗi này vào app `api` trên Coolify, không lưu secret production trong repo.

## Bước 6. Kết nối GitHub Actions với Coolify
- Tạo Deploy Webhook trong Coolify cho môi trường production.
- Lưu URL webhook đầy đủ vào GitHub Secret:
  - `COOLIFY_PRODUCTION_WEBHOOK_URL`
- Workflow `deploy.yml` sẽ:
  - chạy lại test và build
  - build thử image `api` và `web`
  - trigger webhook Coolify khi `main` cập nhật

## Kiểm tra sau deploy
- `web` mở được qua domain production.
- `GET /api/meta/health` trả `ok`.
- `https://airplane.id.vn` và `https://api.airplane.id.vn` đều dùng HTTPS hợp lệ.
- Đăng nhập và quên mật khẩu hoạt động.
- Luồng `QC5004` tạo được phiên thanh toán.
- Gửi email OTP và email vé hoạt động.
- Backoffice hiển thị đúng theo 5 vai trò.
- Tài khoản `member` xem được điểm thưởng và voucher thật trên trang tài khoản.

## Rollback nhanh
1. Mở Coolify.
2. Chọn bản deploy gần nhất ổn định.
3. Redeploy lại phiên bản đó.
4. Nếu lỗi do biến môi trường, khôi phục env cũ trước rồi redeploy.

## Lưu ý vận hành
- Không mở PostgreSQL cho toàn Internet; `Bicep` hiện khóa theo IP public của máy ảo chạy Coolify.
- Đổi toàn bộ secret mẫu trước khi public.
- Sau khi `Coolify` khởi tạo xong, nên giới hạn lại cổng `8000` hoặc chỉ cho phép truy cập từ IP quản trị.
