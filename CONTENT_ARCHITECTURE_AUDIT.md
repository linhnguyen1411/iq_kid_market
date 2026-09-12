# BÁO CÁO AUDIT KIẾN TRÚC NỘI DUNG & HỆ THỐNG TRÒ CHƠI
# (CONTENT ARCHITECTURE AUDIT)

**Dự án:** IQ Kid Market — Nền Tảng Trò Chơi Trí Tuệ & Giáo Dục Trực Tuyến  
**Thời điểm thực hiện Audit:** 11/09/2026  
**Trạng thái Codebase:** Đã xác thực thực tế (Empirical Audit — 80 backend tests passed, 0 tsc compiler errors)  
**Phạm vi:** Hệ thống Game Marketplace, 10 Base Game Engines, Quy trình Creator/Teacher, Cơ chế JSON Import, Chính sách AI nội bộ & Kiến trúc Question Bank. (Coding & Scratch Studio được cách ly riêng).

---

## 1. EXECUTIVE SUMMARY (TỔNG QUAN ĐIỀU HÀNH)

1. **Hiện trạng cốt lõi của Codebase:**
   - IQ Kid Market hiện đang vận hành theo mô hình phân phối trò chơi qua cột `games.levels` (kiểu dữ liệu JSONB trên PostgreSQL hoặc JSON trên SQLite - `backend/app/models.py:83`). Toàn bộ lộ trình 20 màn chơi và dữ liệu câu hỏi được lưu lồng nhau trực tiếp trong bản ghi của bảng `games`.
   - Hệ thống đã hoàn thành đợt khắc phục bảo mật ngày 09/09/2026: Đã chuyển toàn bộ việc chấm điểm 12 engines về máy chủ tập trung (`backend/app/game_evaluator.py`), loại bỏ việc tin tưởng điểm từ client, lọc sạch đáp án đối với học sinh qua `sanitize_game_levels_for_learner` (`backend/app/schemas.py:467-559`), bảo vệ giao dịch ví qua khóa bi quan `with_for_update()`.

2. **Giá trị tái sử dụng cao (~75% - 80%):**
   - **Runtime Gameplay & Evaluation (100%):** Toàn bộ 10 Base Game Engines ở frontend (`QuizEngine`, `MatchingEngine`, `SequenceEngine`, `MemoryEngine`, `FlashcardEngine`, `LanguageEngine`, `ObservationEngine`, `SortingEngine`, `MathEngine`, `LogicGridEngine`) và trọng tài chấm server-side (`backend/app/game_evaluator.py`) hoạt động chuẩn mực, không cần viết lại.
   - **Hệ thống thanh toán & Ví (90%):** Giao dịch trừ xu người mua, cộng ví tác giả, lịch sử biến động số dư hoạt động tốt theo chuẩn ACID.
   - **Quy trình kiểm duyệt (80%):** Vòng đời duyệt bài `pending_review -> approved / rejected` đã có sẵn tại `backend/app/routers/admin.py:decide_review`.

3. **Các điểm chấn chỉnh kiến trúc trọng yếu:**
   - **Làm rõ ngữ nghĩa Question Bank:** Question Bank là **Lớp Nội Dung Tái Sử Dụng Chuẩn Mực (Canonical Reusable Content Layer)**, **KHÔNG PHẢI** là Runtime Source of Truth cho các game đã xuất bản. Game đã xuất bản là các **Bản Chụp Nội Dung Bất Biến (Immutable Content Snapshots)**.
   - **Khắc phục Template Padding Spam:** Khi import pack, hàm `ensure_level_count(pad_to_count=True)` nhân bản 1 câu hỏi thành 20 màn chơi giống hệt nhau (`backend/app/routers/admin.py:484`). Cần tắt hẳn cơ chế tự động nhân bản này.
   - **Mở quyền chơi cho Tác giả (Creator Free Play):** Hiện tại Creator/Teacher không thể chơi game của chính mình từ màn 6 trở đi nếu chưa mua game (`backend/app/routers/attempts.py:201-207`). Cần bổ sung điều kiện miễn trừ: `is_creator = (user.id == game.creator_id)`.
   - **Chia sẻ doanh thu linh hoạt bằng số nguyên (Integer Math):** Thay thế con số 80% gắn cứng `int(game.price * 0.8)` (`backend/app/routers/games.py:206`) bằng cấu hình động `platform_settings` và áp dụng toán học số nguyên (Integer Floor Division: `(price * share_pct) // 100`), đồng thời snapshot tỷ lệ vào bảng `purchases`.
   - **Lọc mã độc XSS trong JSON Import:** Bổ sung bước làm sạch HTML tags trong `prompt`, `title`, `options` trước khi lưu vào cơ sở dữ liệu.
   - **Cách ly Coding & Scratch:** Giữ 10 Base Game Engines độc lập, không đưa Coding/Scratch vào danh mục Base Engines.

