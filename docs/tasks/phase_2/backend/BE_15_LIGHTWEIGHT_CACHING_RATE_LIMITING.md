# [BE-15] Bộ Nhớ Đệm Nhẹ In-Memory & Giới Hạn Tần Suất Truy Cập (Lightweight Caching & Rate Limiting)

> **Mô tả nghiệp vụ**: Nâng cấp hiệu năng ứng dụng bằng cơ chế **Bộ Nhớ Đệm Tinh Gọn (Lightweight In-Memory TTL Cache)** không phụ thuộc hạ tầng ngoài. Tối ưu tốc độ tải danh sách Marketplace, Bảng xếp hạng, danh mục bài học Scratch, và bảo vệ các endpoint trọng yếu (Đăng nhập, Quên mật khẩu, Sinh game AI) bằng cơ chế giới hạn tần suất (In-Memory Token Bucket Rate Limiter) có dọn dẹp bộ nhớ tự động (Auto Eviction / Cleanup).

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-15`
- **Mảng phụ trách**: Backend (FastAPI + Python In-Memory Caching + SlowAPI / Cachetools)
- **Độ ưu tiên**: 🟡 P2 (Hiệu năng cao & Bảo mật ứng dụng gọn nhẹ)
- **Người thực hiện**: Backend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-15-lightweight-caching`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Lightweight In-Memory Cache (Cachetools / Custom TTL Dict)**:
   - Sử dụng thư viện `cachetools` (`TTLCache`, `LRUCache`) hoặc lớp quản lý cache nội bộ trong tiến trình Python:
     - Không cần cài đặt hay duy trì Redis server.
     - Thời gian truy xuất siêu tốc (< 1ms).
     - Giới hạn số lượng key tối đa (`maxsize=1000`) để không gây tràn RAM máy chủ.
2. **TTL (Time-To-Live) Phân Tầng**:
   - Danh sách Marketplace Games: TTL 5 phút.
   - Bảng xếp hạng (Leaderboard): TTL 60 giây.
   - Danh mục Khóa học Scratch: TTL 10 phút.
3. **Cache Invalidation On Write (Xóa cache khi dữ liệu thay đổi)**:
   - Khi có game mới được duyệt hoặc cập nhật màn chơi ➔ Xóa các cache keys liên quan tới `games:*`.
   - Khi có học sinh nộp điểm màn chơi mới ➔ Xóa cache `leaderboard:*`.
4. **Enhanced In-Memory Rate Limiter**:
   - Cung cấp cơ chế tự động dọn dẹp các bản ghi IP/User đã quá hạn kiểm tra, chống rò rỉ bộ nhớ (Memory Leak).

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Module `backend/app/cache.py`**:
   - Khởi tạo singleton `AppCache` với các phương thức:
     - `get(key: str) -> Any | None`
     - `set(key: str, value: Any, ttl_seconds: int = 300)`
     - `invalidate_prefix(prefix: str)`
     - `clear()`
2. **Áp Dụng Cache Vào Các Endpoints Trọng Yếu**:
   - `GET /api/games`: Cache kết quả lọc theo query params hash.
   - `GET /api/scores/leaderboard`: Cache bảng xếp hạng theo `timeframe` và `grade`.
   - `GET /api/scratch/courses`: Cache cấu trúc bài học.
3. **Middleware Rate Limiting Gọn Nhẹ**:
   - `POST /api/auth/login`: Giới hạn tối đa 5 lần / phút cho mỗi IP.
   - `POST /api/admin/games/ai-generate`: Giới hạn tối đa 10 lần / phút cho mỗi tài khoản Giáo viên.
   - Tự động xóa lịch sử các lần thử sau khi cửa sổ thời gian trôi qua.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Thêm `cachetools==5.5.1` vào `backend/requirements.txt`**.
- [ ] **2. Xây dựng Module `backend/app/cache.py`**:
  - [ ] Quản lý cache in-memory đa danh mục với TTL riêng biệt.
  - [ ] Decorator `@cached(ttl=60, prefix="...")` tiện dụng cho các hàm router.
- [ ] **3. Gắn Cache vào các Router `games.py`, `misc.py`, `scratch.py`**:
  - [ ] Tích hợp xóa cache khi gọi các action ghi/sửa.
- [ ] **4. Nâng cấp `auth_utils.py`**:
  - [ ] Dọn dẹp tự động bộ nhớ rate limiting sau mỗi 10 phút.
- [ ] **5. Viết Pytest trong `backend/tests/test_caching.py`**:
  - [ ] Test lấy dữ liệu từ cache nhanh hơn truy vấn DB.
  - [ ] Test xóa cache khi có bản ghi mới.
  - [ ] Test chặn rate limiting khi request quá dày.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

```python
import time
from typing import Any
from cachetools import TTLCache

class InMemoryCacheManager:
    def __init__(self):
        # Lưu tối đa 1000 items, TTL mặc định 300 giây (5 phút)
        self._cache = TTLCache(maxsize=1000, ttl=300)

    def get(self, key: str) -> Any | None:
        return self._cache.get(key)

    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        self._cache[key] = value

    def invalidate_prefix(self, prefix: str) -> None:
        keys_to_delete = [k for k in self._cache.keys() if k.startswith(prefix)]
        for k in keys_to_delete:
            self._cache.pop(k, None)

cache = InMemoryCacheManager()
```

---

## 🧪 6. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Gọi `GET /api/games` lần 2 ➔ Thời gian phản hồi giảm xuống dưới 5ms.
- [ ] Giáo viên thêm 1 game mới ➔ Cache `games:` tự động bị xóa, trang Marketplace hiển thị game mới ngay lập tức.
- [ ] Đăng nhập sai liên tiếp 6 lần ➔ Bị chặn 429 Too Many Requests kèm thông báo rõ thời gian cần chờ.
- [ ] Ứng dụng chạy hoàn toàn độc lập, không cần bất kỳ tiến trình phụ trợ Redis nào.
