insert into airport (code, city_name, airport_name, terminal_label)
values
  ('SGN', 'Thành phố Hồ Chí Minh', 'Tân Sơn Nhất', 'Nhà ga nội địa'),
  ('HAN', 'Hà Nội', 'Nội Bài', 'Nhà ga nội địa'),
  ('DAD', 'Đà Nẵng', 'Đà Nẵng', 'Nhà ga nội địa'),
  ('PQC', 'Phú Quốc', 'Phú Quốc', 'Nhà ga nội địa'),
  ('CXR', 'Nha Trang', 'Cam Ranh', 'Nhà ga nội địa'),
  ('HUI', 'Huế', 'Phú Bài', 'Nhà ga nội địa')
on conflict (code) do update set
  city_name = excluded.city_name,
  airport_name = excluded.airport_name,
  terminal_label = excluded.terminal_label;

insert into flight (code, origin_airport_id, destination_airport_id, departure_at, arrival_at, status)
select flight_data.code, origin.id, destination.id, flight_data.departure_at, flight_data.arrival_at, flight_data.status
from (
  values
    ('VN5201', 'SGN', 'HAN', '2026-05-23T06:10:00+07:00'::timestamptz, '2026-05-23T08:20:00+07:00'::timestamptz, 'on_time'),
    ('VN5205', 'SGN', 'HAN', '2026-05-23T11:30:00+07:00'::timestamptz, '2026-05-23T13:40:00+07:00'::timestamptz, 'scheduled'),
    ('VN5211', 'SGN', 'HAN', '2026-05-23T18:45:00+07:00'::timestamptz, '2026-05-23T20:55:00+07:00'::timestamptz, 'scheduled'),
    ('VN5302', 'HAN', 'SGN', '2026-05-26T07:25:00+07:00'::timestamptz, '2026-05-26T09:35:00+07:00'::timestamptz, 'scheduled'),
    ('VN5308', 'HAN', 'SGN', '2026-05-26T14:10:00+07:00'::timestamptz, '2026-05-26T16:20:00+07:00'::timestamptz, 'on_time'),
    ('VN5316', 'HAN', 'SGN', '2026-05-26T20:05:00+07:00'::timestamptz, '2026-05-26T22:15:00+07:00'::timestamptz, 'scheduled'),
    ('VN6101', 'SGN', 'DAD', '2026-05-24T08:00:00+07:00'::timestamptz, '2026-05-24T09:25:00+07:00'::timestamptz, 'scheduled'),
    ('VN6201', 'DAD', 'SGN', '2026-05-27T16:30:00+07:00'::timestamptz, '2026-05-27T17:55:00+07:00'::timestamptz, 'scheduled'),
    ('VN7101', 'HAN', 'DAD', '2026-05-25T09:20:00+07:00'::timestamptz, '2026-05-25T10:40:00+07:00'::timestamptz, 'scheduled'),
    ('VN7201', 'DAD', 'HAN', '2026-05-28T17:10:00+07:00'::timestamptz, '2026-05-28T18:30:00+07:00'::timestamptz, 'scheduled')
) as flight_data(code, origin_code, destination_code, departure_at, arrival_at, status)
join airport origin on origin.code = flight_data.origin_code
join airport destination on destination.code = flight_data.destination_code
on conflict (code) do update set
  origin_airport_id = excluded.origin_airport_id,
  destination_airport_id = excluded.destination_airport_id,
  departure_at = excluded.departure_at,
  arrival_at = excluded.arrival_at,
  status = excluded.status;

insert into flight_fare_inventory (flight_id, fare_family, total_seats, available_seats, price)
select flight.id, fare_data.fare_family, fare_data.total_seats, fare_data.available_seats, fare_data.price
from (
  values
    ('VN5201', 'pho_thong_tiet_kiem', 42, 31, 1490000),
    ('VN5201', 'pho_thong_linh_hoat', 24, 16, 1890000),
    ('VN5205', 'pho_thong_tiet_kiem', 40, 22, 1590000),
    ('VN5205', 'thuong_gia', 12, 8, 3490000),
    ('VN5211', 'pho_thong_linh_hoat', 28, 19, 1990000),
    ('VN5211', 'thuong_gia', 10, 6, 3690000),
    ('VN5302', 'pho_thong_tiet_kiem', 44, 33, 1520000),
    ('VN5302', 'pho_thong_linh_hoat', 24, 15, 1920000),
    ('VN5308', 'pho_thong_tiet_kiem', 40, 24, 1620000),
    ('VN5308', 'thuong_gia', 10, 7, 3520000),
    ('VN5316', 'pho_thong_linh_hoat', 28, 18, 2020000),
    ('VN5316', 'thuong_gia', 10, 5, 3720000),
    ('VN6101', 'pho_thong_tiet_kiem', 38, 27, 1090000),
    ('VN6101', 'pho_thong_linh_hoat', 20, 14, 1390000),
    ('VN6201', 'pho_thong_tiet_kiem', 38, 25, 1090000),
    ('VN6201', 'pho_thong_linh_hoat', 20, 13, 1390000),
    ('VN7101', 'pho_thong_tiet_kiem', 36, 21, 990000),
    ('VN7101', 'thuong_gia', 8, 5, 2890000),
    ('VN7201', 'pho_thong_tiet_kiem', 36, 20, 990000),
    ('VN7201', 'thuong_gia', 8, 4, 2890000)
) as fare_data(flight_code, fare_family, total_seats, available_seats, price)
join flight on flight.code = fare_data.flight_code
on conflict (flight_id, fare_family) do update set
  total_seats = excluded.total_seats,
  available_seats = excluded.available_seats,
  price = excluded.price;
