-- V33: đồng bộ số ghế của hạng vé không còn hàng ghế nào trong cabin của tàu được gán.
--
-- Bối cảnh: V32 chỉ cập nhật flight_fare_inventory cho các hạng vé xuất hiện trong cabin.
-- Chuyến có cabin LEGACY (bảo toàn ghế cũ nằm sai khu vực) có thể không còn hàng nào của một
-- hạng, nhưng inventory của hạng đó vẫn giữ total_seats/available_seats cũ. Hệ quả: tìm kiếm
-- báo còn chỗ trong khi khách không có ghế nào để chọn.
--
-- Phạm vi: chỉ sửa DỮ LIỆU của flight_fare_inventory. Không đổi cấu trúc bảng, không xóa dòng.
-- Chạy lại nhiều lần an toàn: dòng đã về 0 không bị cập nhật nữa.
-- Trên cơ sở dữ liệu không có cabin LEGACY, câu lệnh này không đổi dòng nào.
--
-- Khôi phục: migration không tự đảo ngược. Trước khi triển khai hãy chụp snapshot cơ sở dữ liệu
-- (Azure PITR hoặc pg_dump -t flight_fare_inventory). Revert commit KHÔNG đưa dữ liệu về như cũ.
update flight_fare_inventory i
set total_seats = 0,
    available_seats = 0
from flight f
join aircraft a on a.id = f.aircraft_id
join aircraft_type t on t.id = a.aircraft_type_id
where i.flight_id = f.id
  and (i.total_seats <> 0 or i.available_seats <> 0)
  and not exists (
    select 1
    from jsonb_array_elements(t.seat_layout_json -> 'rows') cabin_row
    where cabin_row ->> 'fareFamily' = i.fare_family
  );
