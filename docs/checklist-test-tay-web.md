# Checklist test tay toàn bộ web

## Mục tiêu

Tài liệu này gom toàn bộ checklist test tay cho web theo từng màn hình, từng input và từng kết quả mong đợi để có thể tự kiểm tra luồng công khai, luồng khách hàng, luồng hội viên và toàn bộ backoffice.

## Phạm vi

- `apps/web`
- Các luồng gọi sang `apps/api` có ảnh hưởng trực tiếp đến giao diện và nghiệp vụ

## Cách dùng checklist

- Chạy theo đúng thứ tự từ luồng ít phá dữ liệu đến luồng có thay đổi dữ liệu.
- Nếu test trên môi trường dùng chung, ưu tiên tạo dữ liệu mới cho các ca có sửa hoặc xóa.
- Với các ca có thể làm bẩn dữ liệu như tạo booking, duyệt hoàn vé, tạo chuyến bay, sửa role, nên ghi lại mã dữ liệu đã tạo để dọn sau khi test.

## Chuẩn bị môi trường

| Hạng mục | Giá trị |
| --- | --- |
| Web local | `http://localhost:3000` |
| API local | `http://localhost:8080` |
| Health check | `GET /api/meta/health` trả `200` |
| Chạy web | `npm run dev:web` |
| Chạy backend | `mvn test` hoặc `.\mvnw.cmd spring-boot:run` trong `apps/api` |

## Tài khoản test

| Vai trò | Email | Mật khẩu | Ghi chú |
| --- | --- | --- | --- |
| `customer` | `quanpm2006git@gmail.com` | `25102006Qu@n` | Khách hàng thường |
| `member` | `nnn045856@gmail.com` | `25102006Qu@n` | Hội viên có điểm và voucher |
| `customer_support` | `anmycfs2006@gmail.com` | `25102006Qu@n` | Sales, support, finance, CMS |
| `operations_staff` | `bincry2006@gmail.com` | `25102006Qu@n` | Operations, revenue, admin |

## Dữ liệu nghiệp vụ có sẵn

| Nhóm dữ liệu | Giá trị | Mục đích |
| --- | --- | --- |
| Chuyến bay mẫu | `VN5201`, `VN5205`, `VN5211`, `VN5302`, `VN5308`, `VN5316` | Tìm chuyến và booking |
| Booking mẫu | `QC5001` | Đã thanh toán, đã xuất vé |
| Booking mẫu | `QC5002` | Đã check-in |
| Booking mẫu | `QC5003` | Đã thanh toán, đang chờ hoàn vé, có email vé lỗi để support gửi lại |
| Booking mẫu | `QC5004` | Đang giữ chỗ, dùng test checkout và thanh toán |
| Tìm chuyến smoke | `SGN -> HAN`, ngày đi `2026-05-23`, ngày về `2026-05-26` | Bộ input có sẵn để kiểm tra nhanh |

## Thứ tự nên test

1. Luồng công khai
2. Xác thực
3. Tìm chuyến, đặt vé, checkout
4. Quản lý booking và check-in
5. Tài khoản khách hàng và hội viên
6. Backoffice theo từng vai trò
7. Phân quyền chéo

## 1. Trang chủ `/`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| HOME-01 | Chưa đăng nhập | Mở `/` | Trang chủ tải thành công, có điều hướng tới `Tìm chuyến`, `Đặt vé`, `Quản lý đặt chỗ`, `Blog`, `Hỗ trợ` |
| HOME-02 | Chưa đăng nhập | Nhấn các liên kết chính trên header | Điều hướng đúng route, không lỗi `404` |
| HOME-03 | Đăng nhập `customer_support` hoặc `operations_staff` | Mở `/` rồi quan sát header | Có lối vào `Backoffice` cho vai trò nội bộ, không hiển thị với `guest`, `customer`, `member` |

