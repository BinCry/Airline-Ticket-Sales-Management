# Chay backend local

## Yeu cau
- Java `21`
- Maven `3.9+`
- PostgreSQL local hoac Supabase PostgreSQL

## Bien moi truong toi thieu
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_CORS_ALLOWED_ORIGIN_PATTERNS`

Neu chua co gia tri rieng, backend dang co mac dinh local:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/airticket
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
APP_CORS_ALLOWED_ORIGIN_PATTERNS=http://localhost:3000,http://127.0.0.1:3000
```

## Cau hinh gui OTP email that

Neu chay profile `local`, backend se thu nap them file:

```text
apps/api/local-mail.properties
```

Noi dung mau:

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

File nay nen de local va khong day len Git.

## Chay local voi profile `local`

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
$env:SPRING_PROFILES_ACTIVE="local"
mvn spring-boot:run
```

## Kiem tra nhanh
- Health endpoint: `GET /api/meta/health`
- Tim san bay: `GET /api/airports?query=SGN`
- Tim chuyen bay: `GET /api/flights/search?from=SGN&to=HAN&departureDate=2026-03-20`
