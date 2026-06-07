# Pha 3 - Nghiệp vụ còn thiếu

## Mục tiêu
- Hoàn tất những phần còn thiếu trước khi public production.

## Checklist
- [x] Thay `AuthController /api/auth/roles` khỏi `DemoDataService`
- [x] Thay `CustomerController /api/customers/me/overview` khỏi `DemoDataService`
- [x] Thay `SupportController /api/support/overview` khỏi `DemoDataService`
- [x] Thay `CmsController /api/cms/homepage` và `BackofficeCmsController` khỏi `DemoDataService`
- [x] Hoàn thiện phần đọc dữ liệu `member/loyalty/voucher`
- [x] Áp voucher trực tiếp tại checkout và đồng bộ giảm giá vào booking
- [ ] Cắm `SePay live` với `BANK_ACCOUNT_ID`, webhook URL và khóa webhook thật
- [ ] Bật SMTP production và xác nhận OTP + email vé
- [ ] Rà AI `Gemini` với fallback production an toàn
