# BÁO CÁO KIỂM ĐỊNH THỰC TẾ ĐỘC LẬP (FINAL INDEPENDENT VERIFICATION AUDIT)

**Dự án:** IQ Kid Market — Sàn Đấu Trí Tuệ & Nền Tảng Học Tập Trực Tuyến  
**Thời điểm thực hiện:** 11/09/2026  
**Phương pháp:** Static Code Analysis & Dynamic Code Tracing trực tiếp trên toàn bộ source code (Không dựa trên bất kỳ báo cáo lý thuyết nào).  
**Nguyên tắc:** READ-ONLY — Tuyệt đối không sửa code, không migrate DB, không giả định trạng thái đã xong.

---

## 1. EXECUTIVE SUMMARY (TỔNG QUAN ĐIỀU HÀNH)

Đợt kiểm định độc lập này được thực hiện nhằm đối chiếu thực tế từng dòng mã nguồn hiện hành của IQ Kid Market với các tuyên bố trong tài liệu kiến trúc.

**Kết quả kiểm định tổng thể:**
1. **Server-Side Grading cốt lõi ĐÃ HOẠT ĐỘNG:** Đa số các engine đã có logic chấm điểm server-side tại `backend/app/game_evaluator.py`, được kích hoạt từ `backend/app/routers/attempts.py`. Máy chủ là nơi quyết định điểm số và XP lưu vào cơ sở dữ liệu.
2. **Nhiều lỗ hổng bảo mật P0 VẪN ĐANG TỒN TẠI TRONG CODE THỰC TẾ:**
   - **Tự cấp tiền ví qua `confirm-topup`:** Endpoint `POST /api/wallet/confirm-topup` (`wallet.py:143`) cho phép bất kỳ user nào (kể cả học sinh) tự xác nhận nạp tiền cho chính mình với số tiền tùy ý.
   - **Creator bị khóa màn chơi (Creator Lockout):** Tác giả game bị chặn chơi từ màn 6 trở đi trên game của chính mình (`attempts.py:207`).
   - **Stored XSS trong JSON Import:** `POST /api/admin/games/upload` (`admin.py:421`) hoàn toàn không lọc thẻ HTML/JavaScript độc hại.
   - **DoS qua Payload không giới hạn:** `UploadGamesIn(gameObject: Any)` không có giới hạn 2MB.
   - **Doanh thu 80% gắn cứng & Dùng số thực:** `games.py:206` gắn cứng `int(game.price * 0.8)`. Bảng `platform_settings` và các cột snapshot chưa hề tồn tại trong DB.
3. **Question Bank & GameVersion CHƯA TỒN TẠI TRONG CODEBASE:**
   - Bảng `questions` chưa tồn tại trong `models.py`.
   - Bảng `game_blueprints` chưa tồn tại.
   - Bảng `game_versions` chưa tồn tại.
   - Khi Creator sửa game, cột `games.levels` bị ghi đè trực tiếp (`admin.py:327`), làm thay đổi nội dung mà người mua cũ đang thấy.
4. **Kết luận mức độ sẵn sàng:** **NOT READY** (Bắt buộc phải khắc phục các lỗ hổng P0 trước khi đưa vào vận hành thực tế).

---

## 2. SECURITY P0 VERIFICATION (KIỂM ĐỊNH BẢO MẬT P0)

Dưới đây là bảng đánh giá chi tiết từng endpoint trọng yếu dựa trên mã nguồn thực tế:

### 2.1. Endpoint `POST /api/attempts/submit`
- **File & Hàm:** `backend/app/routers/attempts.py` -> `submit_attempt` (Dòng 153-457).
- **1. Authentication bắt buộc?** CÓ (`Depends(get_current_user_required)` tại dòng 156).
- **2. Danh tính User đến từ đâu?** Đến từ JWT Token (`current_user`).
- **3. Có tin tưởng `userId` từ client?** KHÔNG. Dòng 168-172 kiểm tra: `if body.userId and body.userId != current_user.id and current_user.role != "admin": raise HTTPException(403)`. Gán `user = current_user`.
- **4. User A có thể nộp bài cho User B?** KHÔNG (Bị chặn 403 Forbidden).
- **5. Phân quyền server-side?** CÓ, kiểm tra quyền truy cập màn chơi qua `can_access_level(body.levelNum, owned)`.
- **6. Tính lũy đẳng (Idempotency)?** CÓ, dòng 261-272 kiểm tra `clientAttemptId` và bản ghi `existing_attempt`.
- **7. Race condition?** THẤP, điểm số và bản ghi attempt được lưu độc lập theo UUID.
- **TỒN TẠI LỖI P0 (Creator Lockout):** Dòng 201-207 chỉ kiểm tra `owned = (db.query(models.Purchase)... is not None)`. Nếu `user.id == game.creator_id`, tác giả vẫn bị coi là chưa mua và bị chặn tại màn 6+ với mã 403 Forbidden!
- **Trạng thái:** **PARTIALLY_FIXED** (Auth/IDOR tốt, nhưng Creator bị lockout).

