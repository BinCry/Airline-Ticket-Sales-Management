create table oauth_temporary_code (
  id bigserial primary key,
  state_hash varchar(64) not null unique,
  exchange_code_hash varchar(64) unique,
  provider varchar(32) not null,
  provider_subject varchar(190),
  user_id bigint references user_account (id) on delete cascade,
  redirect_to varchar(500),
  created_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index idx_oauth_temporary_code_exchange on oauth_temporary_code (exchange_code_hash);
create index idx_oauth_temporary_code_expires_at on oauth_temporary_code (expires_at);
