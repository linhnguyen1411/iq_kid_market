# [BE-15] Tích Hợp Caching Redis & Rate Limiting Phân Tán (Redis Cache & Security)

> **Mô tả nghiệp vụ**: Nâng cấp hạ tầng backend với bộ nhớ đệm **Redis Cache** và cơ chế **Rate Limiting Phân Tán** (Distributed Token Bucket). Tối ưu hóa tốc độ tải Marketplace, Bảng xếp hạng, danh mục Khóa học Scratch, và bảo vệ hệ thống khỏi tấn công DDoS hoặc brute-force khi chạy trên nhiều worker/server đồng thời.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-15`
- **Mảng phụ trách**: Backend & DevOps (Redis + FastAPI + SlowAPI / Redis Rate Limiter)
- **Độ ưu tiên**: 🟡 P2 (Hiệu năng cao & Bảo mật mở rộng)
- **Người thực hiện**: Backend Developer / DevOps
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-15-redis-caching`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Redis In-Memory Key-Value Store**:
   - Lưu trữ dữ liệu nóng có tần suất đọc cao (Marketplace games list, leaderboard, system stats) với thời gian phản hồi siêu tốc (< 5ms).
   - Thiết lập TTL (Time-To-Live) hợp lý:
     - Danh sách Games: TTL 5 phút (Tự động xóa cache khi có game mới xuất bản hoặc chỉnh sửa).
     - Bảng xếp hạng (Leaderboard): TTL 60 giây.
     - Danh mục khóa học Scratch: TTL 10 phút.
2. **Distributed Rate Limiter (Thay thế biến in-memory RAM của Phase 1)**:
   - Sử dụng Redis Atomic Increment (`INCR` + `EXPIRE`) để giới hạn tần suất request theo IP hoặc Username trên toàn bộ cụm worker.
3. **Graceful Redis Fallback**:
   - Nếu Redis server chưa khởi động hoặc gặp sự cố ➔ Hệ thống tự động fallback truy vấn trực tiếp từ PostgreSQL mà không bị crash HTTP 500.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Module `backend/app/cache.py`**:
   - Khởi tạo kết nối Redis client (`redis-py` hoặc `aioredis`).
   - Hàm `get_cache(key: str)`, `set_cache(key: str, value: Any, ttl_seconds: int)`, `delete_cache_pattern(pattern: str)`.
2. **Áp Dụng Cache Vào Các Endpoints Trọng Yếu**:
   - `GET /api/games` (Cache theo query params hash).
   - `GET /api/scores/leaderboard` (Cache theo timeframe & grade).
   - `GET /api/scratch/courses`.
3. **Cache Invalidation (Xóa cache khi dữ liệu thay đổi)**:
   - Khi Admin duyệt game mới hoặc thêm màn chơi ➔ Xóa cache `games:*`.
   - Khi có người nộp điểm ➔ Xóa cache `leaderboard:*`.
4. **Nâng Cấp Middleware Rate Limiting Phân Tán**:
   - `POST /api/auth/login`: Tối đa 5 lần / phút theo IP/Username.
   - `POST /api/admin/games/ai-generate`: Tối đa 10 lần / phút cho mỗi tài khoản Giáo viên.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Cài đặt thư viện `redis==5.2.1` vào `requirements.txt`**.
- [ ] **2. Thêm Service Redis vào `docker-compose.yml`**:
  - [ ] Port `6379:6379`.
- [ ] **3. Viết Module Cache `backend/app/cache.py`**:
  - [ ] Hỗ trợ tự động fallback khi Redis offline.
- [ ] **4. Gắn Cache Decorator vào các Router `games.py`, `misc.py`, `scratch.py`**.
- [ ] **5. Nâng cấp `auth_utils.py` sử dụng Redis Rate Limiter**.
- [ ] **6. Viết Pytest trong `backend/tests/test_redis_cache.py`**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Gọi `GET /api/games` lần 2 ➔ Response time giảm từ 80ms xuống < 5ms.
- [ ] Tạo game mới ➔ Cache được xóa và danh sách game mới lập tức hiển thị.
- [ ] Đăng nhập sai 5 lần trên 2 trình duyệt khác nhau cùng IP ➔ Bị chặn 429 Too Many Requests đồng bộ.
