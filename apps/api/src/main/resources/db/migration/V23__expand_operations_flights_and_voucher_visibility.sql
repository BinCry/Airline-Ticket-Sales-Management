alter table flight
  add column if not exists hidden_at timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table member_voucher
  add column if not exists operations_hidden_at timestamptz,
  add column if not exists member_hidden_at timestamptz;

update member_voucher
set operations_hidden_at = hidden_at
where hidden_at is not null
  and operations_hidden_at is null;

update member_voucher
set member_hidden_at = hidden_at
where hidden_at is not null
  and member_hidden_at is null
  and status = 'REVOKED';