## 2. Đăng ký `/register`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| REG-01 | Chưa có tài khoản email mới | Nhập họ tên hợp lệ, email mới, mật khẩu hợp lệ rồi gửi form | Tạo tài khoản thành công, phiên đăng nhập được thiết lập, điều hướng về khu phù hợp |
| REG-02 | Chưa có tài khoản email mới | Nhập email sai định dạng | Form báo lỗi định dạng email, không gửi yêu cầu |
| REG-03 | Chưa có tài khoản email mới | Nhập mật khẩu yếu hoặc không đạt checklist | Form hiển thị rule mật khẩu chưa đạt và chặn submit |

## 3. Đăng nhập `/login`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| LOGIN-01 | Có tài khoản `customer` | Đăng nhập bằng `quanpm2006git@gmail.com` và mật khẩu đúng | Đăng nhập thành công, header đổi trạng thái người dùng |
| LOGIN-02 | Có tài khoản hợp lệ | Nhập sai mật khẩu | Hiển thị lỗi đăng nhập, không tạo phiên |
| LOGIN-03 | Chưa đăng nhập | Nhấn đăng nhập Google nếu môi trường đã cấu hình OAuth | Bắt đầu luồng OAuth, callback trả người dùng về web mà không lỗi |

## 4. Quên mật khẩu `/forgot-password`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| FP-01 | Có tài khoản hợp lệ và mail OTP hoạt động | Nhập email hợp lệ, yêu cầu OTP | Hệ thống báo đã gửi OTP, chuyển sang bước nhập OTP |
| FP-02 | Có OTP hợp lệ | Nhập OTP đúng rồi nhập mật khẩu mới hợp lệ | Reset mật khẩu thành công, có thể đăng nhập bằng mật khẩu mới |
| FP-03 | Có OTP hoặc giả lập OTP sai | Nhập OTP sai hoặc hết hạn | Hệ thống báo OTP không hợp lệ hoặc hết hạn, không cho sang bước đặt mật khẩu |

## 5. Tìm chuyến `/search`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| SEARCH-01 | Chưa đăng nhập | Tìm `SGN -> HAN`, ngày đi `2026-05-23`, `one_way`, `1` người lớn | Có danh sách chuyến phù hợp, mỗi chuyến hiển thị giá, giờ bay, số ghế còn |
| SEARCH-02 | Chưa đăng nhập | Chuyển sang `round_trip`, nhập ngày về `2026-05-26` | Có danh sách chiều đi và chiều về, không lỗi validate |
| SEARCH-03 | Chưa đăng nhập | Nhập `from = SGN`, `to = SGN` | Form báo lỗi không cho trùng sân bay đi và đến |
| SEARCH-04 | Chưa đăng nhập | Nhập ngày về sớm hơn ngày đi | Form báo lỗi ngày về không hợp lệ |
| SEARCH-05 | Chưa đăng nhập | Nhập tổng hành khách lớn hơn `9` | Form báo lỗi vượt giới hạn hành khách |
| SEARCH-06 | Chưa đăng nhập | Nhập số em bé lớn hơn số người lớn | Form báo lỗi số em bé không được vượt số người lớn |
| SEARCH-07 | Có kết quả tìm kiếm | Bật bộ lọc giờ bay, ngân sách hoặc số ghế tối thiểu | Danh sách kết quả thay đổi đúng theo bộ lọc đã chọn |
| SEARCH-08 | Có chuyến bay gần giờ cất cánh dưới `30` phút hoặc dữ liệu seed tương đương | Tìm chuyến ở khung thời gian sát giờ bay | Chuyến bay đã quá hạn public booking không xuất hiện trong kết quả |

## 6. Đặt vé `/booking`

