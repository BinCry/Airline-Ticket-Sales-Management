# Pha 2 - Hạ tầng và CI/CD

## Mục tiêu
- Chuẩn hóa cách build và deploy production bằng Azure + Coolify.

## Checklist
- [x] Bật `Next.js standalone`
- [x] Thêm `apps/web/Dockerfile`
- [x] Thêm `.dockerignore`
- [x] Nâng `docker-compose.prod.yml` thành `web + api`
- [x] Thêm scaffold `infra/azure`
- [x] Viết runbook Azure/Coolify
- [x] Thay `deploy.yml` bằng pipeline production mới
- [ ] Điền GitHub Secret `COOLIFY_PRODUCTION_WEBHOOK_URL`
- [ ] Tạo app `web` và `api` trên Coolify
- [ ] Trỏ domain thật và bật HTTPS