---

## 2. CURRENT ARCHITECTURE (KIẾN TRÚC HIỆN TẠI)

Kiến trúc hiện tại tuân theo mô hình 3 lớp phân tầng:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND (React 19 + Vite)                      │
│                                                                             │
│  [Chợ Game]          [Studio Sáng Tạo]         [CMS Admin]     [Màn Chơi]   │
│  MarketplacePage     AdminPage (/studio)       AdminCmsPage    GamePlayPage │
│                             │                       │               │       │
│                             └───────────┬───────────┘               │       │
│                                         ▼                           ▼       │
│                                   api.ts (REST)              QuestionRenderer│
│                                                                     │       │
│                                                          10 Base Game Engines│
└─────────────────────────────────────────┬───────────────────────────┴───────┘
                                          │ HTTP / JWT Bearer
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI + Python)                        │
│                                                                             │
│  routers/games.py   routers/admin.py    routers/attempts.py  routers/wallet.py│
│         │                   │                     │                  │      │
│         │          upload_games (JSON)            │                  │      │
│         │          ai_generate (Gemini)           │                  │      │
│         │                   │                     ▼                  │      │
│         │                   │             game_evaluator.py          │      │
│         │                   ▼                     │                  │      │
│         └─────────────► schemas.py ◄──────────────┘                  │      │
│                     (validate_game_data)                             │      │
└─────────────────────────────────────────┬────────────────────────────────────┘
                                          │ SQLAlchemy ORM
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE (PostgreSQL / SQLite)                       │
│                                                                             │
│  users ──────< games (levels: JSONB) >────── attempts                       │
│    │               │                                                        │
│  wallets        purchases                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Database Layer:** Lưu trữ nguyên khối. Toàn bộ thông tin bài học, câu hỏi, cấu hình game nằm gọn trong cột `games.levels` (JSONB). Chưa có bảng `questions` độc lập.
- **Service & Evaluation Layer:** FastAPI cung cấp REST API. `game_evaluator.py` thẩm định câu trả lời phía server cho 12 loại engine.
- **Presentation Layer:** React 19, TypeScript, Tailwind CSS v4. Giao diện làm bài tập trung qua `QuestionRenderer.tsx`.

---

## 3. CURRENT GAME CREATION FLOW (LUỒNG TẠO GAME HIỆN TẠI)

1. **Khởi tạo Game (Form Metadata):**
   - Creator/Teacher truy cập `/studio` (được điều hướng tới `src/pages/AdminPage.tsx`).
   - Nhập: Tên game, môn học, khối lớp, giá Sao IQ.
   - Gửi `POST /api/admin/games` (`backend/app/routers/admin.py:49-110`).
   - Backend sinh mã định danh: `custom_g_{timestamp}`.
   - Nếu có `customFirstLevel`, gọi `ensure_level_count(levels, pad_to_count=False)` -> lưu game với 1 màn chơi nháp đầu tiên (`review_status = "pending_review"`).
2. **Soạn thảo và bổ sung màn chơi:**
   - Creator thêm màn: Gọi `POST /api/admin/levels/add` (`backend/app/routers/admin.py:142`).
   - Creator sửa màn: Gọi `PUT /api/admin/levels/{game_id}/{level_num}` (`backend/app/routers/admin.py:213`).
   - Cơ chế cập nhật: Backend load toàn bộ mảng `levels` từ JSONB, sửa phần tử tương ứng, ghi đè toàn bộ cột `games.levels` và kích hoạt `flag_modified(game, "levels")`.

---

## 4. CURRENT JSON IMPORT FLOW (LUỒNG IMPORT JSON HIỆN TẠI)

- **Điểm tiếp nhận:** `POST /api/admin/games/upload` (`backend/app/routers/admin.py:421-560`).
- **Input Schema:** `UploadGamesIn(gameObject: Any)` (`backend/app/schemas.py:406-408`).
- **Các định dạng đang nhận:**
  1. Full Pack: Chứa đầy đủ mảng `levels` (20 màn chơi).
  2. Compact Pack: Chứa `level_template` mẫu.
