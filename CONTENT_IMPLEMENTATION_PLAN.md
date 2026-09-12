# KẾ HOẠCH TRIỂN KHAI KIẾN TRÚC NỘI DUNG & HỆ THỐNG TRÒ CHƠI
# (CONTENT ARCHITECTURE IMPLEMENTATION PLAN)

**Dự án:** IQ Kid Market — Nền Tảng Học Tập & Sàn Giao Dịch Game Giáo Dục  
**Thời điểm lập kế hoạch:** 11/09/2026  
**Trạng thái Kế hoạch:** Đã chuẩn hóa toàn diện (Comprehensive Patch Revision) — Sẵn sàng cho triển khai an toàn theo từng Phase.

---

## 1. GOALS (MỤC TIÊU DỰ ÁN)

1. **Chuẩn hóa quy trình tạo Game của Creator/Teacher:** Giúp tác giả tạo game nhanh, thuận tiện qua 2 con đường: Soạn thảo thủ công (Manual Authoring) và Import nội dung JSON từ AI bên ngoài (ChatGPT, Claude, Gemini).
2. **Tiết kiệm chi phí vận hành:** Tuyệt đối không cấp quyền gọi AI API nội bộ cho Creator (0 đồng chi phí token AI cho Creator). AI nội bộ chỉ dành riêng cho Admin phục vụ sản xuất nội dung quy mô lớn.
3. **Xây dựng Question Bank chuẩn mực:** Thiết lập Kho Câu Hỏi độc lập đóng vai trò Lớp Nội Dung Tái Sử Dụng Chuẩn Mực (Canonical Reusable Content Layer), sẵn sàng phục vụ cho Game Marketplace và mở rộng cho phân hệ Training / Classroom trong tương lai.
4. **Bảo toàn dữ liệu và tính tương thích ngược tuyệt đối:** Áp dụng mô hình Snapshot bất biến (Immutable Published Snapshot) cho các Game đã xuất bản, giữ nguyên vẹn 100% cột `games.levels` (JSONB) cũ.
5. **Cổng kiểm soát chất lượng & Chống gian lận:** Tự động phát hiện lỗi cú pháp, vi phạm an toàn trẻ em và trùng lặp nội dung bằng thuật toán băm kép nhận biết đặc thù ngữ nghĩa Engine (Engine-Aware Dual Hashes).
6. **Cấu hình doanh thu linh hoạt bằng số nguyên:** Thay thế con số 80% gắn cứng bằng bảng cấu hình động `platform_settings` và áp dụng toán học số nguyên (Integer Floor Division) cho ví Sao IQ.

---

## 2. NON-GOALS (CÁC MỤC TIÊU NGOÀI PHẠM VI GIAI ĐOẠN NÀY)

1. **KHÔNG viết lại 10 Base Game Engines:** Giữ nguyên 100% logic rendering và gameplay của 10 Base Engines hiện có.
2. **KHÔNG tích hợp Coding và Scratch vào Base Engines:** Coding và Scratch thuộc phân hệ Scratch Studio riêng biệt.
3. **KHÔNG sử dụng Vector Database hay Semantic Embedding:** Không cài đặt pgvector, Pinecone hay Milvus trong giai đoạn này.
4. **KHÔNG triển khai đầy đủ nghiệp vụ Classroom và Training Courses:** Chỉ thiết kế cấu trúc dữ liệu của Question Bank đảm bảo tính mở rộng, không viết code logic hay giao diện cho 2 phân hệ này.
5. **KHÔNG di trú ồ ạt toàn bộ game cũ:** Tuyệt đối không chạy script migrate toàn bộ 100 màn chơi cũ sang Question Bank một cách cưỡng bức.

---

## 3. ARCHITECTURE PRINCIPLES (NGUYÊN TẮC CỐT LÕI)

1. **Principle 1 (Question Bank Semantics):** Question Bank là Canonical Reusable Content Layer; Published Games là Immutable Content Snapshots.
2. **Principle 2 (Zero Breaking Changes & Zero Downtime):** Hệ thống đang chạy phải tiếp tục phục vụ người dùng bình thường. Mọi thay đổi DB đều là Additive (chỉ thêm bảng/cột mới, không xóa/sửa cột cũ).
3. **Principle 3 (Deterministic & Frugal):** Sử dụng thuật toán băm xác định (Deterministic Dual Hashing) thay cho AI suy luận; không tốn chi phí token runtime.
4. **Principle 4 (Unified Creator/Teacher Concept):** Teacher và Creator là một khái niệm tác giả duy nhất.
5. **Principle 5 (Integer Financial Integrity):** Sao IQ là số nguyên, mọi phép tính doanh thu và chia sẻ đều dùng toán học số nguyên và snapshot vĩnh viễn vào giao dịch `purchases`.