| Mã | Tiền điều kiện | Đã có handoff hợp lệ từ màn hình tìm chuyến | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- | --- |
| BOOK-01 | Có chuyến chiều đi hợp lệ | Có | Chọn hạng vé, chọn ghế, nhập thông tin liên hệ và hành khách, rồi tạo booking | Tạo giữ chỗ thành công, điều hướng sang `/booking/{pnr}/checkout` |
| BOOK-02 | Chưa đi từ `/search` | Không | Mở trực tiếp `/booking` | Hệ thống trả về `/search` hoặc hiện thông báo thiếu dữ liệu handoff |
| BOOK-03 | Có booking một chiều | Có | Chọn ghế đã được giữ bởi booking khác | Hệ thống báo ghế không còn khả dụng, không tạo booking |
| BOOK-04 | Có booking khứ hồi | Có | Chọn chuyến đi, rồi chuyến về, rồi chọn ghế cho từng chặng | Dữ liệu từng chặng được giữ đúng, không nhầm ghế giữa hai chiều |
| BOOK-05 | Có dữ liệu hành khách | Có | Nhập thiếu trường bắt buộc như họ tên hoặc giấy tờ | Form báo lỗi rõ trường thiếu và không gửi yêu cầu |
| BOOK-06 | Có dữ liệu hành khách nhiều loại tuổi | Có | Gán loại hành khách không khớp ngày bay, ví dụ trẻ em nhưng tuổi vượt ngưỡng | Hệ thống từ chối tạo booking vì sai loại hành khách |

## 7. Checkout `/booking/[pnr]/checkout`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| PAY-01 | Có booking giữ chỗ như `QC5004` | Mở `/booking/QC5004/checkout` | Hiển thị mã đặt chỗ, thời gian giữ chỗ còn lại, tổng tiền, trạng thái thanh toán |
| PAY-02 | Đăng nhập `member` và có voucher hợp lệ | Áp voucher vào booking đang checkout | Voucher được áp thành công, tổng tiền giảm và trạng thái booking đồng bộ lại |
| PAY-03 | Môi trường local fallback | Nhấn xác nhận thanh toán thủ công khi nút xuất hiện | Thanh toán thành công, booking chuyển sang đã thanh toán hoặc đã xuất vé, có thể đi tiếp sang quản lý booking |
| PAY-04 | Môi trường có SePay live | Mở checkout của booking chờ thanh toán | Hiển thị QR hoặc link thanh toán thật, trạng thái polling cập nhật theo phiên |
| PAY-05 | Booking đã thanh toán rồi | Tải lại màn hình checkout | Không tạo phiên thanh toán trùng, vẫn trả về phiên hiện có hoặc trạng thái đã thanh toán |
| PAY-06 | Booking để quá giờ giữ chỗ | Chờ hết thời gian giữ chỗ rồi thử xác nhận thanh toán | Hệ thống khóa thanh toán hoặc báo giữ chỗ đã hết hạn |
| PAY-07 | Đăng nhập `customer` thường | Tìm cách áp voucher ở checkout | Không có quyền dùng voucher hội viên, UI không cho áp hoặc API từ chối |

## 8. Quản lý đặt chỗ `/manage-booking`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| MB-01 | Chưa đăng nhập, có booking `QC5001` và email đúng | Nhập mã booking, nhập email, yêu cầu OTP | Hệ thống báo gửi OTP và chuyển sang bước xác minh |
| MB-02 | Đã có OTP hợp lệ | Nhập OTP đúng | Tra cứu thành công, hiển thị chi tiết booking và lưu token tra cứu tạm thời |
| MB-03 | Đăng nhập bằng chủ booking | Mở tra cứu booking của chính mình | Xem được booking mà không cần OTP |
| MB-04 | Tra cứu `QC5001` | Quan sát chi tiết booking | Có thông tin trạng thái booking, hành trình, hành khách, vé, giá tiền và ghi chú chuyến bay nếu có |
| MB-05 | Tra cứu `QC5003` | Quan sát phần hoàn vé | Hiển thị trạng thái `đang chờ hoàn vé` hoặc thông điệp tương đương |
| MB-06 | Có booking đủ điều kiện hoàn vé | Mở form hoàn vé, nhập lý do rồi gửi | Gửi yêu cầu thành công, trạng thái booking đổi sang chờ hoàn vé |
| MB-07 | Tra cứu `QC5002` | Thử gửi yêu cầu hoàn vé | Bị chặn do booking đã check-in |
| MB-08 | Có booking đã quá giờ giữ chỗ nhưng chưa thanh toán | Mở chi tiết booking | Hệ thống tự đồng bộ trạng thái hết hạn giữ chỗ và giải phóng ghế nếu cần |

