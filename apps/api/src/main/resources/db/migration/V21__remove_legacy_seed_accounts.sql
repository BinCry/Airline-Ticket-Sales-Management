update user_account
set
  display_name = 'Khách hàng',
  updated_at = now()
where lower(email) = 'quanpm2006git@gmail.com'
  and lower(display_name) <> 'khách hàng';

update user_account
set
  display_name = 'Hội viên',
  updated_at = now()
where lower(email) = 'nnn045856@gmail.com'
  and lower(display_name) <> 'hội viên';

update user_account
set
  display_name = 'Nhân viên chăm sóc khách hàng',
  updated_at = now()
where lower(email) = 'anmycfs2006@gmail.com'
  and lower(display_name) <> 'nhân viên chăm sóc khách hàng';

update user_account
set
  display_name = 'Nhân viên vận hành',
  updated_at = now()
where lower(email) = 'bincry2006@gmail.com'
  and lower(display_name) <> 'nhân viên vận hành';

delete from user_account
where lower(email) in (
  'customer.demo@qlvmb.local',
  'member.demo@qlvmb.local',
  'support.demo@qlvmb.local',
  'operations.demo@qlvmb.local'
);