### 2.2. Endpoint `POST /api/games/purchase`
- **File & Hàm:** `backend/app/routers/games.py` -> `purchase_game` (Dòng 140-230).
- **1. Authentication bắt buộc?** CÓ (`Depends(get_current_user_required)` tại dòng 142).
- **2. Danh tính User đến từ đâu?** Từ JWT Token (`current_user.id`).
- **3. Có tin tưởng `userId` từ client?** KHÔNG. Dòng 154-156: `if body.userId and body.userId != current_user.id and current_user.role != "admin": raise HTTPException(403)`.
- **4. User A có thể dùng ví User B để mua?** KHÔNG (Bị chặn 403).
- **5. Phân quyền server-side?** CÓ, kiểm tra số dư ví và quyền mua game.
- **6. Tính lũy đẳng (Idempotency)?** Dòng 173 kiểm tra `already = db.query(models.Purchase)...`, nếu đã mua trả về 400.
- **7. Race condition?** Ví người mua được khóa bi quan bằng `.with_for_update()` (dòng 162). Tuy nhiên, bảng `purchases` **CHƯA CÓ** UniqueConstraint trên `(user_id, game_id)` ở tầng DB.
- **TỒN TẠI LỖI P0:** Dòng 206 hardcode tỷ lệ 80% dạng float: `revenue_share = int(game.price * 0.8)`. Không có snapshot tỷ lệ phân chia trong bảng `purchases`.
- **Trạng thái:** **PARTIALLY_FIXED**.

### 2.3. Endpoint `POST /api/wallet/topup`
- **File & Hàm:** `backend/app/routers/wallet.py` -> `topup_wallet` (Dòng 21-80).
- **1. Authentication bắt buộc?** CÓ (`Depends(get_current_user_required)`).
- **2. Danh tính User đến từ đâu?** Từ JWT Token.
- **3. Có tin tưởng `userId` từ client?** Dòng 32 kiểm tra nghiêm ngặt: `if current_user.role != "admin": raise HTTPException(403)`. Chỉ Admin mới được dùng.
- **4. User A có thể nạp tiền cho User B?** Chỉ Admin mới có quyền chỉ định `target_user_id`.
- **5. Phân quyền server-side?** CÓ (Khóa role admin).
- **6. Tính lũy đẳng?** Mỗi lần gọi sinh `tx_topup_{timestamp}`.
- **7. Race condition?** Dòng 45 dùng `.with_for_update()` khóa hàng ví.
- **Trạng thái:** **FIXED** (An toàn cho nội bộ admin).

### 2.4. Endpoint `POST /api/wallet/confirm-topup`
- **File & Hàm:** `backend/app/routers/wallet.py` -> `confirm_topup` (Dòng 128-184).
- **1. Authentication bắt buộc?** CÓ (`Depends(get_current_user_optional)` kết hợp dòng 138 `if not current_user: raise HTTPException(401)`).
- **2. Danh tính User đến từ đâu?** Từ JWT Token.
- **3. Có tin tưởng `userId` từ client?** **CÓ — ĐÂY LÀ LỖ HỔNG P0 NGHIÊM TRỌNG!**
  - Xem dòng 143:
    ```python
    if current_user.role != "admin" and current_user.id != body.userId:
        raise HTTPException(status_code=403, detail="...")
    ```
  - **Hệ quả thực tế:** Nếu một học sinh bình thường (`role == "student"`) đăng nhập và gửi `body.userId = current_user.id` kèm `amount = 500000` và `tx_id = uuid4()`, điều kiện kiểm tra trên **HOÀN TOÀN THỎA MÃN**!
  - Dòng 166: `wallet.balance += amount` -> Học sinh tự nạp tiền miễn phí vô hạn vào ví Sao IQ của mình!
- **4. User A có thể nạp cho User B?** Bị chặn, nhưng User A tự nạp cho User A không giới hạn.
- **5. Phân quyền server-side?** **LỖI LOGIC NGHIÊM TRỌNG** (Docstring ghi chỉ dành cho Admin nhưng code cho phép chính user tự xác nhận).
- **Trạng thái:** **STILL_PRESENT (CRITICAL SECURITY VULNERABILITY P0)**.