---

## 4. TARGET CONTENT ARCHITECTURE (KIẾN TRÚC NỘI DUNG MỤC TIÊU)

```
                        [ NGUỒN NỘI DUNG / CONTENT SOURCES ]
                                         │
            ┌────────────────────────────┼────────────────────────────┐
            ▼                            ▼                            ▼
   Soạn Thủ Công (Creator)       Import Nội Dung (JSON)       Admin AI Factory
   (Studio UI trực quan)        (ChatGPT/Gemini Schema)       (Nội bộ Admin)
            │                            │                            │
            └────────────────────────────┼────────────────────────────┘
                                         ▼
                        [ CONTENT QUALITY GATE & VALIDATOR ]
                        ├── Schema & Engine Rules Validation
                        ├── HTML / XSS Sanitizer (Strip dangerous tags)
                        ├── Engine-Aware Dual Hashes: content_hash & normalized_hash
                        └── Jaccard Similarity Engine (<0.60, 0.60-0.80, >=0.80)
                                         │
                                         ▼
                          [ KHO CÂU HỎI / QUESTION BANK ]
                        ├── Canonical Reusable Content Layer (Table: questions)
                        ├── Metadata GDPT: Grade, Subject, Topic, Skill, Difficulty
                        ├── Provenance: creator_id, source_game_id, visibility
                        └── Reusable, Versioned, Searchable
                                         │
                       ┌─────────────────┴─────────────────┐
                       ▼                                   ▼
              [ GAME BUILDER LAYER ]              [ TRAINING ENGINE ]
              ├── Game Blueprint (Recipes)        ├── Curriculum -> Grade
              ├── Game Templates (Layouts)        ├── Subject -> Topic -> Skill
              └── Game (Snapshot Delivery)        └── Course -> Lesson -> Activity
                       │                                   │
                       ▼                                   ▼
              [ GAME MARKETPLACE ]                [ TRAINING COURSES ]
                       │                                   │
                       └─────────────────┬─────────────────┘
                                         ▼
                             [ 10 BASE GAME ENGINES ]
                       (Quiz, Matching, Sequence, Memory,
                        Flashcard, Language, Observation,
                        Sorting, Math, Logic Grid)
```

---

## 5. QUESTION BANK (KHO CÂU HỎI TÁI SỬ DỤNG)

- **Định vị kiến trúc:** Question Bank là **Lớp Nội Dung Tái Sử Dụng Chuẩn Mực (Canonical Reusable Content Layer)**. Nó **KHÔNG PHẢI** là Runtime Source of Truth cho các game đã xuất bản.
- **Cấu trúc thực thể `questions` (Additive Schema):**
  - `id`: `String(60)` (Primary Key, e.g. `q_math_g3_001`).
  - `engine_code`: `String(30)` (Thuộc đúng 1 trong 10 Base Engines).
  - `grade`: `Integer` (1 đến 9).
  - `subject`: `String(50)` (`math`, `language`, `science`, `logic`...).
  - `topic`: `String(100)` (Chủ đề bài học).
  - `skill`: `String(100)` (Kỹ năng đặc thù GDPT).
  - `difficulty`: `Integer` (1: Dễ, 2: Vừa, 3: Khó).
  - `prompt`: `Text` (Đề bài đã làm sạch XSS).
  - `data`: `JSONB` (Dữ liệu cấu hình đặc thù engine).
  - `content_hash`: `String(64)` (Băm SHA-256 canonical chính xác).
  - `normalized_hash`: `String(64)` (Băm SHA-256 đã qua chuẩn hóa engine-aware).
  - `creator_id`: `String(50)` (ID tác giả sở hữu).
  - `source_game_id`: `String(80)` (ID game gốc nếu được trích xuất).
  - `source_game_version`: `Integer` (Mặc định 1).
  - `visibility`: `String(20)` (`"private"` đối với Creator; `"system"` đối với Seed games).
  - `status`: `String(20)` (`"draft"`, `"approved"`, `"archived"`).
  - `usage_count`: `Integer` (Số lần câu hỏi được nhúng vào các Game/Khóa học).