## 9. Check-in `/check-in`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| CI-01 | Chưa đăng nhập, có booking đủ điều kiện check-in | Nhập mã booking và email, yêu cầu OTP | Hệ thống gửi OTP và cho xác minh |
| CI-02 | Có OTP hợp lệ hoặc là chủ booking đã đăng nhập | Hoàn tất bước tra cứu check-in | Hiển thị danh sách hành khách đủ điều kiện check-in |
| CI-03 | Có booking `one_way`, đã xuất vé, chưa khởi hành | Chọn hành khách hợp lệ rồi xác nhận check-in | Tạo boarding pass thành công, trạng thái vé chuyển sang `checked_in` |
| CI-04 | Tra cứu `QC5002` | Thử check-in lại | Hệ thống báo đã check-in trước đó, không cho làm lại |
| CI-05 | Có booking khứ hồi | Thử vào luồng check-in | Hệ thống chặn vì giai đoạn hiện tại chỉ hỗ trợ `one_way` |
| CI-06 | Có booking đã bắt đầu hành trình hoặc chuyến bị hủy | Thử check-in | Hệ thống từ chối check-in |
| CI-07 | Có OTP nhưng tra cứu booking lỗi | Thử tải lại hoặc tra cứu lại | OTP không bị xóa sai trong trường hợp tra cứu thất bại |

## 10. Trạng thái chuyến bay `/flight-status`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| FLIGHT-01 | Có chuyến bay seed | Nhập mã chuyến và ngày tương ứng | Hiển thị trạng thái chuyến, giờ bay, gate hoặc ghi chú nếu có |
| FLIGHT-02 | Không có chuyến phù hợp | Nhập mã chuyến không tồn tại | Hệ thống báo không tìm thấy chuyến |
| FLIGHT-03 | Có chuyến được operations chỉnh trạng thái hoặc gate | Kiểm tra lại sau khi sửa trong backoffice | Thông tin trạng thái chuyến bay ngoài public đồng bộ đúng với dữ liệu vận hành |

## 11. Hỗ trợ `/support`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| SUPPORT-01 | Chưa đăng nhập | Mở `/support` | Trang tải thành công, có FAQ hoặc danh mục trợ giúp |
| SUPPORT-02 | Chưa đăng nhập | Dùng ô tìm FAQ hoặc bấm liên kết nhanh | Bộ lọc câu hỏi hoạt động hoặc liên kết điều hướng đúng tới luồng liên quan |
| SUPPORT-03 | Chưa đăng nhập | Mở chatbot từ support nếu widget xuất hiện | Widget phản hồi đúng ngữ cảnh hỗ trợ, không lỗi API |

## 12. Blog `/blog`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| BLOG-01 | Chưa đăng nhập | Mở `/blog` | Danh sách bài viết hiển thị ổn định, không lỗi render |
| BLOG-02 | Có bài viết hoặc thẻ chiến dịch | Mở một khối nội dung trên blog | Điều hướng hoặc hiển thị đúng nội dung, không lỗi layout |