### 2.5. Endpoint `POST /api/gamification/claim-login-reward` & `lucky-spin`
- **File & Hàm:** `backend/app/routers/quests.py` -> `claim_login_reward` (dòng 115) & `lucky_spin` (dòng 199).
- **1. Authentication bắt buộc?** CÓ (`get_current_user_required`).
- **2. Danh tính User đến từ đâu?** Xác thực qua hàm `_require_user(body.userId, db, current_user)` (dòng 25-47), bắt buộc `current_user.id == user_id` hoặc role admin.
- **3. Có tin tưởng client userId?** KHÔNG (Chặn IDOR).
- **4. User A thao tác tài khoản B?** KHÔNG (403 Forbidden).
- **5. Phân quyền server-side?** CÓ.
- **6. Tính lũy đẳng?** CÓ. Login reward có ID `login_reward_{user.id}_{today}` (dòng 164) và rollback nếu trùng; Lucky Spin kiểm tra cờ `spin.spun` (dòng 215).
- **7. Race condition?** Dòng 210 sử dụng `.with_for_update()` khóa bản ghi spin trong ngày.
- **Trạng thái:** **FIXED**.

### 2.6. Quản lý Game: Edit, Delete & System Game Protection
- **File & Hàm:** `backend/app/routers/admin.py` -> `_assert_can_edit_game` (dòng 36-46), `update_game` (dòng 275), `delete_game` (dòng 352).
- **1. Authentication bắt buộc?** CÓ (`require_roles(["admin", "teacher", "creator"])`).
- **2. Quyền sở hữu:** `_assert_can_edit_game` kiểm tra `if not game.creator_id or game.creator_id != current_user.id: raise HTTPException(403)`.
- **3. Bảo vệ Game Seed hệ thống:**
  - Khi sửa: Dòng 39 chặn `if game.is_seed: raise HTTPException(400)`.
  - Khi xóa: Dòng 362 chặn `if game.is_seed and current_user.role != "admin": raise HTTPException(400)`.
- **TỒN TẠI LỖI KIẾN TRÚC:**
  - Khi Creator sửa game, dòng 327 ghi đè trực tiếp `game.levels = levels` lên live database, sau đó hạ `is_published = False`. Không có cơ chế versioning, làm gián đoạn người học đã mua.
- **Trạng thái:** **PARTIALLY_FIXED**.

---

## 3. SERVER-SIDE GRADING VERIFICATION (KIỂM ĐỊNH CHẤM ĐIỂM SERVER-SIDE)

Đã lần vết toàn bộ luồng chấm điểm từ Client đến Server:

```
[Client] GamePlayPage.tsx: handleLevelComplete(score, submittedAnswer)
   │
   ▼ POST /api/attempts/submit { userId, gameId, levelNum, score, completed: true, submittedAnswer }
[Server] attempts.py: submit_attempt
   ├── 1. Xác thực JWT Token & Chặn IDOR
   ├── 2. Bỏ qua hoàn toàn client score & client completed
   ├── 3. Lấy question_type và question_data từ game.levels trong DB
   ├── 4. Gọi evaluate_game_answer(question_type, question_data, submittedAnswer, max_points)
   │         │
   │         ▼
   │      [game_evaluator.py] Thực thi thuật toán so khớp đặc thù engine
   │         └── Trả về EvaluationResult(is_correct, score, stars, feedback, hint)
   │
   ├── 5. Ghi Attempt vào DB: score = eval_result.score, completed = eval_result.is_correct
   ├── 6. Tính toán XP và Xu thưởng từ DB (không nhận từ client)
   └── 7. Trả về kết quả chính thức cho Client
```

- **Xác nhận thực tế:** Client **KHÔNG THỂ** gian lận điểm số hay trạng thái hoàn thành bằng cách sửa payload gửi lên (`body.score` và `body.completed` bị máy chủ ghi đè 100% bằng kết quả của `evaluate_game_answer`).
- **Ngoại lệ:** Admin Preview (`user.role == "admin" and not body.submittedAnswer` tại `attempts.py:176`) trả về điểm giả lập và **không ghi vào database**.

---

## 4. ANSWER EXPOSURE VERIFICATION (KIỂM ĐỊNH RÒ RỈ ĐÁP ÁN)

Đã kiểm tra hàm `sanitize_game_levels_for_learner` tại `backend/app/schemas.py:467-559` và endpoint `GET /api/games/{game_id}` (`games.py:112-136`):

