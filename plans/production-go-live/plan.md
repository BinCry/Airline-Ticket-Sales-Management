---
title: Sẵn sàng production với Azure, Coolify và 5 vai trò
status: in-progress
priority: P0
effort: large
branch: production-hardening
tags: [production, azure, coolify, rbac, ai]
created: 2026-05-17
---

# Sẵn sàng production với Azure, Coolify và 5 vai trò

## Mục tiêu
- Đưa hệ thống lên production thật với `web + api + Azure Database for PostgreSQL`.
- Giữ đúng `5` vai trò sản phẩm.
- Có runbook và checklist rõ ràng để Claude Kit tiếp tục audit, sửa, test và release khi còn việc dở.

## Tài liệu liên quan
- [docs/setup/production-azure-coolify.md](../../docs/setup/production-azure-coolify.md)
- [docs/architecture/ma-tran-vai-tro-production.md](../../docs/architecture/ma-tran-vai-tro-production.md)
- [risk-register.md](./risk-register.md)
- [test-matrix.md](./test-matrix.md)

## Các pha
- [Pha 1 - Audit và readiness](./phase-01-audit-readiness.md)
- [Pha 2 - Hạ tầng và CI/CD](./phase-02-ha-tang-ci-cd.md)
- [Pha 3 - Nghiệp vụ còn thiếu](./phase-03-nghiep-vu-con-thieu.md)

## Tiêu chí hoàn tất
- [x] Public health check hoạt động
- [x] `web` có Dockerfile production và build `standalone`
- [x] Seat map hiển thị rõ thân máy bay, cánh và ổn định trên browser smoke
- [x] `cms` có tạo, sửa, publish và archive mềm
- [x] `operations` có cập nhật trạng thái chuyến bay, gate, ghi chú vận hành và mở/đóng bán
- [x] Có Playwright smoke cho các luồng sống còn và ma trận vai trò tối thiểu
- [ ] `docker-compose.prod.yml` chạy được `web + api`
- [x] Có scaffold Azure `Bicep`
- [x] `deploy.yml` trigger redeploy production qua Coolify
- [x] Tài liệu production và ma trận 5 vai trò hoàn tất
- [x] Runtime chính không còn endpoint nào phụ thuộc `DemoDataService`
- [x] Loyalty/voucher v1 có dữ liệu thật và áp voucher tại checkout
- [ ] Các secret còn thiếu được điền trên GitHub/Coolify
- [ ] Hạ tầng ngoài repo được xác thực end-to-end với domain, DNS, SePay live và SMTP production
