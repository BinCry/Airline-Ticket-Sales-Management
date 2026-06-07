# Ma trận kiểm thử đã khóa trong vòng hardening

## Kết quả tổng quan
- `apps/api`: `188` test pass qua `mvn test`
- `apps/web` unit: `109` test pass qua `npm run test:web`
- `apps/web` build: pass qua `npm run build:web`
- `Playwright smoke`: `15/15` pass qua `npm run test:e2e:web`

## Theo vai trò
| Vai trò | Kịch bản chính | Kết quả hiện tại |
| --- | --- | --- |
| `guest` | Mở `/account` bị chuyển về đăng nhập | Đã pass qua Playwright |
| `customer` | Tìm chuyến, handoff booking, seat map hiển thị đúng | Đã pass smoke seat map và linked workflow backend |
| `member` | Xem loyalty, voucher và áp voucher vào booking | Đã pass ở lớp service/unit/backend workflow |
| `customer_support` | Vào `support`, bị chặn khỏi `operations`, có CRUD `cms` | Đã pass Playwright + security test |
| `operations_staff` | Vào `admin`, `operations`, cập nhật trạng thái/gate/note | Đã pass Playwright + security test |

## Chuỗi nghiệp vụ đã rà
| Chuỗi | Trạng thái |
| --- | --- |
| `payment -> local fallback -> xác nhận thủ công -> ticket -> outbox -> manage booking` | Đã khóa ở backend, helper web và regression pass |
| `checkout -> SePay live session render -> QR/link thanh toán` | Đã pass Playwright smoke với session `live` |
| `refund -> booking status -> finance dashboard -> refund status email` | Đã pass test backend và outbox |
| `customer <-> member` và đồng bộ quyền loyalty | Đã khóa guard ở backend, UI chỉ mở loyalty cho `member` |
| `flight status -> manage booking -> check-in` | Đã nối dữ liệu trạng thái, gate, ghi chú vận hành và chặn self-service khi chuyến đã bắt đầu hoặc bị hủy |
| `guest lookup -> OTP verify -> manage/check-in self-service` | Đã pass smoke OTP, header `lookupToken` và reset/giữ OTP đúng theo kết quả tra cứu |
| `backoffice sales/support/finance/operations/admin` | Đã pass smoke mutation trọng yếu của từng module |

## Browser smoke đang chạy
1. `guest` không vào được `/account`
2. `customer_support` vào được `/backoffice/support` và bị chặn khỏi `/backoffice/operations`
3. `operations_staff` vào được `/backoffice/admin` và `/backoffice/operations`
4. Booking có handoff hợp lệ hiển thị seat map với thân máy bay và cánh
5. `guest` check-in bằng OTP gửi `lookupToken` và xóa OTP sau tra cứu thành công
6. `guest` check-in bằng OTP giữ nguyên OTP khi tra cứu booking lỗi
7. `guest` check-in tự tra cứu được từ `lookupToken` trên query string
8. `finance` duyệt rồi ẩn yêu cầu hoàn vé
9. `support` gửi lại email vé lỗi và đổi trạng thái outbox
10. `sales` tạo booking hộ và xuất vé từ danh sách nội bộ
11. `operations` hủy rồi ẩn chuyến đã hủy
12. `operations` thu hồi rồi xóa voucher đã thu hồi
13. `admin` đổi role, đổi trạng thái và xóa nhật ký thao tác
14. `checkout` hiển thị đúng session `SePay live`, QR và link thanh toán
15. `checkout` local fallback xác nhận thủ công và chuyển sang `manage-booking`

## Điểm còn chờ kiểm chứng ngoài repo
1. `SePay live` end-to-end với webhook thật
2. SMTP production thật cho OTP và email vé
3. Deploy thực tế bằng Docker/Coolify/Azure