1. **Các Engine đã giấu đáp án thành công:**
   - `quiz`: Bỏ trường `answer`, `explanation`.
   - `math`: Bỏ trường `answer`, `result`, `explanation`.
   - `sequence`: Bỏ trường `answer`, `explanation`.
   - `sorting`: Bỏ trường `correct_order`, `correct_sequence_ids`, `explanation`.
   - `language`: Bỏ trường `answer`, `target_word`, `target_sentence`, `correct_order`, `explanation`.
   - `observation`: Bỏ trường `answer`, `target_row`, `target_col`, `target_coordinates`, `explanation`.
   - `logic_grid`: Bỏ trường `answer`, `explanation`.
   - `coding` & `scratch`: Bỏ trường `answer`, `expected_output`, `target_block_sequence`, `expected_path`.

2. **Các điểm hở đáp án thực tế:**
   - **`matching` Engine:** `data.pairs` chứa danh sách các cặp `{left, right}`. Vì frontend cần biết các thẻ bài để render nên toàn bộ mảng `pairs` được gửi về cho client. Học sinh mở Network tab có thể xem trước toàn bộ các cặp ghép đúng. (Đây là giới hạn của thiết kế engine hiện tại).
   - **`memory` Engine:** `data.items` chứa danh sách các phần tử cần lật.

---

## 5. QUESTION BANK VERIFICATION (KIỂM ĐỊNH QUESTION BANK)

- **Question Bank có tồn tại trong code hiện tại không?**
  $$\mathbf{KHÔNG\ TỒN\ TẠI\ (NOT\ IMPLEMENTED\ —\ ARCHITECTURE\ ONLY)}$$
- **Chi tiết kiểm chứng mã nguồn:**
  - Bảng `questions` không có trong `backend/app/models.py`.
  - Không có migration hay script tạo bảng `questions`.
  - Không có trường `creator_id`, `visibility`, `source_game_id`, `source_game_version` độc lập cho câu hỏi.
  - Không có API `GET /api/questions` hay `POST /api/questions`.
  - Không thể kiểm tra quyền Creator A vs Creator B vì đối tượng chưa hề tồn tại trong code.
- **Kết luận:** Mọi mô tả về Question Bank trong các tài liệu trước đây hoàn toàn là **Kế hoạch tương lai (Planned Architecture)**, chưa có dòng code thực tế nào.

---

## 6. JSON IMPORT VERIFICATION (KIỂM ĐỊNH JSON IMPORT)

Kiểm tra trực tiếp endpoint `POST /api/admin/games/upload` (`backend/app/routers/admin.py:421-560`):

| Tiêu Chí Kiểm Tra | Hiện Trạng Thực Tế Codebase | Đánh Giá |
|---|---|---|
| **Schema Validation** | Kiểm tra `title`, `template_code` thuộc `TEXT_PACK_TEMPLATES`. Gọi `validate_game_data(q_type, q_data)` cho từng màn. | **ĐÃ CÓ** |
| **Engine Validation** | Chặn template lạ qua `is_text_pack_template(template_code)`. | **ĐÃ CÓ** |
| **Answer Validation** | `validate_game_data` kiểm tra đáp án hợp lệ trong options. | **ĐÃ CÓ** |
| **Duplicate Detection** | Không có dòng code nào kiểm tra trùng lặp câu hỏi hay so sánh hash. | **CHƯA CÓ (PLANNED)** |
| **Padding / Clone Spam** | Dòng 484: `pad_to_count=bool(g.get("level_template") or g.get("target_level_count"))` tự động nhân bản 1 câu mẫu thành 20 màn giống hệt nhau. | **LỖI KIẾN TRÚC VẪN TỒN TẠI** |
| **Staging / Preview** | Không có endpoint preview. Dán JSON là ghi thẳng vào DB qua `db.commit()` (dòng 543). | **CHƯA CÓ (PLANNED)** |
| **Data Mutation Safety** | Nếu import đè game đã có id (`existing`), các trường bị ghi đè trực tiếp (dòng 536-537). | **KHÔNG AN TOÀN** |
| **XSS Sanitization** | `prompt`, `title`, `description` được lưu thô vào DB mà không có bước strip tags hay HTML sanitizer. | **LỖ HỔNG P0 VẪN TỒN TẠI** |
| **Payload Size Limits** | `body: schemas.UploadGamesIn` nhận `gameObject: Any` không có middleware hay validator giới hạn 2MB. | **LỖ HỔNG P0 VẪN TỒN TẠI** |
| **Production Preview** | Không có giao diện hay API preview. | **CHƯA CÓ (PLANNED)** |

---

## 7. MARKETPLACE / REVENUE VERIFICATION (KIỂM ĐỊNH DOANH THU & CHỢ GAME)

Kiểm tra trực tiếp endpoint `POST /api/games/purchase` (`backend/app/routers/games.py:139-230`):

