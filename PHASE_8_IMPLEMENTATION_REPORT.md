# BÁO CÁO TRIỂN KHAI GIAI ĐOẠN 8 (PHASE 8 IMPLEMENTATION REPORT)
## Admin AI Content Factory & Thẩm Định Thuật Toán Xác Định (Deterministic Algorithmic Verification)

---

### 1. Tổng Quan Kiến Trúc & Mục Tiêu (Executive Summary)
Trong kiến trúc EdTech dành cho trẻ em K-12, **AI không bao giờ được phép là cơ quan thẩm định cuối cùng**. Các mô hình ngôn ngữ lớn (LLM) luôn tiềm ẩn rủi ro sinh ra ảo giác (hallucinations), sai lệch kết quả số học hoặc tạo ra câu hỏi trắc nghiệm không có đáp án đúng trong các lựa chọn.

**Phase 8: Admin AI Content Factory** thiết lập hệ thống sản xuất nội dung câu hỏi thông minh có kiểm soát chặt chẽ:
- **Giới hạn nghiêm ngặt (Strict Batch Throttling):** Mỗi lần yêu cầu chỉ sinh tối đa **$1 \le count \le 5$ câu hỏi**, tuyệt đối ngăn chặn việc spam không giới hạn tài nguyên AI.
- **Quyền hạn độc quyền Admin:** Chỉ tài khoản `role == 'admin'` mới được phép kích hoạt sinh câu hỏi lô (`HTTP 403` đối với Giáo viên / Creator).
- **Thẩm Định Thuật Toán Xác Định (Deterministic Algorithmic Verification):** 100% câu hỏi do AI sinh ra phải được giải mã và kiểm tra bằng giải thuật máy tính độc lập trước khi phê duyệt:
  1. **Safe AST Math Parser:** Tự động phân tích cây cú pháp trừu tượng (Abstract Syntax Tree) để tính toán lại biểu thức số học cơ bản (`+`, `-`, `*`, `/`, `//`, `%`), tuyệt đối **không sử dụng `eval()`**. Đối soát kết quả với đáp án của AI; nếu có sai lệch sẽ từ chối hoặc chuẩn hoá lại.
  2. **Option Containment Verification (Quiz):** Đáp án đúng bắt buộc phải nằm trong danh sách các lựa chọn (`options`), tự động ánh xạ nếu đáp án trả về dưới dạng ký tự đại diện A/B/C/D.
  3. **Matching Balance & Structure:** Kiểm tra các cặp ghép nối có đủ 2 vế `left` và `right`, tối thiểu 2 cặp trở lên.
  4. **Sequence & Data Contracts:** Thẩm định tính liên tục và đúng chuẩn schema của Game Engine tương ứng.
  5. **Child Safety Filter & XSS Sanitization:** Quét từ khóa nhạy cảm K-12 và làm sạch HTML/Script.
- **Tích hợp Question Bank:** Tự động tính Dual Hashes (`content_hash`, `normalized_hash`), đối soát trùng lặp và lưu trữ vào Ngân hàng câu hỏi hệ thống (`visibility = 'system'`).

---

### 2. Các Thành Phần Mã Nguồn Đã Triển Khai

#### 2.1. Module Thẩm Định Xác Định (`backend/app/deterministic_verifier.py`)
- `safe_eval_math_expression(expr: str) -> Optional[int | float]`:
  - Phân tích cú pháp biểu thức số học qua module chuẩn `ast.parse(mode="eval")`.
  - Hỗ trợ các toán tử số học an toàn (`Add`, `Sub`, `Mult`, `Div`, `FloorDiv`, `Mod`, `USub`, `UAdd`).
  - Chống chia cho 0 và chặn đứng mọi nguy cơ thực thi mã độc (ngăn chặn gọi hàm, truy cập thuộc tính ngầm, hoặc biến số).
  - Tự động lược bỏ phần `= ?` hoặc `= ...` phía sau biểu thức để đánh giá toán học chính xác.
- `verify_and_normalize_ai_question(template_code, prompt, data) -> tuple[bool, Optional[str], dict]`:
  - Kiểm tra độ dài và quét an toàn trẻ em trên đề bài (`prompt`).
  - Kiểm tra an toàn dữ liệu trên cấu trúc `data`.
  - Thực thi các quy tắc kiểm tra logic nghiệp vụ theo từng engine (`math`, `quiz`, `matching`, `sequence`, v.v.).
  - Thẩm định lại hợp đồng schema qua `schemas.AddLevelQuestionIn.validate_game_data`.

