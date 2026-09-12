# BÁO CÁO TRIỂN KHAI GIAI ĐOẠN 2: QUESTION BANK CORE MODEL & REPOSITORY

**Thời điểm hoàn thành:** 11/09/2026  
**Trạng thái:** ✅ **HOÀN THÀNH TOÀN DIỆN (103/103 TEST TRÊN TOÀN HỆ THỐNG ĐÃ PASS)**  
**Phạm vi:** Phase 2 — Ngân hàng câu hỏi dùng chung (Question Bank Core Model & Repository)

---

## 1. MỤC TIÊU ĐÃ HOÀN THÀNH

Giai đoạn 2 đã thiết lập hoàn chỉnh tầng lưu trữ và quản lý câu hỏi độc lập (Canonical Reusable Content Layer) theo kiến trúc đã phê duyệt:

1. **Alembic Migration 0008 (`0008_add_questions_table.py`)**:
   - Tạo bảng `questions` với đầy đủ 19 trường: `id`, `engine_code`, `grade`, `subject`, `topic`, `skill`, `difficulty`, `prompt`, `data` (JSON/JSONB), `content_hash`, `normalized_hash`, `creator_id` (FK `users.id`), `source_game_id` (FK `games.id`), `source_game_version`, `visibility`, `status`, `usage_count`, `created_at`, `updated_at`.
   - Thiết lập chỉ mục (Indexes) trên các trường truy vấn trọng yếu: `engine_code`, `grade`, `subject`, `topic`, `difficulty`, `content_hash`, `normalized_hash`, `creator_id`, `source_game_id`, `visibility`, `status`.
   - Đã chạy upgrade thành công trên PostgreSQL cục bộ.

2. **Core Hashing Engine & Engine-Aware Normalization (`backend/app/content_hasher.py`)**:
   - `content_hash`: SHA-256 trên chuỗi JSON canonical (`sort_keys=True`, `separators=(',', ':')`, `ensure_ascii=False`).
   - `normalized_hash`: SHA-256 trên nội dung ngữ nghĩa sau khi chuẩn hóa Unicode NFC, lowercased, loại bỏ dấu câu thông dụng và gom khoảng trắng.
   - Chuẩn hóa đặc thù theo Engine (Mục 9.1 Content Contract):
     - `quiz`: Sắp xếp mảng `options`, chuẩn hóa prompt và answer.
     - `sequence`: **Bảo lưu tuyệt đối thứ tự phần tử** (order preservation `item[0] -> item[1]...`).
     - `sorting`: Bảo lưu thứ tự đích `correct_sequence_ids`.
     - `unscramble`: Bảo lưu thứ tự từ/token `correct_order`.
     - `matching`: Ghép cặp `{norm_left}_{norm_right}` rồi sắp xếp tập các cặp.
     - `math`: Loại bỏ toàn bộ khoảng trắng trong biểu thức và chuẩn hóa đáp số.
     - `observation`: Bảo lưu tọa độ đích `target_row`, `target_col`.

3. **Data Models Layer (`backend/app/models.py`)**:
   - Model `Question` ánh xạ bảng `questions` với quan hệ `creator` (`relationship("User", back_populates="questions")`) và `source_game` (`relationship("Game")`).
   - Thêm `questions` relationship vào `User`.

4. **Schemas Layer (`backend/app/schemas.py`)**:
   - `QuestionCreateIn`: Nhận dữ liệu tạo câu hỏi với GDPT metadata (`grade`, `subject`, `topic`, `skill`, `difficulty`), `engine_code`, `prompt`, `data`, `visibility`, `status`.
   - `QuestionUpdateIn`: Cho phép cập nhật từng phần thông tin câu hỏi.
   - `QuestionOut`: Trả về chi tiết câu hỏi kèm dual hashes và `usage_count`.
   - `PaginatedQuestionsOut`: Cung cấp danh sách phân trang chuẩn hóa (`items`, `total`, `page`, `page_size`, `total_pages`).
   - Tái sử dụng bộ kiểm tra hợp lệ `AddLevelQuestionIn.validate_game_data(engine_code, data)` cho toàn bộ 12 game engines.

