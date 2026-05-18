alter table booking
  add column if not exists discount_amount bigint not null default 0;

alter table booking
  add column if not exists applied_voucher_code varchar(40);

update booking
set discount_amount = 0
where discount_amount is null;