1. **Tỷ lệ chia sẻ doanh thu có cấu hình được không?**
   - **KHÔNG.** Dòng 206 gắn cứng: `revenue_share = int(game.price * 0.8)`.
   - Bảng `platform_settings` **HOÀN TOÀN CHƯA TỒN TẠI** trong cơ sở dữ liệu (`models.py`).
2. **Có dùng toán học số nguyên không?**
   - **KHÔNG THUẦN TÚY.** Code đang dùng phép nhân số thực: `game.price * 0.8` rồi mới ép kiểu `int()`.
3. **Có snapshot phân chia doanh thu vào giao dịch mua không?**
   - **KHÔNG.** Bảng `purchases` (`models.py:104-115`) chỉ có các cột: `id`, `user_id`, `game_id`, `purchased_price`, `purchased_at`. Không có `creator_revenue`, không có `platform_revenue`, không có `revenue_share_percent_snapshot`.
4. **Giá trị giao dịch lịch sử có bị thay đổi nếu sửa cài đặt không?**
   - Lịch sử biến động số dư ví (`WalletTransaction`) ghi nhận `amount = revenue_share`, nhưng bảng `purchases` không có dữ liệu đối soát phân chia doanh thu.
5. **Giao dịch trùng lặp khi chạy đồng thời (Concurrency)?**
   - Ví người mua được khóa bi quan bằng `with_for_update()`, nhưng bảng `purchases` chưa có ràng buộc duy nhất `UniqueConstraint("user_id", "game_id")`.
6. **Creator có thể thao túng `userId` khi mua không?**
   - KHÔNG, dòng 154-156 chặn IDOR bằng cách kiểm tra `body.userId == current_user.id`.

---

## 8. VERIFY THE 10 ENGINE CONTRACTS (KIỂM ĐỊNH HỢP ĐỒNG 10 ENGINES)

Dưới đây là ma trận kiểm định chi tiết từng engine trong số 10 Base Engines:

| ENGINE | CURRENT CLIENT INPUT | SERVER EVALUATION | ANSWER EXPOSURE | REWARD SOURCE | KNOWN BUG / VẤN ĐỀ | STATUS |
|---|---|---|---|---|---|---|
| **1. quiz** | `{ selectedOption: string }` | So khớp chính xác hoặc tiền tố với `data.answer` (`game_evaluator.py:73-121`) | Đáp án đã được giấu hoàn toàn qua `sanitize_question_data_for_learner` | Server tính toán từ `max_points` và kết quả đúng/sai | Không có | **VERIFIED SOLID** |
| **2. matching** | `{ pairs: [{ left: string, right: string }] }` | Kiểm tra từng cặp với tập hợp `canonical_pairs` (`game_evaluator.py:124-173`) | **LỘ ĐÁP ÁN:** Toàn bộ mảng `pairs` `{left, right}` được gửi về client để render | Server tính theo tỷ lệ số cặp ghép đúng (`matched_count / total_needed`) | Client có thể đọc trước đáp án từ `data.pairs` | **PARTIALLY VERIFIED** |
| **3. sequence** | `{ answer: string }` | So khớp chuỗi sau khi làm sạch qua `_clean_str` (`game_evaluator.py:175-199`) | Đáp án đã được giấu | Server tính điểm (max_points) | Không có | **VERIFIED SOLID** |
| **4. memory** | `{ completed: bool, flipsCount: int, matchesCount: int }` | Kiểm tra `completed == True`, `matches >= total`, `flips >= min_flips` (`game_evaluator.py:201-231`) | Client nhận danh sách `items` (tất cả thẻ bài) | Server tính điểm | **WEAK EVALUATION:** Client gửi `completed: true` kèm số lần lật giả lập là được tính điểm tối đa | **PARTIALLY VERIFIED** |
| **5. flashcard** | `{ completed: bool, cardsViewed: int }` | Kiểm tra `cards_viewed >= total_cards` (`game_evaluator.py:233-256`) | Thẻ bài hiển thị nội dung công khai (mục đích học tập) | Server tính điểm | Đây là thẻ học tập đọc hiểu, không có đáp án đúng/sai | **VERIFIED SOLID** |
| **6. language** | Unscramble: `{ tokens: string[] }`<br>Fill blank: `{ answer: string }` | Unscramble: So khớp thứ tự mảng từ.<br>Fill blank: So khớp từ điền vào (`game_evaluator.py:258-319`) | Đáp án `answer`, `target_word`, `correct_order` đã được giấu | Server tính điểm | Không có | **VERIFIED SOLID** |
| **7. observation** | `{ row: int, col: int, cell: string, answer: string }` | So khớp tọa độ `(user_r == target_r and user_c == target_c)` hoặc `user_val == target_val` (`game_evaluator.py:321-355`) | Tọa độ `target_row`, `target_col` và `answer` đã được giấu | Server tính điểm | Không có | **VERIFIED SOLID** |
| **8. sorting** | `{ orderedIds: string[] }` | So khớp chính xác thứ tự mảng `clean_user_ids == correct_ids` (`game_evaluator.py:357-386`) | Mảng `correct_sequence_ids` và `correct_order` đã được giấu | Server tính điểm | Không có | **VERIFIED SOLID** |
| **9. math** | `{ answer: string }` | So khớp chuỗi với `data.answer` (`game_evaluator.py:389-413`) | Đáp án và lời giải đã được giấu | Server tính điểm | Đã xóa triệt để lỗi lộ đáp án `${correctAnswer} = ?` | **VERIFIED SOLID** |
| **10. logic_grid** | `{ selectedOption: string }` | So khớp với `data.answer` (`game_evaluator.py:415-439`) | Đáp án `answer` đã được giấu | Server tính điểm | Đã bỏ fallback `'🍎'` | **VERIFIED SOLID** |