---

## 6. GAME SNAPSHOT & VERSIONING (BẢN CHỤP NỘI DUNG BẤT BIẾN)

- **Vòng đời trạng thái Game:**
  $$\text{DRAFT} \longrightarrow \text{VALIDATING} \longrightarrow \text{CREATOR\_REVIEW} \longrightarrow \text{SUBMITTED} \longrightarrow \text{APPROVED / PUBLISHED} \longrightarrow \text{IMMUTABLE PUBLISHED SNAPSHOT}$$
- **Nguyên tắc bất biến (Snapshot Immutability):**
  - Khi Game được xuất bản (Published), toàn bộ nội dung các màn chơi và câu hỏi được "chụp nhanh" và lưu trữ trực tiếp trong `games.levels` (hoặc bản ghi `GameVersion` tương ứng).
  - Việc Creator chỉnh sửa câu hỏi trong Question Bank sau ngày xuất bản **TUYỆT ĐỐI KHÔNG LÀM THAY ĐỔI** Game đã xuất bản.
  - Người mua game luôn được đảm bảo chơi đúng phiên bản nội dung tại thời điểm giao dịch.

---

## 7. CREATOR JSON IMPORT (LUỒNG IMPORT NỘI DUNG TỪ BÊN NGOÀI)

- **Mô hình chi phí:** Creator **HOÀN TOÀN KHÔNG SỬ DỤNG AI NỘI BỘ**. Không tốn chi phí token của nền tảng.
- **Giao diện & Thuật ngữ:** Sử dụng tên gọi **"Import nội dung"** (tránh dùng "AI Generator").
- **Hướng dẫn cho Creator:** *"Bạn có thể dùng ChatGPT / Claude / Gemini bên ngoài để tạo JSON theo mẫu sau đó dán vào đây."*
- **Quy trình Import từng bước:**
  1. Creator sao chép Template JSON mẫu do hệ thống cung cấp.
  2. Creator yêu cầu AI bên ngoài sinh dữ liệu JSON theo đúng mẫu.
  3. Creator dán JSON vào IQ Kid Market Studio.
  4. Backend thực hiện: Parse JSON -> Kiểm tra Schema -> Tẩy rửa HTML/XSS -> Quality Gate -> Duplicate Detection.
  5. **Staging Preview:** Trả về danh sách màn chơi cho Creator xem trước trực quan bằng chính component `QuestionRenderer` thật của sản phẩm.
  6. Creator chỉnh sửa nếu cần -> Bấm "Lưu Bản Nháp (Save Draft)".
  7. Nộp bài lên hàng đợi kiểm duyệt của Admin.

---

## 8. QUALITY GATE (CỔNG THẨM ĐỊNH CHẤT LƯỢNG NỘI DUNG)

Quality Gate diễn ra **TRƯỚC KHI** Game được lưu chính thức hoặc nộp duyệt Marketplace. Nếu JSON không hợp lệ, hệ thống từ chối và **TUYỆT ĐỐI KHÔNG LÀM BIẾN ĐỔI** Game hiện tại.

Các điều kiện kiểm định bắt buộc:
1. **JSON & Schema validity:** Cú pháp JSON chuẩn, đúng kiểu dữ liệu, các trường bắt buộc không được rỗng.
2. **Valid engine_code:** Thuộc đúng 1 trong 10 Base Engines.
3. **Answer integrity:** Đáp án đúng bắt buộc phải tồn tại trong danh sách lựa chọn (`options`, `pairs`).
4. **Engine-specific structure:** Số lượng phần tử tối thiểu theo hợp đồng (options >= 2, pairs >= 2, sequence >= 2...).
5. **Nội bộ Game không trùng lặp:** Không có 2 câu hỏi nào trùng `normalized_hash` trong cùng 1 game.
6. **Content length sanity:** Độ dài đề bài tối thiểu 5 ký tự, tối đa 500 ký tự.
7. **An toàn trẻ em:** Quét blacklist từ khóa qua `is_content_safe_for_kids`.
8. **Quy mô tối thiểu:** Game nộp lên chợ phải có tối thiểu 5 màn chơi hợp lệ.

---

## 9. DUPLICATE DETECTION (PHÁT HIỆN TRÙNG LẶP ENGINE-AWARE)

### 9.1. Chuẩn hóa đặc thù theo từng Engine: `normalize_for_duplicate(engine_code, question)`