- **Quy trình xử lý thực tế:**
  1. Kiểm tra quyền sở hữu game nếu có `id`. Chặn ghi đè game hệ thống (`is_seed = True`) hoặc game của tác giả khác.
  2. Thẩm định `template_code` thuộc danh mục cho phép.
  3. Lặp qua danh sách màn chơi, gọi `AddLevelQuestionIn.validate_game_data(q_type, q_data)` (`backend/app/schemas.py:255`).
  4. **Lỗi nhân bản dữ liệu:** Nếu là dạng compact pack có `level_template`, hệ thống gọi `ensure_level_count(levels, pad_to_count=True)` (`backend/app/routers/admin.py:484`) -> Nhân bản câu hỏi mẫu thành 20 màn chơi giống nhau, chỉ đảo vị trí đáp án.
  5. **Thiếu Staging/Preview:** Dữ liệu import được ghi thẳng vào cơ sở dữ liệu. Nếu có lỗi ở màn số 19, request bị thất bại hoặc sinh rác trong DB.
  6. **Thiếu Sanitization:** Không có bộ lọc HTML, tiềm ẩn nguy cơ Stored XSS nếu đề bài chứa thẻ `<script>` hoặc `<img onerror=...>`.

---

## 5. CURRENT AI FLOW (LUỒNG AI HIỆN TẠI)

- **Quyền hạn truy cập:** **CHỈ DUY NHẤT ADMIN** (`require_roles(["admin"])` tại `backend/app/routers/admin.py:565`). Creator/Teacher bị chặn hoàn toàn từ backend (403 Forbidden).
- **Backend Service:** `backend/app/ai_content.py` tích hợp Google Gemini SDK (`google.genai.Client`), model `gemini-2.0-flash`.
- **Bộ lọc an toàn trẻ em:** `is_content_safe_for_kids(topic)` (`backend/app/ai_content.py:19-31`) quét blacklist từ khóa độc hại, bạo lực, người lớn.
- **Cơ chế Fallback an toàn:** Nếu thiếu `GEMINI_API_KEY` hoặc lỗi mạng/quota, tự động kích hoạt `generate_fallback_game` (`backend/app/ai_content.py:448`) sinh 20 màn thuật toán giả lập, đảm bảo không sập request.
- **Đánh giá chi phí:** Hệ thống tuân thủ nghiêm ngặt việc không phát sinh chi phí token AI cho Creator. Creator muốn dùng AI phải tự sử dụng công cụ bên ngoài (ChatGPT, Claude, Gemini) và dán JSON vào hệ thống.

---

## 6. CURRENT MARKETPLACE FLOW (LUỒNG CHỢ GAME HIỆN TẠI)

1. **Khám phá trò chơi:** `GET /api/games` (`backend/app/routers/games.py:28-110`), hỗ trợ lọc theo khối lớp (`grade`), danh mục (`category`), loại phí (`type = free | premium`), tìm kiếm theo từ khóa và phân trang.
2. **Chi tiết trò chơi & Ẩn đáp án:** `GET /api/games/{id}` (`backend/app/routers/games.py:112-136`). Nếu người xem không phải Admin hoặc Tác giả, hệ thống tự động lọc sạch toàn bộ trường `answer`, `correct_order`, `correct_sequence_ids` qua hàm `sanitize_game_levels_for_learner` (`backend/app/schemas.py:467`).
3. **Giao dịch mua game:** `POST /api/games/purchase` (`backend/app/routers/games.py:139-230`):
   - Khóa bản ghi ví người mua và người bán qua `with_for_update()`.
   - Kiểm tra số dư ví Sao IQ (`wallet.balance >= game.price`).
   - Ghi 2 bản ghi biến động số dư (`WalletTransaction`): Trừ xu người mua, cộng doanh thu cho Creator.
   - **Vấn đề tồn tại:** Doanh thu creator bị gắn cứng 80% dạng số thực `revenue_share = int(game.price * 0.8)` (`backend/app/routers/games.py:206`). Bảng `purchases` không lưu lại snapshot số tiền phân chia tại thời điểm mua.

---

## 7. CURRENT ENGINE INVENTORY (DANH MỤC 10 BASE ENGINES)

Frontend registry: `src/components/game-engines/registry.ts`.  
Bộ chấm điểm tập trung server-side: `backend/app/game_evaluator.py`.

