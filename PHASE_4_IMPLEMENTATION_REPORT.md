# BÁO CÁO TRIỂN KHAI GIAI ĐOẠN 4: GAME BUILDER INTEGRATION & TÁI SỬ DỤNG CÂU HỎI (SNAPSHOT PATTERN)

**Thời điểm hoàn thành:** 11/09/2026  
**Trạng thái:** ✅ **HOÀN THÀNH TOÀN DIỆN (115/115 TEST BACKEND + FRONTEND BUILD PASS)**  
**Phạm vi:** Phase 4 — Game Builder Integration & Question Reuse (Snapshot Pattern, Anti-theft Isolation, Dual Provenance, Question Extraction)

---

## 1. MỤC TIÊU ĐÃ HOÀN THÀNH

Giai đoạn 4 kết nối Ngân hàng câu hỏi (Question Bank - Content Layer) vào Hệ thống Xây dựng Game (Game Builder & Runtime Layer), tuân thủ triệt để kiến trúc Snapshot Immutability đã chốt:

1. **Khởi tạo Game mới từ Ngân hàng câu hỏi (`POST /api/admin/games/build-from-bank`)**:
   - Nhận danh sách `question_ids` kèm siêu dữ liệu game (`title`, `description`, `template_code`, `category`, `grade_from`, `grade_to`, `price`).
   - Lắp ráp thành một thực thể `Game` độc lập với danh sách `levels` được tạo tuần tự.
   - **Cơ chế Snapshot Immutability**: Nội dung câu hỏi (`data`) được sao chép sâu (`deepcopy`) vào cấp độ game. Mọi chỉnh sửa đối với câu hỏi gốc trong Question Bank sau này sẽ không bao giờ làm biến đổi hay ảnh hưởng đến các màn chơi của Game đã tạo.
   - **Theo dõi nguồn gốc (Provenance Tracking)**: Ghi nhận `question_bank_id: q.id` trong từng câu hỏi của màn chơi và tự động tăng biến đếm tái sử dụng `q.usage_count += 1`.
   - **Khởi tạo GameVersion v1**: Tự động tạo và lưu trữ bản đóng gói bất biến `GameVersion` v1 để bảo vệ tính toàn vẹn ngay khi game được dựng.
   - **Chính sách Chống Đánh Cắp Câu Hỏi (Anti-Theft Isolation)**:
     - Creator chỉ được phép sử dụng câu hỏi của chính mình (`creator_id == current_user.id`) hoặc câu hỏi hệ thống (`visibility == 'system'`).
     - Cố tình sử dụng câu hỏi riêng tư (`visibility == 'private'`) của Creator khác sẽ lập tức bị chặn với mã lỗi `HTTP 403 Forbidden`.
     - Admin có toàn quyền sử dụng bất kỳ câu hỏi nào trên toàn hệ thống.

2. **Bổ sung câu hỏi từ Ngân hàng vào Game có sẵn (`POST /api/admin/games/{game_id}/add-from-bank`)**:
   - Cho phép Creator/Admin chọn lọc câu hỏi và thêm tiếp vào cuối danh sách các màn chơi hiện có của một Game draft.
   - Tự động đánh số `level_num` kế tiếp, tính toán `is_free`, `points`, `xp_reward`, `coin_reward` hợp lệ.
   - Sao chép dữ liệu dạng snapshot và tăng `usage_count` cho các câu hỏi tương ứng.

3. **Trích xuất câu hỏi từ Game vào Ngân hàng (`POST /api/admin/games/{game_id}/extract-to-bank`)**:
   - Trích xuất toàn bộ câu hỏi từ các màn chơi của một Game hiện có đưa vào Question Bank.
   - Tự động sinh `normalized_hash` và `data_hash` để chống trùng lặp.
   - Bỏ qua các câu hỏi đã tồn tại trong Ngân hàng (`skipped_duplicate_count`).
   - Cập nhật liên kết ngược `question_bank_id` vào cấu trúc màn chơi của Game và tăng `usage_count`.

