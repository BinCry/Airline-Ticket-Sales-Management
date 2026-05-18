create table cms_homepage_entry (
  id bigserial primary key,
  section varchar(16) not null,
  title varchar(160) not null,
  subtitle varchar(255),
  cta varchar(160),
  category varchar(120),
  summary varchar(500),
  locale varchar(10) not null,
  sort_order integer not null,
  published boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint ck_cms_homepage_entry_section check (section in ('banner', 'article', 'faq'))
);

create index idx_cms_homepage_entry_section_sort
  on cms_homepage_entry (section, sort_order, id);

insert into cms_homepage_entry (
  section,
  title,
  subtitle,
  cta,
  category,
  summary,
  locale,
  sort_order,
  published,
  created_at,
  updated_at
)
values
  (
    'banner',
    'Đặt vé nội địa linh hoạt và theo dõi hành trình trong cùng một trải nghiệm',
    'Nội dung công khai đã sẵn sàng cho website và trung tâm hỗ trợ',
    'Đặt vé ngay',
    null,
    null,
    'vi',
    1,
    true,
    now(),
    now()
  ),
  (
    'banner',
    'Quản lý đặt chỗ, thanh toán và làm thủ tục trước ngày bay',
    'Các hành động chính được gom rõ ràng để hành khách xử lý nhanh hơn',
    'Quản lý đặt chỗ',
    null,
    null,
    'vi',
    2,
    true,
    now(),
    now()
  ),
  (
    'article',
    'Chuẩn bị hành lý và giấy tờ trước ngày khởi hành',
    null,
    null,
    'Cẩm nang',
    'Tập trung vào những thông tin hành khách cần xem ngay trước khi ra sân bay nội địa.',
    'vi',
    1,
    true,
    now(),
    now()
  ),
  (
    'article',
    'Theo dõi trạng thái thanh toán, email vé và các bước sau khi đặt chỗ',
    null,
    null,
    'Tự phục vụ',
    'Nội dung này dùng cho luồng quản lý đặt chỗ, hỗ trợ khách và các kênh nhắc việc trước giờ bay.',
    'vi',
    2,
    true,
    now(),
    now()
  ),
  (
    'faq',
    'Tôi có thể đổi chuyến sau khi đã thanh toán không?',
    null,
    null,
    'FAQ',
    'Có. Hệ thống sẽ kiểm tra điều kiện vé, chênh lệch giá và thời hạn xử lý trước khi xác nhận.',
    'vi',
    1,
    true,
    now(),
    now()
  ),
  (
    'faq',
    'Nếu email vé gửi lỗi thì tôi cần làm gì?',
    null,
    null,
    'FAQ',
    'Bộ phận hỗ trợ có thể gửi lại email vé từ phân hệ support sau khi kiểm tra trạng thái notification outbox.',
    'vi',
    2,
    true,
    now(),
    now()
  );
