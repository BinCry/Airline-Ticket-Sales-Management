# Quy tắc làm việc với trợ lý lập trình AI

## Mục tiêu
Giữ thay đổi nhỏ, đúng phạm vi và an toàn cho dự án.

## Quy trình bắt buộc
1. Luôn theo thứ tự: hiểu bối cảnh -> lập kế hoạch -> xin hoặc đợi xác nhận nếu tác vụ có rủi ro cao -> mới sửa mã.
2. Chỉ sửa trong phạm vi tệp cần thiết hoặc các tệp phát sinh lỗi liên đới.
3. Không tự ý đổi hợp đồng API, lược đồ dữ liệu, thư viện phụ thuộc, cấu hình môi trường, luồng xác thực, nghiệp vụ thanh toán, di trú dữ liệu hoặc CI/CD khi chưa được cho phép rõ ràng.
4. Mọi mã sinh ra chỉ là bản nháp cho tới khi có kiểm thử, kiểm tra chuẩn mã, kiểm tra kiểu dữ liệu và rà soát thủ công.
5. Luôn ưu tiên bản vá nhỏ nhất giải quyết đúng vấn đề.
6. Không tái cấu trúc ngoài phạm vi yêu cầu.
7. Sau mỗi thay đổi phải báo cáo: đã sửa gì, vì sao, test nào đã chạy, rủi ro nào còn lại.
8. Nếu thiếu thông tin, phải nêu giả định, không tự bịa.
9. Nếu có nhiều phương án, phải nêu rõ phần đánh đổi trước khi triển khai.

## Quy ước ngôn ngữ và comment mã
1. Không dùng tiếng Anh trong `README.md`.
2. Không dùng tiếng Anh trong comment mã.
3. Comment mã phải bằng tiếng Việt, ngắn gọn, trực quan.
4. Ở phần thay thế/chỉnh sửa, comment phải nêu rõ chỗ nào thay thế cái gì (nếu có).

## Quy ước commit GitHub (bắt buộc)
Áp dụng cho cả AI agent và lập trình viên trong dự án.

1. Mọi commit bắt buộc theo đúng mẫu: `Type(scope):description`.
2. `Type` phải thuộc danh sách cho phép bên dưới và dùng chữ thường.
3. `scope` là phạm vi thay đổi chính, không được để trống.
4. `description` bắt buộc viết bằng tiếng Việt có dấu, ngắn gọn, nêu đúng thay đổi chính.
5. Không dùng thông điệp commit mơ hồ hoặc sai mẫu (ví dụ: `update`, `fix bug`, `abc`).
6. Mỗi commit chỉ nên chứa một mục tiêu thay đổi chính để dễ truy vết.

### Các Type hay dùng
- `feat`: Một tính năng mới.
- `fix`: Sửa lỗi.
- `docs`: Cập nhật tài liệu.
- `style`: Cải thiện định dạng, kiểu dáng, chuẩn mã nguồn.
- `refactor`: Sửa đổi mã nguồn không ảnh hưởng tính năng.
- `perf`: Cải thiện hiệu năng.
- `chore`: Cập nhật công cụ, thư viện hỗ trợ.
- `test`: Thêm hoặc cập nhật kiểm thử.
- `revert`: Quay lại một số thay đổi trước đó.

### Hướng dẫn viết thông điệp commit
- Chỉ dùng một `Type` trong danh sách cho phép.
- Luôn có `scope` rõ ràng theo phạm vi thay đổi chính (ví dụ: `api`, `ui`, `dat-ve`, `thanh-toan`).
- Phần `description` phải là tiếng Việt có dấu, đi thẳng vào thay đổi chính, không mơ hồ.
- Không chèn nhiều thay đổi không liên quan trong một commit.

### Ví dụ đúng
- `feat(dat-ve):thêm bộ lọc chuyến bay theo hạng ghế`
- `fix(thanh-toan):sửa lỗi nhân đôi giao dịch khi tải lại trang`
- `docs(api):bổ sung hướng dẫn xác thực bằng jwt`
- `refactor(booking-service):tách hàm tính giá vé theo từng bước`
- `test(dat-ve):thêm kiểm thử đơn vị cho hàm tính tổng tiền`

### Quy định trước khi đẩy mã
- AI agent và lập trình viên phải tự kiểm tra thông điệp commit đúng mẫu trước khi `git commit`.
- Nếu sai mẫu hoặc phần `description` không phải tiếng Việt có dấu, phải sửa lại trước khi đẩy lên GitHub.