#### 2.2. Mở Rộng Module Sinh Nội Dung AI (`backend/app/ai_content.py`)
- Bổ sung hàm `generate_batch_questions_with_gemini(topic, template_code, count=5, grade=2, category="iq") -> list[dict]`:
  - Ép dải số lượng: `clamped_count = min(max(1, count), 5)`.
  - Kiểm tra an toàn trẻ em ngay từ chủ đề đầu vào.
  - Tích hợp Google Gemini 2.0 Flash với prompt yêu cầu cấu trúc JSON Array chuẩn xác.
  - Dự phòng an toàn (Graceful Fallback Mode): Khi không có `GEMINI_API_KEY` hoặc API gián đoạn, tự động sinh lô câu hỏi mẫu sư phạm chuẩn hóa và đa dạng cho tất cả 10 loại Game Engine.

#### 2.3. Lược Đồ Dữ Liệu Pydantic (`backend/app/schemas.py`)
- `AiBatchGenerateQuestionsIn`: Nhận tham số `topic`, `template_code`, `count` (mặc định 5), `grade`, `category`, `save_to_bank` (boolean).
- `VerifiedQuestionItem`: Trả về chi tiết từng câu hỏi, trạng thái thẩm định `is_verified`, thông báo lỗi `error_message`, `content_hash`, `normalized_hash`, và `saved_question_id` (nếu đã lưu vào Question Bank).
- `AiBatchGenerateQuestionsOut`: Báo cáo kết quả tổng hợp (`total_requested`, `total_generated`, `total_verified`, `saved_to_bank_count`, `items`).

#### 2.4. Điểm Cuối Quản Trị Viên (`backend/app/routers/admin.py`)
- Định tuyến: `POST /api/admin/ai/batch-generate-questions`
- Quyền truy cập: `current_user: models.User = Depends(require_roles(["admin"]))` (HTTP 403 nếu là Teacher/Creator).
- Quy trình xử lý:
  1. Thẩm tra an toàn trẻ em trên chủ đề.
  2. Kẹp cứng `count = min(max(1, count), 5)`.
  3. Kích hoạt sinh lô câu hỏi từ AI.
  4. Lặp qua từng câu hỏi để đưa qua bộ thẩm định xác định `verify_and_normalize_ai_question`.
  5. Tính toán song song `content_hash` và `normalized_hash`.
  6. Nếu `save_to_bank=True` và câu hỏi đạt thẩm định: Kiểm tra trùng lặp trong bảng `questions` theo `normalized_hash`. Nếu đã có, tăng `usage_count`; nếu chưa có, lưu bản ghi mới với `visibility='system'`.

#### 2.5. Giao Diện Người Dùng Admin Studio (`src/pages/AdminPage.tsx` & `src/services/api.ts`)
- Mở rộng types TypeScript: `AiBatchGenerateQuestionsIn`, `VerifiedQuestionItem`, `AiBatchGenerateQuestionsOut`.
- Tích hợp API client: `api.admin.batchGenerateAiQuestions(data)`.
- Thiết kế bảng điều khiển **AI Content Factory** hiện đại trong tab Trợ Lý AI:
  - Form chọn chủ đề, Game Engine, Khối Lớp, Thể Loại, Stepper chọn số lượng (1 - 5), Toggle lưu vào Question Bank.
  - Bảng thống kê tức thì: Yêu cầu, Đã sinh, Đạt thẩm định, Lưu Question Bank.
  - Danh sách thẻ câu hỏi trực quan với huy hiệu `ĐẠT THẨM ĐỊNH XÁC ĐỊNH` (xanh lục) hoặc `TỪ CHỐI THẨM ĐỊNH` kèm lý do chi tiết (đỏ), hiển thị Normalized Hash và Question Bank ID.

---

### 3. Kết Quả Kiểm Thử (Verification & Testing)