4. **Tích hợp Frontend (Client Services & Admin Level Builder UI)**:
   - Trong `src/services/api.ts`:
     - Bổ sung nhóm API `api.questions` (`list`, `get`, `create`, `update`, `delete`).
     - Bổ sung các phương thức xây dựng game trong `api.admin`: `buildGameFromBank`, `addQuestionsFromBank`, `extractQuestionsToBank`.
   - Trong `src/pages/admin-cms/AdminLevelBuilderTab.tsx`:
     - Thêm tab chế độ mới: **"Ghép Từ Ngân Hàng" (`build_from_bank`)**.
     - Bảng điều khiển bộ lọc đa chiều (Engine, Khối lớp, Môn học, Tìm kiếm từ khóa) kết nối trực tiếp với backend.
     - Danh sách câu hỏi kèm checkbox chọn nhanh / chọn cả trang, huy hiệu phân loại, lượt sử dụng, nút xem trước (Live Preview với `QuestionRenderer`).
     - Bảng điều khiển lắp ráp (Assembly Console) hỗ trợ 2 luồng:
       - **Luồng A (Ghép Game Mới)**: Nhập tên, mô tả, danh mục, khối lớp, giá bán và xuất bản ngay thành Game mới.
       - **Luồng B (Bổ sung vào Game có sẵn)**: Chọn game đích từ danh sách và ghép thêm các câu hỏi đã chọn vào cuối game.
     - Trong màn hình Soạn Thảo Màn Chơi (`mode === 'levels'`), bổ sung 2 nút thao tác nhanh:
       - **"Trích Xuất Vào Bank"**: Đẩy toàn bộ màn chơi của game hiện tại vào Question Bank kèm thông báo số câu mới và câu trùng bỏ qua.
       - **"Bổ Sung Từ Bank"**: Chuyển thẳng sang giao diện chọn câu hỏi từ Ngân hàng cho game đang chọn.

---

## 2. KẾT QUẢ KIỂM THỬ (TEST RESULTS)

### 2.1. Bộ test Game Builder & Reuse (`backend/tests/test_game_builder.py`)
- `test_build_game_from_bank_own_and_system_questions`: **PASSED** (Ghép game thành công từ câu hỏi của mình + câu hỏi hệ thống, tạo GameVersion v1, tăng usage_count).
- `test_build_game_from_bank_anti_theft_lockout`: **PASSED** (Chặn 403 khi Creator cố tình lấy trộm câu hỏi riêng tư của Creator khác).
- `test_snapshot_immutability`: **PASSED** (Sửa câu hỏi trong Question Bank KHÔNG làm thay đổi dữ liệu màn chơi trong Game đã ghép).
- `test_add_questions_from_bank_to_existing_game`: **PASSED** (Bổ sung câu hỏi vào game có sẵn, tăng số màn chơi chính xác).
- `test_extract_questions_from_game_to_bank`: **PASSED** (Trích xuất màn chơi vào Question Bank, chống trùng lặp hiệu quả khi chạy lại lần 2).

### 2.2. Kiểm thử toàn bộ Backend
- **115/115 tests passed** trong 36.83 giây (toàn bộ 18 file test từ Phase 0 đến Phase 4 đều vượt qua 100%).

### 2.3. Kiểm thử Frontend Build
- `npm run build` (Vite production build) thành công không có bất kỳ cảnh báo/lỗi kiểu dữ liệu nào.

---

## 3. DANH SÁCH FILE THAY ĐỔI / TẠO MỚI

1. `backend/app/schemas.py`: Thêm các schema `BuildGameFromBankIn`, `AddQuestionsFromBankIn`, `ExtractQuestionsToBankOut`.
2. `backend/app/routers/admin.py`: Thêm 3 endpoint `/build-from-bank`, `/{game_id}/add-from-bank`, `/{game_id}/extract-to-bank`.
3. `backend/tests/test_game_builder.py`: 5 test kiểm định chức năng builder, snapshot immutability, anti-theft, extract.
4. `src/services/api.ts`: Thêm client SDK cho `questions` và các thao tác Game Builder.
5. `src/pages/admin-cms/AdminLevelBuilderTab.tsx`: Giao diện tái sử dụng câu hỏi từ Ngân hàng, bộ lọc, chọn lọc, ghép game và trích xuất.