| STT | Engine Code | Frontend Component | Backend Evaluator | Cấu Trúc Dữ Liệu `question.data` | Cấu Trúc Payload `submittedAnswer` |
|---|---|---|---|---|---|
| 1 | **quiz** | `QuizEngine.tsx` | `quiz` | `{ options: string[], answer: string, explanation?: string }` | `{ selectedOption: string }` |
| 2 | **matching** | `MatchingEngine.tsx` | `matching` | `{ pairs: [{ left: string, right: string }] }` | `{ pairs: [{ left: string, right: string }] }` |
| 3 | **sequence** | `SequenceEngine.tsx` | `sequence` | `{ sequence: string[], answer: string, options?: string[] }` | `{ answer: string }` |
| 4 | **memory** | `MemoryEngine.tsx` | `memory` | `{ items: string[], theme?: string }` | `{ completed: boolean, matchesCount: number, flipsCount: number }` |
| 5 | **flashcard** | `FlashcardEngine.tsx` | `flashcard` | `{ cards: [{ front: string, back: string, pronounce?: string, fact?: string }] }` | `{ completed: true, cardsViewed: number }` |
| 6 | **language** | `LanguageEngine.tsx` | `language` | Subtype `unscramble`: `{ scrambled_words: string[], correct_order: string[] }`<br>Subtype `fill_blank`: `{ options: string[], answer: string, sentence: string }` | Unscramble: `{ tokens: string[] }`<br>Fill blank: `{ answer: string }` |
| 7 | **observation** | `ObservationEngine.tsx` | `observation` | `{ grid: string[][], target_row?: number, target_col?: number, answer?: string }` | `{ row: number, col: number, cell: string, answer: string }` |
| 8 | **sorting** | `SortingEngine.tsx` | `sorting` | `{ items: [{ id: string, label: string }], correct_sequence_ids: string[] }` | `{ sequence: string[], orderedIds: string[] }` |
| 9 | **math** | `MathEngine.tsx` | `math` | `{ expression?: string, answer: string \| number, hint?: string }` | `{ answer: string }` |
| 10 | **logic_grid** | `LogicGridEngine.tsx` | `logic_grid` / `logic` | `{ grid: string[][], options: string[], answer: string, hint?: string }` | `{ selectedOption: string, answer: string }` |

> [!IMPORTANT]
> **Cách ly Coding & Scratch Studio:** `coding` (`CodingEngine.tsx`) và `scratch` (`ScratchEngine.tsx`) thuộc phân hệ Scratch Studio độc lập (`ScratchCourse`, `ScratchLesson`, `exercise_evaluator.py`). Danh mục 10 Base Engines của Game Marketplace chỉ gồm đúng 10 engines nêu trên.

---

## 8. QUESTION BANK ASSESSMENT (ĐÁNH GIÁ KHO CÂU HỎI)

1. **Sửa đổi mâu thuẫn ngữ nghĩa (Semantic Clarification):**
   - Question Bank **KHÔNG PHẢI** là "Single Source of Truth" cho dữ liệu runtime của Game đã xuất bản.
   - **Khái niệm chuẩn mực:** **Question Bank là Lớp Nội Dung Tái Sử Dụng Chuẩn Mực (Canonical Reusable Content Layer); Các Game Đã Xuất Bản Là Các Bản Chụp Nội Dung Bất Biến (Immutable Content Snapshots).**
   - Luồng kiến trúc:
     $$\text{Question Bank} \longrightarrow \text{Game Draft} \longrightarrow \text{Validation} \longrightarrow \text{Creator Review} \longrightarrow \text{Admin Approval} \longrightarrow \text{Published Game Snapshot}$$
   - Khi một câu hỏi trong Question Bank được chọn vào một Game:
     - Game nhận một bản snapshot của dữ liệu câu hỏi đó;
     - Bản snapshot của Game đã xuất bản là bất biến (immutable);
     - Việc chỉnh sửa câu hỏi trong Question Bank sau này **TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP** làm biến đổi các Game đã xuất bản;
     - Các Game đã bán/đã xuất bản phải giữ nguyên tính tái lập (reproducible).

2. **Lợi ích kiến trúc của mô hình Snapshot:**
   - Đảm bảo tính toàn vẹn của giao dịch thương mại: Học sinh mua game sẽ luôn chơi đúng nội dung đã mua.
   - Hiệu năng tối đa: Không cần thực hiện lệnh `JOIN` nhiều bảng phức tạp khi người chơi tải màn chơi.

---

## 9. OWNERSHIP / RIGHTS ASSESSMENT (ĐÁNH GIÁ QUYỀN SỞ HỮU & TÁC GIẢ)

1. **Mô hình hợp nhất năng lực Teacher = Creator:**
   - Trong kiến trúc nội dung của IQ Kid Market, **Teacher và Creator là MỘT khái niệm tác giả duy nhất**.
   - Không thiết kế các bảng hay hệ thống sở hữu tách biệt cho Teacher và Creator.
   - Bảng `User.role` hiện tại có 4 giá trị (`student`, `teacher`, `creator`, `admin`). Giữ nguyên các giá trị role này trong DB để tương thích ngược, nhưng sử dụng một lớp phân quyền năng lực chung (Capability Layer):
     - `student`: Học sinh (chơi game, làm bài, tích lũy điểm).
     - `creator/teacher`: Tác giả nội dung (tạo game, soạn câu hỏi, import JSON, chơi thử game của mình miễn phí, trình chiếu lớp học, nộp duyệt lên chợ, nhận doanh thu sau khi Admin duyệt và xuất bản).
     - `admin`: Quản trị viên (kiểm duyệt game, quản lý cấu hình hệ thống, sử dụng AI nội bộ).