---

## 9. GAME VERSIONING VERIFICATION (KIỂM ĐỊNH PHIÊN BẢN GAME)

- **Mô hình `GameVersion` có tồn tại không?**
  $$\mathbf{KHÔNG\ TỒN\ TẠI\ (NOT\ IMPLEMENTED)}$$
- **Nội dung Game đã xuất bản có bất biến không?**
  - **KHÔNG.** Khi Creator sửa game qua `PUT /api/admin/games/{id}` (`admin.py:327`), câu lệnh `game.levels = levels` ghi đè trực tiếp lên hàng dữ liệu đang live trong bảng `games`.
- **Học sinh đã mua game có bị ảnh hưởng khi Creator sửa game không?**
  - **CÓ.** Học sinh gọi `GET /api/games/{id}` sẽ lập tức nhận nội dung mới chưa qua kiểm duyệt duyệt xong của Creator.
  - Đồng thời, cờ `is_published` bị hạ xuống `False` (dòng 333), khiến game biến mất khỏi danh sách Marketplace (`games.py:78`).
- **Lịch sử mua hàng có liên kết với phiên bản bất biến không?**
  - **KHÔNG.** Bảng `purchases` chỉ lưu khóa ngoại `game_id`, không có `version_id`.

---

## 10. RECHECK ALL 25 AUDIT FINDINGS (ĐỐI CHIẾU 25 PHÁT HIỆN TỪ AUDIT 09/09/2026)

Bảng đối chiếu kiểm chứng độc lập 100% mã nguồn thực tế:

