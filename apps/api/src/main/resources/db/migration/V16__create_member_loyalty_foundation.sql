create table member_loyalty_account (
  id bigserial primary key,
  user_id bigint not null unique references user_account (id) on delete cascade,
  membership_tier varchar(64) not null,
  point_balance integer not null default 0,
  lifetime_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_member_loyalty_account_user on member_loyalty_account (user_id);

create table member_loyalty_ledger (
  id bigserial primary key,
  loyalty_account_id bigint not null references member_loyalty_account (id) on delete cascade,
  entry_type varchar(32) not null,
  points_delta integer not null,
  balance_after integer not null,
  booking_code varchar(6),
  description varchar(255) not null,
  created_at timestamptz not null default now()
);

create index idx_member_loyalty_ledger_account_created
  on member_loyalty_ledger (loyalty_account_id, created_at desc);

create table member_voucher (
  id bigserial primary key,
  user_id bigint not null references user_account (id) on delete cascade,
  voucher_code varchar(40) not null unique,
  title varchar(160) not null,
  description varchar(255) not null,
  discount_amount bigint not null,
  currency varchar(8) not null,
  status varchar(16) not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  booking_code varchar(6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_member_voucher_user_status_expiry
  on member_voucher (user_id, status, expires_at);

insert into member_loyalty_account (
  user_id,
  membership_tier,
  point_balance,
  lifetime_points,
  created_at,
  updated_at
)
select
  user_account.id,
  'Hội viên Vàng',
  18450,
  24600,
  '2026-05-16T08:00:00+07:00'::timestamptz,
  '2026-05-16T08:00:00+07:00'::timestamptz
from user_account
where lower(user_account.email) = 'member.demo@qlvmb.local'
  and not exists (
    select 1
    from member_loyalty_account loyalty_account
    where loyalty_account.user_id = user_account.id
  );

insert into member_loyalty_ledger (
  loyalty_account_id,
  entry_type,
  points_delta,
  balance_after,
  booking_code,
  description,
  created_at
)
select
  loyalty_account.id,
  loyalty_seed.entry_type,
  loyalty_seed.points_delta,
  loyalty_seed.balance_after,
  loyalty_seed.booking_code,
  loyalty_seed.description,
  loyalty_seed.created_at
from member_loyalty_account loyalty_account
join user_account user_account on user_account.id = loyalty_account.user_id
join (
  values
    ('BASELINE', 12000, 12000, null, 'Điểm tích lũy từ các hành trình hoàn tất trước đây.', '2026-03-20T09:00:00+07:00'::timestamptz),
    ('PROFILE_BONUS', 4500, 16500, null, 'Thưởng hoàn thiện hồ sơ hành khách và kênh nhận thông báo.', '2026-04-08T10:15:00+07:00'::timestamptz),
    ('PROMOTION', 1950, 18450, null, 'Điểm cộng thêm từ chương trình ưu đãi tháng 5.', '2026-05-12T14:30:00+07:00'::timestamptz)
) as loyalty_seed(entry_type, points_delta, balance_after, booking_code, description, created_at) on true
where lower(user_account.email) = 'member.demo@qlvmb.local'
  and not exists (
    select 1
    from member_loyalty_ledger ledger
    where ledger.loyalty_account_id = loyalty_account.id
  );

insert into member_voucher (
  user_id,
  voucher_code,
  title,
  description,
  discount_amount,
  currency,
  status,
  expires_at,
  used_at,
  booking_code,
  created_at,
  updated_at
)
select
  user_account.id,
  voucher_seed.voucher_code,
  voucher_seed.title,
  voucher_seed.description,
  voucher_seed.discount_amount,
  voucher_seed.currency,
  voucher_seed.status,
  voucher_seed.expires_at,
  voucher_seed.used_at,
  voucher_seed.booking_code,
  voucher_seed.created_at,
  voucher_seed.updated_at
from user_account
join (
  values
    ('MEM52026', 'Giảm 200.000 đ cho chặng nội địa', 'Áp dụng cho một booking nội địa khi hoàn tất thanh toán trong thời hạn ưu đãi.', 200000, 'VND', 'AVAILABLE', '2026-06-30T23:59:00+07:00'::timestamptz, null, null, '2026-05-16T08:00:00+07:00'::timestamptz, '2026-05-16T08:00:00+07:00'::timestamptz),
    ('BAGFREE26', 'Ưu đãi hành lý ký gửi 23kg', 'Dùng để đổi ưu đãi hành lý cho chuyến bay nội địa tiếp theo.', 290000, 'VND', 'AVAILABLE', '2026-07-15T23:59:00+07:00'::timestamptz, null, null, '2026-05-16T08:05:00+07:00'::timestamptz, '2026-05-16T08:05:00+07:00'::timestamptz),
    ('SPRINGUSED', 'Ưu đãi đã sử dụng', 'Bản ghi lịch sử để kiểm tra hiển thị voucher đã dùng.', 150000, 'VND', 'USED', '2026-04-10T23:59:00+07:00'::timestamptz, '2026-04-05T16:10:00+07:00'::timestamptz, null, '2026-03-25T09:45:00+07:00'::timestamptz, '2026-04-05T16:10:00+07:00'::timestamptz)
) as voucher_seed(
  voucher_code,
  title,
  description,
  discount_amount,
  currency,
  status,
  expires_at,
  used_at,
  booking_code,
  created_at,
  updated_at
) on true
where lower(user_account.email) = 'member.demo@qlvmb.local'
  and not exists (
    select 1
    from member_voucher voucher
    where voucher.voucher_code = voucher_seed.voucher_code
  );
