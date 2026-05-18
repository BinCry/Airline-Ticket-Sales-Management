# Ma trận kiểm thử đã khóa trong vòng hardening

## Kết quả tổng quan
- `apps/api`: pass
- `apps/web` unit: pass
- `apps/web` build: pass
- `Playwright smoke`: pass

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
| `payment -> ticket -> outbox -> manage booking` | Đã khóa ở backend và regression pass |
| `refund -> booking status -> finance dashboard` | Đã pass test backend |
| `customer <-> member` và đồng bộ quyền loyalty | Đã khóa guard ở backend, UI chỉ mở loyalty cho `member` |
| `flight status -> manage booking -> check-in` | Đã nối dữ liệu trạng thái, gate, ghi chú vận hành |

## Browser smoke đang chạy
1. `guest` không vào được `/account`
2. `customer_support` vào được `/backoffice/support` và bị chặn khỏi `/backoffice/operations`
3. `operations_staff` vào được `/backoffice/admin` và `/backoffice/operations`
4. Booking có handoff hợp lệ hiển thị seat map với thân máy bay và cánh

## Điểm còn chờ kiểm chứng ngoài repo
1. `SePay live` end-to-end với webhook thật
2. SMTP production thật cho OTP và email vé
3. Deploy thực tế bằng Docker/Coolify/Azure