5. **API Router (`backend/app/routers/questions.py`)**:
   - `GET /api/questions`: Lọc đa chiều (`grade`, `subject`, `topic`, `difficulty`, `engine_code`, `status`, `visibility`, `search`) kết hợp phân trang.
   - **Bảo mật & Cô lập dữ liệu (Data Isolation)**:
     - Học sinh (`student`): Chặn truy cập 403 tuyệt đối.
     - Tác giả (`creator`, `teacher`): Chỉ xem được câu hỏi của chính mình (`creator_id == user.id`) hoặc câu hỏi hệ thống dùng chung (`visibility == 'system'`). Hoàn toàn không thể xem hoặc tìm thấy câu hỏi riêng tư của tác giả khác.
     - Quản trị viên (`admin`): Toàn quyền xem và lọc toàn bộ ngân hàng câu hỏi.
     - Tác giả không thể tự phong câu hỏi thành `system` (chặn 403).
   - `POST /api/questions`: Xác thực engine data contract, tính toán dual hash, cấp ID duy nhất `q_<uuid>`.
   - `GET /api/questions/{id}`: Xem chi tiết với kiểm tra quyền sở hữu/hệ thống.
   - `PUT /api/questions/{id}`: Cập nhật câu hỏi, tự động validate lại engine contract và tự động tính toán lại dual hash nếu prompt/data thay đổi.
   - `DELETE /api/questions/{id}`: **Cơ chế Safe Deletion**:
     - Nếu `usage_count == 0`: Xóa cứng vĩnh viễn khỏi database (`status: "deleted"`).
     - Nếu `usage_count > 0`: Chuyển trạng thái sang `archived` để bảo vệ tính toàn vẹn của các game đang tham chiếu (`status: "archived"`).

6. **Đăng ký Router vào Main App (`backend/app/main.py`)**:
   - `app.include_router(questions.router)` đã kích hoạt và sẵn sàng phục vụ.

---

## 2. KẾT QUẢ KIỂM THỬ (TEST RESULTS)

### 2.1. Bộ test Question Bank chuyên sâu (`backend/tests/test_question_bank.py`)
- `test_hasher_normalization_and_order_preservation`: **PASSED** (Băm kép, chống trùng lặp, bảo lưu thứ tự sequence).
- `test_create_question_validation`: **PASSED** (Xác thực payload theo từng Engine, chặn dữ liệu sai cấu trúc).
- `test_student_forbidden_access`: **PASSED** (Học sinh bị chặn 403 tuyệt đối khỏi Ngân hàng câu hỏi).
- `test_creator_privacy_isolation`: **PASSED** (Cô lập dữ liệu giữa các Creator; không cho xem/sửa/xóa câu hỏi người khác).
- `test_system_questions_permissions`: **PASSED** (Chỉ Admin tạo/sửa/xóa câu hỏi system; Creator chỉ được đọc).
- `test_question_update_recomputes_dual_hashes`: **PASSED** (Tự động băm lại khi sửa nội dung câu hỏi).
- `test_safe_deletion_rules`: **PASSED** (Xóa cứng khi usage_count=0; lưu trữ archived khi usage_count>0).

### 2.2. Kiểm thử hồi quy toàn bộ Backend (Full Regression Test Suite)
- **103/103 tests passed** trong 32.15 giây.
- Không có bất kỳ lỗi hồi quy nào trên các tính năng Phase 0 và Phase 1 (Game Versioning, Wallet, Attempts, Quests, Scratch, Security P0).

### 2.3. Kiểm thử Frontend Build
- `npm run build`: **PASSED** trong 7.71 giây mà không phát sinh lỗi types hay contract.

---

## 3. DANH SÁCH FILE THAY ĐỔI / TẠO MỚI

| File | Hành động | Mục đích |
|---|---|---|
| `backend/alembic/versions/0008_add_questions_table.py` | Tạo mới | Alembic migration thêm bảng `questions` và các chỉ mục |
| `backend/app/content_hasher.py` | Tạo mới | Engine băm kép SHA-256 (`content_hash` & `normalized_hash`) |
| `backend/app/models.py` | Chỉnh sửa | Bổ sung model `Question` và liên kết với `User` |
| `backend/app/schemas.py` | Chỉnh sửa | Bổ sung schemas cho Question Bank (`QuestionCreateIn`, `QuestionOut`, v.v.) |
| `backend/app/routers/questions.py` | Tạo mới | Router API quản lý Question Bank kèm phân quyền chặt chẽ |
| `backend/app/main.py` | Chỉnh sửa | Đăng ký `questions.router` vào ứng dụng FastAPI |
| `backend/tests/test_question_bank.py` | Tạo mới | Bộ kiểm thử tự động 7 test cases cho Phase 2 |
| `PHASE_2_IMPLEMENTATION_REPORT.md` | Tạo mới | Báo cáo chi tiết kết quả hoàn thành Phase 2 |

---

## 4. KẾT LUẬN & BƯỚC KẾ TIẾP

Giai đoạn 2 (Question Bank Core Model & Repository) đã hoàn tất 100% với chất lượng cao nhất, tuân thủ nghiêm ngặt các nguyên tắc bảo mật và kiến trúc hệ thống đã cam kết.

Hệ thống đã sẵn sàng chuyển sang **Phase 3: Question Bank Import / Export & Quality Gate** khi có sự đồng ý của Quý kiến trúc sư/Tech Lead.
