# [BE-11] Động Cơ Nhiệm Vụ Hàng Ngày, Điểm Danh & Vòng Quay May Mắn (Daily Quests Engine)

> **Mô tả nghiệp vụ**: Xây dựng hệ thống Nhiệm Vụ Hàng Ngày (Daily Quests), Thưởng Điểm Danh 7 Ngày Liên Tiếp (7-Day Login Rewards), và Vòng Quay May Mắn (Lucky Spin Wheel) nhận Xu và Vật Phẩm bổ trợ (Hints, Shields). Kích thích thói quen học tập đều đặn mỗi ngày của trẻ.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-11`
- **Mảng phụ trách**: Backend (FastAPI + SQLAlchemy + Gamification Logic)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Tăng tỷ lệ giữ chân Retention DAU)
- **Người thực hiện**: Backend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-11-daily-quests`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Daily Quest Reset by Timezone (00:00 UTC+7)**:
   - Các nhiệm vụ ngày tự động làm mới vào lúc 00:00 sáng theo giờ Việt Nam.
   - Mỗi ngày học sinh nhận được 3 nhiệm vụ ngẫu nhiên:
     - 1. Chinh phục 2 màn chơi bất kỳ.
     - 2. Đạt điểm số tuyệt đối 100/100 trong 1 game Toán học hoặc IQ.
     - 3. Hoàn thành 1 bài học Scratch.
2. **Quest Claim Status & Idempotency**:
   - Trạng thái nhiệm vụ: `IN_PROGRESS` (Đang làm), `COMPLETED` (Đã xong, chưa nhận quà), `CLAIMED` (Đã nhận thưởng).
   - Chặn nhận thưởng 2 lần cho cùng 1 nhiệm vụ trong ngày.
3. **Lucky Spin Odds (Tỷ lệ xác suất Vòng Quay)**:
   - Thuật toán Weighted Random Distribution (Rút thăm có trọng số):
     - 10 Xu (40%), 20 Xu (30%), 50 Xu (15%), 100 Xu (10%), 1 Vé Nhân Đôi XP (5%).

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Tạo Bảng `daily_quests` và `user_daily_quests`**:
   - Bảng `daily_quests`: `id`, `title`, `description`, `type` (`play_count`, `score_reach`, `scratch_complete`), `target_count`, `xp_reward`, `coin_reward`.
   - Bảng `user_daily_quests`: `id`, `user_id`, `quest_id`, `current_progress`, `status` (`IN_PROGRESS`, `COMPLETED`, `CLAIMED`), `quest_date`.
2. **API Lấy Danh Sách Nhiệm Vụ Ngày Của Học Sinh (`GET /api/quests/daily`)**:
   - Tự động gán 3 nhiệm vụ ngày nếu học sinh chưa có nhiệm vụ cho ngày hôm nay.
   - Trả về tiến độ hiện tại `current_progress / target_count` và trạng thái nhận quà.
3. **API Nhận Thưởng Nhiệm Vụ (`POST /api/quests/{quest_id}/claim`)**:
   - Kiểm tra `status == 'COMPLETED'`.
   - Cộng XP và Xu vào ví, chuyển `status = 'CLAIMED'`.
4. **API Vòng Quay May Mắn (`POST /api/gamification/lucky-spin`)**:
   - Kiểm tra điều kiện: Mỗi ngày học sinh có 1 lượt quay miễn phí sau khi hoàn thành 1 màn chơi.
   - Trả về phần thưởng ngẫu nhiên theo thuật toán trọng số an toàn từ phía Server (Server-side RNG).

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Cập nhật Model & Schemas**:
  - [ ] Tạo Model `DailyQuest`, `UserDailyQuest`, `UserDailySpin`.
  - [ ] Migration Alembic `0004_add_daily_quests_and_spins.py`.
- [ ] **2. Tích hợp Quest Event Listener vào `attempts.py` và `scratch.py`**:
  - [ ] Khi nộp điểm màn chơi thành công ➔ Tự động cập nhật `current_progress` cho các nhiệm vụ tương ứng.
- [ ] **3. Xây dựng Router `backend/app/routers/quests.py`**:
  - [ ] `GET /api/quests/daily`
  - [ ] `POST /api/quests/{quest_id}/claim`
  - [ ] `POST /api/gamification/lucky-spin`
- [ ] **4. Viết Test Pytest trong `backend/tests/test_quests.py`**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Học sinh vào app ngày mới nhận đúng 3 nhiệm vụ ngày.
- [ ] Chơi xong 2 màn game ➔ Nhiệm vụ chuyển sang trạng thái `COMPLETED` và nút Nhận Thưởng sáng lên.
- [ ] Bấm nhận thưởng ➔ Nhận đúng số xu và XP, không thể bấm nhận lần 2.
- [ ] Vòng quay may mắn thực thi RNG từ server, không thể gian lận từ client.
