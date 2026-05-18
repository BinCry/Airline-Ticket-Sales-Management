delete from user_role
where user_id in (
  select id
  from user_account
  where lower(email) = 'guest.demo@qlvmb.local'
);

delete from user_account
where lower(email) = 'guest.demo@qlvmb.local';

update user_account
set
  email = 'quanpm2006git@gmail.com',
  password_hash = '$2a$10$eTMVgAIk1qVR0kZO47I14OSYYqjPqc90mbW5Kv/UJmL/34S9gJ9fW',
  display_name = 'Khách hàng',
  phone = '0900000002',
  status = 'active',
  email_verified = true,
  updated_at = now()
where lower(email) = 'customer.demo@qlvmb.local'
  and not exists (
    select 1
    from user_account existing_user
    where lower(existing_user.email) = 'quanpm2006git@gmail.com'
  );

update user_account
set
  password_hash = '$2a$10$eTMVgAIk1qVR0kZO47I14OSYYqjPqc90mbW5Kv/UJmL/34S9gJ9fW',
  display_name = 'Khách hàng',
  phone = '0900000002',
  status = 'active',
  email_verified = true,
  updated_at = now()
where lower(email) = 'quanpm2006git@gmail.com';

update user_account
set
  email = 'nnn045856@gmail.com',
  password_hash = '$2a$10$eTMVgAIk1qVR0kZO47I14OSYYqjPqc90mbW5Kv/UJmL/34S9gJ9fW',
  display_name = 'Hội viên',
  phone = '0900000003',
  status = 'active',
  email_verified = true,
  updated_at = now()
where lower(email) = 'member.demo@qlvmb.local'
  and not exists (
    select 1
    from user_account existing_user
    where lower(existing_user.email) = 'nnn045856@gmail.com'
  );

update user_account
set
  password_hash = '$2a$10$eTMVgAIk1qVR0kZO47I14OSYYqjPqc90mbW5Kv/UJmL/34S9gJ9fW',
  display_name = 'Hội viên',
  phone = '0900000003',
  status = 'active',
  email_verified = true,
  updated_at = now()
where lower(email) = 'nnn045856@gmail.com';

update user_account
set
  email = 'anmycfs2006@gmail.com',
  password_hash = '$2a$10$eTMVgAIk1qVR0kZO47I14OSYYqjPqc90mbW5Kv/UJmL/34S9gJ9fW',
  display_name = 'Nhân viên chăm sóc khách hàng',
  phone = '0900000004',
  status = 'active',
  email_verified = true,
  updated_at = now()
where lower(email) = 'support.demo@qlvmb.local'
  and not exists (
    select 1
    from user_account existing_user
    where lower(existing_user.email) = 'anmycfs2006@gmail.com'
  );

update user_account
set
  password_hash = '$2a$10$eTMVgAIk1qVR0kZO47I14OSYYqjPqc90mbW5Kv/UJmL/34S9gJ9fW',
  display_name = 'Nhân viên chăm sóc khách hàng',
  phone = '0900000004',
  status = 'active',
  email_verified = true,
  updated_at = now()
where lower(email) = 'anmycfs2006@gmail.com';

update user_account
set
  email = 'bincry2006@gmail.com',
  password_hash = '$2a$10$eTMVgAIk1qVR0kZO47I14OSYYqjPqc90mbW5Kv/UJmL/34S9gJ9fW',
  display_name = 'Nhân viên vận hành',
  phone = '0900000005',
  status = 'active',
  email_verified = true,
  updated_at = now()
where lower(email) = 'operations.demo@qlvmb.local'
  and not exists (
    select 1
    from user_account existing_user
    where lower(existing_user.email) = 'bincry2006@gmail.com'
  );

update user_account
set
  password_hash = '$2a$10$eTMVgAIk1qVR0kZO47I14OSYYqjPqc90mbW5Kv/UJmL/34S9gJ9fW',
  display_name = 'Nhân viên vận hành',
  phone = '0900000005',
  status = 'active',
  email_verified = true,
  updated_at = now()
where lower(email) = 'bincry2006@gmail.com';

delete from user_role
using user_account, auth_role
where user_role.user_id = user_account.id
  and user_role.role_id = auth_role.id
  and lower(user_account.email) = 'quanpm2006git@gmail.com'
  and auth_role.code <> 'customer';

insert into user_role (user_id, role_id)
select user_account.id, auth_role.id
from user_account
join auth_role on auth_role.code = 'customer'
where lower(user_account.email) = 'quanpm2006git@gmail.com'
on conflict do nothing;

delete from user_role
using user_account, auth_role
where user_role.user_id = user_account.id
  and user_role.role_id = auth_role.id
  and lower(user_account.email) = 'nnn045856@gmail.com'
  and auth_role.code <> 'member';

insert into user_role (user_id, role_id)
select user_account.id, auth_role.id
from user_account
join auth_role on auth_role.code = 'member'
where lower(user_account.email) = 'nnn045856@gmail.com'
on conflict do nothing;

delete from user_role
using user_account, auth_role
where user_role.user_id = user_account.id
  and user_role.role_id = auth_role.id
  and lower(user_account.email) = 'anmycfs2006@gmail.com'
  and auth_role.code <> 'customer_support';

insert into user_role (user_id, role_id)
select user_account.id, auth_role.id
from user_account
join auth_role on auth_role.code = 'customer_support'
where lower(user_account.email) = 'anmycfs2006@gmail.com'
on conflict do nothing;

delete from user_role
using user_account, auth_role
where user_role.user_id = user_account.id
  and user_role.role_id = auth_role.id
  and lower(user_account.email) = 'bincry2006@gmail.com'
  and auth_role.code <> 'operations_staff';

insert into user_role (user_id, role_id)
select user_account.id, auth_role.id
from user_account
join auth_role on auth_role.code = 'operations_staff'
where lower(user_account.email) = 'bincry2006@gmail.com'
on conflict do nothing;

update booking_contact
set email = 'quanpm2006git@gmail.com'
where lower(email) = 'customer.demo@qlvmb.local';

update notification_outbox
set recipient_email = 'quanpm2006git@gmail.com'
where lower(recipient_email) = 'customer.demo@qlvmb.local';