2. **Chính sách phân quyền sở hữu câu hỏi (Ownership & Reuse Policy):**
   - Không đánh đồng các câu hỏi được trích xuất thành tài sản "hệ thống" chỉ vì chúng được đưa vào Question Bank.
   - Dữ liệu câu hỏi trích xuất từ Game của Creator **BẮT BUỘC PHẢI BẢO LƯU**:
     - `creator_id`: ID của tác giả gốc.
     - `source_game_id`: ID của game nguồn.
     - `source_game_version`: Phiên bản game nguồn (mặc định 1).
     - `visibility`: `"private"` đối với câu hỏi của Creator; chỉ gán `"system"` đối với 5 game gốc hệ thống (`is_seed = True`).
     - `status`: Trạng thái kiểm duyệt.
   - **Phân biệt rõ ràng:**
     - **SYSTEM CONTENT:** Tài sản hệ thống, được tái sử dụng theo chính sách nền tảng.
     - **CREATOR-OWNED CONTENT:** Thuộc quyền sở hữu của Creator, chỉ tác giả được tái sử dụng; **KHÔNG ĐƯỢC PHÉP** để Creator khác tự ý lấy hoặc bán lại nếu không có sự cấp phép.

---

## 10. SECURITY ASSESSMENT (ĐÁNH GIÁ AN TOÀN & BẢO MẬT)

1. **Khóa bản quyền Tác giả (Creator Lockout - P0):**
   - Tại `attempts.py:201-207` và `GamePlayPage.tsx:28-30`, hàm `can_access_level` chỉ cho phép màn > 5 nếu `isPurchased` hoặc `role == "admin"`. Tác giả tạo ra game không thể chơi thử game của mình từ màn 6 trở đi.
   - **Khắc phục:** Bổ sung điều kiện kiểm tra tác giả: `is_creator = (user.id == game.creator_id)`. Nếu `is_creator == True`, mở toàn bộ màn miễn phí.

2. **Nguy cơ Stored XSS trong JSON Import (P0):**
   - Endpoint `POST /api/admin/games/upload` lưu dữ liệu chuỗi trực tiếp vào cơ sở dữ liệu mà không làm sạch HTML tags.
   - **Khắc phục:** Tẩy rửa các thẻ nguy hiểm (`<script>`, `<iframe>`, `javascript:`, các event handlers `onerror=`, `onload=`) trước khi lưu.

3. **Nguy cơ DoS qua Payload JSON khổng lồ (P0):**
   - Request `UploadGamesIn` nhận `gameObject: Any` không giới hạn dung lượng.
   - **Khắc phục:** Giới hạn kích thước payload tối đa 2MB và số màn chơi tối đa 50 màn trong 1 lần import.

4. **Cách ly AI API nội bộ (P1):**
   - `admin.py:565` đã khóa chặt bằng `require_roles(["admin"])`. Duy trì nghiêm ngặt cơ chế này để bảo vệ chi phí token của nền tảng.

---

## 11. QUALITY / DUPLICATE ASSESSMENT (ĐÁNH GIÁ CHẤT LƯỢNG & CHỐNG TRÙNG)

1. **Cơ chế băm nhận biết ngữ nghĩa Engine (Engine-Aware Normalization):**
   - **TUYỆT ĐỐI KHÔNG** áp dụng thuật toán sắp xếp mảng hay token một cách bừa bãi toàn cục vì sẽ làm sai lệch ngữ nghĩa thứ tự trong các engine nhạy cảm về chuỗi (`sequence`, `sorting`).
   - Hàm chuẩn hóa `normalize_for_duplicate(engine_code, question)` phải xử lý đặc thù cho từng engine:
     - `quiz`: Chuẩn hóa prompt (NFC, lowercase, bỏ dấu câu), chuẩn hóa text của options, chuẩn hóa đáp án.
     - `matching`: Giữ nguyên mối quan hệ cặp ngữ nghĩa (semantic pair `{left}_{right}`), không xáo trộn liên kết trái-phải.
     - `sequence`: **BẮT BUỘC BẢO LƯU THỨ TỰ** các phần tử trong chuỗi.
     - `sorting`: **BẮT BUỘC BẢO LƯU THỨ TỰ** đích cần sắp xếp (`correct_sequence_ids`).
     - `language`: Bảo lưu vị trí chỗ trống và thứ tự từ chuẩn trong câu.
     - `math`: Chuẩn hóa cấu trúc biểu thức toán học và đáp số.
     - `memory`: Bảo lưu danh sách các thẻ bài.
     - `logic_grid`: Bảo lưu cấu trúc bảng logic và ràng buộc điều kiện.
     - `observation`: Bảo lưu cấu trúc lưới ma trận và tọa độ hàng/cột.
     - `flashcard`: Chuẩn hóa nội dung mặt trước và mặt sau.
   - Các trường băm bắt buộc: `content_hash`, `normalized_hash`, `engine_code`.