Tuyệt đối không áp dụng hàm sort mảng toàn cục bừa bãi. Phải bảo lưu thứ tự đối với các engine nhạy cảm về chuỗi:

1. **quiz:**
   - Prompt: Unicode NFC -> lowercase -> bỏ dấu câu -> gom khoảng trắng.
   - Options: Chuẩn hóa text của từng option, sort danh sách options đã chuẩn hóa.
   - Answer: Chuẩn hóa text của answer.
2. **matching:**
   - Bảo lưu mối quan hệ cặp ngữ nghĩa: Mỗi pair chuẩn hóa thành `{norm_left}_{norm_right}`, sau đó mới sort danh sách các cặp.
3. **sequence:**
   - **BẮT BUỘC BẢO LƯU THỨ TỰ:** Ghép các phần tử trong sequence theo đúng thứ tự xuất hiện: `item[0] -> item[1] -> item[2]...`
4. **sorting:**
   - **BẮT BUỘC BẢO LƯU THỨ TỰ ĐÍCH:** Ghép danh sách `correct_sequence_ids` theo đúng thứ tự chuẩn.
5. **language:**
   - Dạng unscramble: Ghép mảng `correct_order` theo đúng thứ tự.
   - Dạng fill_blank: Bảo lưu vị trí ô trống trong câu và đáp án.
6. **math:**
   - Chuẩn hóa biểu thức số học (bỏ khoảng trắng) và đáp số chuẩn.
7. **memory:**
   - Sort danh sách các thẻ bài đã chuẩn hóa.
8. **logic_grid:**
   - Bảo lưu cấu trúc bảng lưới và danh sách điều kiện gợi ý.
9. **observation:**
   - Bảo lưu ma trận lưới và tọa độ mục tiêu `{target_row}_{target_col}`.
10. **flashcard:**
    - Chuẩn hóa từng cặp thẻ `{norm_front}_{norm_back}`.

### 9.2. Phân cấp ngưỡng tương đồng Jaccard (Jaccard Thresholds)

So sánh tập hợp các `normalized_hash` của Game mới nộp ($S_A$) và Game đã có ($S_B$):
$$J(A, B) = \frac{|S_A \cap S_B|}{|S_A \cup S_B|}$$

- **$J < 0.60$:** An toàn, không có cảnh báo trùng lặp (No duplicate warning).
- **$0.60 \le J < 0.80$:** Cảnh báo có khả năng trùng lặp cao (Possible duplicate / warning / review). Yêu cầu Creator xác nhận và kiểm tra lại.
- **$J \ge 0.80$:** Xác suất clone game rất cao (Strong duplicate candidate). Hệ thống tự động chặn nộp trực tiếp HOẶC đưa vào hàng đợi Admin Review đặc biệt kèm cảnh báo.
- **Chống xóa nhầm (False-Positive Protection):** Hệ thống **TUYỆT ĐỐI KHÔNG TỰ ĐỘNG XÓA BỎ NỘI DUNG** của người dùng.

---

## 10. ADMIN AI CONTENT FACTORY (CÔNG CỤ NỘI BỘ CHO ADMIN)

- **Quyền hạn:** **Chỉ duy nhất Admin** có quyền truy cập và thực thi.
- **Nhiệm vụ:** Hỗ trợ Admin sản xuất câu hỏi chất lượng cao nạp vào Question Bank theo chủ đề hoặc tạo game mẫu từ Blueprint.
- **Kiểm soát tính đúng đắn (Deterministic Verification):** AI không phải là cơ quan thẩm định cuối cùng. Backend validation phải kiểm tra tính đúng đắn bằng thuật toán xác định, đặc biệt là các bài toán Math (tính toán lại biểu thức).
- **Quản trị chi phí & Vận hành:**
  - Giới hạn Batch: Chỉ sinh tối đa 5 câu hỏi trong 1 request (tránh lỗi cạn token và timeout).
  - Rate limits: Tối đa 10 requests / phút.
  - Audit log: Ghi lại lịch sử sinh nội dung của Admin kèm số token tiêu thụ.

---

## 11. MARKETPLACE / REVENUE (CHỢ GAME & DOANH THU SỐ NGUYÊN)