#### 3.1. Bộ Kiểm Thử Độc Lập (`backend/tests/test_ai_factory.py`)
Bao gồm **7 test cases chuyên sâu**:
1. `test_batch_generate_admin_only`: Kiểm tra quyền RBAC; Teacher gọi nhận HTTP 403, Admin gọi nhận HTTP 200.
2. `test_batch_generate_count_clamped_to_max_5`: Truyền `count=10`, hệ thống kẹp lại chính xác $\le 5$ câu hỏi.
3. `test_deterministic_math_verification`:
   - Biểu thức số học hợp lệ: `24 + 16` -> 40, `50 - 15 = ?` -> 35, `10 * 5 / 2` -> 25.
   - Ngăn chặn mã độc: `__import__('os')` -> `None`, chia cho 0 -> `None`.
   - Đối soát đáp án AI: AI trả lời sai (99 thay vì 40) -> Bị từ chối ngay lập tức; AI trả lời đúng -> Phê duyệt.
4. `test_deterministic_quiz_verification`:
   - Đáp án nằm trong options -> Phê duyệt.
   - Đáp án dạng ký tự A/B/C/D -> Tự động mapping sang text tương ứng.
   - Đáp án không nằm trong options -> Bị từ chối.
   - Options < 2 lựa chọn -> Bị từ chối.
5. `test_deterministic_matching_verification`:
   - Cặp ghép đủ 2 vế `left` & `right` -> Phê duyệt.
   - Ít hơn 2 cặp hoặc thiếu vế -> Bị từ chối.
6. `test_batch_generate_saves_to_question_bank`:
   - `save_to_bank=True` tạo bản ghi trong bảng `questions` với `visibility='system'` và `creator_id=admin.id`.
   - Cơ chế Dedup nhận diện `normalized_hash` khi gọi lại lần 2, tăng `usage_count` thay vì sinh trùng bản ghi.
7. `test_ai_factory_child_safety_filter`:
   - Chủ đề chứa từ khóa cấm ("vũ khí chiến tranh") -> Trả về HTTP 400.
   - Nội dung câu hỏi vi phạm an toàn trẻ em -> Bị verifier từ chối.

**Kết quả chạy `pytest tests/test_ai_factory.py -v`:**
```text
tests/test_ai_factory.py::test_batch_generate_admin_only PASSED          [ 14%]
tests/test_ai_factory.py::test_batch_generate_count_clamped_to_max_5 PASSED [ 28%]
tests/test_ai_factory.py::test_deterministic_math_verification PASSED    [ 42%]
tests/test_ai_factory.py::test_deterministic_quiz_verification PASSED    [ 57%]
tests/test_ai_factory.py::test_deterministic_matching_verification PASSED [ 71%]
tests/test_ai_factory.py::test_batch_generate_saves_to_question_bank PASSED [ 85%]
tests/test_ai_factory.py::test_ai_factory_child_safety_filter PASSED     [100%]
============================== 7 passed in 1.76s ==============================
```

#### 3.2. Toàn Bộ Test Suite Hệ Thống
Chạy kiểm thử hồi quy toàn bộ hệ thống backend:
```text
collected 141 items
============================ 141 passed in 44.13s =============================
```
**Không có bất kỳ lỗi hồi quy nào (0 failures, 141 passed)**.

#### 3.3. Kiểm Thử Giao Diện Frontend
Chạy kiểm tra biên dịch Vite/TypeScript:
```text
> react-example@0.0.0 build
> vite build
✓ 2723 modules transformed.
dist/index.html                     1.10 kB │ gzip:   0.63 kB
dist/assets/index-yPKlVHxu.css    132.24 kB │ gzip:  18.03 kB
dist/assets/index-BDL8S1pu.js   2,008.80 kB │ gzip: 551.23 kB
✓ built in 10.57s
```
**Biên dịch thành công, không có lỗi TypeScript hay cú pháp nào.**

---

### 4. Kết Luận
Phase 8 đã hoàn thành xuất sắc toàn bộ các mục tiêu đề ra, đưa nền tảng IQ Kid Market đạt tiêu chuẩn EdTech quốc tế về mặt kiểm soát nội dung do AI tạo ra: **Không phụ thuộc vào ảo giác của AI, bảo đảm tính xác thực sư phạm tuyệt đối bằng thuật toán máy tính, ngăn ngừa trùng lặp và liên kết trực tiếp với Ngân hàng câu hỏi trung tâm.**
