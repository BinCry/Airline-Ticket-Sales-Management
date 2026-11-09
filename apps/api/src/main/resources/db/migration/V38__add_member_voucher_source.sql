-- V38 bổ sung nguồn cấp; dữ liệu cũ luôn là MANUAL, không suy từ mã voucher.
alter table member_voucher
  add column source varchar(16) not null default 'MANUAL';

alter table member_voucher
  add constraint ck_member_voucher_source
  check (source in ('MANUAL', 'BIRTHDAY'));