- **Cấu hình động:** Lưu tỷ lệ chia sẻ trong bảng `platform_settings` (mặc định ban đầu `creator_revenue_share_percent = 80`).
- **Toán học số nguyên tuyệt đối (Integer Arithmetic):**
  $$\text{creator\_revenue} = (\text{price\_iq\_star} \times \text{share\_percent}) // 100$$
  $$\text{platform\_revenue} = \text{price\_iq\_star} - \text{creator\_revenue}$$
- **Snapshot giao dịch trong bảng `purchases`:**
  - Bổ sung 3 trường vào bảng `purchases`:
    - `creator_revenue`: Số xu thực tế Creator nhận được tại thời điểm mua.
    - `platform_revenue`: Số xu thực tế nền tảng giữ lại tại thời điểm mua.
    - `revenue_share_percent_snapshot`: Tỷ lệ phần trăm áp dụng tại thời điểm giao dịch.
  - Lịch sử giao dịch không bao giờ bị biến động khi Admin thay đổi cài đặt hệ thống sau này.

---

## 12. OWNERSHIP / REUSE POLICY (QUYỀN SỞ HỮU & CHÍNH SÁCH TÁI SỬ DỤNG)

1. **Bảo tồn xuất xứ dữ liệu (Provenance Metadata):**
   - Mọi câu hỏi trong Question Bank bắt buộc lưu trữ: `creator_id`, `source_game_id`, `source_game_version`, `visibility`, `status`.
2. **Phân biệt ranh giới tài sản:**
   - **System Content:** Thuộc quyền hệ thống (`creator_id = "system"`, `visibility = "system"`). Cho phép mọi Creator tái sử dụng làm màn chơi.
   - **Creator-Owned Content:** Thuộc quyền sở hữu của riêng Creator đó (`visibility = "private"`). Chỉ tác giả mới có quyền bốc câu hỏi của mình vào game khác.
3. **Chống đánh cắp bản quyền:**
   - Hệ thống nghiêm cấm và chặn hoàn toàn việc Creator B truy vấn hoặc tái sử dụng câu hỏi của Creator A để xuất bản game thương mại kiếm xu.

---

## 13. LEGACY MIGRATION PILOT (DI TRÚ THÍ ĐIỂM CÓ KIỂM SOÁT)

- **Nguyên tắc an toàn:** Tuyệt đối không di trú toàn bộ game cũ một cách ồ ạt. Cột `games.levels` JSONB được bảo toàn nguyên vẹn 100%.
- **Quy trình Pilot Migration:**
  1. Chọn đúng 5 game seed hệ thống (`is_seed = True`).
  2. Chọn một số ít game tiêu biểu của Creator.
  3. Chạy script `backend/scripts/pilot_extract_questions.py`:
     - Trích xuất từng màn thành bản ghi trong `questions`.
     - 5 Game seed: Gán `creator_id = "system"`, `visibility = "system"`.
     - Game của Creator: Gán đúng `creator_id` gốc của tác giả, `source_game_id = game.id`, `visibility = "private"`.
     - Tính toán Dual Hashes (`content_hash` và `normalized_hash`).
  4. Kiểm tra đối soát:
     - Game cũ vẫn chơi bình thường từ `games.levels`.
     - Không có câu hỏi nào của Creator bị biến thành tài sản công cộng "system".
     - Thuật toán chống trùng hoạt động chính xác.

---

## 14. API CHANGES (CÁC THAY ĐỔI API)

1. `POST /api/attempts/submit`: Bổ sung miễn trừ `is_creator = (user.id == game.creator_id)` cho phép tác giả chơi thử toàn bộ màn 1-20 miễn phí.
2. `POST /api/admin/games/import-preview`: Endpoint mới, parse JSON, sanitize XSS, kiểm tra Quality Gate và trả về dữ liệu màn chơi để preview trên frontend mà không lưu vào DB.
3. `POST /api/admin/games/upload`: Tắt hoàn toàn `pad_to_count=True`, áp dụng sanitizer tẩy sạch thẻ HTML, giới hạn payload 2MB.
4. `GET /api/questions`: API tìm kiếm câu hỏi trong Question Bank (lọc theo grade, subject, difficulty; chỉ trả về câu hỏi system hoặc của chính user).
5. `POST /api/questions`: Thêm câu hỏi mới vào kho (tự động tính Dual Hashes).
6. `POST /api/admin/games/build-from-bank`: Tạo game mới bằng cách ghép danh sách `question_ids` đã chọn (Snapshot Pattern).
7. `GET /api/admin/platform-settings` & `PUT /api/admin/platform-settings/{key}`: Xem và điều chỉnh tỷ lệ chia sẻ doanh thu (Chỉ Admin).

