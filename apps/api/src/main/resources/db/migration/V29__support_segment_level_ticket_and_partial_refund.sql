alter table ticket
  add column booking_segment_id bigint references booking_segment (id);

update ticket
set booking_segment_id = segment.id
from booking_segment segment
where ticket.booking_segment_id is null
  and segment.booking_id = ticket.booking_id
  and not exists (
    select 1
    from booking_segment other_segment
    where other_segment.booking_id = ticket.booking_id
      and other_segment.id <> segment.id
  );

update ticket
set booking_segment_id = seat_selection.booking_segment_id
from booking_seat_selection seat_selection
where ticket.booking_segment_id is null
  and seat_selection.booking_passenger_id = ticket.booking_passenger_id
  and not exists (
    select 1
    from booking_seat_selection other_selection
    where other_selection.booking_passenger_id = seat_selection.booking_passenger_id
      and other_selection.booking_segment_id <> seat_selection.booking_segment_id
  );

insert into ticket (
  booking_id,
  booking_passenger_id,
  booking_segment_id,
  ticket_number,
  status,
  issued_at,
  created_at,
  updated_at
)
select
  ticket.booking_id,
  ticket.booking_passenger_id,
  seat_selection.booking_segment_id,
  '739' || lpad(nextval('ticket_id_seq')::text, 10, '0'),
  ticket.status,
  ticket.issued_at,
  ticket.created_at,
  ticket.updated_at
from ticket
join booking_seat_selection seat_selection on seat_selection.booking_passenger_id = ticket.booking_passenger_id
where ticket.booking_segment_id is not null
  and seat_selection.booking_segment_id <> ticket.booking_segment_id
  and not exists (
    select 1
    from ticket existing_ticket
    where existing_ticket.booking_passenger_id = ticket.booking_passenger_id
      and existing_ticket.booking_segment_id = seat_selection.booking_segment_id
  );

update ticket
set booking_segment_id = segment.id
from booking_segment segment
where ticket.booking_segment_id is null
  and segment.booking_id = ticket.booking_id;

alter table ticket
  alter column booking_segment_id set not null;

alter table ticket
  drop constraint if exists ticket_booking_passenger_id_key;

alter table ticket
  add constraint uk_ticket_passenger_segment unique (booking_passenger_id, booking_segment_id);

create index if not exists idx_ticket_booking_segment_id on ticket (booking_segment_id);

create table if not exists refund_request_ticket (
  refund_request_id bigint not null references refund_request (id) on delete cascade,
  ticket_id bigint not null references ticket (id) on delete cascade,
  primary key (refund_request_id, ticket_id)
);

insert into refund_request_ticket (refund_request_id, ticket_id)
select distinct refund_request.id, ticket.id
from refund_request
join booking on booking.booking_code = refund_request.booking_code
join ticket on ticket.booking_id = booking.id
where not exists (
  select 1
  from refund_request_ticket existing_link
  where existing_link.refund_request_id = refund_request.id
    and existing_link.ticket_id = ticket.id
);
