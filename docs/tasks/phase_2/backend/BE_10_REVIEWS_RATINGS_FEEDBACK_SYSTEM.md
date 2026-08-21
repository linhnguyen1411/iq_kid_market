# [BE-10] Hệ Thống Đánh Giá, Xếp Hạng Sao & Kiểm Duyệt Bình Luận (Reviews & Ratings)

> **Mô tả nghiệp vụ**: Xây dựng hệ thống Đánh giá trò chơi (Rating 1-5 sao) và Nhận xét (Reviews/Comments) từ học sinh và phụ huynh. Tự động tính toán điểm đánh giá trung bình `rating_avg` của game, bộ lọc từ khóa phản cảm (Profanity Filter) bảo vệ trẻ em, và API kiểm duyệt phản hồi dành cho Admin/Giáo viên.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-10`
- **Mảng phụ trách**: Backend (FastAPI + SQLAlchemy + PostgreSQL + Safety Content)
- **Độ ưu tiên**: 🔴 P0 (Quan trọng / Tăng tương tác & Độ uy tín game)
- **Người thực hiện**: Backend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-10-reviews-ratings`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Incremental Average Rating Calculation**:
   - Khi có review mới hoặc sửa rating, cần cập nhật trường `rating_avg` trong bảng `games`:
     $$\text{rating\_avg} = \frac{\sum \text{stars}}{\text{total\_reviews}}$$
   - Sử dụng database trigger hoặc update trực tiếp trong transaction để đảm bảo tính nhất quán.
2. **Profanity Filter & Child Safety Protection**:
   - Bình luận của trẻ em cần được kiểm tra qua danh sách từ khóa nhạy cảm / chửi thề / tiêu cực. Nếu phát hiện vi phạm ➔ Tự động ẩn hoặc đánh dấu `status = 'flagged'` để Admin duyệt.
3. **Only Purchased / Played Verification**:
   - Chỉ cho phép học sinh đã sở hữu game (hoặc đã hoàn thành ít nhất Màn 1 của game miễn phí) được gửi đánh giá để chống spam rating ảo.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Tạo Bảng `game_reviews`**:
   - Cột: `id`, `game_id`, `user_id`, `rating` (1-5), `comment` (Text), `is_visible` (Boolean, default True), `created_at`, `updated_at`.
   - Khóa duy nhất (Unique Constraint): `(game_id, user_id)` (mỗi học sinh chỉ đánh giá 1 lần / game, có thể cập nhật lại).
2. **API Gửi / Cập Nhật Đánh Giá (`POST /api/games/{game_id}/reviews`)**:
   - Nhận `rating` (1-5) và `comment`.
   - Kiểm tra điều kiện: Người dùng đã mua game hoặc đã chơi thử.
   - Lọc từ ngữ nhạy cảm.
   - Cập nhật lại `rating_avg` của game.
3. **API Lấy Danh Sách Đánh Giá Của Game (`GET /api/games/{game_id}/reviews`)**:
   - Hỗ trợ phân trang (`page`, `pageSize`).
   - Sắp xếp: Mới nhất, Đánh giá cao nhất, Đánh giá thấp nhất.
   - Trả về thông tin kèm Avatar, Tên học sinh, Cấp độ, Số sao và ngày nhận xét.
4. **API Danh Sách Game Yêu Thích / Wishlist (`POST /api/games/{game_id}/favorite`, `GET /api/user/favorites`)**:
   - Cho phép học sinh lưu các trò chơi yêu thích vào bộ sưu tập cá nhân.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Cập nhật Model & Schema trong `backend/app/models.py` & `schemas.py`**:
  - [ ] Thêm Model `GameReview` và `UserFavoriteGame`.
  - [ ] Tạo Migration Alembic `0003_add_reviews_and_favorites.py`.
- [ ] **2. Thêm Router Đánh Giá vào `backend/app/routers/games.py`**:
  - [ ] `POST /api/games/{game_id}/reviews`
  - [ ] `GET /api/games/{game_id}/reviews`
  - [ ] `DELETE /api/games/reviews/{review_id}` (Dành cho Admin xóa bình luận tiêu cực)
  - [ ] `POST /api/games/{game_id}/favorite`
  - [ ] `GET /api/user/favorites`
- [ ] **3. Viết Bộ Lọc Từ Khóa Tiếng Việt trong `backend/app/services/profanity_filter.py`**.
- [ ] **4. Viết Test Pytest trong `backend/tests/test_reviews.py`**:
  - [ ] Test gửi đánh giá thành công & cập nhật đúng `rating_avg`.
  - [ ] Test chặn đánh giá khi chưa chơi / chưa mua game.
  - [ ] Test tự động chặn từ ngữ thô tục trong nhận xét.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Học sinh gửi đánh giá 5 sao ➔ Game có `rating_avg` được tính toán lại chính xác.
- [ ] Học sinh chưa mua game có phí cố tình gửi review ➔ Trả về mã lỗi 403 / 400.
- [ ] Bình luận chứa từ ngữ thô tục ➔ Bị từ chối hoặc che ký tự `***`.
- [ ] API lấy danh sách review trả về đúng format phân trang.
