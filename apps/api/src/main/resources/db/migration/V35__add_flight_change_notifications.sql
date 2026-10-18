create table flight_change_event (
 id bigserial primary key,
 flight_id bigint not null references flight(id),
 field_name varchar(32) not null,
 old_value text,
 new_value text,
 actor_user_id bigint references user_account(id) on delete set null,
 created_at timestamptz not null
);
create index idx_flight_change_event_flight_date on flight_change_event(flight_id,created_at desc);
alter table notification_outbox add column flight_code varchar(16);
alter table notification_outbox add column dedup_key varchar(190);
alter table notification_outbox add column read_at timestamptz;
create unique index uk_notification_outbox_dedup on notification_outbox(dedup_key) where dedup_key is not null;
create index idx_notification_outbox_email_time on notification_outbox(lower(recipient_email),created_at desc);