2. **Ngưỡng tương đồng Jaccard thực tế (Jaccard Similarity Thresholds):**
   - Việc phát hiện game trùng lặp không được phép tự động xóa dữ liệu mà phải phân cấp theo mức độ tương đồng:
     - **$J < 0.60$:** Không có cảnh báo trùng lặp (No duplicate warning).
     - **$0.60 \le J < 0.80$:** Cảnh báo có thể trùng lặp / rà soát (Possible duplicate / warning / review).
     - **$J \ge 0.80$:** Khả năng trùng lặp rất cao (Strong duplicate candidate) -> Chặn nộp trực tiếp HOẶC yêu cầu Admin xét duyệt tùy thuộc vào quyền sở hữu và ngữ cảnh nguồn gốc.
   - Hệ thống **TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ ĐỘNG XÓA BỎ NỘI DUNG** chỉ vì độ tương đồng. Cần có cơ chế bảo vệ chống nhận diện nhầm (False-positive protection).

---

## 12. BACKWARD COMPATIBILITY ASSESSMENT (ĐÁNH GIÁ TƯƠNG THÍCH NGƯỢC)

1. **Bảo tồn nguyên vẹn các Game hiện hành:**
   - Tất cả các trò chơi hiện có tiếp tục vận hành bình thường qua cột `games.levels` (JSONB).
   - **TUYỆT ĐỐI KHÔNG** bắt buộc toàn bộ dữ liệu game cũ phải chuyển đổi sang Question Bank ngay lập tức.
   - Mô hình phân lớp:
     - Game cũ: Tiếp tục đọc từ `games.levels` JSONB hiện có.
     - Nội dung mới / cập nhật: Có thể bốc từ Question Bank.
     - Game đã xuất bản: Chứa bản chụp nội dung bất biến (Immutable Content Snapshot).
     - Question Bank: Đóng vai trò nguồn tài nguyên tái sử dụng cho Game, Training, Classroom trong tương lai.
   - Đây là kiến trúc tiến hóa từng bước (Incremental Architecture), không phải cuộc đại phẫu viết lại từ đầu (Big-Bang Rewrite).

2. **Chiến lược Pilot Migration có kiểm soát:**
   - **Giai đoạn thử nghiệm:** Chỉ chọn đúng 5 game hệ thống gốc (`is_seed = True`) và một số ít game tiêu biểu của Creator để trích xuất vào Question Bank.
   - **Bảo lưu nguồn gốc:**
     - Game hệ thống: `creator_id = "system"`, `visibility = "system"`.
     - Game của Creator: `creator_id = game.creator_id`, `source_game_id = game.id`, `source_game_version = 1`, `visibility = "private"`.
   - Cột `games.levels` của các game được trích xuất vẫn được giữ nguyên vẹn 100% byte-for-byte.
   - Kế hoạch **TUYỆT ĐỐI KHÔNG ĐƯỢC ÁM CHỈ** rằng "toàn bộ 100 màn chơi cũ biến thành tài sản hệ thống của Question Bank".

---

## 13. RECONCILIATION OF 09/09 AUDIT FINDINGS (ĐỐI CHIẾU 25 KẾT LUẬN AUDIT)

Dưới đây là bảng đối chiếu thực tế 100% mã nguồn hiện hành với 25 vấn đề từ đợt Full System Audit ngày 09/09/2026. Mỗi mục được phân loại chính xác vào một trong các trạng thái: `FIXED`, `PARTIALLY_FIXED`, `STILL_PRESENT`, `FALSE_POSITIVE`, `DEFERRED`, `NOT_VERIFIED`:

