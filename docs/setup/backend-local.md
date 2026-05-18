# Chạy backend local

## Yêu cầu
- Java `21`
- Maven `3.9+`
- PostgreSQL local hoặc PostgreSQL từ Docker

## Biến môi trường tối thiểu
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_CORS_ALLOWED_ORIGIN_PATTERNS`
- `APP_AUTH_JWT_SECRET`

Nếu chưa có giá trị riêng, có thể dùng local:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/airticket
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
APP_CORS_ALLOWED_ORIGIN_PATTERNS=http://localhost:3000,http://127.0.0.1:3000
APP_AUTH_JWT_SECRET=doi-secret-toi-thieu-32-ky-tu-va-phai-thay-doi
```

## Cấu hình gửi OTP và email vé thật
Nếu chạy profile `local`, backend sẽ nạp thêm:

```text
apps/api/local-mail.properties
```

Ví dụ:

```properties
APP_MAIL_ENABLED=true
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=emailcuaban@gmail.com
SPRING_MAIL_PASSWORD=mat_khau_ung_dung
SPRING_MAIL_SMTP_AUTH=true
SPRING_MAIL_SMTP_STARTTLS_ENABLE=true
APP_MAIL_FROM_EMAIL=emailcuaban@gmail.com
```

File này nên để local và không đẩy lên Git.

## Chạy local với profile `local`

```powershell
$env:SPRING_PROFILES_ACTIVE="local"
.\mvnw.cmd spring-boot:run
```

## Kiểm tra nhanh
- Health endpoint: `GET /api/meta/health`
- Tìm sân bay: `GET /api/airports?query=SGN`
- Tìm chuyến bay: `GET /api/flights/search?from=SGN&to=HAN&departureDate=2026-05-23`
