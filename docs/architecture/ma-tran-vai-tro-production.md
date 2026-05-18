# Ma trận vai trò production

## Vai trò sản phẩm
Chỉ giữ đúng `5` vai trò trong toàn bộ sản phẩm:

- `guest`
- `customer`
- `member`
- `customer_support`
- `operations_staff`

## Tài khoản seed dùng để kiểm thử vai trò
- `customer`: `quanpm2006git@gmail.com`
- `member`: `nnn045856@gmail.com`
- `customer_support`: `anmycfs2006@gmail.com`
- `operations_staff`: `bincry2006@gmail.com`
- Mật khẩu chung seed: `25102006Qu@n`
- `guest` là vai trò công khai không xác thực, không có tài khoản seed đăng nhập.

## Nguyên tắc chung
- `permission` chỉ là lớp kỹ thuật nội bộ ở backend và web để khóa hành vi chi tiết.
- UI, seed dữ liệu, tài liệu sản phẩm và backoffice chỉ trình bày theo `5` vai trò trên.
- Chỉ `operations_staff` được đổi vai trò và trạng thái tài khoản.
- `customer_support` không được đổi vai trò hoặc khóa tài khoản người dùng.
- Được phép đổi `customer <-> member` mà không làm mất hồ sơ, booking và lịch sử thanh toán.

## Phạm vi theo vai trò
| Vai trò | Phạm vi chính | Không được làm |
| --- | --- | --- |
| `guest` | Tra cứu công khai, xem thông tin chuyến bay, tìm vé | Không vào backoffice, không có dữ liệu loyalty |
| `customer` | Đăng ký, đăng nhập, đặt vé, thanh toán, quản lý đặt chỗ, check-in, hồ sơ cá nhân | Không dùng backoffice, không xem quyền lợi loyalty |
| `member` | Toàn bộ quyền của `customer` và thêm loyalty/voucher | Không dùng backoffice |
| `customer_support` | `sales`, `support`, `finance`, `cms` theo phạm vi nội bộ | Không đổi role, không khóa tài khoản, không cập nhật cấu hình vận hành |
| `operations_staff` | `operations`, `admin`, quản trị tài khoản và trạng thái hệ thống | Không dùng như tài khoản khách thông thường để thao tác nghiệp vụ công khai |

## Phân hệ backoffice đang mở theo vai trò
| Phân hệ | Vai trò được dùng |
| --- | --- |
| `sales` | `customer_support` |
| `support` | `customer_support` |
| `finance` | `customer_support` |
| `cms` | `customer_support` |
| `operations` | `operations_staff` |
| `admin` | `operations_staff` |

## Ràng buộc bắt buộc trước go-live
- Không được để route hoặc menu nào hiển thị vai trò ngoài 5 nhóm trên.
- Không để tài liệu sản phẩm mô tả `permission` như một vai trò.
- Mọi thay đổi role/status đều phải ghi `audit_log`.
- Luôn chặn tự gỡ hoặc khóa `operations_staff` cuối cùng.
