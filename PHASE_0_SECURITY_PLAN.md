# KẾ HOẠCH THỰC THI KHẮC PHỤC BẢO MẬT & BASELINE (PHASE 0 SECURITY PLAN)

**Dự án:** IQ Kid Market  
**Mục tiêu:** Khắc phục khẩn cấp 7 vấn đề bảo mật và tính toàn vẹn cấp độ P0 đã được kiểm chứng thực tế trong mã nguồn trước khi thực hiện bất kỳ thay đổi kiến trúc nào.  
**Nguyên tắc:** Application-level fixes only — Không sửa DB schema, không tạo bảng Question Bank, không thay đổi games.levels, bảo toàn 100% server-side grading.

---

## 1. DANH SÁCH CÁC LỖ HỔNG P0 ĐÃ ĐƯỢC XÁC THỰC THỰC TẾ

1. **P0-1: Lỗ hổng tự cấp tiền ví tại `POST /api/wallet/confirm-topup` (`wallet.py:143`)**
   - *Thực tế code:* `if current_user.role != "admin" and current_user.id != body.userId: raise HTTPException(403)`
   - *Hậu quả:* Học sinh hoặc bất kỳ user nào có thể truyền `body.userId = own_id` kèm `amount` tùy ý để tự tăng số dư ví Sao IQ không giới hạn.
   - *Khắc phục:* Khóa chặt endpoint này chỉ dành riêng cho Admin (`current_user.role == "admin"`). Bất kỳ non-admin nào (student, teacher, creator) đều bị trả về `403 Forbidden`. Khóa hàng ví bằng `with_for_update()`, kiểm tra trùng `tx_id`.

2. **P0-2: Nguy cơ Stored XSS trong JSON Import (`admin.py:421`)**
   - *Thực tế code:* `upload_games` nhận `gameObject: Any` và lưu thẳng chuỗi `prompt`, `title`, `description`, `options` vào DB mà không làm sạch HTML tags.
   - *Khắc phục:* Xây dựng module `backend/app/sanitizer.py` làm sạch triệt để thẻ HTML (`<script>`, `<iframe>`, `<img>`, `<svg>`, `onerror=`, `onload=`, `javascript:`) cho toàn bộ các trường chuỗi và cấu trúc lồng nhau trong game payload.

3. **P0-3: Nguy cơ DoS qua Payload JSON không giới hạn (`admin.py:406, 421`)**
   - *Thực tế code:* `UploadGamesIn(gameObject: Any)` không kiểm tra độ dài payload và độ sâu cấu trúc.
   - *Khắc phục:* Giới hạn dung lượng payload tối đa 2MB (2,097,152 bytes) trên backend; giới hạn tối đa 50 games / 50 màn; chặn cấu trúc JSON lồng sâu quá 10 cấp để chống cạn kiệt ngăn xếp. Trả về mã lỗi HTTP 413 (Payload Too Large) hoặc 400.

4. **P0-4: Khóa quyền chơi của Tác giả (Creator Lockout - `attempts.py:201-207`)**
   - *Thực tế code:* `can_access_level(body.levelNum, owned)` chỉ kiểm tra `owned` trong bảng `purchases` hoặc `user.role == "admin"`. Tác giả game bị chặn chơi từ màn 6 trở đi trên game của chính mình với lỗi 403.
   - *Khắc phục:* Bổ sung kiểm tra quyền tác giả: `is_creator = bool(game.creator_id and user.id == game.creator_id)`. Nếu `is_creator or owned or user.role == "admin"`, mở toàn bộ màn 1-20 miễn phí. Đồng bộ logic cho frontend tại `src/lib/gameAccess.ts` và `src/pages/GamePlayPage.tsx`.

5. **P0-5: Bảo toàn Server-Side Grading 10 Base Engines**
   - *Thực tế code:* Đã hoạt động tốt qua `evaluate_game_answer`.
   - *Yêu cầu:* Giữ nguyên tính toàn vẹn: Server tải dữ liệu từ DB, máy chủ quyết định điểm số và trạng thái hoàn thành. Điểm số từ client gửi lên tiếp tục bị bỏ qua.

6. **P0-6: Rò rỉ đáp án trong Matching Engine (`schemas.py:467-559` & `MatchingEngine.tsx`)**
   - *Thực tế code:* Trong `sanitize_question_data_for_learner`, `matching` không được lọc và truyền nguyên mảng `pairs: [{left, right}]` về client, cho phép học sinh đọc trực tiếp đáp án đúng từ Network tab / DevTools.
   - *Khắc phục:* Thiết kế Learner DTO chuẩn cho Matching: Trộn ngẫu nhiên danh sách `left_items` và `right_items`, che giấu liên kết ghép đôi bằng mã băm kiểm tra (Pair Hash Matcher / Token Key) để học sinh không đọc được cặp đáp án từ JSON. Đồng thời giữ nguyên format nộp bài `{ pairs: [{ left, right }] }` để `game_evaluator.py` chấm điểm độc lập phía server.

7. **P0-7: Kiểm định hồi quy Auth & IDOR trên toàn bộ các Endpoint**
   - *Phạm vi:* Kiểm tra chéo User A không thao tác được ví, bài nộp, game của User B. Creator không thể sửa game seed hoặc game của Creator khác.

---

## 2. KẾ HOẠCH FILE-BY-FILE CHỈNH SỬA

```
backend/app/
├── sanitizer.py              # [NEW] Hàm làm sạch HTML/XSS an toàn cho chuỗi và payload dict/list
├── routers/
│   ├── wallet.py             # [MODIFY] Chặn confirm_topup chỉ cho Admin; kiểm tra giao dịch trùng lặp
│   ├── admin.py              # [MODIFY] Thêm kiểm tra payload size 2MB, áp dụng sanitizer cho JSON import
│   └── attempts.py           # [MODIFY] Thêm miễn trừ Creator Free Play cho tác giả (is_creator)
└── schemas.py                # [MODIFY] Cập nhật sanitize_question_data_for_learner cho Matching Engine

src/
├── lib/
│   └── gameAccess.ts         # [MODIFY] Bổ sung tham số isCreator vào canAccessLevel
├── pages/
│   └── GamePlayPage.tsx      # [MODIFY] Truyền isCreator vào canAccessLevel
└── components/game-engines/
    └── MatchingEngine.tsx    # [MODIFY] Hỗ trợ Learner DTO không lộ cặp đáp án trực tiếp

backend/tests/
├── test_wallet.py            # [MODIFY] Cập nhật test confirm_topup theo chuẩn bảo mật Admin Only
└── test_security_p0.py       # [NEW] Bộ kiểm thử tập trung cho toàn bộ 7 yêu cầu P0
```

---

## 3. TIÊU CHÍ HOÀN THÀNH & NGHIỆM THU
1. Toàn bộ 82 tests backend hiện có và các tests mới đều vượt qua (`pytest`).
2. TypeScript biên dịch không có lỗi (`tsc --noEmit`).
3. Frontend build thành công (`npm run build`).
4. Xuất báo cáo `PHASE_0_SECURITY_REPORT.md` và DỪNG LẠI (STOP), không làm sang Phase 1.