| ID | Vấn Đề Gốc (09/09/2026) | Bằng Chứng Thực Tế Codebase | Trạng Thái Phân Loại | Mức Độ Ảnh Hưởng | Kế Hoạch Xử Lý Thực Tế |
|---|---|---|---|---|---|
| **F01** | Classic engines client-side grading | Đã có bộ chấm máy chủ `backend/app/game_evaluator.py:39-503`, gọi từ `attempts.py:237`. | **FIXED** | Cao | Đã hoàn thành trong đợt 09/09. |
| **F02** | Quiz substring matching bug | Đã sửa so khớp chính xác tại `QuizEngine.tsx:27-30` & `game_evaluator.py:92-106`. | **FIXED** | Trung bình | Đã hoàn thành trong đợt 09/09. |
| **F03** | Language duplicate token issue | Quản lý token bằng UID `{ id: idx, text: w }` tại `LanguageEngine.tsx:8-11`. | **FIXED** | Trung bình | Đã hoàn thành trong đợt 09/09. |
| **F04** | Sequence type mismatch | Chuẩn hóa string qua `_clean_str` tại `game_evaluator.py:176-180`. | **FIXED** | Thấp | Đã hoàn thành trong đợt 09/09. |
| **F05** | Memory timer cleanup | Hủy interval sạch sẽ tại `QuestionRenderer.tsx:49-54` (`clearInterval`). | **FIXED** | Thấp | Đã hoàn thành trong đợt 09/09. |
| **F06** | Flashcard reward issue | Client gửi `cardsViewed`, server kiểm tra đủ thẻ (`game_evaluator.py:243`). | **FIXED** | Thấp | Đã hoàn thành trong đợt 09/09. |
| **F07** | Observation missing data | Thẩm định ma trận tại `schemas.py:348-360` & `game_evaluator.py:321-341`. | **FIXED** | Thấp | Đã hoàn thành trong đợt 09/09. |
| **F08** | Sorting no undo | Chạm thẻ để hoàn tác tại `SortingEngine.tsx:56-61, 74-85`. | **FIXED** | Thấp | Đã hoàn thành trong đợt 09/09. |
| **F09** | Math answer leak | Xóa hoàn toàn `${correctAnswer} = ?` tại `MathEngine.tsx:65-69`. | **FIXED** | Cao | Đã hoàn thành trong đợt 09/09. |
| **F10** | Logic Grid hardcoded fallback | Bỏ fallback `'🍎'`, so khớp thực tế tại `LogicGridEngine.tsx` & `game_evaluator.py:415`. | **FIXED** | Thấp | Đã hoàn thành trong đợt 09/09. |
| **F11** | Classic engines server-blind | Bộ chấm `evaluate_game_answer` hỗ trợ đủ các engine tại `game_evaluator.py`. | **FIXED** | Cao | Đã hoàn thành trong đợt 09/09. |
| **F12** | Backend validation thiếu engines | `AddLevelQuestionIn.validate_game_data` (`schemas.py:255-385`) kiểm tra đủ 12 engines. | **FIXED** | Trung bình | Cần tách Coding/Scratch ở Phase 1. |
| **F13** | Quiz schema chưa check answer in options | Kiểm tra `clean_ans in clean_opts` tại `schemas.py:277-287`. | **FIXED** | Trung bình | Đã hoàn thành trong đợt 09/09. |
| **F14** | Client submit score/completed | Server bỏ qua điểm client và chấm độc lập tại `attempts.py:162-164, 237-248`. | **FIXED** | Cao | Đã hoàn thành trong đợt 09/09. |
| **F15** | Attempt auth/security issues | Bắt buộc JWT và chặn IDOR tại `attempts.py:156, 168-172`. Tuy nhiên, Creator bị khóa màn 6+. | **PARTIALLY_FIXED** | Cao | Cần mở quyền cho Creator tại Phase 0. |
| **F16** | Answer exposure (Lộ đáp án) | `sanitize_game_levels_for_learner` lọc đáp án cho 10 engines. Riêng `matching` vẫn lộ mảng `pairs`. | **PARTIALLY_FIXED** | Cao | Đã xử lý 90%, matching lộ do đặc thù engine. |
| **F17** | JSONB monolithic architecture | Toàn bộ màn chơi vẫn nằm trong `Game.levels` (`models.py:83`), chưa có bảng `questions`. | **STILL_PRESENT** | Trung bình | Sẽ xử lý ở Phase 2 (Question Bank). |
| **F18** | AI prompt token collision | Đã có prompt chuẩn (`ai_content.py:558`), nhưng sinh 20 màn 1 lần dễ vượt token limit. | **PARTIALLY_FIXED** | Trung bình | Sẽ xử lý ở Phase 8 (Batch 5 câu/lần). |
| **F19** | Duplicate level cloning (Padding Spam) | `admin.py:484` vẫn gọi `pad_to_count=True` nhân bản 20 màn giống nhau khi import pack. | **STILL_PRESENT** | Trung bình | Cần tắt ở Phase 0 / Phase 3. |
| **F20** | Stored XSS trong JSON Import | `admin.py:421` không làm sạch HTML tags trong `prompt`, `title`, `description`. | **STILL_PRESENT** | Cao (P0) | Cần vá ngay tại Phase 0. |
| **F21** | SB3 zip bomb / zip slip | 5 lớp bảo vệ tại `sb3_serializer.py:72-78` (15MB nén, 50MB giải nén, chặn `..`). | **FIXED** | Cao | Đã hoàn thành trong phân hệ Scratch. |
| **F22** | System game authorization | Chặn xóa và sửa game `is_seed=True` tại `admin.py:39-40, 362-363`. | **FIXED** | Cao | Đã hoàn thành trong đợt 09/09. |
| **F23** | No frontend test coverage | `package.json` chưa có test runner nào cho frontend. | **STILL_PRESENT** | Trung bình | Cần bổ sung Vitest tại Phase 10. |
| **F24** | Idempotency & Replay attacks | `attempts.py:260` dùng `clientAttemptId`; quests và lucky-spin có ràng buộc duy nhất. | **FIXED** | Cao | Đã hoàn thành trong đợt 09/09. |
| **F25** | API contract mismatches | `src/services/api.ts` đã khớp toàn bộ response/payload của backend. | **FIXED** | Trung bình | Đã hoàn thành trong đợt 09/09. |

---

## 11. DOCUMENTATION VS CODE CONTRADICTIONS (CÁC MÂU THUẪN GIỮA TÀI LIỆU VÀ MÃ NGUỒN)

