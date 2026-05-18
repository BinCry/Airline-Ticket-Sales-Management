update user_account
set
  display_name = 'Khách hàng',
  updated_at = now()
where lower(email) = 'quanpm2006git@gmail.com';

update user_account
set
  display_name = 'Hội viên',
  updated_at = now()
where lower(email) = 'nnn045856@gmail.com';

update user_account
set
  display_name = 'Nhân viên chăm sóc khách hàng',
  updated_at = now()
where lower(email) = 'anmycfs2006@gmail.com';

update user_account
set
  display_name = 'Nhân viên vận hành',
  updated_at = now()
where lower(email) = 'bincry2006@gmail.com';
