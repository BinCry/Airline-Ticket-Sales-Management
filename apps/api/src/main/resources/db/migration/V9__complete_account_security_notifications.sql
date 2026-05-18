alter table user_account
  add column avatar_url varchar(500);

create table auth_provider_identity (
  id bigserial primary key,
  user_id bigint not null references user_account (id) on delete cascade,
  provider varchar(32) not null,
  provider_subject varchar(190) not null,
  email varchar(160) not null,
  avatar_url varchar(500),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (provider, provider_subject)
);

create index idx_auth_provider_identity_user_id on auth_provider_identity (user_id);
create index idx_auth_provider_identity_email on auth_provider_identity (lower(email));

create table audit_log (
  id bigserial primary key,
  actor_user_id bigint references user_account (id) on delete set null,
  action varchar(120) not null,
  target_type varchar(80) not null,
  target_id varchar(120) not null,
  detail varchar(1000) not null,
  created_at timestamptz not null
);

create index idx_audit_log_created_at on audit_log (created_at desc);
create index idx_audit_log_actor_user_id on audit_log (actor_user_id);

create table notification_outbox (
  id bigserial primary key,
  type varchar(80) not null,
  booking_code varchar(6) references booking (booking_code) on delete set null,
  recipient_email varchar(160) not null,
  subject varchar(200) not null,
  body text not null,
  status varchar(16) not null,
  retry_count integer not null default 0,
  last_error varchar(1000),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  sent_at timestamptz,
  constraint ck_notification_outbox_status check (status in ('PENDING', 'SENT', 'FAILED'))
);

create index idx_notification_outbox_status_created_at on notification_outbox (status, created_at desc);
create index idx_notification_outbox_booking_code on notification_outbox (booking_code);
