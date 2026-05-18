insert into airport (code, city_name, airport_name, terminal_label)
values
  ('VCA', 'Cần Thơ', 'Cần Thơ', 'Nhà ga nội địa'),
  ('HPH', 'Hải Phòng', 'Cát Bi', 'Nhà ga nội địa'),
  ('VII', 'Vinh', 'Vinh', 'Nhà ga nội địa')
on conflict (code) do update set
  city_name = excluded.city_name,
  airport_name = excluded.airport_name,
  terminal_label = excluded.terminal_label;

insert into flight (code, origin_airport_id, destination_airport_id, departure_at, arrival_at, status)
select flight_data.code, origin.id, destination.id, flight_data.departure_at, flight_data.arrival_at, flight_data.status
from (
  values
    ('VN5401', 'SGN', 'HAN', '2026-05-27T05:50:00+07:00'::timestamptz, '2026-05-27T08:00:00+07:00'::timestamptz, 'scheduled'),
    ('VN5407', 'SGN', 'HAN', '2026-05-27T11:45:00+07:00'::timestamptz, '2026-05-27T13:55:00+07:00'::timestamptz, 'on_time'),
    ('VN5413', 'SGN', 'HAN', '2026-05-27T19:35:00+07:00'::timestamptz, '2026-05-27T21:45:00+07:00'::timestamptz, 'scheduled'),
    ('VN5502', 'HAN', 'SGN', '2026-05-29T07:10:00+07:00'::timestamptz, '2026-05-29T09:20:00+07:00'::timestamptz, 'scheduled'),
    ('VN5508', 'HAN', 'SGN', '2026-05-29T14:00:00+07:00'::timestamptz, '2026-05-29T16:10:00+07:00'::timestamptz, 'on_time'),
    ('VN5516', 'HAN', 'SGN', '2026-05-29T20:30:00+07:00'::timestamptz, '2026-05-29T22:40:00+07:00'::timestamptz, 'scheduled'),

    ('VN6113', 'SGN', 'DAD', '2026-05-27T06:30:00+07:00'::timestamptz, '2026-05-27T07:55:00+07:00'::timestamptz, 'scheduled'),
    ('VN6119', 'SGN', 'DAD', '2026-05-27T13:15:00+07:00'::timestamptz, '2026-05-27T14:40:00+07:00'::timestamptz, 'on_time'),
    ('VN6125', 'SGN', 'DAD', '2026-05-27T20:20:00+07:00'::timestamptz, '2026-05-27T21:45:00+07:00'::timestamptz, 'scheduled'),
    ('VN6214', 'DAD', 'SGN', '2026-05-29T08:10:00+07:00'::timestamptz, '2026-05-29T09:35:00+07:00'::timestamptz, 'scheduled'),
    ('VN6220', 'DAD', 'SGN', '2026-05-29T15:00:00+07:00'::timestamptz, '2026-05-29T16:25:00+07:00'::timestamptz, 'on_time'),
    ('VN6226', 'DAD', 'SGN', '2026-05-29T21:00:00+07:00'::timestamptz, '2026-05-29T22:25:00+07:00'::timestamptz, 'scheduled'),

    ('VN7303', 'HAN', 'PQC', '2026-05-27T07:00:00+07:00'::timestamptz, '2026-05-27T09:10:00+07:00'::timestamptz, 'scheduled'),
    ('VN7309', 'HAN', 'PQC', '2026-05-27T12:40:00+07:00'::timestamptz, '2026-05-27T14:50:00+07:00'::timestamptz, 'on_time'),
    ('VN7315', 'HAN', 'PQC', '2026-05-27T18:25:00+07:00'::timestamptz, '2026-05-27T20:35:00+07:00'::timestamptz, 'scheduled'),
    ('VN7404', 'PQC', 'HAN', '2026-05-29T09:05:00+07:00'::timestamptz, '2026-05-29T11:15:00+07:00'::timestamptz, 'scheduled'),
    ('VN7410', 'PQC', 'HAN', '2026-05-29T15:25:00+07:00'::timestamptz, '2026-05-29T17:35:00+07:00'::timestamptz, 'on_time'),
    ('VN7416', 'PQC', 'HAN', '2026-05-29T20:15:00+07:00'::timestamptz, '2026-05-29T22:25:00+07:00'::timestamptz, 'scheduled'),

    ('VN7511', 'DAD', 'CXR', '2026-05-27T08:15:00+07:00'::timestamptz, '2026-05-27T09:25:00+07:00'::timestamptz, 'scheduled'),
    ('VN7517', 'DAD', 'CXR', '2026-05-27T14:20:00+07:00'::timestamptz, '2026-05-27T15:30:00+07:00'::timestamptz, 'on_time'),
    ('VN7523', 'DAD', 'CXR', '2026-05-27T19:10:00+07:00'::timestamptz, '2026-05-27T20:20:00+07:00'::timestamptz, 'scheduled'),
    ('VN7612', 'CXR', 'DAD', '2026-05-29T10:00:00+07:00'::timestamptz, '2026-05-29T11:10:00+07:00'::timestamptz, 'scheduled'),
    ('VN7618', 'CXR', 'DAD', '2026-05-29T16:10:00+07:00'::timestamptz, '2026-05-29T17:20:00+07:00'::timestamptz, 'on_time'),
    ('VN7624', 'CXR', 'DAD', '2026-05-29T21:10:00+07:00'::timestamptz, '2026-05-29T22:20:00+07:00'::timestamptz, 'scheduled'),

    ('VN6701', 'SGN', 'VCA', '2026-05-27T06:45:00+07:00'::timestamptz, '2026-05-27T07:35:00+07:00'::timestamptz, 'scheduled'),
    ('VN6707', 'SGN', 'VCA', '2026-05-27T12:15:00+07:00'::timestamptz, '2026-05-27T13:05:00+07:00'::timestamptz, 'on_time'),
    ('VN6802', 'VCA', 'SGN', '2026-05-29T08:00:00+07:00'::timestamptz, '2026-05-29T08:50:00+07:00'::timestamptz, 'scheduled'),
    ('VN6808', 'VCA', 'SGN', '2026-05-29T14:10:00+07:00'::timestamptz, '2026-05-29T15:00:00+07:00'::timestamptz, 'on_time'),

    ('VN7813', 'HAN', 'HUI', '2026-05-27T06:20:00+07:00'::timestamptz, '2026-05-27T07:35:00+07:00'::timestamptz, 'scheduled'),
    ('VN7819', 'HAN', 'HUI', '2026-05-27T13:35:00+07:00'::timestamptz, '2026-05-27T14:50:00+07:00'::timestamptz, 'on_time'),
    ('VN7904', 'HUI', 'HAN', '2026-05-29T08:05:00+07:00'::timestamptz, '2026-05-29T09:20:00+07:00'::timestamptz, 'scheduled'),
    ('VN7910', 'HUI', 'HAN', '2026-05-29T15:10:00+07:00'::timestamptz, '2026-05-29T16:25:00+07:00'::timestamptz, 'on_time'),

    ('VN8801', 'SGN', 'HPH', '2026-05-27T06:00:00+07:00'::timestamptz, '2026-05-27T08:10:00+07:00'::timestamptz, 'scheduled'),
    ('VN8802', 'HPH', 'SGN', '2026-05-29T17:30:00+07:00'::timestamptz, '2026-05-29T19:40:00+07:00'::timestamptz, 'scheduled'),
    ('VN8901', 'HAN', 'VII', '2026-05-27T09:10:00+07:00'::timestamptz, '2026-05-27T10:05:00+07:00'::timestamptz, 'scheduled'),
    ('VN8902', 'VII', 'HAN', '2026-05-29T18:10:00+07:00'::timestamptz, '2026-05-29T19:05:00+07:00'::timestamptz, 'scheduled')
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
    ('VN5401', 'pho_thong_tiet_kiem', 48, 34, 1490000),
    ('VN5401', 'pho_thong_linh_hoat', 28, 18, 1890000),
    ('VN5401', 'thuong_gia', 10, 6, 3590000),
    ('VN5407', 'pho_thong_tiet_kiem', 46, 30, 1550000),
    ('VN5407', 'pho_thong_linh_hoat', 26, 17, 1950000),
    ('VN5413', 'pho_thong_tiet_kiem', 44, 25, 1650000),
    ('VN5413', 'pho_thong_linh_hoat', 24, 14, 2050000),
    ('VN5413', 'thuong_gia', 10, 5, 3720000),
    ('VN5502', 'pho_thong_tiet_kiem', 48, 32, 1520000),
    ('VN5502', 'pho_thong_linh_hoat', 28, 18, 1920000),
    ('VN5502', 'thuong_gia', 10, 6, 3620000),
    ('VN5508', 'pho_thong_tiet_kiem', 46, 27, 1600000),
    ('VN5508', 'pho_thong_linh_hoat', 24, 15, 1980000),
    ('VN5516', 'pho_thong_tiet_kiem', 42, 21, 1680000),
    ('VN5516', 'pho_thong_linh_hoat', 24, 12, 2080000),
    ('VN5516', 'thuong_gia', 10, 4, 3750000),

    ('VN6113', 'pho_thong_tiet_kiem', 40, 29, 1090000),
    ('VN6113', 'pho_thong_linh_hoat', 22, 15, 1390000),
    ('VN6119', 'pho_thong_tiet_kiem', 38, 24, 1150000),
    ('VN6119', 'pho_thong_linh_hoat', 20, 12, 1450000),
    ('VN6125', 'pho_thong_tiet_kiem', 36, 18, 1190000),
    ('VN6125', 'pho_thong_linh_hoat', 20, 10, 1490000),
    ('VN6125', 'thuong_gia', 8, 4, 2790000),
    ('VN6214', 'pho_thong_tiet_kiem', 40, 28, 1090000),
    ('VN6214', 'pho_thong_linh_hoat', 22, 14, 1390000),
    ('VN6220', 'pho_thong_tiet_kiem', 38, 22, 1150000),
    ('VN6220', 'pho_thong_linh_hoat', 20, 12, 1450000),
    ('VN6226', 'pho_thong_tiet_kiem', 36, 16, 1190000),
    ('VN6226', 'pho_thong_linh_hoat', 20, 9, 1490000),
    ('VN6226', 'thuong_gia', 8, 3, 2790000),

    ('VN7303', 'pho_thong_tiet_kiem', 38, 24, 1890000),
    ('VN7303', 'pho_thong_linh_hoat', 20, 13, 2250000),
    ('VN7309', 'pho_thong_tiet_kiem', 36, 20, 1950000),
    ('VN7309', 'pho_thong_linh_hoat', 20, 12, 2320000),
    ('VN7315', 'pho_thong_tiet_kiem', 34, 16, 2050000),
    ('VN7315', 'pho_thong_linh_hoat', 18, 10, 2420000),
    ('VN7315', 'thuong_gia', 8, 4, 4150000),
    ('VN7404', 'pho_thong_tiet_kiem', 38, 23, 1890000),
    ('VN7404', 'pho_thong_linh_hoat', 20, 12, 2250000),
    ('VN7410', 'pho_thong_tiet_kiem', 36, 18, 1950000),
    ('VN7410', 'pho_thong_linh_hoat', 20, 11, 2320000),
    ('VN7416', 'pho_thong_tiet_kiem', 34, 15, 2050000),
    ('VN7416', 'pho_thong_linh_hoat', 18, 9, 2420000),
    ('VN7416', 'thuong_gia', 8, 3, 4150000),

    ('VN7511', 'pho_thong_tiet_kiem', 34, 21, 990000),
    ('VN7511', 'pho_thong_linh_hoat', 18, 11, 1290000),
    ('VN7517', 'pho_thong_tiet_kiem', 32, 18, 1040000),
    ('VN7517', 'pho_thong_linh_hoat', 16, 10, 1340000),
    ('VN7523', 'pho_thong_tiet_kiem', 30, 13, 1090000),
    ('VN7523', 'pho_thong_linh_hoat', 16, 8, 1390000),
    ('VN7523', 'thuong_gia', 6, 3, 2490000),
    ('VN7612', 'pho_thong_tiet_kiem', 34, 20, 990000),
    ('VN7612', 'pho_thong_linh_hoat', 18, 11, 1290000),
    ('VN7618', 'pho_thong_tiet_kiem', 32, 17, 1040000),
    ('VN7618', 'pho_thong_linh_hoat', 16, 9, 1340000),
    ('VN7624', 'pho_thong_tiet_kiem', 30, 12, 1090000),
    ('VN7624', 'pho_thong_linh_hoat', 16, 7, 1390000),
    ('VN7624', 'thuong_gia', 6, 2, 2490000),

    ('VN6701', 'pho_thong_tiet_kiem', 30, 19, 720000),
    ('VN6701', 'pho_thong_linh_hoat', 16, 10, 890000),
    ('VN6707', 'pho_thong_tiet_kiem', 28, 15, 760000),
    ('VN6707', 'pho_thong_linh_hoat', 14, 8, 930000),
    ('VN6802', 'pho_thong_tiet_kiem', 30, 18, 720000),
    ('VN6802', 'pho_thong_linh_hoat', 16, 10, 890000),
    ('VN6808', 'pho_thong_tiet_kiem', 28, 14, 760000),
    ('VN6808', 'pho_thong_linh_hoat', 14, 8, 930000),

    ('VN7813', 'pho_thong_tiet_kiem', 32, 20, 860000),
    ('VN7813', 'pho_thong_linh_hoat', 16, 10, 1050000),
    ('VN7819', 'pho_thong_tiet_kiem', 30, 16, 910000),
    ('VN7819', 'pho_thong_linh_hoat', 16, 9, 1090000),
    ('VN7904', 'pho_thong_tiet_kiem', 32, 19, 860000),
    ('VN7904', 'pho_thong_linh_hoat', 16, 10, 1050000),
    ('VN7910', 'pho_thong_tiet_kiem', 30, 15, 910000),
    ('VN7910', 'pho_thong_linh_hoat', 16, 8, 1090000),

    ('VN8801', 'pho_thong_tiet_kiem', 36, 25, 1780000),
    ('VN8801', 'pho_thong_linh_hoat', 18, 11, 2190000),
    ('VN8801', 'thuong_gia', 8, 4, 3980000),
    ('VN8802', 'pho_thong_tiet_kiem', 36, 24, 1780000),
    ('VN8802', 'pho_thong_linh_hoat', 18, 10, 2190000),
    ('VN8802', 'thuong_gia', 8, 3, 3980000),

    ('VN8901', 'pho_thong_tiet_kiem', 28, 18, 690000),
    ('VN8901', 'pho_thong_linh_hoat', 14, 9, 840000),
    ('VN8902', 'pho_thong_tiet_kiem', 28, 17, 690000),
    ('VN8902', 'pho_thong_linh_hoat', 14, 8, 840000)
) as fare_data(flight_code, fare_family, total_seats, available_seats, price)
join flight on flight.code = fare_data.flight_code
on conflict (flight_id, fare_family) do update set
  total_seats = excluded.total_seats,
  available_seats = excluded.available_seats,
  price = excluded.price;
