MASTER PROMPT V2 — AUTONOMOUS FULL FRONTEND UI/UX AUDIT, REFINEMENT & CONVERGENCE LOOP
VAI TRÒ
Bạn đang đóng vai đồng thời là:
Principal Product Designer
Principal UI/UX Designer
Senior Design System Architect
Senior Frontend Architect
Senior Frontend Engineer
UX Researcher
Accessibility Specialist
Responsive Design Specialist
Visual QA Engineer
Regression QA Engineer
Bạn được giao nhiệm vụ thực hiện một FULL FRONTEND UI/UX REFINEMENT cho toàn bộ hệ thống.
Website production tham chiếu:
`https://airticket.bincrydev.id.vn/`
Bạn đang làm việc trực tiếp trên source code hiện tại của project.
---
0. MISSION
Đây KHÔNG phải nhiệm vụ:
> “Tìm vài chỗ chưa đẹp rồi chỉnh CSS.”
Đây là nhiệm vụ:
> **Quét toàn bộ frontend, phát hiện mọi vấn đề UI/UX có thể quan sát được, sửa chúng có hệ thống, render lại toàn bộ giao diện, audit lại từ đầu và tiếp tục lặp cho tới khi UI đạt trạng thái ổn định, nhất quán, clean, cân đối và không còn vấn đề đáng kể có thể cải thiện an toàn.**
Bạn không được dừng sau iteration đầu tiên.
Bạn phải thực hiện vòng lặp:
```text
DISCOVER
↓
INVENTORY
↓
AUDIT
↓
PRIORITIZE
↓
IMPLEMENT
↓
BUILD
↓
RENDER
↓
VISUAL QA
↓
UX RE-AUDIT
↓
REGRESSION TEST
↓
SCORE
↓
REPEAT IF NEEDED
```
Chỉ được kết thúc khi đạt CONVERGENCE CRITERIA ở cuối prompt.
---
1. NGUYÊN TẮC TỐI CAO
Đây là:
> BEHAVIOR-PRESERVING UI/UX REFACTOR
Tức là:
```text
Business logic BEFORE = Business logic AFTER

API contract BEFORE = API contract AFTER

Permissions BEFORE = Permissions AFTER

Navigation capability BEFORE = Navigation capability AFTER

Feature set BEFORE = Feature set AFTER
```
Mục tiêu là cải thiện:
presentation;
clarity;
density;
layout;
hierarchy;
spacing;
responsiveness;
consistency;
accessibility;
perceived polish.
Không được thay đổi chức năng.
---
2. TUYỆT ĐỐI KHÔNG ĐƯỢC LÀM
Không sửa:
backend;
database;
migration;
entity;
repository;
service;
controller;
API contract;
request payload;
response contract;
authentication;
authorization;
permission;
role;
JWT;
OAuth;
OTP logic;
booking logic;
pricing;
payment;
check-in;
refund;
baggage;
seat;
voucher;
flight business rule;
validation business rule.
Không:
xóa feature;
xóa route;
xóa action;
xóa form field cần thiết;
xóa status;
đổi URL route;
đổi enum;
đổi API field;
bypass authentication;
hardcode dữ liệu;
fake API để UI đẹp hơn;
rewrite toàn app khi không cần.
Nếu phát hiện backend issue:
```text
BACKEND ISSUE — OUT OF UI/UX SCOPE
```
Ghi nhận nhưng không sửa.
---
3. KHÔNG TIN RẰNG UI HIỆN TẠI ĐÃ ĐƯỢC AUDIT ĐỦ
Cho dù project đã trải qua V1 UI refactor:
KHÔNG ĐƯỢC ASSUME V1 ĐÃ ĐÚNG.
V1 chỉ được xem là:
```text
current baseline
```
Không phải:
```text
final design
```
Phải audit lại từ đầu.
Có thể:
giữ phần V1 làm tốt;
tinh chỉnh phần V1 chưa tốt;
rollback một quyết định V1 nếu chứng minh được nó làm UX tệ hơn.
Không rewrite chỉ vì khác preference.
---
4. FIRST PRINCIPLE — SCAN BEFORE EDIT
Không được sửa code ngay.
Trước tiên phải:
hiểu architecture;
hiểu route;
hiểu role;
hiểu shared layout;
hiểu design system;
hiểu component dependency;
hiểu business interaction;
hiểu trạng thái responsive;
hiểu state loading/error/empty;
hiểu visual baseline.
Sau đó mới được chỉnh.
---
5. FULL FRONTEND RECONNAISSANCE
Quét toàn bộ frontend source.
Tìm:
pages;
layouts;
route declarations;
nested routes;
protected routes;
dynamic routes;
role guards;
permission guards;
redirects;
sidebar;
navbar;
footer;
breadcrumbs;
tabs;
shared components;
forms;
tables;
dialogs;
drawers;
cards;
badges;
charts;
search;
filters;
pagination;
notifications;
toast;
skeleton;
empty states;
error states.
Đồng thời tìm:
global CSS;
Tailwind;
theme;
CSS variables;
design token;
CSS modules;
styled components;
inline styles;
repeated utility classes.
---
6. ENUMERATE MỌI ROLE
Không được đoán role.
Đọc source code.
Tạo:
```text
ROLE INVENTORY
```
Ví dụ:
```text
PUBLIC
CUSTOMER
STAFF
ADMIN
MANAGER
...
```
Nhưng danh sách cuối cùng phải từ source thật.
---
7. ENUMERATE MỌI ROUTE
Tạo complete route map:
```text
ROLE
→ ROUTE
→ PAGE
→ LAYOUT
→ ACCESS CONDITION
→ PRIMARY TASK
```
Bao gồm cả route:
không hiện trên menu;
edit;
detail;
nested;
dynamic;
settings;
report;
history;
profile;
notification;
modal-based workflow.
Không bỏ sót chỉ vì route ít dùng.
---
8. COMPONENT INVENTORY
Tạo inventory:
```text
Shared Layout
Navigation
Card
Button
Input
Select
Textarea
Date Picker
Passenger Selector
Modal
Dialog
Drawer
Table
Pagination
Filter
Toolbar
Badge
Status
Toast
Loading
Empty
Error
Tabs
Stepper
Breadcrumb
Tooltip
Dropdown
Accordion
```
Xác định:
```text
GOOD
NEEDS POLISH
INCONSISTENT
DUPLICATE
HIGH RISK
```
---
9. KHÔNG REFACTOR COMPONENT ĐANG TỐT
Trước mỗi thay đổi hỏi:
```text
Is there an observable UX problem?
```
Nếu:
```text
NO
```
thì:
```text
KEEP
```
Không sửa để:
đổi syntax;
đổi class name;
thể hiện sở thích cá nhân;
tăng diff;
“modernize” vô nghĩa.
---
10. CREATE BASELINE
Trước khi sửa:
capture trạng thái hiện tại của tất cả page quan trọng.
Nếu browser automation khả dụng:
capture:
```text
390px
768px
1024px
1440px
```
Ít nhất cho:
public;
customer;
staff;
admin;
những flow chính.
Store screenshot hoặc visual notes theo route.
---
11. AUDIT DIMENSION #1 — PAGE COMPOSITION
Với từng page kiểm tra:
page title;
page intro;
primary task;
secondary task;
actions;
information grouping;
section order;
content hierarchy;
visual focus.
Hỏi:
```text
User mở trang này để làm gì?
```
Phần đó phải nổi bật nhất.
---
12. AUDIT DIMENSION #2 — SPACING
Quét:
page padding;
section gap;
card gap;
card padding;
form gap;
field gap;
button gap;
icon gap;
table spacing;
toolbar spacing;
sidebar item spacing;
footer spacing.
Tìm:
```text
too tight
too loose
random
inconsistent
```
---
13. SPACING RHYTHM
Nếu project chưa có spacing system rõ:
normalize về scale hợp lý:
```text
4
8
12
16
20/24
32
40/48
64
```
Không bắt buộc đúng tuyệt đối.
Mục tiêu:
> visual rhythm
Không phải:
> tất cả đều gap-4.
---
14. TÌM CARD BỊ DÍNH
Search toàn bộ layout.
Phát hiện:
```text
Card A
Card B
```
nhưng gap quá nhỏ.
Đặc biệt:
dashboard;
management;
account;
booking;
homepage;
support.
Không sửa bằng cách tăng global gap mù quáng.
Phải đánh giá từng hierarchy.
---
15. TÌM KHOẢNG TRỐNG VÔ NGHĨA
Các lỗi dạng:
```text
[Card A] [Card B]

[Card C] [      ]
```
hoặc:
```text
[ Tall Card ] [ Small ]
              [ Empty ]
```
phải audit.
Kiểm tra:
row-span;
col-span;
min-height;
height;
flex stretch;
grid auto row;
align-items;
content distribution.
Không dùng fake content để lấp chỗ trống.
---
16. AUDIT DIMENSION #3 — ALIGNMENT
Kiểm tra:
headings;
text;
cards;
icons;
form controls;
buttons;
table cells;
filters;
badges.
Tìm các lệch nhỏ:
```text
4–8px
```
nhưng khiến giao diện nhìn thiếu polish.
---
17. AUDIT DIMENSION #4 — CONTAINER WIDTH
Kiểm tra toàn app.
Không để page A:
```text
1180px
```
page B:
```text
1216px
```
page C:
```text
1328px
```
nếu không có lý do.
Phân loại container:
```text
standard
wide
reading
full-width
```
---
18. AUDIT DIMENSION #5 — INFORMATION DENSITY
Đây là priority rất cao.
Tìm những nơi có:
```text
eyebrow
heading
description
subtitle
card title
card description
helper
note
footer note
```
xuất hiện đồng thời.
Xác định text:
```text
REQUIRED
USEFUL
OPTIONAL
DUPLICATE
FILLER
```
---
19. XÓA CHỮ THỪA CÓ KIỂM SOÁT
Có thể giảm:
sentence giải thích lại heading;
marketing copy trên transactional page;
helper quá hiển nhiên;
repetitive introduction;
description không tạo thêm value.
Không xóa:
fare condition;
baggage rule;
validation;
security requirement;
business warning;
legal;
payment information;
critical status.
---
20. TRANSACTIONAL PAGE PHẢI TASK-FOCUSED
Các page như:
```text
Search
Booking
Manage Booking
Check-in
Flight Status
Login
Register
Forgot Password
```
không được biến thành landing page marketing.
Ưu tiên:
```text
Task
↓
Relevant information
↓
Supporting information
```
---
21. AUDIT DIMENSION #6 — VISUAL HIERARCHY
Từng viewport phải có:
```text
1 primary focal point
limited secondary focal points
clear tertiary content
```
Không để mọi card:
shadow;
badge;
title lớn;
button màu mạnh;
icon màu.
---
22. AUDIT DIMENSION #7 — TYPOGRAPHY
Quét:
H1;
H2;
H3;
H4;
body;
label;
caption;
helper;
table;
badge.
Tìm:
quá nhiều font size;
quá nhiều weight;
line-height không hợp lý;
heading oversized;
body quá dài;
text muted quá nhạt.
---
23. LINE LENGTH
Text paragraph dài không nên trải toàn container.
Content reading-width nên hợp lý.
Transactional page không cần paragraph dài nếu checklist ngắn tốt hơn.
---
24. AUDIT DIMENSION #8 — COLOR
Quét color toàn app.
Tìm:
hardcoded colors;
duplicate hex;
random gray;
inconsistent primary;
unnecessary decorative colors;
contrast yếu;
dashboard quá nhiều màu.
---
25. COLOR PRINCIPLE
Không thay palette chỉ vì thích.
Ưu tiên:
```text
brand primary
neutral scale
semantic colors
accent
```
Giữ tinh thần hàng không/Vietnam Airlines.
---
26. COLOR HIERARCHY
Mỗi page không nên có quá nhiều CTA màu primary.
Phải rõ:
```text
Primary
Secondary
Tertiary
Destructive
```
---
27. COLOR ACCESSIBILITY
Kiểm tra contrast.
Không dùng muted text quá nhạt.
Không dùng màu làm cách duy nhất thể hiện:
status;
error;
success;
warning.
---
28. AUDIT DIMENSION #9 — BUTTON SYSTEM
Quét tất cả button.
Tìm:
height khác nhau;
padding khác nhau;
radius khác nhau;
icon alignment;
inconsistent font weight;
inconsistent hover;
inconsistent disabled.
---
29. BUTTON PRIORITY
Không để page có:
```text
5 primary buttons
```
Mỗi flow phải hiểu được:
```text
main action
secondary action
escape/cancel
```
---
30. AUDIT DIMENSION #10 — FORMS
Kiểm tra:
grouping;
field width;
label;
required;
helper;
error;
placeholder;
focus;
disabled;
submit.
Không để:
```text
label
input
helper
long paragraph
```
lặp trên từng field nếu không cần.
---
31. FORM DENSITY
Desktop:
có thể group những field liên quan.
Mobile:
collapse hợp lý về 1 column.
Không group chỉ để giảm chiều cao nếu làm user khó đọc.
---
32. AUDIT DIMENSION #11 — TABLE
Quét mọi table.
Kiểm tra:
row height;
header;
column alignment;
numeric;
dates;
status;
action;
pagination;
overflow.
---
33. TABLE ACTION
Không để 4–5 button lớn trong mỗi row.
Có thể:
```text
Primary action
+
More menu
```
nếu không làm giảm discoverability.
Không thay permission.
---
34. TABLE MOBILE
Không ép table 10 column vào 390px.
Tùy context:
horizontal scrolling;
priority columns;
mobile cards;
expandable row.
Chọn phương án ít ảnh hưởng logic nhất.
---
35. AUDIT DIMENSION #12 — FILTER
Kiểm tra:
search;
status;
date;
sort;
reset;
advanced filter.
Không chia mỗi filter thành một card.
Filter phải compact.
---
36. AUDIT DIMENSION #13 — MODAL
Kiểm tra:
width;
scroll;
header;
content;
footer;
CTA;
destructive action;
close;
ESC;
mobile.
---
37. AUDIT DIMENSION #14 — NAVIGATION
Header/sidebar phải:
dễ scan;
active state rõ;
icon consistent;
spacing consistent;
permission preserved.
Không đổi navigation structure lớn nếu không có UX reason.
---
38. SIDEBAR
Đặc biệt kiểm tra:
sidebar quá rộng;
menu quá nhiều khoảng trống;
icon lệch;
submenu khó hiểu;
collapsed state;
mobile drawer.
---
39. AUDIT DIMENSION #15 — HOMEPAGE
Homepage phải ưu tiên:
```text
flight search
primary utilities
important service
```
Không để hàng loạt content section có visual weight bằng nhau.
---
40. HOMEPAGE CONTENT REDUCTION
Audit:
repeated support;
repeated account promotion;
repeated travel preparation;
repeated campaign;
repeated description.
Có thể:
```text
compact
merge
de-emphasize
```
Không xóa feature bừa.
---
41. SEARCH PAGE
Flow phải scan được:
```text
Route
Date
Passengers
Filters
Flights
Fare
Continue
```
Không để popular route/helper content chen ngang primary flow.
---
42. BOOKING PAGE
Giữ mental model rõ:
```text
Flight
Passenger
Seat/Baggage
Review
Payment
```
theo flow thật trong source.
Nếu có stepper:
không để stepper chiếm quá nhiều height.
---
43. REGISTER
Primary content:
```text
Create account
```
Không để benefit marketing cạnh tranh với form.
---
44. FORGOT PASSWORD
Flow:
```text
Email
OTP
New password
Done
```
phải là focus.
---
45. SUPPORT
FAQ phải dễ scan.
Category filter responsive.
Không show wall-of-text.
---
46. ADMIN
Admin phải ưu tiên:
```text
information density
scanability
task efficiency
```
hơn decorative design.
Không làm admin “landing-page-like”.
---
47. ADMIN DASHBOARD
Metric card:
compact;
readable;
consistent;
không mỗi metric một rainbow color.
---
48. ADMIN CRUD
Page chuẩn nên hướng tới:
```text
Title                         Primary action

Search + Filters

Table / Content

Pagination
```
Không phải bắt buộc y hệt, nhưng hierarchy tương tự.
---
49. CUSTOMER DASHBOARD
Không để dashboard chứa quá nhiều:
```text
welcome message
marketing paragraph
multiple promotional cards
```
trước các task thực sự.
---
50. AUDIT DIMENSION #16 — FOOTER
Audit footer.
Footer phải:
compact;
clean;
responsive;
useful.
Giữ phần:
```text
Kênh truyền thông Vietnam Airlines
```
với social official đã verify.
Không để social icons làm footer rối.
---
51. AUDIT DIMENSION #17 — ICONOGRAPHY
Quét:
icon library;
sizes;
stroke;
filled/outline;
alignment.
Không mix 3 style icon nếu không cần.
---
52. AUDIT DIMENSION #18 — BORDER & SHADOW
Tìm:
excessive shadow;
excessive border;
card-within-card-within-card;
double elevation.
Ưu tiên:
```text
spacing
surface
hierarchy
```
trước shadow.
---
53. CARD NESTING
Tránh:
```text
Card
 └ Card
    └ Card
```
nếu grouping có thể giải quyết bằng section/divider.
---
54. AUDIT DIMENSION #19 — RADIUS
Không để:
```text
6px
8px
10px
13px
16px
20px
24px
```
random.
Normalize nếu cần.
---
55. AUDIT DIMENSION #20 — LOADING
Loading phải:
không layout shift mạnh;
không chiếm viewport quá mức;
consistent.
Reuse skeleton nếu có.
---
56. EMPTY STATE
Empty state phải trả lời:
```text
What happened?
What can I do?
```
Không cần marketing essay.
---
57. ERROR STATE
Error:
rõ;
actionable;
không aggressive;
không che mất form.
---
58. SUCCESS STATE
Success confirmation phải:
rõ;
concise;
đưa user tới next action.
---
59. AUDIT DIMENSION #21 — MICRO INTERACTION
Check:
hover;
active;
focus;
loading;
disabled;
expanded;
selected.
Animation phải subtle.
Không dùng animation để che UX kém.
---
60. ANIMATION PERFORMANCE
Không thêm animation:
nặng;
liên tục;
parallax vô nghĩa;
blur lớn;
GPU-heavy effect
nếu không tạo UX value.
---
61. AUDIT DIMENSION #22 — RESPONSIVE
Bắt buộc:
```text
320
375
390
768
1024
1280
1440+
```
---
62. MOBILE-FIRST PROBLEMS
Tìm:
overflow;
clipped content;
tiny button;
crowded field;
table broken;
chip overflow;
modal overflow;
sidebar issue;
sticky element overlap.
---
63. TABLET
Không xem tablet chỉ là desktop nhỏ.
Audit riêng.
---
64. LARGE SCREEN
Ở 1440+:
không được stretch content vô hạn.
Không để:
```text
giữa màn hình trống quá nhiều
```
do container nhỏ không hợp lý.
---
65. AUDIT DIMENSION #23 — ACCESSIBILITY
Kiểm tra:
keyboard;
tab order;
focus-visible;
labels;
aria;
icon button names;
modal focus;
contrast;
touch target.
---
66. AUDIT DIMENSION #24 — UX CONSISTENCY ACROSS ROLES
Kiểm tra:
```text
PUBLIC
vs CUSTOMER
vs STAFF
vs ADMIN
```
Phải cảm giác cùng một product.
Không cần giống y hệt.
Nhưng phải cùng:
typography;
token;
spacing philosophy;
controls;
status;
interactions.
---
67. AUDIT DIMENSION #25 — CONTENT CONSISTENCY
Kiểm tra:
cùng một action nhưng nhiều wording;
inconsistent capitalization;
inconsistent Vietnamese terminology;
duplicate descriptions.
Không thay business meaning.
---
68. AUDIT DIMENSION #26 — VISUAL NOISE
Tìm:
too many badges;
too many borders;
too many icons;
too many colors;
too many cards;
too many headings;
too many pills;
too many helper texts.
---
69. AUDIT DIMENSION #27 — PAGE HEIGHT
Không đánh giá trang dài chỉ dựa vào số pixel.
Nhưng tìm section:
```text
low information value
+
high vertical space
```
và compact nếu hợp lý.
---
70. AUDIT DIMENSION #28 — DUPLICATED UI
Tìm component gần giống nhưng được copy ở nhiều page.
Nếu consolidate an toàn:
reuse shared component.
Không refactor shared component nếu nguy cơ lớn hơn UX benefit.
---
71. AUDIT DIMENSION #29 — VISUAL POLISH
Cuối mỗi iteration kiểm tra những chi tiết nhỏ:
1px border;
icon centering;
baseline;
padding;
truncation;
line wrap;
badge height;
separator;
button alignment.
Đây là bước polish, không phải bước đầu.
---
72. PRIORITY SYSTEM
Mọi issue phải được gắn:
```text
P0
P1
P2
P3
```
P0:
broken;
inaccessible;
content hidden;
overflow nghiêm trọng.
P1:
UX confusion;
hierarchy kém;
responsive kém.
P2:
inconsistency;
density;
spacing;
layout.
P3:
polish;
minor alignment;
aesthetic refinement.
---
73. UX IMPACT SCORE
Mỗi issue chấm:
```text
Severity: 1–5
Frequency: 1–5
Visual impact: 1–5
Functional risk: 1–5
```
Ưu tiên issue:
```text
high UX impact
+
low functional risk
```
trước.
---
74. TẠO FILE AUDIT
Tạo:
`UI_UX_AUDIT_V2.md`
Có:
```text
Route
Role
Breakpoint
Component
Issue
Severity
Cause
Keep
Improve
Risk
Proposed fix
Iteration found
Iteration fixed
Status
```
---
75. TẠO SCORECARD
Tạo:
`UI_UX_SCORECARD.md`
Mỗi nhóm chấm /10:
```text
Layout
Spacing
Alignment
Typography
Color
Hierarchy
Density
Forms
Tables
Navigation
Responsive
Accessibility
Consistency
Polish
```
---
76. BASELINE SCORE
Trước khi sửa:
chấm baseline.
Không inflate score.
Nếu chưa kiểm tra:
ghi:
```text
NOT VERIFIED
```
không tự chấm 9/10.
---
77. ITERATION LOOP — BẮT BUỘC
Sau initial audit:
bắt đầu:
```text
ITERATION 1
```
---
78. ITERATION 1 — STRUCTURAL
Ưu tiên:
broken responsive;
bad grid;
spacing;
page container;
hierarchy;
navigation;
major density.
Không dành quá nhiều thời gian polish icon ở iteration 1.
---
79. ITERATION 1 VALIDATION
Sau sửa:
```text
lint
test
build
```
sau đó render lại.
Không chuyển iteration nếu build fail.
---
80. RE-AUDIT SAU ITERATION
Quan trọng:
Không chỉ check xem issue cũ đã hết chưa.
Audit lại toàn viewport để tìm:
issue mới;
side effect;
spacing mới lệch;
visual imbalance do fix trước tạo ra.
---
81. ITERATION 2 — CONSISTENCY
Ưu tiên:
typography;
buttons;
cards;
tables;
forms;
filters;
badges;
colors.
---
82. ITERATION 3 — DENSITY & HIERARCHY
Ưu tiên:
redundant copy;
visual noise;
over-cardization;
action hierarchy;
whitespace balance.
---
83. ITERATION 4 — RESPONSIVE & ACCESSIBILITY
Audit lại:
```text
320
390
768
1024
1440
```
và keyboard/focus.
---
84. ITERATION 5 — POLISH
Chỉ khi structural issues đã ổn mới làm:
subtle shadow;
icon alignment;
radius;
transition;
small typography refinement.
---
85. KHÔNG ĐƯỢC DỪNG CỨNG Ở ITERATION 5
Iteration 1–5 chỉ là guideline.
Nếu sau iteration 5 vẫn còn:
```text
P0
P1
meaningful P2
```
thì tiếp tục:
```text
ITERATION 6
ITERATION 7
...
```
---
86. NHƯNG KHÔNG LOOP VÔ HẠN
Maximum recommended:
```text
8 full iterations
```
Nếu iteration 6–8 chỉ còn thay đổi preference-level:
STOP.
Không được phá UI tốt chỉ để tăng iteration.
---
87. CONVERGENCE PRINCIPLE
Một iteration được xem là tạo value nếu:
```text
UX score improves
AND
no meaningful regression
```
Nếu score không tăng hoặc giảm:
xem lại changes.
Rollback thay đổi không tạo giá trị.
---
88. ANTI-THRASHING RULE
Không:
```text
Iteration 2 đổi card radius 12 → 16

Iteration 3 đổi 16 → 10

Iteration 4 đổi 10 → 14
```
chỉ vì cảm giác.
Sau khi token đã được quyết định:
chỉ đổi khi có evidence.
---
89. SCREEN-BY-SCREEN CHECK
Sau mỗi major iteration:
đi qua từng route.
Không chỉ sample vài route.
Status:
```text
PASS
NEEDS FIX
NOT ACCESSIBLE
NOT TESTABLE
```
---
90. ROLE-BY-ROLE CHECK
Tương tự:
```text
Public: PASS/FAIL
Customer: PASS/FAIL
Staff: PASS/FAIL
Admin: PASS/FAIL
...
```
Một role còn UI tệ:
task chưa hoàn thành.
---
91. FUNCTIONAL REGRESSION
Sau mỗi iteration test:
links;
buttons;
forms;
modal;
API action;
search;
filter;
pagination;
route;
auth;
permission.
---
92. EVENT HANDLER PROTECTION
Đặc biệt bảo toàn:
```text
onClick
onChange
onSubmit
onBlur
onKeyDown
handlers
hooks
queries
mutations
state
refs
```
---
93. API PROTECTION
Before/after phải:
```text
same endpoint
same HTTP method
same payload
same parameters
same trigger
same auth
same response handling
```
---
94. GIT DIFF CHECK
Sau mỗi iteration:
review diff.
Tìm accidental changes.
Không để UI task lan sang backend.
---
95. SCREENSHOT COMPARISON
Nếu browser tooling hỗ trợ:
so sánh screenshot trước/sau.
Không đánh giá:
> “code trông clean hơn”
mà phải đánh giá:
> “render trông tốt hơn”.
---
96. VISUAL QA QUESTIONS
Với từng screen hỏi:
```text
Có phần nào dính nhau?

Có phần nào quá xa?

Có gì lệch?

Có khoảng trắng vô nghĩa?

Có text thừa?

Có quá nhiều card?

Có quá nhiều border?

Có quá nhiều màu?

CTA chính có rõ?

Có component nào quá to?

Có component nào quá nhỏ?

Có hierarchy rõ?

Có overflow?

Có wrapping xấu?

Có gì nhìn amateur?

Có gì nhìn inconsistent?
```
Nếu YES:
ghi issue.
---
97. 5-SECOND TEST
Với từng page chính:
trong 5 giây phải trả lời được:
```text
Tôi đang ở đâu?

Trang này để làm gì?

Action chính ở đâu?

Thông tin nào quan trọng?
```
Nếu không:
hierarchy chưa đạt.
---
98. SQUINT TEST
Quan sát page ở mức blur/squint mentally.
Nếu mọi block đều có visual weight ngang nhau:
FAIL.
Phải có hierarchy.
---
99. DENSITY TEST
Nếu bỏ text phụ mà user vẫn hiểu task:
text đó là candidate để remove/compact.
---
100. WHITESPACE TEST
Whitespace phải:
```text
intentional
```
không phải:
```text
accidental
```
---
101. CONSISTENCY TEST
Cùng component semantics phải tương đồng toàn app.
Ví dụ cùng:
```text
status badge
```
không được mỗi page một kiểu.
---
102. ALIGNMENT TEST
Kiểm tra vertical edges của:
heading;
card;
form;
toolbar;
table.
Các edge chính phải tạo visual grid.
---
103. COLOR TEST
Tạm bỏ màu trong tưởng tượng.
Nếu hierarchy biến mất hoàn toàn:
layout đang phụ thuộc màu quá nhiều.
---
104. MOBILE TAP TEST
Action quan trọng phải dễ tap.
Không để icon button quá nhỏ.
---
105. LONG CONTENT TEST
Test:
long name;
long airport;
long email;
long booking code;
long status;
long title.
Không để phá layout.
---
106. EMPTY DATA TEST
Test page khi:
```text
0 result
```
Layout vẫn phải đẹp.
---
107. MANY DATA TEST
Test:
```text
large table
many cards
long pagination
```
Layout vẫn ổn.
---
108. LOADING TEST
Loading không làm page collapse/expand mạnh.
---
109. ERROR TEST
Error không phá layout.
---
110. PERMISSION TEST
Role không có permission:
không được vô tình thấy action sau UI refactor.
---
111. SCROLL TEST
Kiểm tra:
nested scroll;
body scroll lock;
sticky header;
sticky table;
modal scroll.
Không tạo double-scroll xấu.
---
112. FIX ROOT CAUSE
Nếu 20 page cùng có spacing sai:
không patch 20 page nếu root cause là shared component.
Sửa root cause khi an toàn.
---
113. NHƯNG KHÔNG OVER-ABSTRACT
Không tạo:
```text
UniversalEverythingCard
UniversalPageBuilder
UniversalLayoutConfig
```
chỉ để giảm code.
UI refactor không phải architecture rewrite.
---
114. DELETE UNUSED VISUAL CSS
Nếu chắc chắn style không còn dùng:
cleanup.
Nhưng không xóa class dựa trên phỏng đoán.
---
115. KEEP DESIGN LANGUAGE
Mục tiêu không phải biến AirTicket thành sản phẩm mới.
User cũ vẫn phải nhận ra.
---
116. EXPECTED STYLE
Sau cùng UI phải tạo cảm giác:
```text
clean
airy
balanced
premium
calm
trustworthy
modern
professional
cohesive
easy to scan
fast to use
```
---
117. KHÔNG LẠM DỤNG “PREMIUM”
Không:
gradient everywhere;
gold everywhere;
shadow everywhere;
blur everywhere;
animation everywhere.
Premium đến từ:
```text
proportion
spacing
hierarchy
typography
consistency
```
---
118. STOP CONDITIONS
Chỉ được kết thúc khi:
P0
```text
0 unresolved
```
P1
```text
0 unresolved
```
trừ vấn đề ngoài frontend control.
P2
Không còn issue ảnh hưởng đáng kể tới:
layout;
spacing;
consistency;
responsive;
hierarchy.
P2 nhỏ có thể ghi nhận.
P3
Có thể còn minor aesthetic preference.
---
119. SCORE TARGET
Score mục tiêu:
```text
Layout            >= 9
Spacing           >= 9
Alignment         >= 9
Typography        >= 8.5
Color             >= 8.5
Hierarchy         >= 9
Density           >= 9
Forms             >= 8.5
Tables            >= 8.5
Navigation        >= 9
Responsive        >= 9
Accessibility     >= 8.5
Consistency       >= 9
Polish            >= 8.5
```
Không fake score.
Score phải dựa trên inspection.
---
120. NO REGRESSION CONDITION
Không được declare DONE nếu:
```text
build failing
test failing do refactor
route broken
button broken
API action broken
responsive regression
permission changed
```
---
121. DIMINISHING RETURNS CONDITION
Có thể stop nếu:
3 iteration liên tiếp:
```text
không còn P0
không còn P1
không phát hiện meaningful P2 mới
score improvement < 0.2
```
và thay đổi còn lại chỉ mang tính preference.
---
122. FINAL FULL AUDIT
Trước khi DONE:
audit lại toàn app một lần cuối từ đầu, không chỉ dựa trên issue list.
Tức là:
```text
re-scan routes
re-render
re-check responsive
re-check roles
re-check shared components
```
---
123. FINAL BUILD
Chạy:
```bash
lint
test
build
```
hoặc command tương ứng project.
---
124. FINAL BACKEND CHECK
Git diff phải xác nhận:
```text
Backend files changed: NONE
API contracts changed: NONE
Permissions changed: NONE
Business logic changed: NONE
```
Nếu có:
investigate trước khi DONE.
---
125. FINAL REPORT
Tạo:
`UI_UX_FINAL_REPORT.md`
Format:
```text
# UI/UX FINAL REPORT

## Iterations
Total iterations:

## Routes audited
...

## Roles audited
...

## Baseline score
...

## Final score
...

## P0 fixed
...

## P1 fixed
...

## P2 fixed
...

## Components preserved
...

## Components improved
...

## Layout improvements
...

## Spacing improvements
...

## Typography improvements
...

## Color improvements
...

## Density improvements
...

## Responsive improvements
...

## Accessibility improvements
...

## Footer improvements
...

## Social media links verified
...

## Functional regression
NONE

## Backend changes
NONE

## API changes
NONE

## Permission changes
NONE

## Tests executed
...

## Build
PASS

## Remaining minor issues
...
```
---
126. CHANGE LOG PER ITERATION
Tạo:
`UI_UX_ITERATIONS.md`
Ví dụ:
```text
ITERATION 1

Problems found:
...

Changes:
...

Regression:
...

Score:
...


ITERATION 2

Problems found:
...

Changes:
...

Regression:
...

Score:
...
```
---
127. KHÔNG CHE GIẤU ISSUE
Nếu có issue không thể sửa an toàn:
ghi:
```text
UNRESOLVED
Reason:
Risk:
Recommendation:
```
Không tự claim DONE.
---
128. AUTONOMOUS OPERATION
Không hỏi tôi:
```text
Bạn thích radius 12 hay 16?
Bạn thích gap 24 hay 32?
Bạn thích button kiểu nào?
```
Hãy tự quyết định dựa trên:
existing design system;
UX convention;
consistency;
accessibility;
visual balance;
brand direction.
---
129. CHỈ DỪNG HỎI KHI
Chỉ dừng nếu quyết định cần:
thay business logic;
thay API;
thay permission;
thay backend;
xóa chức năng quan trọng;
thay thương hiệu một cách material.
Những vấn đề thuần UI:
tự xử lý.
---
130. KHÔNG CHỈ FIX ISSUE TÔI ĐÃ NÊU
Các issue chủ dự án từng nêu như:
card quá sát;
khoảng trắng;
text nhiều;
màu sắc;
footer;
hierarchy;
chỉ là starting point.
Bạn phải chủ động tìm mọi issue khác.
---
131. DEFINITION OF “QUÉT TOÀN BỘ”
Không được claim:
```text
Full audit complete
```
nếu chưa kiểm tra:
```text
EVERY ROUTE
EVERY ROLE
EVERY LAYOUT
EVERY MAJOR COMPONENT
EVERY IMPORTANT STATE
EVERY TARGET BREAKPOINT
```
---
132. DEFINITION OF “UI ỔN”
UI ổn không có nghĩa:
> đẹp theo sở thích.
UI ổn nghĩa là:
```text
no broken layout
clear hierarchy
consistent spacing
balanced composition
controlled density
clean typography
consistent color
usable forms
scannable tables
predictable navigation
responsive
accessible
visually coherent
functional
```
---
133. FINAL COMMAND
Bắt đầu ngay bây giờ.
Không chỉnh code ngay.
Thực hiện theo thứ tự:
```text
1. Re-scan frontend architecture

2. Enumerate roles

3. Enumerate every route

4. Enumerate shared components

5. Build current visual baseline

6. Audit every route

7. Create UI_UX_AUDIT_V2.md

8. Create baseline UI_UX_SCORECARD.md

9. Prioritize problems

10. Perform Iteration 1

11. Build/test/render

12. Re-audit

13. Perform Iteration 2

14. Build/test/render

15. Re-audit

16. Continue the loop

17. Stop only when convergence criteria are satisfied

18. Perform final full-system audit

19. Run final regression

20. Produce UI_UX_FINAL_REPORT.md
```
Không được kết thúc sau khi chỉ chỉnh những lỗi hiển nhiên.
Không được kết thúc sau iteration đầu.
Không được kết luận dựa trên code inspection בלבד.
Phải đánh giá output đã render.
Không được sửa những phần đang hoạt động và nhìn tốt chỉ để tạo thêm diff.
Nguyên tắc cuối cùng:
> **Preserve what works.**
>
> **Fix what does not.**
>
> **Re-check everything after every meaningful change.**
>
> **Repeat until further changes provide no meaningful UX improvement.**
>
> **Stability > aesthetics.**
>
> **Rendered quality > code prettiness.**