---

## 15. DATABASE CHANGES (ADDITIVE ONLY)

1. **Tạo bảng mới `questions`:**
```python
class Question(Base):
    __tablename__ = "questions"

    id = Column(String(60), primary_key=True)
    engine_code = Column(String(30), nullable=False, index=True)
    grade = Column(Integer, nullable=False, index=True)
    subject = Column(String(50), nullable=False, index=True)
    topic = Column(String(100), nullable=False, index=True)
    skill = Column(String(100), nullable=True)
    difficulty = Column(Integer, default=1, index=True)
    prompt = Column(Text, nullable=False)
    data = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    content_hash = Column(String(64), nullable=False, index=True)
    normalized_hash = Column(String(64), nullable=False, index=True)
    creator_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    source_game_id = Column(String(80), nullable=True, index=True)
    source_game_version = Column(Integer, default=1)
    visibility = Column(String(20), default="private", index=True)
    status = Column(String(20), default="draft", index=True)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
```

2. **Tạo bảng mới `game_blueprints`:**
```python
class GameBlueprint(Base):
    __tablename__ = "game_blueprints"

    id = Column(String(50), primary_key=True)
    title = Column(String(150), nullable=False)
    grade = Column(Integer, nullable=False, index=True)
    subject = Column(String(50), nullable=False, index=True)
    topic = Column(String(100), nullable=False)
    target_engine = Column(String(30), nullable=False)
    total_questions = Column(Integer, default=20)
    rule_config = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    is_active = Column(Boolean, default=True)
```