Trong quá trình đối soát độc lập, phát hiện 6 điểm mâu thuẫn lớn giữa các tài liệu kế hoạch/audit trước đây và hiện trạng code thực tế:

1. **MÂU THUẪN VỀ QUESTION BANK:**
   - *Tài liệu mô tả:* Question Bank là kho lưu trữ trung tâm, có metadata, phân loại GDPT, quản lý quyền tác giả.
   - *Code thực tế:* Bảng `questions` **chưa hề tồn tại** trong database hay models. Mọi câu hỏi vẫn nằm 100% trong JSONB `games.levels`.
2. **MÂU THUẪN VỀ TỶ LỆ CHIA SẺ DOANH THU:**
   - *Tài liệu mô tả:* Tỷ lệ chia sẻ doanh thu có thể cấu hình linh hoạt trong `platform_settings` và dùng toán học số nguyên.
   - *Code thực tế:* `platform_settings` **chưa tồn tại**. Tỷ lệ 80% gắn cứng tại `games.py:206` và dùng phép nhân số thực `* 0.8`. Bảng `purchases` không có trường lưu snapshot phân chia doanh thu.
3. **MÂU THUẪN VỀ TÍNH BẤT BIẾN CỦA PUBLISHED GAME:**
   - *Tài liệu mô tả:* Game đã xuất bản là bản chụp bất biến (Immutable Published Snapshot).
   - *Code thực tế:* Sửa game tại `admin.py:327` ghi đè trực tiếp lên cột `games.levels` live, làm biến đổi ngay lập tức dữ liệu của game mà người học đã mua.
4. **MÂU THUẪN VỀ BẢO MẬT VÍ TIỀN (`confirm-topup`):**
   - *Tài liệu mô tả:* Hệ thống bảo vệ ví an toàn, nạp tiền tự động qua webhook ngân hàng chỉ dành cho Admin.
   - *Code thực tế:* `wallet.py:143` chứa lỗ hổng logic cho phép bất kỳ user nào đăng nhập cũng có thể tự xác nhận nạp tiền cho tài khoản của chính mình.
5. **MÂU THUẪN VỀ CHỐNG NHÂN BẢN DỮ LIỆU (PADDING SPAM):**
   - *Tài liệu mô tả:* Đã kiểm soát việc nhân bản màn chơi.
   - *Code thực tế:* `admin.py:484` vẫn kích hoạt `pad_to_count=True` khi import JSON dạng template, nhân bản 1 câu hỏi thành 20 màn giống hệt nhau.
6. **MÂU THUẪN VỀ DUPLICATE DETECTION:**
   - *Tài liệu mô tả:* Có cơ chế phát hiện trùng lặp bằng băm kép (`content_hash` và `normalized_hash`).
   - *Code thực tế:* File `content_dedup.py` **chưa hề tồn tại**; không có hàm băm nào được gọi trong luồng import hay submit game.

---

## 12. FINAL READINESS (KẾT LUẬN MỨC ĐỘ SẴN SÀNG)

$$\mathbf{NOT\ READY}$$

### Lý do kỹ thuật bắt buộc:
Theo đúng nguyên tắc kiểm định bảo mật: **Nếu còn BẤT KỲ lỗ hổng bảo mật P0 nào tồn tại trong mã nguồn, trạng thái nghiệm thu bắt buộc phải là NOT READY.**

Codebase hiện hành còn tồn tại 4 lỗ hổng bảo mật cấp độ P0:
1. **Lỗ hổng tự cấp tiền ví tại `POST /api/wallet/confirm-topup` (`wallet.py:143`):** Bất kỳ người dùng nào cũng có thể tự nạp tiền miễn phí không giới hạn.
2. **Lỗ hổng khóa bản quyền Tác giả tại `POST /api/attempts/submit` (`attempts.py:207`):** Creator bị chặn màn 6+ trên chính game của mình.
3. **Nguy cơ Stored XSS tại `POST /api/admin/games/upload` (`admin.py:421`):** Payload JSON không được tẩy rửa mã độc HTML/Script.
4. **Nguy cơ DoS qua Payload tại `POST /api/admin/games/upload` (`admin.py:406`):** Nhận object không giới hạn kích thước dung lượng.

### Lộ trình giải quyết:
Codebase **CHỈ ĐƯỢC CHUYỂN SANG TRẠNG THÁI READY** sau khi hoàn thành đợt sửa lỗi cấp bách **Phase 0: Baseline & Security Remediation** nhằm triệt tiêu toàn bộ 4 vấn đề P0 nêu trên.
