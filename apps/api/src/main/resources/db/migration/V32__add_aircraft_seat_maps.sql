create table aircraft_type (
  id bigserial primary key,
  code varchar(16) not null unique,
  name varchar(120) not null,
  total_rows integer not null check (total_rows between 1 and 200),
  seat_layout_json jsonb not null check (jsonb_typeof(seat_layout_json) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table aircraft (
  id bigserial primary key,
  aircraft_type_id bigint not null references aircraft_type(id),
  registration_code varchar(20) not null unique,
  status varchar(16) not null check (status in ('ACTIVE','MAINTENANCE','INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table flight add column aircraft_id bigint references aircraft(id);
create index idx_flight_aircraft_id on flight(aircraft_id);
create index idx_aircraft_type_id on aircraft(aircraft_type_id);
alter table booking_seat_selection add column updated_at timestamptz;
update booking_seat_selection set updated_at = created_at;
alter table booking_seat_selection alter column updated_at set not null;
alter table booking_seat_selection alter column updated_at set default now();

-- Boarding pass còn hiệu lực xác định ghế đã xác nhận, không giữ thêm ghế selection cũ.
create temporary table migration_active_seat on commit drop as
select i.flight_id, upper(s.seat_number) seat_number, bs.fare_family,
    s.booking_passenger_id passenger_id, s.booking_segment_id segment_id
from booking_seat_selection s join booking b on b.id=s.booking_id
join booking_segment bs on bs.id=s.booking_segment_id
join flight_fare_inventory i on i.id=bs.inventory_id join flight f on f.id=i.flight_id
where f.status<>'cancelled' and (
  (b.status='HOLD' and b.expires_at>now()) or
  (b.status in ('TICKETED','REFUND_PENDING') and (
    exists (select 1 from ticket t where t.booking_passenger_id=s.booking_passenger_id
      and t.booking_segment_id=s.booking_segment_id and t.status in ('ISSUED','CHECKED_IN'))
    or not exists (select 1 from ticket t where t.booking_passenger_id=s.booking_passenger_id
      and t.booking_segment_id=s.booking_segment_id)
  ))
) and not exists (
  select 1 from ticket t join boarding_pass bp on bp.ticket_id=t.id
  where t.booking_passenger_id=s.booking_passenger_id and t.booking_segment_id=s.booking_segment_id
    and t.status in ('ISSUED','CHECKED_IN')
)
union
select i.flight_id, upper(bp.seat_number), bs.fare_family, t.booking_passenger_id, t.booking_segment_id
from boarding_pass bp join ticket t on t.id=bp.ticket_id
join booking b on b.id=t.booking_id join booking_segment bs on bs.id=t.booking_segment_id
join flight_fare_inventory i on i.id=bs.inventory_id join flight f on f.id=i.flight_id
where f.status<>'cancelled' and b.status in ('TICKETED','REFUND_PENDING')
  and t.status in ('ISSUED','CHECKED_IN');

do $$
declare conflicts text;
begin
  select string_agg(flight_id::text || ':' || seat_number, ', ') into conflicts
  from migration_active_seat
  where seat_number !~ '^[1-9][0-9]{0,2}[A-Z]$'
    or fare_family not in ('thuong_gia','pho_thong_linh_hoat','pho_thong_tiet_kiem');
  if conflicts is not null then raise exception 'Dữ liệu ghế cũ không hợp lệ, cần xử lý trước migration: %', conflicts; end if;

  select string_agg(flight_id::text || ':' || seat_number, ', ') into conflicts
  from (select flight_id,seat_number from migration_active_seat
        group by flight_id,seat_number having count(distinct (passenger_id,segment_id))>1) collision;
  if conflicts is not null then raise exception 'Ghế cũ đang bị nhiều hành khách giữ: %', conflicts; end if;

  select string_agg(flight_id::text || ':hàng ' || seat_row::text, ', ') into conflicts
  from (select flight_id, substring(seat_number from '^[0-9]+')::integer seat_row
        from migration_active_seat group by flight_id,substring(seat_number from '^[0-9]+')::integer
        having count(distinct fare_family)>1 or substring(seat_number from '^[0-9]+')::integer>200) collision;
  if conflicts is not null then raise exception 'Cabin cũ có hàng nhiều hạng hoặc vượt giới hạn, cần cấu hình trước migration: %', conflicts; end if;
end $$;

insert into aircraft_type(code,name,total_rows,seat_layout_json)
select 'A321','Airbus A321',28,jsonb_build_object(
  'columns',jsonb_build_array('A','B','C','D','E','F'),
  'aislesAfter',jsonb_build_array('C'),
  'rows',jsonb_agg(jsonb_build_object('row',r,'fareFamily',case
    when r<=2 then 'thuong_gia' when r<=8 then 'pho_thong_linh_hoat' else 'pho_thong_tiet_kiem' end,
    'seats',jsonb_build_array('A','B','C','D','E','F')) order by r),
  'disabledSeats','[]'::jsonb)
from generate_series(1,28) r;
insert into aircraft(aircraft_type_id,registration_code,status)
select id,'VN-DEMO-A321','ACTIVE' from aircraft_type where code='A321';

-- Cabin riêng bảo toàn ghế đã phát trước đây sai khu vực hoặc nằm ngoài 28 hàng; không remap khách.
do $$
declare item record; cabin jsonb; columns_json jsonb; row_count integer;
  type_id bigint; plane_id bigint;
begin
  for item in select distinct flight_id from migration_active_seat loop
    if exists (select 1 from migration_active_seat s where s.flight_id=item.flight_id and (
      substring(s.seat_number from '^[0-9]+')::integer>28 or right(s.seat_number,1) not in ('A','B','C','D','E','F')
      or s.fare_family<>case when substring(s.seat_number from '^[0-9]+')::integer<=2 then 'thuong_gia'
        when substring(s.seat_number from '^[0-9]+')::integer<=8 then 'pho_thong_linh_hoat' else 'pho_thong_tiet_kiem' end
    )) then
      select greatest(28,max(substring(seat_number from '^[0-9]+')::integer)) into row_count
      from migration_active_seat where flight_id=item.flight_id;
      select jsonb_agg(c order by c) into columns_json from (
        select unnest(array['A','B','C','D','E','F']) c
        union select right(seat_number,1) from migration_active_seat where flight_id=item.flight_id
      ) cols;
      select jsonb_build_object('columns',columns_json,'aislesAfter',jsonb_build_array('C'),
        'disabledSeats','[]'::jsonb,'rows',jsonb_agg(jsonb_build_object('row',r,'fareFamily',coalesce(
          (select min(s.fare_family) from migration_active_seat s where s.flight_id=item.flight_id
            and substring(s.seat_number from '^[0-9]+')::integer=r),
          case when r<=2 then 'thuong_gia' when r<=8 then 'pho_thong_linh_hoat' else 'pho_thong_tiet_kiem' end),
          'seats',columns_json) order by r)) into cabin from generate_series(1,row_count) r;
      insert into aircraft_type(code,name,total_rows,seat_layout_json)
      values ('LEGACY-' || item.flight_id,'Cabin bảo toàn dữ liệu cũ chuyến ' || item.flight_id,row_count,cabin) returning id into type_id;
      insert into aircraft(aircraft_type_id,registration_code,status)
      values(type_id,'VN-LEGACY-' || item.flight_id,'ACTIVE') returning id into plane_id;
      update flight set aircraft_id=plane_id where id=item.flight_id;
    end if;
  end loop;
end $$;
update flight set aircraft_id=(select id from aircraft where registration_code='VN-DEMO-A321') where aircraft_id is null;

-- Đồng bộ số ghế bán được theo cabin đã gán; giữ lượng inventory đã đặt trước đây.
update flight_fare_inventory i set
  total_seats=capacity.total,
  available_seats=greatest(0,capacity.total-greatest(0,i.total_seats-i.available_seats))
from (
  select f.id flight_id, row_item->>'fareFamily' fare_family,
      sum(jsonb_array_length(row_item->'seats'))::integer total
  from flight f join aircraft a on a.id=f.aircraft_id join aircraft_type t on t.id=a.aircraft_type_id
  cross join lateral jsonb_array_elements(t.seat_layout_json->'rows') row_item
  group by f.id,row_item->>'fareFamily'
) capacity where i.flight_id=capacity.flight_id and i.fare_family=capacity.fare_family;
