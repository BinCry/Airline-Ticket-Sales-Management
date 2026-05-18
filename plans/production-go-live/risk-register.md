# Risk Register trước cutover production

## Trạng thái tại thời điểm chốt vòng hardening
- `apps/api`: `93` test pass
- `apps/web`: `69` unit test pass
- `apps/web`: `4` Playwright smoke pass
- `apps/web`: build production pass
- `docker-compose.prod.yml`: đã xác thực cú pháp bằng `docker-compose config`
- `infra/azure/main.bicep`: đã build thành công bằng `az bicep build`

## P0 - blocker chưa thể tự đóng trong repo
| Mã | Rủi ro | Tác động | Trạng thái | Hành động cần làm |
| --- | --- | --- | --- | --- |
| `P0-01` | Thiếu `APP_PAYMENT_SEPAY_BANK_ACCOUNT_ID` | Không bật được `SePay live`, session thanh toán thật chưa hoàn tất | Chưa đóng | Điền secret production trên Coolify |
| `P0-02` | Thiếu `APP_PAYMENT_SEPAY_WEBHOOK_API_KEY` và webhook public thật | Không xác thực được callback production | Chưa đóng | Cấu hình `https://api.airplane.id.vn/api/payments/webhooks/sepay` |
| `P0-03` | Thiếu SMTP production thật | OTP và email vé chưa thể kiểm chứng trên production | Chưa đóng | Điền `SPRING_MAIL_*` và `APP_MAIL_*` thật |
| `P0-04` | DNS cho `airplane.id.vn` và `api.airplane.id.vn` chưa được trỏ thật | Không thể cutover public | Chưa đóng | Trỏ DNS, bật HTTPS trên Coolify |
| `P0-05` | Thiếu webhook Coolify production và thông tin Azure subscription thật | Chưa thể redeploy production thật từ GitHub Actions | Chưa đóng | Điền secret triển khai ngoài repo |

## P1 - rủi ro cần theo dõi sát khi lên production
| Mã | Rủi ro | Tác động | Trạng thái | Ghi chú |
| --- | --- | --- | --- | --- |
| `P1-01` | `npm audit --omit=dev` còn advisory `next -> postcss` mức `moderate` | Còn rủi ro phụ thuộc phía framework dù đã nâng `next` lên `16.2.6` | Đang theo dõi | Đã gỡ xong nhóm `high` của `vite/picomatch`, chưa ép `audit fix --force` để tránh phá `Next` |
| `P1-02` | Tài khoản seed Gmail thật sẽ nhận OTP và email vé khi bật SMTP production | Có thể phát sinh email thật trong lúc QA production | Chấp nhận có kiểm soát | Cần bạn xác nhận tiếp tục dùng 4 Gmail seed này cho QA production |
| `P1-03` | Browser smoke mới phủ lớp E2E tối thiểu | Chưa phủ toàn bộ hành vi backoffice sâu và mọi biến thể thanh toán thật | Giảm rủi ro nhưng chưa tuyệt đối | Đã ưu tiên các luồng sống còn và ma trận RBAC chính |
| `P1-04` | Máy hiện tại mới xác thực được CLI và cú pháp Compose, chưa build image bằng engine container cục bộ | Chưa có kiểm chứng local hoàn chỉnh cho `docker build` | Đang theo dõi | CI GitHub Actions vẫn là lớp build chính trước cutover |

## P2 - tồn đọng không chặn cutover ngay
| Mã | Rủi ro | Tác động | Trạng thái | Ghi chú |
| --- | --- | --- | --- | --- |
| `P2-01` | Một số migration lịch sử vẫn chứa email `@qlvmb.local` cũ | Có thể gây nhiễu khi đọc lịch sử seed | Chấp nhận | Runtime đã được `V18` căn lại sang Gmail seed mới |
| `P2-02` | Một số log test tiếng Việt còn lỗi mã hóa trong console Windows | Không ảnh hưởng runtime production | Chưa xử lý | Có thể dọn sau nếu cần log đẹp tuyệt đối |

## Kết luận QA/QC
- Repo đang ở trạng thái `sẵn sàng cutover` trong phạm vi mã nguồn và cấu hình có thể tự đóng trong máy hiện tại.
- Không còn `P0` nội bộ trong repo sau vòng hardening, kiểm thử và xác thực hạ tầng tĩnh.
- Khi các đầu vào ngoài repo được điền đủ, thứ tự xác minh cuối nên là:
  1. Deploy `api` và `web` lên Coolify
  2. Chạy `GET /api/meta/health`
  3. Đăng nhập theo 4 vai trò Gmail
  4. Tạo session SePay live
  5. Xác minh OTP và email vé thật