## 13. Tài khoản `/account` cho `customer`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| ACCOUNT-01 | Chưa đăng nhập | Mở `/account` | Bị chuyển về `/login` |
| ACCOUNT-02 | Đăng nhập `customer` | Mở `/account` | Hiển thị hồ sơ cá nhân và các khu tự phục vụ phù hợp |
| ACCOUNT-03 | Đăng nhập `customer` | Sửa họ tên, số điện thoại rồi lưu | Dữ liệu hồ sơ cập nhật thành công và tải lại vẫn đúng |
| ACCOUNT-04 | Đăng nhập `customer` | Đổi mật khẩu bằng mật khẩu hiện tại đúng và mật khẩu mới hợp lệ | Đổi mật khẩu thành công |
| ACCOUNT-05 | Đăng nhập `customer` | Upload avatar hợp lệ | Avatar cập nhật thành công và hiển thị lại đúng |
| ACCOUNT-06 | Đăng nhập `customer` | Thêm mới một hành khách thường dùng | Danh sách hành khách tăng thêm một bản ghi |
| ACCOUNT-07 | Đăng nhập `customer` | Sửa rồi xóa hành khách vừa tạo | Thay đổi được lưu đúng, xóa thành công, danh sách đồng bộ lại |
| ACCOUNT-08 | Đăng nhập `customer` | Xem thông báo | Có danh sách thông báo của người dùng, không lộ dữ liệu người khác |

## 14. Hội viên `member` trên `/account` và checkout

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| MEMBER-01 | Đăng nhập `member` | Mở `/account` | Có thêm khu điểm thưởng và voucher |
| MEMBER-02 | Đăng nhập `member` | Xem chi tiết điểm thưởng, lịch sử gần đây | Dữ liệu loyalty tải thành công |
| MEMBER-03 | Đăng nhập `member` | Xem danh sách voucher khả dụng và voucher đã dùng | Dữ liệu voucher hiển thị đúng nhóm |
| MEMBER-04 | Đăng nhập `member` | Ẩn lịch sử một voucher đã dùng | Voucher bị ẩn khỏi góc nhìn self-service của chính hội viên |

## 15. Backoffice tổng quan `/backoffice`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| BO-01 | Đăng nhập `customer_support` | Mở `/backoffice` | Thấy các module `sales`, `support`, `finance`, `cms` |
| BO-02 | Đăng nhập `operations_staff` | Mở `/backoffice` | Thấy các module `operations`, `revenue`, `admin` |
| BO-03 | Đăng nhập `customer` hoặc `member` | Mở `/backoffice` | Không được vào backoffice |

## 16. Backoffice sales `/backoffice/sales`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| SALES-01 | Đăng nhập `customer_support` | Tìm booking theo `QC5001` | Danh sách trả đúng booking cần tìm |
| SALES-02 | Đăng nhập `customer_support` | Tìm booking theo email khách | Danh sách booking của email đó hiển thị và sắp xếp hợp lý |
| SALES-03 | Đăng nhập `customer_support` | Tạo booking hộ bằng một chuyến còn mở bán, nhập contact và một hành khách | Tạo booking nội bộ thành công, sinh mã booking mới |
| SALES-04 | Có booking nội bộ vừa tạo đang chờ thanh toán hoặc giữ chỗ | Thực hiện `issue ticket` từ danh sách nội bộ | Booking được xuất vé và có audit log tương ứng |
| SALES-05 | Dùng chuyến đã quá hạn public booking | Thử tạo booking hộ | Hệ thống từ chối do chuyến không còn mở bán |

## 17. Backoffice support `/backoffice/support`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| CS-01 | Đăng nhập `customer_support` | Mở danh sách thông báo hoặc outbox | Tải được danh sách email hoặc thông báo nội bộ |
| CS-02 | Có booking `QC5003` với email vé lỗi | Nhấn gửi lại email lỗi | Trạng thái outbox đổi theo hướng đã retry hoặc đã gửi |
| CS-03 | Không có bản ghi lỗi | Tìm hoặc lọc danh sách | Màn hình xử lý ổn định, không lỗi khi danh sách trống |