3. **Tạo bảng mới `platform_settings`:**
```python
class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    key = Column(String(50), primary_key=True)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

4. **Bổ sung cột Snapshot vào bảng `purchases`:**
```python
creator_revenue = Column(Integer, default=0, nullable=False)
platform_revenue = Column(Integer, default=0, nullable=False)
revenue_share_percent_snapshot = Column(Integer, default=80, nullable=False)
```

---

## 16. SECURITY TESTS (KIỂM THỬ BẢO MẬT BẮT BUỘC)

- `test_creator_free_play`: Tác giả chơi game của mình từ màn 1 đến 20 không bị 403 Forbidden.
- `test_non_owner_lockout`: Người dùng khác chưa mua game bị chặn tại màn 6 với mã 403.
- `test_json_xss_sanitization`: Payload chứa `<script>` và `onerror=` được tẩy sạch trước khi vào DB.
- `test_payload_size_limit`: Gửi JSON > 2MB bị từ chối với mã 413 Payload Too Large.
- `test_question_bank_isolation`: Creator A không thể xem hoặc bốc câu hỏi `"private"` của Creator B.
- `test_seed_game_protection`: Creator không thể sửa hoặc xóa game `is_seed = True`.

---

## 17. BACKEND TESTS (KIỂM THỬ ĐƠN VỊ & TÍCH HỢP BACKEND)

- Duy trì toàn bộ 80 backend tests hiện có (`pytest tests/`).
- Bổ sung `tests/test_content_dedup.py`: Kiểm thử `normalize_for_duplicate` trên toàn bộ 10 Base Engines.
- Bổ sung `tests/test_question_bank.py`: Kiểm thử CRUD, quyền riêng tư và snapshot immutability.
- Bổ sung `tests/test_revenue_integer_math.py`: Kiểm tra tính toán phân chia doanh thu số nguyên và snapshot giao dịch.

---

## 18. FRONTEND TESTS (KIỂM THỬ FRONTEND)

- Cài đặt Vitest và React Testing Library.
- Viết unit tests cho `canAccessLevel`: Kiểm tra trường hợp `isCreator = True`.
- Viết component test cho `QuestionRenderer`: Đảm bảo hiển thị đúng 10 Base Engines ở chế độ Preview.

---

## 19. E2E TESTS (KIỂM THỬ LUỒNG NGƯỜI DÙNG ĐẦU-CUỐI)

- Luồng Creator: Import JSON -> Xem trước Preview -> Sửa đổi -> Lưu Draft -> Nộp bài.
- Luồng Admin: Mở danh sách bài nộp -> Xem đối soát trùng lặp Jaccard -> Quyết định Duyệt (Approve).
- Luồng Student: Mua game bằng Sao IQ -> Chơi từ màn 1 đến 20 -> Ghi nhận điểm số server-side.

---

## 20. ROLLOUT PLAN (KẾ HOẠCH TRIỂN KHAI TỪNG PHASE)

| Phase | Nội Dung Trọng Tâm | Thời Lượng | Mức Độ Rủi Ro | Trạng Thái Hiện Tại |
|---|---|---|---|---|
| **Phase 0** | Baseline & Security Remediation (Creator Free Play, XSS, Payload Limit) | 1 ngày | Rất thấp | **PLANNED** |
| **Phase 1** | Contract Normalization (10 Base Engines, tách Coding/Scratch) | 1 ngày | Rất thấp | **PLANNED** |
| **Phase 2** | Question Bank Core Model & Repository (Bảng `questions`, CRUD API) | 2-3 ngày | Thấp | **PLANNED** |
| **Phase 3** | JSON Import Staging & Preview (Tắt padding spam, Preview UI) | 2 ngày | Thấp | **PLANNED** |
| **Phase 4** | Game Builder Integration & Question Reuse (Snapshot Pattern) | 2-3 ngày | Thấp | **PLANNED** |
| **Phase 5** | Game Blueprint & Template Presets (Công thức tạo game) | 2 ngày | Thấp | **PLANNED** |
| **Phase 6** | Content Quality Gate (Chấm điểm sư phạm tự động) | 1-2 ngày | Thấp | **PLANNED** |
| **Phase 7** | Duplicate Detection Engine (Engine-aware Dual Hashes & Jaccard) | 1 ngày | Thấp | **PLANNED** |
| **Phase 8** | Admin AI Content Factory (Batching 5 câu/lần, Deterministic validation) | 2 ngày | Thấp | **PLANNED** |
| **Phase 9** | Marketplace Workflow & Configurable Integer Revenue | 1 ngày | Thấp | **PLANNED** |
| **Phase 10** | Pilot Migration & Comprehensive Test Suite | 2 ngày | Thấp | **PLANNED** |

---

## 21. ACCEPTANCE CRITERIA STATUS (BẢNG TRẠNG THÁI NGHIỆM THU)

Quy ước ký hiệu trạng thái:
- `[x]` = **CURRENTLY VERIFIED** (Đã kiểm chứng thực tế trong mã nguồn hiện tại)
- `[~]` = **PARTIALLY IMPLEMENTED** (Đã có một phần, cần hoàn thiện theo plan)
- `[ ]` = **PLANNED** (Nhiệm vụ thuộc kế hoạch triển khai, chưa code)
- `[-]` = **DEFERRED** (Hoãn lại giai đoạn sau)
- `[?]` = **NOT VERIFIED** (Chưa được kiểm chứng)

### A. Hiện trạng hệ thống (Verified & Partially Implemented)
- [x] Server-side grading 12 engines qua `game_evaluator.py` độc lập với client.
- [x] Lọc bỏ đáp án đối với học sinh qua `sanitize_game_levels_for_learner`.
- [x] Khóa bi quan `with_for_update()` chống race condition khi trừ ví Sao IQ.
- [x] Chặn IDOR và bắt buộc JWT Authentication cho các lượt submit màn chơi.
- [x] Chặn xóa hoặc chỉnh sửa game hệ thống (`is_seed = True`).
- [x] Bảo vệ chống Zip Bomb / Zip Slip trong module Scratch.
- [~] Phân quyền Admin cho AI: Backend đã chặn Teacher gọi AI nội bộ, nhưng cần chuyển đổi UI Import JSON thân thiện hơn.
- [~] Vòng đời kiểm duyệt: Đã có trạng thái `pending_review -> approved/rejected`, cần tích hợp thêm Quality Gate.

### B. Kế hoạch triển khai (Planned Tasks)
- [ ] Creator/Teacher không thể chỉnh sửa Game của Creator khác.
- [ ] Creator/Teacher không thể xóa Game của Creator khác.
- [ ] Creator/Teacher không thể tự ý phê duyệt/xuất bản Game của chính mình.
- [ ] Creator/Teacher không thể chỉnh sửa Game hệ thống đã được bảo vệ.
- [ ] Creator/Teacher không thể tái sử dụng câu hỏi riêng tư của Creator khác khi chưa được phép.
- [ ] Tác giả được chơi miễn phí toàn bộ màn 1-20 trên game do chính mình tạo ra (`is_creator`).
- [ ] Dữ liệu JSON import không hợp lệ không làm biến đổi hoặc gây lỗi cho Game hiện tại.
- [ ] Endpoint JSON import có bộ lọc tẩy sạch mã độc XSS.
- [ ] Giới hạn kích thước payload JSON import tối đa 2MB.
- [ ] Tắt hoàn toàn cơ chế tự động nhân bản câu hỏi (`pad_to_count = False`).
- [ ] Giao diện Preview sử dụng chính component `QuestionRenderer` thật của sản phẩm.
- [ ] Cung cấp JSON template mẫu chuẩn cho Creator sử dụng với ChatGPT/Gemini ngoài.
- [ ] Bản snapshot của Game đã xuất bản là bất biến (Immutable Published Snapshot).
- [ ] Việc sửa đổi câu hỏi trong Question Bank không làm thay đổi các Game đã bán/đã xuất bản.
- [ ] Toàn bộ các Game cũ tiếp tục hoạt động bình thường mà không bắt buộc phải migrate sang Question Bank.
- [ ] Question Bank bảo lưu đầy đủ metadata xuất xứ (`creator_id`, `source_game_id`, `visibility`).
- [ ] Thuật toán Duplicate Detection nhận biết đặc thù ngữ nghĩa của 10 Base Engines (`normalize_for_duplicate`).
- [ ] Thuật toán so khớp Jaccard áp dụng theo 3 phân cấp (<0.60, 0.60-0.80, >=0.80) và không tự động xóa nội dung.
- [ ] Phép tính chia sẻ doanh thu sử dụng toán học số nguyên (Integer Floor Division).
- [ ] Tỷ lệ chia sẻ doanh thu được cấu hình động qua bảng `platform_settings`.
- [ ] Ghi lại snapshot phân chia doanh thu (`creator_revenue`, `platform_revenue`, `revenue_share_percent_snapshot`) vào bảng `purchases`.
- [ ] AI nội bộ được cách ly tuyệt đối khỏi luồng Creator (Admin Only).
- [ ] Admin AI Factory có cơ chế kiểm soát chi phí, rate limit và chia nhỏ batch (tối đa 5 câu/lần).
- [ ] Kết quả sinh của Admin AI phải qua kiểm định xác định (deterministic validation) trước khi nạp vào kho.
- [ ] Di trú thí điểm (Pilot Migration) chỉ thực hiện trên 5 game seed và một số ít game creator chọn lọc.
- [ ] Thiết lập bộ kiểm thử tự động toàn diện từ Backend (Pytest) đến Frontend (Vitest).

### C. Hạng mục hoãn lại (Deferred)
- [-] Vector Database và Semantic AI Search cho Question Bank.
- [-] Triển khai toàn diện phân hệ Quản lý Lớp học (Classroom Management).
- [-] Triển khai toàn diện phân hệ Khóa học Kỹ năng (Training Courses & Curriculum Builder).
- [-] Chợ mua bán câu hỏi lẻ giữa các Creator.

---

## 22. RISKS & DEFERRED (RỦI RO VÀ PHƯƠNG ÁN DỰ PHÒNG)

1. **Rủi ro nhận diện nhầm trùng lặp (False-Positive Duplicate Risk):**
   - *Nguy cơ:* Các câu hỏi toán học cơ bản (ví dụ: "1 + 1 = ?", "2 x 3 = ?") có thể bị thuật toán đánh giá là trùng lặp giữa các giáo viên khác nhau.
   - *Giải pháp:* Ngưỡng tương đồng Jaccard $\ge 0.80$ chỉ áp dụng ở cấp độ toàn bộ Game (tập hợp 20 câu). Với câu hỏi đơn lẻ, trùng `normalized_hash` chỉ đưa ra gợi ý liên kết trong Question Bank chứ không xóa bài của tác giả.
2. **Rủi ro xung đột dữ liệu khi sửa Game đã xuất bản:**
   - *Giải pháp:* Khi Creator bấm sửa một Game đã xuất bản, hệ thống tạo một bản nháp mới (`Draft`). Game đang bán trên chợ vẫn giữ nguyên phiên bản đã duyệt cho đến khi bản nháp mới được Admin phê duyệt thay thế.
3. **Rủi ro hiệu năng truy vấn Question Bank:**
   - *Giải pháp:* Đánh chỉ mục (Index) đầy đủ trên các cột phân loại chính: `engine_code`, `grade`, `subject`, `topic`, `difficulty`, `creator_id`, `normalized_hash`.
