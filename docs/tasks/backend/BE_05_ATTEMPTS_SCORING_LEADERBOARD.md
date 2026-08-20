# [BE-05] Hệ Thống Chấm Điểm, Daily Streak & Bảng Xếp Hạng (Gamification Backend)

> **Mô tả nghiệp vụ**: Nâng cấp toàn diện động cơ Gamification của backend: Ghi nhận kết quả làm bài (`Attempt`), tính toán điểm XP và cấp độ Level, tự động duy trì hoặc cộng dồn chuỗi ngày học liên tục (Daily Streak), mở khóa danh hiệu thành tích (Achievements) và tính toán bảng xếp hạng đa chiều theo Game / Khối lớp / Toàn quốc.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-05`
- **Mảng phụ trách**: Backend (FastAPI + SQLAlchemy + PostgreSQL)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Tăng tương tác người dùng)
- **Người thực hiện**: _[Điền tên thành viên]_
- **Trạng thái**: 🟡 To Do (Chưa bắt đầu)
- **Branch làm việc**: `feature/be-05-gamification-scoring`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **XP Curve (Đường cong Kinh nghiệm)**:
   - Mỗi màn chơi hoàn thành mang lại điểm XP cơ bản + điểm thưởng theo độ khó màn chơi (`xp_reward = 50 + (level_num * 5)`).
   - Công thức Level: `level = (xp // XP_PER_LEVEL) + 1` (ví dụ `XP_PER_LEVEL = 250`).
2. **Daily Streak (Chuỗi ngày học liên tiếp)**:
   - Nếu bé hoàn thành ít nhất 1 bài tập trong ngày hôm nay:
     - Nếu lần học trước là hôm qua ➔ `streak += 1`.
     - Nếu lần học trước là hôm nay ➔ `streak` giữ nguyên.
     - Nếu lần học trước cách từ 2 ngày trở lên ➔ `streak` bị reset về `1`.
   - Cần lưu ý múi giờ Việt Nam (`Asia/Ho_Chi_Minh` - UTC+7) khi so sánh ngày.
3. **Achievement Trigger Engine (Bộ Kích Hoạt Danh Hiệu)**:
   - Khi hoàn thành bài, hệ thống kiểm tra các tiêu chí (Ví dụ: Đạt Streak 7 ngày, Hoàn thành 10 màn chơi, Đạt 1000 XP) để tự động ghi nhận danh hiệu cho học sinh.
4. **Leaderboard Aggregation**:
   - Truy vấn SQL tính tổng điểm hoặc điểm cao nhất của từng người dùng, xếp hạng theo `ORDER BY score DESC, duration_secs ASC`.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Nâng cấp API Nộp Điểm Màn Chơi (`POST /api/attempts/submit`)**:
   - Lưu chi tiết: `score`, `duration_secs`, `completed`, `level_num`.
   - Tính toán và cập nhật XP, Level cho User.
   - Tính toán và cập nhật `streak` ngày học.
   - Kiểm tra và trả về danh sách huy hiệu vừa mở khóa (nếu có).
2. **Nâng cấp API Bảng Xếp Hạng (`GET /api/scores/leaderboard`)**:
   - Hỗ trợ các bộ lọc:
     - `gameId`: Xếp hạng theo game cụ thể hoặc toàn bộ sàn.
     - `timeframe`: `all_time` (Tất cả), `weekly` (Trong tuần này), `daily` (Hôm nay).
     - `grade`: Xếp hạng riêng theo từng khối lớp (Lớp 1 -> Lớp 9).
3. **API Thành Tích Cá Nhân (`GET /api/achievements/user/{user_id}`)**:
   - Trả về danh sách huy hiệu kèm trạng thái của bé: Đã đạt được (kèm ngày đạt) hay Chưa mở khóa (kèm thanh tiến độ %).

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Nâng cấp Model `User` & Bảng Thành Tích trong `backend/app/models.py`**:
  - [ ] Thêm trường `last_active_date` (Date) vào `User` để quản lý Streak chuẩn xác.
  - [ ] Thêm bảng `UserAchievement` (Lưu quan hệ User đã nhận Achievement nào, ngày nhận).
- [ ] **2. Nâng cấp Router `backend/app/routers/attempts.py`**:
  - [ ] Viết hàm tính toán Streak chuẩn múi giờ UTC+7.
  - [ ] Trả về thông tin đầy đủ: `xpAwarded`, `newXp`, `levelUp`, `newLevel`, `newStreak`, `unlockedAchievements`.
- [ ] **3. Nâng cấp Router `backend/app/routers/misc.py`**:
  - [ ] Nâng cấp query Bảng xếp hạng với bộ lọc `timeframe` và `grade`.
  - [ ] Thêm endpoint lấy huy hiệu của user.
- [ ] **4. Viết Test & Kiểm thử thực tế**.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Logic tính Daily Streak theo múi giờ:

```python
from datetime import datetime, date, timedelta
import zoneinfo

VN_TZ = zoneinfo.ZoneInfo("Asia/Ho_Chi_Minh")

def update_user_streak(user: models.User) -> int:
    today_vn = datetime.now(VN_TZ).date()
    
    if not user.last_active_date:
        user.streak = 1
        user.last_active_date = today_vn
    else:
        last_date = user.last_active_date
        diff_days = (today_vn - last_date).days
        
        if diff_days == 1:
            # Học tiếp nối ngày hôm qua -> Tăng streak
            user.streak = (user.streak or 0) + 1
            user.last_active_date = today_vn
        elif diff_days > 1:
            # Bị đứt chuỗi -> Reset về 1
            user.streak = 1
            user.last_active_date = today_vn
        # diff_days == 0 -> Hôm nay đã học rồi, giữ nguyên streak
    
    return user.streak
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/be-05-gamification-scoring
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "backend: hoàn thiện logic nộp điểm, daily streak và leaderboard đa chiều"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Nộp Điểm & Lên Level**:
  - Gửi request `POST /api/attempts/submit` với điểm 100 ➔ XP tăng đúng, khi vượt qua mốc 250 XP thì `levelUp = true` và `newLevel = 2`.
- [ ] **2. Test Logic Streak**:
  - Giả lập `last_active_date` là ngày hôm qua ➔ Nộp điểm ➔ Streak tăng từ 1 lên 2.
  - Giả lập `last_active_date` là 3 ngày trước ➔ Nộp điểm ➔ Streak bị reset về 1.
- [ ] **3. Test Bảng Xếp Hạng**:
  - Gọi `GET /api/scores/leaderboard?timeframe=all_time` ➔ Trả về đúng top 10 người điểm cao nhất, sắp xếp giảm dần.
  - Gọi lọc theo `grade=3` ➔ Chỉ hiện học sinh lớp 3.