## 18. Backoffice finance `/backoffice/finance`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| FIN-01 | Đăng nhập `customer_support` và có refund pending như `QC5003` | Mở danh sách hoàn vé | Thấy yêu cầu hoàn vé đang chờ xử lý |
| FIN-02 | Có refund pending | Duyệt hoàn vé | Yêu cầu chuyển sang đã duyệt, booking và ghế được xử lý theo nghiệp vụ hoàn vé |
| FIN-03 | Tạo một refund pending khác nếu cần | Từ chối hoàn vé | Yêu cầu chuyển sang đã từ chối, booking quay lại trạng thái phù hợp |
| FIN-04 | Có yêu cầu đã xử lý | Ẩn yêu cầu đã xử lý khỏi danh sách | Bản ghi được ẩn khỏi góc nhìn finance, không còn nằm trong danh sách đang xử lý |

## 19. Backoffice CMS `/backoffice/cms`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| CMS-01 | Đăng nhập `customer_support` | Mở module CMS | Tải được danh sách entry trang chủ, banner, FAQ hoặc bài viết |
| CMS-02 | Đăng nhập `customer_support` | Tạo một entry test có tiền tố `[TEST]` | Entry mới được tạo thành công |
| CMS-03 | Có entry test | Sửa nội dung rồi `publish` | Entry đổi trạng thái và hiển thị ở trang public tương ứng nếu loại nội dung có render |
| CMS-04 | Có entry test đã publish | `archive` entry test | Entry chuyển sang lưu trữ và không còn hiển thị như nội dung đang hoạt động |

## 20. Backoffice operations chuyến bay `/backoffice/operations`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| OPS-FLIGHT-01 | Đăng nhập `operations_staff` | Tìm `VN5201` theo đúng ngày bay | Trả về đúng chuyến bay cần tìm |
| OPS-FLIGHT-02 | Đăng nhập `operations_staff` | Tạo chuyến bay mới với mã test riêng, ngày tương lai, giờ bay hợp lệ | Tạo thành công và hệ thống sinh tồn kho hạng vé tương ứng |
| OPS-FLIGHT-03 | Có chuyến bay vừa tạo hoặc chuyến seed | Sửa `gate`, `note`, `status`, `salesOpen`, `baseFare` | Dữ liệu cập nhật thành công, kiểm tra lại thấy đã đổi |
| OPS-FLIGHT-04 | Có chuyến bay cần hủy | Thực hiện hủy chuyến | Trạng thái chuyến đổi sang hủy và đóng bán |
| OPS-FLIGHT-05 | Có chuyến bay đã hủy | Ẩn chuyến đã hủy | Bản ghi bị ẩn khỏi danh sách quản trị hoạt động |
| OPS-FLIGHT-06 | Có chuyến bay vừa sửa trạng thái hoặc gate | Kiểm tra lại `/flight-status` hoặc `/manage-booking` ngoài public | Dữ liệu public đồng bộ đúng với thay đổi vận hành |

## 21. Backoffice operations voucher `/backoffice/operations`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| OPS-VOUCHER-01 | Đăng nhập `operations_staff` | Tạo voucher mới cho tài khoản `member` | Tạo voucher thành công |
| OPS-VOUCHER-02 | Có voucher vừa tạo | Sửa mô tả, hạn dùng hoặc trạng thái được phép sửa | Thay đổi được lưu đúng |
| OPS-VOUCHER-03 | Có voucher chưa dùng | Thu hồi voucher | Voucher chuyển sang trạng thái đã thu hồi |
| OPS-VOUCHER-04 | Có voucher đã thu hồi hoặc đã dùng | Ẩn voucher khỏi danh sách vận hành | Voucher bị ẩn khỏi góc nhìn operations |
| OPS-VOUCHER-05 | Có voucher đã dùng | Thử thu hồi voucher đã dùng | Hệ thống từ chối thao tác vì voucher đã dùng |

