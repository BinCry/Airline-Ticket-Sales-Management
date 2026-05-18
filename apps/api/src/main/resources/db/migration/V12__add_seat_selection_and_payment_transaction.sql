create table booking_seat_selection (
  id bigserial primary key,
  booking_id bigint not null references booking (id) on delete cascade,
  booking_passenger_id bigint not null references booking_passenger (id) on delete cascade,
  booking_segment_id bigint not null references booking_segment (id) on delete cascade,
  seat_number varchar(8) not null,
  unit_price bigint not null,
  created_at timestamptz not null,
  constraint ck_booking_seat_selection_unit_price_non_negative check (unit_price >= 0),
  constraint uk_booking_seat_selection_passenger_segment unique (booking_passenger_id, booking_segment_id),
  constraint uk_booking_seat_selection_segment_seat unique (booking_segment_id, seat_number)
);

create index idx_booking_seat_selection_booking_id on booking_seat_selection (booking_id);

create table payment_transaction (
  id bigserial primary key,
  booking_id bigint not null unique references booking (id) on delete cascade,
  provider varchar(32) not null,
  session_mode varchar(16) not null,
  order_code varchar(64) not null unique,
  provider_order_id varchar(96),
  external_transaction_id bigint unique,
  external_reference_code varchar(128),
  status varchar(16) not null,
  amount bigint not null,
  payment_url varchar(255),
  qr_code_url text,
  qr_code_data_url text,
  bank_name varchar(120),
  account_number varchar(64),
  account_holder_name varchar(160),
  last_payload text,
  paid_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint ck_payment_transaction_status check (status in ('PENDING', 'PAID', 'FAILED', 'EXPIRED')),
  constraint ck_payment_transaction_session_mode check (session_mode in ('live', 'local')),
  constraint ck_payment_transaction_amount_non_negative check (amount >= 0)
);
