-- Purchased baggage is scoped to a passenger and one booked fare segment.
-- Old ancillaries remain valid without passenger/segment ownership.
alter table booking_ancillary add column booking_passenger_id bigint references booking_passenger(id);
alter table booking_ancillary add column booking_segment_id bigint references booking_segment(id);
alter table booking_ancillary add column kind varchar(16);
alter table booking_ancillary add constraint ck_booking_ancillary_baggage_scope
 check (kind is distinct from 'BAGGAGE' or
        (booking_passenger_id is not null and booking_segment_id is not null and quantity between 1 and 3));
create unique index uk_baggage_scope on booking_ancillary(booking_passenger_id,booking_segment_id)
 where kind='BAGGAGE';
create index idx_booking_ancillary_passenger_segment on booking_ancillary(booking_passenger_id,booking_segment_id);

create table baggage_tracking (
 id bigserial primary key,
 ticket_id bigint not null references ticket(id) on delete cascade,
 booking_ancillary_id bigint not null references booking_ancillary(id) on delete cascade,
 piece_no integer not null check (piece_no between 1 and 3),
 tag_code varchar(10) not null unique,
 status varchar(24) not null check (status in ('REGISTERED','ACCEPTED','LOADED','DELIVERED','CANCELLED','RETURN_PENDING')),
 purchased_weight_kg integer not null check (purchased_weight_kg > 0),
 weight_kg numeric(6,2),
 note varchar(500),
 accepted_at timestamptz,
 loaded_at timestamptz,
 delivered_at timestamptz,
 created_at timestamptz not null,
 updated_at timestamptz not null,
 updated_by_user_id bigint references user_account(id),
 constraint uk_baggage_ancillary_piece unique(booking_ancillary_id,piece_no),
 constraint ck_baggage_actual_weight check(weight_kg is null or weight_kg > 0)
);
create index idx_baggage_ticket on baggage_tracking(ticket_id);
create index idx_baggage_status on baggage_tracking(status);
