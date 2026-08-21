# [BE-13] Nâng Cấp AI Generator: Question Caching & Kiểm Chuẩn Đa Engine Tự Động (AI Pipeline Pro)

> **Mô tả nghiệp vụ**: Nâng cấp toàn diện bộ tạo nội dung AI Google Gemini: Xây dựng cơ chế **Question Bank Caching** lưu trữ câu hỏi AI đã sinh vào CSDL để tái sử dụng tức thì mà không tốn API call, hệ thống tự động kiểm chuẩn chất lượng câu hỏi (Auto-Validator kiểm tra tính chính xác của đáp án toán học/logic trước khi trả về), và hỗ trợ sinh game bám sát chương trình Giáo Dục Phổ Thông 2018 (SGK Cánh Diều, Kết Nối Tri Thức).

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-13`
- **Mảng phụ trách**: Backend (FastAPI + Google Gemini API + Vector/Full-text Search + Schema Quality Assurance)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Tối ưu chi phí & Tốc độ sinh game)
- **Người thực hiện**: Backend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-13-ai-pipeline-caching`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **AI Question Bank & Caching Strategy**:
   - Khi người dùng yêu cầu sinh game với chủ đề "Phép nhân 7", backend kiểm tra trước trong bảng `cached_ai_questions`.
   - Nếu đã có sẵn trong ngân hàng câu hỏi đạt chuẩn ➔ Trả về ngay trong 100ms mà không cần gọi API Google Gemini (Tiết kiệm 80% chi phí API và tăng tốc độ trải nghiệm).
2. **Deterministic Question Auto-Validator**:
   - Kiểm tra logic của câu hỏi do AI tạo ra trước khi lưu vào CSDL:
     - Với `math`: Tự động tính toán biểu thức (ví dụ `"15 + 28"`) và so khớp đáp án `answer == 43`. Nếu AI sinh sai đáp án ➔ Tự động sửa lại hoặc sinh lại.
     - Với `quiz`: Kiểm tra đáp án `answer` có nằm trong mảng `options` không, không có đáp án trùng lặp.
     - Với `sequence`: Kiểm tra quy luật toán học tăng/giảm đều.
     - Với `matching`: Đảm bảo các vế A và B không bị trùng nhau.
3. **Curriculum Tagging (Phân loại theo Bộ Sách Giáo Khoa)**:
   - Thêm metadata bám sát chương trình: `curriculum_standard` (Bộ GD&ĐT 2018, Cánh Diều, Kết Nối Tri Thức, Chân Trời Sáng Tạo), `subject` (Toán, Tiếng Việt, Khoa học, Tin học).

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Tạo Bảng `ai_question_bank`**:
   - Cột: `id`, `topic`, `template_code`, `grade`, `category`, `curriculum`, `question_payload` (JSONB), `usage_count`, `quality_score`, `created_at`.
2. **Bộ Kiểm Chuẩn Tự Động (`ai_validator.py`)**:
   - Viết hàm kiểm tra tính đúng đắn cho toàn bộ 12 loại Game Engine.
3. **Nâng Cấp API `POST /api/admin/games/ai-generate`**:
   - Tham số mở rộng: `curriculum` (canh_dieu, ket_noi, mac_dinh), `difficulty` (easy, medium, hard).
   - Tích hợp tra cứu Cache ➔ Gọi Gemini ➔ Auto-validate ➔ Lưu vào Question Bank ➔ Trả về kết quả.
4. **API Ngân Hàng Câu Hỏi AI (`GET /api/admin/ai/question-bank`)**:
   - Cho phép giáo viên tìm kiếm câu hỏi có sẵn trong kho theo từ khóa và khối lớp.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Tạo Model `AiQuestionBank` & Migration Alembic `0006_add_ai_question_bank.py`**.
- [ ] **2. Viết Module `backend/app/services/ai_validator.py`**:
  - [ ] `validate_and_sanitize_ai_game(game_data: dict) -> dict`.
- [ ] **3. Cập nhật `backend/app/ai_content.py`**:
  - [ ] Nâng cấp Prompt theo bộ sách GDPT 2018.
  - [ ] Tích hợp cơ chế Cache-aside Pattern.
- [ ] **4. Thêm Endpoint vào `backend/app/routers/admin.py`**:
  - [ ] `GET /api/admin/ai/question-bank`.
- [ ] **5. Viết Pytest trong `backend/tests/test_ai_pipeline_advanced.py`**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Sinh game cùng 1 chủ đề lần thứ 2 ➔ Phản hồi tức thì dưới 200ms nhờ Cache.
- [ ] AI sinh câu hỏi phép tính ➔ Validator kiểm tra đúng 100% đáp án toán học.
- [ ] Giáo viên tra cứu được danh sách câu hỏi trong ngân hàng dữ liệu.