| ID | Vấn Đề Từ Audit 09/09/2026 | Bằng Chứng Thực Tế Codebase | Trạng Thái Phân Loại | Mức Độ Ảnh Hưởng | Hướng Khắc Phục Kiến Trúc | Phase Xử Lý |
|---|---|---|---|---|---|---|
| **F01** | Classic engines client-side grading | Máy chủ chấm độc lập tại `backend/app/game_evaluator.py:39-503`, gọi từ `attempts.py:237`. | **FIXED** | Cao (Gian lận điểm) | Duy trì cơ chế hiện hành. | Phase 0 |
| **F02** | Quiz substring matching bug | Đã sửa so khớp chính xác và tiền tố tại `QuizEngine.tsx:27-30` & `game_evaluator.py:92-106`. | **FIXED** | Trung bình | Duy trì cơ chế hiện hành. | Phase 1 |
| **F03** | Language duplicate token issue | Quản lý token bằng UID `{ id: idx, text: w }` tại `LanguageEngine.tsx:8-11, 83-87`. | **FIXED** | Trung bình | Duy trì cơ chế hiện hành. | Phase 1 |
| **F04** | Sequence type mismatch | Chuẩn hóa string qua `_clean_str` tại `game_evaluator.py:176-180`. | **FIXED** | Thấp | Duy trì cơ chế hiện hành. | Phase 1 |
| **F05** | Memory timer cleanup | Hủy interval sạch sẽ tại `QuestionRenderer.tsx:49-54` (`clearInterval`). | **FIXED** | Thấp | Duy trì cơ chế hiện hành. | Phase 1 |
| **F06** | Flashcard reward issue | Client gửi `cardsViewed` (`FlashcardEngine.tsx:20`), server kiểm tra đủ thẻ (`game_evaluator.py:243`). | **FIXED** | Thấp | Duy trì cơ chế hiện hành. | Phase 1 |
| **F07** | Observation missing data | Thẩm định ma trận và tọa độ tại `schemas.py:348-360` & `game_evaluator.py:321-341`. | **FIXED** | Thấp | Duy trì cơ chế hiện hành. | Phase 1 |
| **F08** | Sorting no undo | Chạm thẻ để hoàn tác tại `SortingEngine.tsx:56-61, 74-85` (`handleReturnItem`). | **FIXED** | Thấp | Duy trì cơ chế hiện hành. | Phase 1 |
| **F09** | Math answer leak | Xóa hoàn toàn `${correctAnswer} = ?` tại `MathEngine.tsx:65-69`; `schemas.py:484` loại bỏ answer. | **FIXED** | Cao (Lộ đáp án) | Duy trì cơ chế hiện hành. | Phase 1 |
| **F10** | Logic Grid hardcoded fallback | Bỏ fallback `'🍎'`, so khớp thực tế tại `LogicGridEngine.tsx:23-50` & `game_evaluator.py:415-438`. | **FIXED** | Thấp | Duy trì cơ chế hiện hành. | Phase 1 |
| **F11** | Classic engines server-blind | Bộ chấm `evaluate_game_answer` hỗ trợ toàn bộ 12 engines tại `game_evaluator.py`. | **FIXED** | Cao | Duy trì cơ chế hiện hành. | Phase 1 |
| **F12** | Backend validation thiếu engines | `AddLevelQuestionIn.validate_game_data` (`schemas.py:255-385`) kiểm tra đủ 12 engines. | **FIXED** | Trung bình | Tách Coding/Scratch ra khỏi danh mục Base Engine. | Phase 1 |
| **F13** | Quiz schema chưa check answer in options | Kiểm tra `clean_ans in clean_opts` tại `schemas.py:277-287`. | **FIXED** | Trung bình | Duy trì cơ chế hiện hành. | Phase 1 |
| **F14** | Client submit score/completed | Điểm số và trạng thái hoàn thành từ client bị bỏ qua tại `attempts.py:162-164, 237-248`. | **FIXED** | Cao (Gian lận điểm) | Duy trì cơ chế hiện hành. | Phase 0 |
| **F15** | Attempt auth/security issues | Bắt buộc JWT và chặn IDOR tại `attempts.py:156, 168-172`. | **FIXED** | Cao | Thêm quyền miễn phí cho Creator tại Phase 0. | Phase 0 |
| **F16** | Answer exposure (Lộ đáp án) | `sanitize_game_levels_for_learner` lọc sạch đáp án tại `schemas.py:467-559` & `games.py:134`. | **FIXED** | Cao (Học sinh đọc đáp án) | Duy trì cơ chế hiện hành. | Phase 0 |
| **F17** | JSONB monolithic architecture | Toàn bộ màn chơi vẫn lưu dính liền trong cột `Game.levels` (`models.py:83`). | **STILL_PRESENT** | Trung bình (Khó tái sử dụng) | Triển khai Question Bank làm Reusable Content Layer kết hợp Published Snapshot. | Phase 2, 4 |
| **F18** | AI prompt token collision | Đã có prompt chuẩn (`ai_content.py:558`), nhưng sinh 20 màn 1 lần dễ vượt token limit. | **PARTIALLY_FIXED** | Trung bình | Chia nhỏ tiến trình sinh câu hỏi (Batch 5 câu/lần) cho Admin AI Factory. | Phase 8 |
| **F19** | Duplicate level cloning (Padding Spam) | `pad_to_count=False` khi tạo tay (`admin.py:78`), nhưng import pack vẫn nhân bản 20 màn (`admin.py:484`). | **PARTIALLY_FIXED** | Trung bình (Rác dữ liệu) | Tắt hoàn toàn `pad_to_count=True` trong `upload_games`. | Phase 3 |
| **F20** | Stored XSS trong JSON Import | Chưa có cơ chế sanitize chuỗi HTML/script khi nạp JSON tại `admin.py:421`. | **STILL_PRESENT** | Cao (Tấn công XSS) | Tẩy sạch HTML tags nguy hiểm trước khi lưu vào DB. | Phase 0 |
| **F21** | SB3 zip bomb / zip slip | 5 lớp bảo vệ tại `sb3_serializer.py:72-78` (15MB nén, 50MB giải nén, chặn `..`). | **FIXED** | Cao | Duy trì trong phân hệ Scratch riêng biệt. | Phân hệ Scratch |
| **F22** | System game authorization | Chặn xóa và chỉnh sửa game `is_seed=True` tại `admin.py:39-40, 362-363`. | **FIXED** | Cao | Duy trì cơ chế hiện hành. | Phase 0 |
| **F23** | No frontend test coverage | `package.json` chưa có script test runner cho React/Vite (Backend có 80 pytest passed). | **STILL_PRESENT** | Trung bình | Thiết lập Vitest và test suites cho 10 Base Engines. | Phase 10 |
| **F24** | Idempotency & Replay attacks | Sử dụng `clientAttemptId` (`attempts.py:260`) và unique constraints cho quest/spin (`models.py:260-300`). | **FIXED** | Cao | Duy trì cơ chế hiện hành. | Phase 0 |
| **F25** | API contract mismatches | `src/services/api.ts` đã đồng bộ toàn bộ payload và response của backend routers. | **FIXED** | Trung bình | Duy trì và mở rộng schema cho Question Bank API. | Phase 1, 2 |

