insert into booking (
  booking_code,
  status,
  payment_status,
  trip_type,
  base_amount,
  ancillary_amount,
  total_amount,
  currency,
  expires_at,
  ticketed_at,
  payment_reference,
  payment_session_url,
  created_at,
  updated_at
)
values
  ('QC5001', 'TICKETED', 'PAID', 'one_way', 1890000, 290000, 2180000, 'VND', '2026-05-23T05:40:00+07:00', '2026-05-16T09:20:00+07:00', 'LOCAL-QC5001', '/payment/local?pnr=QC5001', '2026-05-16T09:00:00+07:00', '2026-05-16T09:20:00+07:00'),
  ('QC5002', 'TICKETED', 'PAID', 'one_way', 1590000, 0, 1590000, 'VND', '2026-05-23T11:00:00+07:00', '2026-05-16T10:15:00+07:00', 'LOCAL-QC5002', '/payment/local?pnr=QC5002', '2026-05-16T10:00:00+07:00', '2026-05-16T10:15:00+07:00'),
  ('QC5003', 'REFUND_PENDING', 'PAID', 'one_way', 3520000, 0, 3520000, 'VND', '2026-05-26T13:40:00+07:00', '2026-05-16T11:20:00+07:00', 'LOCAL-QC5003', '/payment/local?pnr=QC5003', '2026-05-16T11:00:00+07:00', '2026-05-16T12:00:00+07:00'),
  ('QC5004', 'HOLD', 'PENDING', 'one_way', 1990000, 320000, 2310000, 'VND', '2026-12-31T23:59:00+07:00', null, null, '/payment/local?pnr=QC5004', '2026-05-16T13:00:00+07:00', '2026-05-16T13:00:00+07:00')
on conflict (booking_code) do nothing;

insert into booking_contact (booking_id, full_name, email, phone)
select booking.id, contact_data.full_name, contact_data.email, contact_data.phone
from (
  values
    ('QC5001', 'Nguyễn Minh Anh', 'customer.demo@qlvmb.local', '0900000002'),
    ('QC5002', 'Trần Hoàng Nam', 'customer.demo@qlvmb.local', '0900000002'),
    ('QC5003', 'Lê Thu Hà', 'customer.demo@qlvmb.local', '0900000002'),
    ('QC5004', 'Phạm Gia Bảo', 'customer.demo@qlvmb.local', '0900000002')
) as contact_data(booking_code, full_name, email, phone)
join booking on booking.booking_code = contact_data.booking_code
where not exists (
  select 1 from booking_contact existing_contact where existing_contact.booking_id = booking.id
);

insert into booking_passenger (booking_id, full_name, passenger_type, date_of_birth, document_type, document_number, created_at)
select booking.id, passenger_data.full_name, passenger_data.passenger_type, passenger_data.date_of_birth, passenger_data.document_type, passenger_data.document_number, passenger_data.created_at
from (
  values
    ('QC5001', 'Nguyễn Minh Anh', 'adult', '1994-03-12'::date, 'CCCD', '079094000001', '2026-05-16T09:00:00+07:00'::timestamptz),
    ('QC5002', 'Trần Hoàng Nam', 'adult', '1990-07-22'::date, 'CCCD', '001090000002', '2026-05-16T10:00:00+07:00'::timestamptz),
    ('QC5003', 'Lê Thu Hà', 'adult', '1988-11-05'::date, 'Hộ chiếu', 'B12345003', '2026-05-16T11:00:00+07:00'::timestamptz),
    ('QC5004', 'Phạm Gia Bảo', 'adult', '1997-01-18'::date, 'CCCD', '079097000004', '2026-05-16T13:00:00+07:00'::timestamptz)
) as passenger_data(booking_code, full_name, passenger_type, date_of_birth, document_type, document_number, created_at)
join booking on booking.booking_code = passenger_data.booking_code
where not exists (
  select 1
  from booking_passenger existing_passenger
  where existing_passenger.booking_id = booking.id
    and existing_passenger.document_number = passenger_data.document_number
);

insert into booking_segment (
  booking_id,
  inventory_id,
  flight_code,
  from_city,
  to_city,
  origin_code,
  destination_code,
  departure_at,
  arrival_at,
  fare_family,
  fare_title,
  price_per_passenger,
  passenger_count,
  subtotal_amount,
  created_at
)
select
  booking.id,
  inventory.id,
  flight.code,
  origin.city_name,
  destination.city_name,
  origin.code,
  destination.code,
  flight.departure_at,
  flight.arrival_at,
  inventory.fare_family,
  segment_data.fare_title,
  inventory.price,
  1,
  inventory.price,
  segment_data.created_at
from (
  values
    ('QC5001', 'VN5201', 'pho_thong_linh_hoat', 'Phổ thông linh hoạt', '2026-05-16T09:00:00+07:00'::timestamptz),
    ('QC5002', 'VN5205', 'pho_thong_tiet_kiem', 'Phổ thông tiết kiệm', '2026-05-16T10:00:00+07:00'::timestamptz),
    ('QC5003', 'VN5308', 'thuong_gia', 'Thương gia', '2026-05-16T11:00:00+07:00'::timestamptz),
    ('QC5004', 'VN5211', 'pho_thong_linh_hoat', 'Phổ thông linh hoạt', '2026-05-16T13:00:00+07:00'::timestamptz)
) as segment_data(booking_code, flight_code, fare_family, fare_title, created_at)
join booking on booking.booking_code = segment_data.booking_code
join flight on flight.code = segment_data.flight_code
join airport origin on origin.id = flight.origin_airport_id
join airport destination on destination.id = flight.destination_airport_id
join flight_fare_inventory inventory on inventory.flight_id = flight.id and inventory.fare_family = segment_data.fare_family
where not exists (
  select 1
  from booking_segment existing_segment
  where existing_segment.booking_id = booking.id
    and existing_segment.inventory_id = inventory.id
);