## 22. Backoffice revenue `/backoffice/revenue`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| REVENUE-01 | Đăng nhập `operations_staff` | Mở dashboard doanh thu | Tải được số liệu tổng quan, biểu đồ và bộ lọc kỳ |
| REVENUE-02 | Đăng nhập `operations_staff` | Đổi bộ lọc ngày hoặc tháng | Chỉ số và biểu đồ thay đổi theo kỳ đã chọn |
| REVENUE-03 | Đăng nhập `customer_support` | Thử mở `/backoffice/revenue` | Bị chặn do sai quyền |

## 23. Backoffice admin `/backoffice/admin`

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| ADMIN-01 | Đăng nhập `operations_staff` | Mở dashboard admin | Hiển thị số liệu quản trị, người dùng và audit log |
| ADMIN-02 | Có tài khoản test mới tạo từ `REG-01` | Đổi role của tài khoản test | Role cập nhật thành công, phiên đăng nhập cũ của tài khoản đó bị vô hiệu nếu chính sách áp dụng |
| ADMIN-03 | Có tài khoản test mới tạo | Khóa rồi mở lại tài khoản test | Trạng thái người dùng cập nhật đúng |
| ADMIN-04 | Có audit log có thể xóa | Xóa một audit log không quan trọng | Bản ghi biến mất khỏi danh sách sau khi xóa |
| ADMIN-05 | Chỉ còn một `operations_staff` hoạt động | Thử hạ quyền hoặc khóa người này | Hệ thống từ chối để tránh mất người vận hành cuối cùng |

## 24. Phân quyền chéo

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| RBAC-01 | Đăng nhập `customer_support` | Mở `/backoffice/operations` | Bị chặn do sai quyền |
| RBAC-02 | Đăng nhập `operations_staff` | Mở `/backoffice/support` hoặc `/backoffice/finance` | Bị chặn do sai quyền |
| RBAC-03 | Đăng nhập `customer` | Gọi các luồng loyalty hoặc voucher của hội viên | Không truy cập được dữ liệu hội viên |
| RBAC-04 | Chưa đăng nhập | Vào `/account` hoặc `/backoffice` | Bị chuyển hướng hoặc bị từ chối truy cập |
| RBAC-05 | Chưa đăng nhập | Thử hoàn vé hoặc check-in khi không có OTP hoặc lookup token hợp lệ | API và UI từ chối thao tác |
| RBAC-06 | Đăng nhập bằng tài khoản không sở hữu booking | Tra cứu booking của người khác qua luồng chủ sở hữu | Không xem được booking nếu không có OTP hợp lệ |

## 25. Kết thúc buổi test

| Mã | Tiền điều kiện | Input hoặc thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| WRAP-01 | Đã chạy các ca có tạo dữ liệu | Ghi lại booking mới, voucher mới, chuyến bay mới, user test mới | Có danh sách dữ liệu phát sinh để dọn hoặc dùng cho lần test sau |
| WRAP-02 | Đã chạy các ca phá dữ liệu | Kiểm tra lại các seed quan trọng như `QC5001` đến `QC5004` còn đúng ý nghĩa ban đầu | Nếu seed bị đổi trạng thái, cần seed lại trước vòng test tiếp theo |

## Gợi ý ghi kết quả test

| Cột nên ghi | Ví dụ |
| --- | --- |
| Mã ca test | `PAY-03` |
| Người test | `Tên người test` |
| Ngày giờ | `2026-06-14 21:30` |
| Kết quả | `Pass`, `Fail`, `Blocked` |
| Bằng chứng | Ảnh chụp, video, mã booking, mã voucher |
| Ghi chú lỗi | Mô tả ngắn, bước tái hiện, môi trường |

## Ghi chú quan trọng

- Luồng `check-in` hiện chỉ hỗ trợ booking `one_way`.
- Luồng public booking bị chặn nếu còn dưới `30` phút trước giờ cất cánh.
- `member` mới có quyền loyalty và voucher.
- `customer_support` chỉ có `sales`, `support`, `finance`, `cms`.
- `operations_staff` chỉ có `operations`, `revenue`, `admin`.
