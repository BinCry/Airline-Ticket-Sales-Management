create table if not exists booking_lookup_session (
  id bigserial primary key,
  booking_code varchar(6) not null,
  contact_email varchar(160) not null,
  token_key varchar(120) not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_lookup_session_booking_code
  on booking_lookup_session (booking_code, expires_at desc);

alter table audit_log
  add column if not exists hidden_at timestamptz;
