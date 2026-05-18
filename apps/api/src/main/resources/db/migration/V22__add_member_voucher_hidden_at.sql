alter table member_voucher
  add column if not exists hidden_at timestamptz;

create index if not exists idx_member_voucher_hidden_at
  on member_voucher (hidden_at);
