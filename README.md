# Quản lý bán vé máy bay

## Tổng quan
- Dự án gồm 2 phần chính:
  - `apps/api`: Máy chủ `Spring Boot` chạy trên `Java 21`
  - `apps/web`: Giao diện `Next.js` dùng `App Router`
- Cơ sở dữ liệu chính là `PostgreSQL`.
- Các thay đổi cấu trúc dữ liệu được quản lý bằng `Flyway`.

## Cấu trúc thư mục
- `apps/api`: API, nghiệp vụ, di trú dữ liệu và kiểm thử máy chủ
- `apps/web`: giao diện người dùng, đường dẫn, thành phần hiển thị và kiểm thử giao diện
- `packages/shared-types`: kiểu dữ liệu dùng chung giữa giao diện và máy chủ
- `docker-compose.prod.yml`: cấu hình dựng `PostgreSQL` và `API` cho môi trường VPS

## Cách chạy dự án ở máy cục bộ

### 1. Chuẩn bị biến môi trường
- Tạo file `.env` ở thư mục gốc từ `.env.example`.
- Tạo file `apps/web/.env.local` từ `apps/web/.env.example`.
- File `.env` dùng làm nguồn tham chiếu cho máy chủ và Docker Compose.
- File `apps/web/.env.local` được `Next.js` đọc trực tiếp khi chạy máy cục bộ.

### 2. Khởi động cơ sở dữ liệu
- Từ thư mục gốc, chạy:

```powershell
docker compose -f docker-compose.prod.yml up -d postgres
```

- Mặc định cơ sở dữ liệu máy cục bộ dùng:
  - Tên cơ sở dữ liệu: `airticket`
  - Tài khoản: `postgres`
  - Mật khẩu: lấy từ `POSTGRES_PASSWORD` trong `.env`

### 3. Chạy máy chủ bằng Maven Wrapper
- Mở terminal tại `apps/api`.
- Khai báo tối thiểu các biến môi trường trong terminal hoặc trong cấu hình chạy của IDE:

```powershell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/airticket"
$env:SPRING_DATASOURCE_USERNAME="postgres"
$env:SPRING_DATASOURCE_PASSWORD="doi-mat-khau-database"
$env:APP_AUTH_JWT_SECRET="doi-secret-toi-thieu-32-ky-tu-va-phai-thay-doi"
$env:APP_AUTH_JWT_ISSUER="airticket-api"
```

- Sau đó chạy:

```powershell
./mvnw.cmd spring-boot:run
```

- Nếu chạy trên `bash` hoặc `zsh`, dùng:

```bash
./mvnw spring-boot:run
```

- Địa chỉ API máy cục bộ mặc định: `http://localhost:8080`

### 4. Chạy giao diện
- Cài gói ở thư mục gốc:

```powershell
npm install
```

- Chạy web từ thư mục gốc:

```powershell
npm run dev:web
```

- Hoặc chạy trực tiếp trong `apps/web`:

```powershell
npm run dev
```

- Địa chỉ web máy cục bộ mặc định: `http://localhost:3000`

### 5. Chạy kiểm thử trước khi làm việc tiếp
- Backend:

```powershell
cd apps/api
./mvnw.cmd clean test
```

- Web:

```powershell
npm run test:web
npm run build:web
```

## Triển khai lên Azure VPS

### 1. Chuẩn bị máy chủ
- Cài sẵn `Docker` và `Docker Compose`.
- Sao chép mã nguồn lên VPS.
- Tạo file `.env` ở thư mục gốc từ `.env.example`.

### 2. Cấu hình bắt buộc trong `.env`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `APP_AUTH_JWT_SECRET`
- `APP_AUTH_JWT_ISSUER`
- `APP_CORS_ALLOWED_ORIGIN_PATTERNS`

### 3. Cấu hình nên điền trước khi mở trình diễn
- `SPRING_MAIL_HOST`
- `SPRING_MAIL_PORT`
- `SPRING_MAIL_USERNAME`
- `SPRING_MAIL_PASSWORD`
- `SPRING_MAIL_SMTP_AUTH`
- `SPRING_MAIL_SMTP_STARTTLS_ENABLE`
- `APP_MAIL_ENABLED`
- `APP_MAIL_FROM_EMAIL`

### 4. Dựng dịch vụ trên VPS
- Từ thư mục gốc, chạy:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

- Kiểm tra log máy chủ:

```bash
docker compose -f docker-compose.prod.yml logs -f api
```

- Kiểm tra trạng thái cơ sở dữ liệu:

```bash
docker compose -f docker-compose.prod.yml ps
```

### 5. Gợi ý hoàn thiện trước khi public
- Gắn tên miền hoặc bộ chuyển tiếp cho cổng `8080`.
- Cấu hình `NEXT_PUBLIC_API_BASE_URL` của giao diện trỏ về địa chỉ API trên VPS.
- Thay toàn bộ khóa bí mật mặc định trong `.env` trước khi mở truy cập thật.

## Tài khoản thử nội bộ
- Mật khẩu mặc định cho cả 5 tài khoản: `Demo@123456`

| Vai trò | Email đăng nhập | Ghi chú |
| --- | --- | --- |
| `guest` | `guest.demo@qlvmb.local` | Tài khoản quyền thấp nhất để giáo viên kiểm tra luồng công khai |
| `customer` | `customer.demo@qlvmb.local` | Tài khoản khách hàng thông thường |
| `member` | `member.demo@qlvmb.local` | Tài khoản hội viên |
| `customer_support` | `support.demo@qlvmb.local` | Tài khoản chăm sóc khách hàng và tài chính nội bộ |
| `operations_staff` | `operations.demo@qlvmb.local` | Tài khoản vận hành và quản trị backoffice |

## Ghi chú thêm
- File `apps/api/local-mail.properties` chỉ dùng cho cấu hình máy cục bộ riêng của máy bạn và đang bị bỏ qua khỏi Git.
- `docker-compose.prod.yml` của pha này chỉ dựng `PostgreSQL` và `API`, chưa dựng dịch vụ giao diện.
- Nếu cần cấu hình mail OTP thật, hãy điền nhóm biến `SPRING_MAIL_*` và `APP_MAIL_*` trong `.env` trước khi khởi động lại API.