insert into booking_ancillary (booking_id, code, name, description, unit_price, quantity, subtotal_amount, created_at)
select booking.id, ancillary_data.code, ancillary_data.name, ancillary_data.description, ancillary_data.unit_price, ancillary_data.quantity, ancillary_data.subtotal_amount, ancillary_data.created_at
from (
  values
    ('QC5001', 'BAG_23', 'Hành lý ký gửi 23kg', 'Mua trước khi thanh toán hoặc bổ sung sau đặt chỗ.', 290000, 1, 290000, '2026-05-16T09:00:00+07:00'::timestamptz),
    ('QC5004', 'SEAT_PLUS', 'Ghế hàng đầu', 'Thêm chỗ duỗi chân và ưu tiên xuống tàu.', 320000, 1, 320000, '2026-05-16T13:00:00+07:00'::timestamptz)
) as ancillary_data(booking_code, code, name, description, unit_price, quantity, subtotal_amount, created_at)
join booking on booking.booking_code = ancillary_data.booking_code
where not exists (
  select 1
  from booking_ancillary existing_ancillary
  where existing_ancillary.booking_id = booking.id
    and existing_ancillary.code = ancillary_data.code
);

insert into ticket (booking_id, booking_passenger_id, ticket_number, status, issued_at, created_at, updated_at)
select booking.id, passenger.id, ticket_data.ticket_number, ticket_data.status, ticket_data.issued_at, ticket_data.issued_at, ticket_data.updated_at
from (
  values
    ('QC5001', '079094000001', '7385001001', 'ISSUED', '2026-05-16T09:20:00+07:00'::timestamptz, '2026-05-16T09:20:00+07:00'::timestamptz),
    ('QC5002', '001090000002', '7385002001', 'CHECKED_IN', '2026-05-16T10:15:00+07:00'::timestamptz, '2026-05-16T10:40:00+07:00'::timestamptz),
    ('QC5003', 'B12345003', '7385003001', 'ISSUED', '2026-05-16T11:20:00+07:00'::timestamptz, '2026-05-16T11:20:00+07:00'::timestamptz)
) as ticket_data(booking_code, document_number, ticket_number, status, issued_at, updated_at)
join booking on booking.booking_code = ticket_data.booking_code
join booking_passenger passenger on passenger.booking_id = booking.id and passenger.document_number = ticket_data.document_number
where not exists (
  select 1 from ticket existing_ticket where existing_ticket.booking_passenger_id = passenger.id
);

insert into boarding_pass (ticket_id, seat_number, gate, boarding_time, barcode, created_at, updated_at)
select ticket.id, '9C', 'G3', '2026-05-23T10:50:00+07:00'::timestamptz, 'QC5002-7385002001', '2026-05-16T10:40:00+07:00'::timestamptz, '2026-05-16T10:40:00+07:00'::timestamptz
from ticket
where ticket.ticket_number = '7385002001'
  and not exists (
    select 1 from boarding_pass existing_boarding_pass where existing_boarding_pass.ticket_id = ticket.id
  );

insert into refund_request (booking_code, reason, refund_amount, status, created_at, updated_at)
select 'QC5003', 'Hành khách đổi kế hoạch công tác và cần hoàn vé.', 3520000, 'PENDING', '2026-05-16T12:00:00+07:00'::timestamptz, '2026-05-16T12:00:00+07:00'::timestamptz
where not exists (
  select 1 from refund_request where booking_code = 'QC5003' and status = 'PENDING'
);

insert into notification_outbox (type, booking_code, recipient_email, subject, body, status, retry_count, last_error, created_at, updated_at, sent_at)
select outbox_data.type, outbox_data.booking_code, outbox_data.recipient_email, outbox_data.subject, outbox_data.body, outbox_data.status, outbox_data.retry_count, outbox_data.last_error, outbox_data.created_at, outbox_data.updated_at, outbox_data.sent_at
from (
  values
    ('TICKET_EMAIL', 'QC5001', 'customer.demo@qlvmb.local', 'Vé điện tử cho mã đặt chỗ QC5001', 'Mã đặt chỗ QC5001 đã thanh toán thành công. Vui lòng kiểm tra thông tin vé trước giờ bay.', 'SENT', 0, null, '2026-05-16T09:21:00+07:00'::timestamptz, '2026-05-16T09:21:00+07:00'::timestamptz, '2026-05-16T09:21:00+07:00'::timestamptz),
    ('TICKET_EMAIL', 'QC5003', 'customer.demo@qlvmb.local', 'Vé điện tử cho mã đặt chỗ QC5003', 'Mã đặt chỗ QC5003 đã thanh toán thành công. Email này đang chờ nhân sự gửi lại.', 'FAILED', 1, 'SMTP local chưa cấu hình', '2026-05-16T11:21:00+07:00'::timestamptz, '2026-05-16T11:25:00+07:00'::timestamptz, null)
) as outbox_data(type, booking_code, recipient_email, subject, body, status, retry_count, last_error, created_at, updated_at, sent_at)
where not exists (
  select 1
  from notification_outbox existing_outbox
  where existing_outbox.type = outbox_data.type
    and existing_outbox.booking_code = outbox_data.booking_code
    and existing_outbox.recipient_email = outbox_data.recipient_email
);