## Quy tắc teamwork GitHub cho nhóm 4 (bắt buộc)
Áp dụng cho toàn bộ thành viên trong nhóm.

### Mô hình nhánh
- `main`: Nhánh ổn định, cấm đẩy trực tiếp.
- `deploy`: Nhánh triển khai dành riêng cho `Vercel`, được đồng bộ tự động từ `main`, không dùng để phát triển tính năng và không được xóa.
- `feat/<pham-vi>-<mo-ta-ngan>`: Nhánh làm tính năng mới.
- `fix/<pham-vi>-<mo-ta-ngan>`: Nhánh sửa lỗi.
- `docs/<pham-vi>-<mo-ta-ngan>`, `test/<pham-vi>-<mo-ta-ngan>`, `refactor/<pham-vi>-<mo-ta-ngan>`, `chore/<pham-vi>-<mo-ta-ngan>`: Nhánh cho thay đổi kỹ thuật tương ứng.
- `hotfix/<pham-vi>-<mo-ta-ngan>`: Nhánh xử lý lỗi khẩn cấp phát sinh trên `main`.

### Quy trình làm việc theo nhánh
1. Luôn tạo nhánh mới từ `main`.
2. Mỗi nhánh chỉ xử lý một mục tiêu chính.
3. Mọi commit trong nhánh phải theo mẫu `Type(scope):description` và phần `description` bằng tiếng Việt có dấu.
4. Đẩy nhánh lên sớm và mở yêu cầu hợp nhất (`pull request`) ngay khi có bản chạy được.
5. Trước khi xin duyệt, phải cập nhật thay đổi mới nhất từ `main` và xử lý xung đột.
6. Không cập nhật thủ công vào `deploy` nếu không có yêu cầu bảo trì rõ ràng; nhánh này chỉ nhận đồng bộ tự động từ `main`.

### Quy tắc duyệt và hợp nhất mã
1. Không hợp nhất trực tiếp vào `main`; chỉ hợp nhất qua `pull request`.
2. Bắt buộc có ít nhất 1 người duyệt; phần nhạy cảm (xác thực, thanh toán, di trú dữ liệu) cần 2 người duyệt.
3. Bắt buộc qua toàn bộ kiểm tra tự động: biên dịch, kiểm thử, kiểm tra chuẩn mã.
4. Bắt buộc xử lý hết toàn bộ trao đổi trước khi hợp nhất.
5. Ưu tiên kiểu hợp nhất `squash and merge` để lịch sử thay đổi gọn và rõ.
6. Tiêu đề `pull request` hoặc thông điệp hợp nhất phải theo mẫu `Type(scope):description`, phần `description` bằng tiếng Việt có dấu.
7. Sau khi hợp nhất phải xóa nhánh để tránh tồn đọng nhánh cũ.
8. Riêng bạn (người có quyền hạn cao nhất) có quyền quyết định cuối cùng và được phép tự duyệt, tự hợp nhất khi cần.
9. Riêng nhánh `deploy` là ngoại lệ, không được xóa sau khi hợp nhất vì đây là nhánh triển khai cố định cho `Vercel`.

### Thiết lập bảo vệ nhánh `main` trên GitHub
- Bật yêu cầu mở `pull request` trước khi hợp nhất.
- Bật yêu cầu số lượt duyệt tối thiểu.
- Bật yêu cầu các kiểm tra tự động phải thành công trước khi hợp nhất.
- Bật yêu cầu xử lý xong mọi trao đổi trước khi hợp nhất.
- Tắt quyền đẩy thẳng và tắt `force push` vào `main`, trừ tài khoản của bạn trong trường hợp cần xử lý khẩn.
- Bật hủy duyệt cũ khi có commit mới được đẩy lên.

### Quy ước phối hợp trong nhóm 4
- Mỗi `pull request` có 1 người duyệt chính và luân phiên theo tuần.
- Thành viên khác không tự duyệt và tự hợp nhất mã của chính mình; riêng bạn được phép thực hiện khi cần.
- Ưu tiên `pull request` nhỏ (khoảng dưới 300 dòng thay đổi) để duyệt nhanh và giảm sót lỗi.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **DoAnSE** (5111 symbols, 13967 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/DoAnSE/context` | Codebase overview, check index freshness |
| `gitnexus://repo/DoAnSE/clusters` | All functional areas |
| `gitnexus://repo/DoAnSE/processes` | All execution flows |
| `gitnexus://repo/DoAnSE/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
