# Quản lý bán vé máy bay

[![Java Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)

Hệ thống quản lý bán vé máy bay được phát triển với kiến trúc Monorepo (Next.js & Spring Boot).

## Tổng quan
- Dự án gồm 2 phần chính:
  - `apps/api`: máy chủ `Spring Boot` chạy trên `Java 21`
  - `apps/web`: giao diện `Next.js` dùng `App Router`
- Cơ sở dữ liệu chính là `PostgreSQL`.
- Các thay đổi cấu trúc dữ liệu được quản lý bằng `Flyway`.
- Mục tiêu production hiện tại:
  - giữ đúng `5` vai trò sản phẩm
  - chạy `web + api` trên `Azure VM + Coolify`
  - dùng `Azure Database for PostgreSQL Flexible Server`
  - deploy tự động từ `main`

## Năm vai trò sản phẩm
- `guest`
- `customer`
- `member`
- `customer_support`
- `operations_staff`

> `permission` chỉ là lớp kỹ thuật nội bộ của backend và web để khóa hành vi chi tiết, không được xem là vai trò mới trong UI hay tài liệu sản phẩm.

## Cấu trúc thư mục
- `apps/api`: API, nghiệp vụ, migration và kiểm thử backend
- `apps/web`: giao diện người dùng, route, component và kiểm thử web
- `packages/shared-types`: kiểu dữ liệu dùng chung giữa web và backend
- `infra/azure`: hạ tầng `Bicep` cho production Azure
- `infra/scripts`: script hỗ trợ provision và vận hành
- `plans/production-go-live`: kế hoạch production để Claude Kit bám theo

## Hỗ trợ Claude Kit
- Repo đã tích hợp:
  - `/.claude`
  - `/.codex`
  - `/plans`
  - `CLAUDE.md`
- Kế hoạch production chính:
  - [plans/production-go-live/plan.md](plans/production-go-live/plan.md)
- Tài liệu production:
  - [docs/setup/production-azure-coolify.md](docs/setup/production-azure-coolify.md)
  - [docs/architecture/ma-tran-vai-tro-production.md](docs/architecture/ma-tran-vai-tro-production.md)

### GitNexus dùng chung
- Kho mã chỉ theo dõi bộ hướng dẫn nhỏ ở `.claude/skills/gitnexus`.
- Không đưa `.gitnexus/` vào Git vì đây là chỉ mục cục bộ và có kích thước lớn.
- Mỗi thành viên tạo lại chỉ mục tại thư mục gốc khi cần:

```powershell
npx gitnexus analyze
```

- Kiểm tra trạng thái chỉ mục:

```powershell
npx gitnexus status
```

## Chạy local

### 1. Chuẩn bị biến môi trường
- Tạo file `.env` ở thư mục gốc từ `.env.example`.
- Tạo file `apps/web/.env.local` từ `apps/web/.env.example`.
- File `.env` dùng cho backend, `docker-compose.prod.yml` và các lệnh local.
- File `apps/web/.env.local` được `Next.js` đọc trực tiếp khi chạy máy cục bộ.

### 2. Khởi động PostgreSQL local
- Dùng `docker-compose.prod.yml` với profile `local-db`:

```powershell
docker compose -f docker-compose.prod.yml --profile local-db up -d postgres
```

- Mặc định local:
  - tên cơ sở dữ liệu: `airticket`
  - tài khoản: `postgres`
  - mật khẩu: lấy từ `POSTGRES_PASSWORD` trong `.env`

### 3. Chạy backend
- Tại `apps/api`, khai báo tối thiểu:

```powershell
$env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/airticket"
$env:SPRING_DATASOURCE_USERNAME="postgres"
$env:SPRING_DATASOURCE_PASSWORD="doi-mat-khau-database"
$env:APP_AUTH_JWT_SECRET="doi-secret-toi-thieu-32-ky-tu-va-phai-thay-doi"
$env:APP_AUTH_JWT_ISSUER="airticket-api"
$env:SPRING_PROFILES_ACTIVE="local"
```

- Sau đó chạy:

```powershell
.\mvnw.cmd spring-boot:run
```

- API local mặc định: `http://localhost:8080`
- Health endpoint: `GET http://localhost:8080/api/meta/health`

### 4. Chạy web
- Cài dependency tại thư mục gốc:

```powershell
npm install
```

- Chạy web:

```powershell
npm run dev:web
```

- Web local mặc định: `http://localhost:3000`

### 5. Kiểm tra nhanh dữ liệu test
- Script smoke check:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-check-flight-search.ps1
```

- Truy vấn nhanh:
  - `SGN -> HAN`
  - ngày đi `2026-05-23`
  - ngày về `2026-05-26`

## Tài khoản test nội bộ
- Mật khẩu mặc định cho 4 tài khoản đăng nhập: `25102006Qu@n`

| Vai trò | Email đăng nhập | Ghi chú |
| --- | --- | --- |
| `guest` | Không có tài khoản đăng nhập | Vai trò công khai để kiểm tra luồng tìm chuyến, hỗ trợ, tình trạng chuyến bay và tra cứu mã đặt chỗ |
| `customer` | `quanpm2006git@gmail.com` | Tài khoản khách hàng thông thường |
| `member` | `nnn045856@gmail.com` | Tài khoản hội viên |
| `customer_support` | `anmycfs2006@gmail.com` | Tài khoản chăm sóc khách hàng, bán vé nội bộ, tài chính và CMS |
| `operations_staff` | `bincry2006@gmail.com` | Tài khoản vận hành và quản trị hệ thống |

## Dữ liệu test local
- Chuyến bay có dữ liệu:
  - `VN5201`
  - `VN5205`
  - `VN5211`
  - `VN5302`
  - `VN5308`
  - `VN5316`
- Các mã đặt chỗ mẫu:
  - `QC5001`: đã thanh toán, đã xuất vé
  - `QC5002`: đã thanh toán, đã check-in
  - `QC5003`: đã thanh toán, đang chờ hoàn vé và có email vé lỗi để support gửi lại
  - `QC5004`: đang giữ chỗ, dùng để test thanh toán
- Dữ liệu hội viên thật cho `nnn045856@gmail.com`:
  - điểm thưởng hiện có
  - lịch sử cộng điểm gần đây
  - voucher khả dụng và voucher đã dùng để kiểm tra hiển thị
  - API hội viên:
    - `GET /api/me/loyalty`
    - `GET /api/me/vouchers`

### Tích điểm và nâng hạng tự động
- Chỉ mã đặt chỗ mới gắn với tài khoản hội viên đã xác thực mới được tích điểm; không suy đoán bằng email hoặc cộng hồi tố mã cũ.
- Khi chuyến bay chuyển sang `landed`, hệ thống cộng `floor(giá vé mỗi hành khách × số vé chưa hủy của chặng / 1000)` cho mã đã thanh toán, xuất vé và tài khoản còn vai trò hội viên. Không tính dịch vụ bổ sung hay phân bổ voucher.
- Điểm khả dụng, tổng điểm tích lũy và lịch sử được lưu trong cùng giao dịch, khóa theo tài khoản và có ràng buộc duy nhất để không cộng trùng.
- Ngưỡng hạng lấy từ `loyalty_tier_rule`: Hội viên `0`, Bạc `10000`, Vàng `20000`, Bạch Kim `40000`. Chỉ nâng hạng, không tự hạ hạng.
- Tích điểm chạy sau khi cập nhật chuyến bay đã lưu thành công; lỗi tích điểm không hoàn tác trạng thái chuyến. Tác vụ đối soát chạy mỗi phút để thử lại chặng còn thiếu điểm.
- Trang `/account` hiển thị hạng, số dư, tổng điểm tích lũy, tiến độ lên hạng và lịch sử gần đây. Thông báo nâng hạng dùng cấu hình thư hiện có; không cần biến môi trường production mới.

### Sơ đồ ghế theo tàu bay
- Di trú `V32` bổ sung loại tàu, tàu bay vật lý, cấu hình cabin và tàu bay của chuyến. Không sửa di trú đã phát hành.
- Đặt vé và làm thủ tục dùng chung sơ đồ từ `GET /api/flights/{flightId}/seat-map`; phản hồi công khai chỉ có cabin và trạng thái ghế, không có thông tin người giữ.
- Điều hành quản lý loại tàu, JSON cabin và tàu vật lý tại `/backoffice/operations`, mục **Tàu bay và sơ đồ ghế**. Chỉ tàu `ACTIVE` được gán mới. Thay đổi làm ghế đang giữ không hợp lệ sẽ bị chặn và trả danh sách ghế xung đột.
- Giữ chỗ còn hạn, vé chưa hủy và thẻ lên máy bay còn hiệu lực chiếm ghế; giữ chỗ hết hạn và vé hủy không chiếm ghế. Làm thủ tục phải xác nhận ghế, không cấp ngẫu nhiên.
- Di trú kiểm tra dữ liệu ghế cũ trước khi gán tàu. Cabin riêng bảo toàn vị trí cũ nằm ngoài sơ đồ chuẩn; nếu dữ liệu cũ trùng ghế hoặc một hàng có nhiều hạng vé, di trú dừng với lỗi cụ thể để người vận hành xử lý, không tự chuyển ghế hành khách.
- Không thêm thư viện, biến môi trường bắt buộc hoặc thay đổi cấu hình triển khai. Hướng dẫn thao tác và đủ 18 kịch bản: [Kiểm thử sơ đồ ghế](docs/testing/nghiep-vu-4-so-do-ghe.md).

## Production trên Azure + Coolify

### Thành phần chính
- `Azure VM` cài `Coolify`
- `Azure Database for PostgreSQL Flexible Server`
- `docker-compose.prod.yml` dùng cho `web + api`
- GitHub Actions trigger redeploy qua webhook Coolify
- Domain production:
  - `https://airticket.bincrydev.id.vn`
  - `https://airticket.api.bincrydev.id.vn`

### Hạ tầng trong repo
- `infra/azure/main.bicep`
- `infra/azure/cloud-init-coolify.yml`
- `infra/azure/production.parameters.example.json`
- `infra/scripts/provision-azure-production.ps1`

### Tài liệu production
- [docs/setup/production-azure-coolify.md](docs/setup/production-azure-coolify.md)

### Secret production bắt buộc
- `APP_AUTH_JWT_SECRET`
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_MAIL_*`
- `APP_MAIL_*`
- `APP_PAYMENT_SEPAY_*`
- `NEXT_PUBLIC_API_BASE_URL`
- `COOLIFY_WEB_PRODUCTION_WEBHOOK_URL` trên GitHub Actions
- `COOLIFY_API_PRODUCTION_WEBHOOK_URL` trên GitHub Actions
- `COOLIFY_TOKEN` có quyền `deploy` trên GitHub Actions, workflow gọi webhook bằng `POST`

### Kiểm tra nhanh cấu hình production
- Lệnh:

```powershell
npm run validate:production:config
```

- Lệnh này sẽ:
  - kiểm tra cú pháp `docker-compose.prod.yml`
  - kiểm tra biên dịch `infra/azure/main.bicep`

## Kiểm thử trước khi giao
- Backend:

```powershell
cd apps/api
.\mvnw.cmd test
```

- Kiểm thử tích hợp tích điểm và sơ đồ ghế cần cơ sở dữ liệu PostgreSQL **riêng cho kiểm thử**, tài khoản có quyền tạo lược đồ; bài kiểm thử chạy toàn bộ di trú trong một lược đồ mới. Không trỏ đến dữ liệu production.
- Khai báo các biến chỉ dành cho kiểm thử rồi chạy lại lệnh backend phía trên:

```powershell
$env:LOYALTY_TEST_DB_URL="jdbc:postgresql://localhost:5432/airticket_loyalty_test"
$env:LOYALTY_TEST_DB_USER="postgres"
$env:LOYALTY_TEST_DB_PASSWORD="mat-khau-database-kiem-thu"
```

- Các bộ kiểm thử PostgreSQL tích điểm và sơ đồ ghế dùng chung ba biến kiểm thử phía trên. Khi không có `LOYALTY_TEST_DB_URL`, các bộ này không chạy; các kiểm thử backend còn lại vẫn chạy như hiện tại. Hai biến tài khoản mặc định là `loyalty_test` và mật khẩu rỗng, nên cần ghi đè theo cơ sở dữ liệu kiểm thử của bạn. Không cần cấu hình các biến này trong Coolify; pipeline hiện có giữ nguyên. Khi chạy chúng trên CI, cấu hình các biến ở môi trường kiểm thử của job, mật khẩu dùng secret. Không coi kết quả chỉ có mock là bằng chứng cho tính đúng đắn của khóa ghế.

- Web:

```powershell
npm run test:web
npm run build:web
npm run test:e2e:web
npm run validate:production:config
```

## Ghi chú vận hành
- `SePay live` chỉ bật hoàn toàn khi có:
  - `APP_PAYMENT_SEPAY_TOKEN`
  - `APP_PAYMENT_SEPAY_BANK_ACCOUNT_ID`
  - `APP_PAYMENT_SEPAY_WEBHOOK_API_KEY`
  - webhook public trỏ về `POST /api/payments/webhooks/sepay`
- Voucher của `member` hiện đã áp được trực tiếp vào bước checkout và được đồng bộ về booking sau khi giữ chỗ.
- OTP và email vé dùng chung cấu hình mail.
- `Coolify` là nơi quản lý biến môi trường production, không commit `.env` production vào repo.
