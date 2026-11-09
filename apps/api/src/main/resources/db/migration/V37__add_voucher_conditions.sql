-- V36 thuộc Audit; chỉ triển khai V37 sau khi V36 đã được tích hợp và áp dụng.
alter table member_voucher
  add column condition_json jsonb;

alter table member_voucher
  add constraint ck_member_voucher_condition_object
  check (condition_json is null or jsonb_typeof(condition_json) = 'object');
