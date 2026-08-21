# [BE-12] Cổng Phụ Huynh, Giới Hạn Giờ Chơi & Báo Cáo Năng Lực (Parent Portal API)

> **Mô tả nghiệp vụ**: Xây dựng phân hệ **Cổng Phụ Huynh (Parent Portal)** chuyên biệt. Cho phép tài khoản Phụ huynh liên kết với tài khoản Học sinh (Parent-Child Account Linking), đặt mã PIN bảo vệ cá nhân hóa (Bcrypt Hashed PIN thay thế PIN cứng "1234"), thiết lập giới hạn thời gian học/chơi mỗi ngày (Daily Screen Time Limit), và xem báo cáo phân tích 5 năng lực tư duy của con (Toán, Não bộ, Ngôn ngữ, Quan sát, Thuật toán).

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-12`
- **Mảng phụ trách**: Backend (FastAPI + SQLAlchemy + PostgreSQL + Analytics Engine)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Giá trị cốt lõi cho gia đình)
- **Người thực hiện**: Backend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-12-parent-portal`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Parent-Child Account Association**:
   - Một phụ huynh có thể liên kết và quản lý nhiều con (1-to-Many).
   - Mã liên kết phụ huynh: Sinh mã 6 ký tự ngẫu nhiên (Ví dụ `IQ-8839`) để phụ huynh nhập và kết nối với tài khoản học sinh của con.
2. **Personalized Bcrypt Hashed Parent PIN**:
   - Thay thế hoàn toàn mã PIN hardcode `"1234"` trong `auth.py`.
   - Phụ huynh tự đặt mã PIN 4-6 số khi đăng ký tài khoản. Mã PIN được băm an toàn bằng Bcrypt lưu trong cột `parent_pin_hash`.
3. **Screen Time Enforcement Middleware**:
   - Khi học sinh gọi API nộp điểm hoặc chơi game, backend kiểm tra tổng thời gian chơi trong ngày (`sum(duration_secs)` trong bảng `attempts`).
   - Nếu vượt quá `daily_time_limit_minutes` do phụ huynh cài đặt ➔ Trả về mã lỗi `403 Forbidden` kèm thông điệp: `"Đã hết thời gian học tập hôm nay! Hãy nghỉ ngơi bảo vệ mắt nhé! 👀"`.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Bảng `parent_child_links` và Cập nhật Model `User`**:
   - Bảng `parent_child_links`: `id`, `parent_id`, `child_id`, `created_at`.
   - Bổ sung vào `User`: `parent_pin_hash`, `daily_time_limit_minutes` (Mặc định 60 phút), `is_locked_by_parent`.
2. **API Thiết Lập / Đổi Mã PIN Phụ Huynh (`POST /api/parent/pin/setup`, `POST /api/parent/pin/change`)**:
   - Băm mã PIN an toàn và lưu vào DB.
3. **API Liên Kết Tài Khoản Con (`POST /api/parent/link-child`)**:
   - Nhập username của con và mã PIN để kết nối.
4. **API Báo Cáo Phân Tích Năng Lực Trẻ Em (`GET /api/parent/child/{child_id}/analytics`)**:
   - Tổng thời gian chơi trong 7 ngày qua.
   - Điểm đánh giá 5 khía cạnh tư duy (Radar chart data):
     - Toán học (Math & Sequence)
     - Não bộ IQ (LogicGrid, Memory)
     - Ngôn ngữ (Language, Flashcard)
     - Quan sát (Observation, Matching)
     - Lập trình (Scratch, Coding)
5. **API Cài Đặt Giới Hạn Thời Gian Chơi (`PUT /api/parent/child/{child_id}/settings`)**:
   - Đặt số phút tối đa trong ngày (30 phút, 60 phút, 90 phút hoặc không giới hạn).
   - Khóa / Mở khóa tài khoản con ngay lập tức.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Nâng cấp Model `User` & Tạo bảng `parent_child_links` trong `models.py`**:
  - [ ] Migration Alembic `0005_add_parent_portal_tables.py`.
- [ ] **2. Tạo Router `backend/app/routers/parent.py`**:
  - [ ] `POST /api/parent/pin/setup`
  - [ ] `POST /api/parent/link-child`
  - [ ] `GET /api/parent/children`
  - [ ] `GET /api/parent/child/{child_id}/analytics`
  - [ ] `PUT /api/parent/child/{child_id}/settings`
- [ ] **3. Cập nhật `attempts.py`**:
  - [ ] Kiểm tra screen time limit trước khi ghi nhận lượt chơi.
- [ ] **4. Sửa `auth.py`**:
  - [ ] Endpoint `/api/auth/reset-password` kiểm tra qua `parent_pin_hash` thực tế trong DB thay vì so sánh `"1234"`.
- [ ] **5. Viết Pytest trong `backend/tests/test_parent_portal.py`**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Phụ huynh đổi mã PIN thành công, reset password của con bằng đúng mã PIN đó.
- [ ] Phụ huynh cài đặt giới hạn 30 phút ➔ Khi học sinh chơi quá 30 phút, hệ thống tự động khóa và chặn nộp bài tiếp theo.
- [ ] API Analytics trả về đúng số liệu phân bổ 5 năng lực tư duy.
