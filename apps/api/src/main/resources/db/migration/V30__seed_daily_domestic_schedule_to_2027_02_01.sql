-- Bổ sung lịch bay thương mại mẫu theo ngày, không xóa hoặc sửa lịch cũ.
-- Phạm vi: 28/08/2026 - 01/02/2027, giờ địa phương Asia/Ho_Chi_Minh.
-- Mỗi ngày có 2 chuyến SGN -> HAN và 2 chuyến HAN -> SGN.

with route_template(route_id, origin_code, destination_code, departure_local, duration_minutes, base_fare) as (
  values
    -- Hai chuyến mỗi chiều giữa Thành phố Hồ Chí Minh và Hà Nội.
    (1, 'SGN', 'HAN', '05:45', 130, 5000),
    (2, 'SGN', 'HAN', '18:10', 130, 5000),
    (3, 'HAN', 'SGN', '06:30', 130, 5000),
    (4, 'HAN', 'SGN', '18:50', 130, 5000),

    -- Các tuyến liên thành phố khác, mỗi tuyến một chuyến mỗi ngày.
    (5, 'DAD', 'PQC', '07:20', 95, 5000),
    (6, 'PQC', 'DAD', '16:10', 95, 5000),
    (7, 'DAD', 'CXR', '09:00', 55, 5000),
    (8, 'CXR', 'DAD', '14:30', 55, 5000),
    (9, 'SGN', 'CXR', '08:15', 60, 5000),
    (10, 'CXR', 'SGN', '18:20', 60, 5000),
    (11, 'HAN', 'PQC', '08:40', 120, 5000),
    (12, 'PQC', 'HAN', '15:45', 120, 5000),
    (13, 'DLI', 'DAD', '10:20', 50, 5000),
    (14, 'DAD', 'DLI', '16:00', 50, 5000),
    (15, 'VCA', 'HAN', '07:10', 120, 5000),
    (16, 'HAN', 'VCA', '17:35', 120, 5000),
    (17, 'HPH', 'DAD', '08:30', 115, 5000),
    (18, 'DAD', 'HPH', '15:40', 115, 5000)
),
flight_day(schedule_day) as (
  select generate_series('2026-08-28'::date, '2027-02-01'::date, interval '1 day')::date
),
generated_flight as (
  select
    concat('AT', lpad(route_template.route_id::text, 2, '0'), to_char(flight_day.schedule_day, 'YYMMDD')) as code,
    route_template.origin_code,
    route_template.destination_code,
    route_template.base_fare,
    ((flight_day.schedule_day::text || ' ' || route_template.departure_local)::timestamp at time zone 'Asia/Ho_Chi_Minh') as departure_at,
    ((flight_day.schedule_day::text || ' ' || route_template.departure_local)::timestamp at time zone 'Asia/Ho_Chi_Minh')
      + make_interval(mins => route_template.duration_minutes) as arrival_at,
    concat('G', ((route_template.route_id - 1) % 12) + 1) as gate
  from route_template
  cross join flight_day
)
insert into flight (
  code,
  origin_airport_id,
  destination_airport_id,
  departure_at,
  arrival_at,
  status,
  gate,
  operations_note,
  sales_open,
  hidden_at,
  cancelled_at
)
select
  generated_flight.code,
  origin.id,
  destination.id,
  generated_flight.departure_at,
  generated_flight.arrival_at,
  'scheduled',
  generated_flight.gate,
  'Lịch bay nội địa theo ngày phục vụ tra cứu và kiểm thử đặt vé.',
  true,
  null,
  null
from generated_flight
join airport origin on origin.code = generated_flight.origin_code
join airport destination on destination.code = generated_flight.destination_code
on conflict (code) do nothing;

with route_template(route_id, base_fare) as (
  values
    (1, 5000),
    (2, 5000),
    (3, 5000),
    (4, 5000),
    (5, 5000),
    (6, 5000),
    (7, 5000),
    (8, 5000),
    (9, 5000),
    (10, 5000),
    (11, 5000),
    (12, 5000),
    (13, 5000),
    (14, 5000),
    (15, 5000),
    (16, 5000),
    (17, 5000),
    (18, 5000)
),
flight_day(schedule_day) as (
  select generate_series('2026-08-28'::date, '2027-02-01'::date, interval '1 day')::date
),
generated_inventory as (
  select
    concat('AT', lpad(route_template.route_id::text, 2, '0'), to_char(flight_day.schedule_day, 'YYMMDD')) as flight_code,
    route_template.base_fare
  from route_template
  cross join flight_day
),
fare_meta(fare_family, total_seats, price_offset) as (
  values
    ('pho_thong_tiet_kiem', 120, 0),
    ('pho_thong_linh_hoat', 36, 5000),
    ('thuong_gia', 12, 10000)
)
insert into flight_fare_inventory (flight_id, fare_family, total_seats, available_seats, price)
select
  flight.id,
  fare_meta.fare_family,
  fare_meta.total_seats,
  fare_meta.total_seats,
  generated_inventory.base_fare + fare_meta.price_offset
from generated_inventory
join flight on flight.code = generated_inventory.flight_code
cross join fare_meta
on conflict (flight_id, fare_family) do nothing;
