alter table cms_homepage_entry
  add column archived boolean not null default false;

create index idx_cms_homepage_entry_active_section
  on cms_homepage_entry (archived, published, section, sort_order, id);

alter table flight
  add column gate varchar(12),
  add column operations_note varchar(255),
  add column sales_open boolean not null default true;
