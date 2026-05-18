alter table refund_request
  add column if not exists hidden_at timestamptz;

create index if not exists idx_refund_request_hidden_at
  on refund_request (hidden_at);
