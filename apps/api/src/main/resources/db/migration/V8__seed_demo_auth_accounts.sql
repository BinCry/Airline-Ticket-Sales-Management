insert into user_account (
  email,
  password_hash,
  display_name,
  phone,
  status,
  email_verified,
  created_at,
  updated_at
)
values
  (
    'guest.demo@qlvmb.local',
    '$2a$10$LhT4METD3G14hQyK41p4vuEumxJbDOyZcdLblWfp63Hp/f47xAmhK',
    'Khách vãng lai nội bộ',
    '0900000001',
    'active',
    true,
    now(),
    now()
  ),
  (
    'customer.demo@qlvmb.local',
    '$2a$10$LhT4METD3G14hQyK41p4vuEumxJbDOyZcdLblWfp63Hp/f47xAmhK',
    'Khách hàng nội bộ',
    '0900000002',
    'active',
    true,
    now(),
    now()
  ),
  (
    'member.demo@qlvmb.local',
    '$2a$10$LhT4METD3G14hQyK41p4vuEumxJbDOyZcdLblWfp63Hp/f47xAmhK',
    'Hội viên nội bộ',
    '0900000003',
    'active',
    true,
    now(),
    now()
  ),
  (
    'support.demo@qlvmb.local',
    '$2a$10$LhT4METD3G14hQyK41p4vuEumxJbDOyZcdLblWfp63Hp/f47xAmhK',
    'Nhân viên chăm sóc khách hàng nội bộ',
    '0900000004',
    'active',
    true,
    now(),
    now()
  ),
  (
    'operations.demo@qlvmb.local',
    '$2a$10$LhT4METD3G14hQyK41p4vuEumxJbDOyZcdLblWfp63Hp/f47xAmhK',
    'Nhân viên vận hành nội bộ',
    '0900000005',
    'active',
    true,
    now(),
    now()
  )
on conflict do nothing;

insert into user_role (user_id, role_id)
select
  user_account.id,
  auth_role.id
from user_account
join auth_role on auth_role.code = case lower(user_account.email)
  when 'guest.demo@qlvmb.local' then 'guest'
  when 'customer.demo@qlvmb.local' then 'customer'
  when 'member.demo@qlvmb.local' then 'member'
  when 'support.demo@qlvmb.local' then 'customer_support'
  when 'operations.demo@qlvmb.local' then 'operations_staff'
end
where lower(user_account.email) in (
  'guest.demo@qlvmb.local',
  'customer.demo@qlvmb.local',
  'member.demo@qlvmb.local',
  'support.demo@qlvmb.local',
  'operations.demo@qlvmb.local'
)
on conflict do nothing;
