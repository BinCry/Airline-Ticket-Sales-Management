# Lên production bằng image registry cho Azure + Coolify

## Mục tiêu
- Không để `Coolify` tự build source trên VPS `4GB RAM`.
- Chuyển toàn bộ bước build image sang `GitHub Actions`.
- `Coolify` chỉ kéo image mới từ `GHCR` rồi khởi động lại container.
- Giảm rủi ro `OOM`, `504 Gateway Time-out` và treo panel trong lúc deploy.

## Luồng deploy mới
1. Dev push lên `main`.
2. GitHub Actions chạy test, build và push image lên `GHCR`.
3. GitHub Actions gọi webhook redeploy cho từng app trên `Coolify`.
4. `Coolify` chỉ pull image mới rồi restart container.

## Image được publish
- Web:
  - `ghcr.io/<owner>/<repo>-web:main`
  - `ghcr.io/<owner>/<repo>-web:sha-<full-commit-sha>`
- API:
  - `ghcr.io/<owner>/<repo>-api:main`
  - `ghcr.io/<owner>/<repo>-api:sha-<full-commit-sha>`

Ví dụ với repo hiện tại:
- `ghcr.io/bincry/airline-ticket-sales-management-web:main`
- `ghcr.io/bincry/airline-ticket-sales-management-api:main`

## GitHub Secrets cần có
- `COOLIFY_WEB_PRODUCTION_WEBHOOK_URL`
- `COOLIFY_API_PRODUCTION_WEBHOOK_URL`

Lưu ý:
- Secret cũ `COOLIFY_PRODUCTION_WEBHOOK_URL` không còn được workflow production dùng nữa.
- Giữ secret cũ có thể gây nhầm lẫn vì nó thường trỏ về flow source-build cũ.

## Cấu hình GHCR cho Coolify
### Nếu để image public
- Không cần thêm registry credential vào `Coolify`.
- Đây là cách ít thao tác nhất.

### Nếu để image private
1. Tạo `GitHub Personal Access Token` với quyền `read:packages`.
2. Trong `Coolify`, thêm registry mới:
   - Registry: `ghcr.io`
   - Username: tài khoản GitHub của bạn
   - Password: token `read:packages`
3. Gán registry đó cho cả app `web` và `api`.

## Chuyển app `web` sang image-based deploy
1. Mở app `web` trong `Coolify`.
2. Đổi loại nguồn từ `Git Repository / Dockerfile` sang `Docker Image`.
3. Điền image:
   - `ghcr.io/<owner>/<repo>-web:main`
4. Giữ cổng nội bộ là `3000`.
5. Giữ domain:
   - `https://airplane.id.vn`
6. Giữ các biến môi trường hiện có:
   - `NEXT_PUBLIC_API_BASE_URL`
   - `GEMINI_API_KEY` hoặc `GOOGLE_GENERATIVE_AI_API_KEY`
   - `GEMINI_MODEL`
   - `OPENWEATHER_API_KEY`
   - `NEWSDATA_API_KEY` hoặc `NEWSDATAIO_API_KEY`
7. Tạo webhook redeploy riêng của app `web`, lưu vào:
   - `COOLIFY_WEB_PRODUCTION_WEBHOOK_URL`

## Chuyển app `api` sang image-based deploy
1. Mở app `api` trong `Coolify`.
2. Đổi loại nguồn từ `Git Repository / Dockerfile` sang `Docker Image`.
3. Điền image:
   - `ghcr.io/<owner>/<repo>-api:main`
4. Giữ cổng nội bộ là `8080`.
5. Giữ health check:
   - `/api/meta/health`
6. Giữ domain:
   - `https://api.airplane.id.vn`
7. Giữ toàn bộ biến môi trường production hiện có:
   - `SPRING_DATASOURCE_*`
   - `APP_AUTH_*`
   - `SPRING_MAIL_*`
   - `APP_MAIL_*`
   - `APP_PAYMENT_SEPAY_*`
   - `APP_UPLOAD_AVATAR_DIR`
8. Tạo webhook redeploy riêng của app `api`, lưu vào:
   - `COOLIFY_API_PRODUCTION_WEBHOOK_URL`

## Việc cần dọn sau khi chuyển
- Tắt hoặc bỏ cơ chế source-build cũ trong `Coolify`.
- Không để app production tiếp tục watch nhánh `deploy` theo kiểu build source.
- Nếu có app production cũ còn trỏ vào repo và branch `deploy`, hãy chuyển nó sang image hoặc tắt đi trước khi bật lại VPS.

## Swap khuyến nghị cho VPS 4GB
Với VM 4GB, vẫn nên thêm swap để tránh chết đột ngột khi:
- kéo image lớn
- giải nén layer
- restart đồng thời nhiều service

Lệnh thêm swap:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

## Khi VPS bật lại
1. Bật VPS.
2. Xác nhận `docker` và `Coolify` sống ổn.
3. Chuyển app `web` và `api` sang image-based deploy trong `Coolify`.
4. Cấu hình webhook mới cho từng app.
5. Redeploy từng app từ image `:main`.
6. Kiểm tra:
   - `https://airplane.id.vn`
   - `https://api.airplane.id.vn/api/meta/health`

## Rollback
Nếu image mới có vấn đề:
1. Trong `Coolify`, đổi tag từ `:main` về tag commit cũ:
   - `:sha-<commit-sha-cu>`
2. Redeploy lại app tương ứng.

## Ghi chú vận hành
- Cách này không làm biến môi trường production biến mất.
- Bạn chỉ đổi **nguồn deploy**, không đổi domain hay contract API.
- Lợi ích lớn nhất là host production không còn phải gánh `npm ci`, `next build`, `mvn package`, `docker build`.
