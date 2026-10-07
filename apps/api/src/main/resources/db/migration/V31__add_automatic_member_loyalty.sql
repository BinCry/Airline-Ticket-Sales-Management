create table loyalty_tier_rule (
  id bigserial primary key,
  tier_name varchar(64) not null unique,
  min_lifetime_points integer not null check (min_lifetime_points >= 0),
  sort_order integer not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into loyalty_tier_rule (tier_name, min_lifetime_points, sort_order)
values ('Hội viên', 0, 0), ('Hội viên Bạc', 10000, 1),
       ('Hội viên Vàng', 20000, 2), ('Hội viên Bạch Kim', 40000, 3);

alter table booking
  add column member_user_id bigint references user_account (id);
create index idx_booking_member_user on booking (member_user_id)
  where member_user_id is not null;

alter table member_loyalty_ledger
  add column booking_segment_id bigint references booking_segment (id);
create unique index uk_loyalty_flight_earn_segment
  on member_loyalty_ledger (loyalty_account_id, booking_segment_id, entry_type)
  where entry_type = 'FLIGHT_EARN';