---

## 14. ARCHITECTURAL DECISIONS (CÁC QUYẾT ĐỊNH KIẾN TRÚC ĐÃ CHỐT)

1. **Quyết định 1 (Question Bank Semantics):** Question Bank là Canonical Reusable Content Layer; Published Games là Immutable Content Snapshots.
2. **Quyết định 2 (No AI Token Cost for Creators):** Creator hoàn toàn không gọi AI API nội bộ. Creator tự dùng AI bên ngoài và sử dụng luồng "Import nội dung" JSON có Preview.
3. **Quyết định 3 (Dual Hashes & Engine-Aware Deduplication):** Sử dụng `content_hash` và `normalized_hash` nhận biết đặc thù ngữ nghĩa của 10 Base Engines, không dùng Vector DB.
4. **Quyết định 4 (Unified Creator/Teacher Model):** Hợp nhất quyền hạn của Teacher và Creator thành một khái niệm tác giả duy nhất.
5. **Quyết định 5 (Integer Revenue Sharing):** Tính toán chia sẻ doanh thu bằng toán học số nguyên (Integer Floor Division) và snapshot tỷ lệ vào bảng `purchases`.
6. **Quyết định 6 (Controlled Pilot Migration):** Chỉ di trú thí điểm 5 game seed và select creator games, giữ nguyên vẹn 100% cột `games.levels` cũ.

---

## 15. RISKS & DEFERRED ITEMS (RỦI RO & CÁC MỤC HOÃN LẠI)

1. **Các hạng mục hoãn lại (Deferred Items):**
   - **Vector Database / Embedding Models:** Hoãn lại đến khi quy mô câu hỏi vượt 100,000 câu.
   - **Phân hệ Khóa Học Training & Quản Lý Lớp Học Classroom:** Hoãn phần code UI/Business Logic; cấu trúc DB của Question Bank đã sẵn sàng hỗ trợ mà không cần sửa đổi sau này.
   - **Thị trường mua bán câu hỏi lẻ giữa các tác giả:** Chỉ cho phép Creator dùng câu hỏi của chính mình và của hệ thống.
2. **Rủi ro và biện pháp giảm thiểu:**
   - *Rủi ro tràn ngập game clone:* Áp dụng kiểm tra tương đồng Jaccard theo 3 phân cấp (<0.60, 0.60-0.80, >=0.80) và cảnh báo/chặn thông minh.
   - *Rủi ro biến động doanh thu lịch sử:* Lưu snapshot số xu `creator_revenue` và `platform_revenue` ngay khi phát sinh giao dịch trong bảng `purchases`.
