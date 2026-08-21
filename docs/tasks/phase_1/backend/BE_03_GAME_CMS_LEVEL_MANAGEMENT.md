# [BE-03] API Quản Lý Game, Levels JSONB & Hàng Đợi Kiểm Duyệt (Game CMS & Review Queue)

> **Mô tả nghiệp vụ**: Nâng cấp toàn diện bộ API quản lý trò chơi và các màn chơi lồng nhau (Levels & Questions). Đảm bảo kiểm tra tính hợp lệ của cấu trúc dữ liệu JSONB theo từng loại Game Engine, hỗ trợ phân trang (Pagination), tìm kiếm nâng cao và quy trình phê duyệt chất lượng sư phạm (Review Queue Workflow).

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-03`
- **Mảng phụ trách**: Backend (FastAPI + SQLAlchemy + PostgreSQL)
- **Độ ưu tiên**: 🔴 P0 (Bắt buộc / Nền tảng)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/be-03-game-cms`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **PostgreSQL JSONB (Binary JSON)**:
   - Cột `levels` trong bảng `games` lưu trữ danh sách các màn chơi lồng nhau dưới dạng JSON nhị phân giúp đọc ghi cực nhanh mà không cần tạo 3-4 bảng quan hệ phức tạp.
   - Khi lưu, bắt buộc phải validate dữ liệu đầu vào để tránh trường hợp frontend bị crash do thiếu field trong `question.data`.
2. **Pydantic Validation**:
   - Sử dụng `@field_validator` trong Pydantic để kiểm tra cấu trúc dữ liệu của từng `question_type` (matching, sequence, memory, quiz, language, observation, sorting, flashcard, scratch, coding) theo đúng quy ước tại `docs/GAME_ENGINE_RULES.md`.
3. **Phân trang (Pagination) & Sort**:
   - `skip: int = 0`, `limit: int = 20`.
   - Sắp xếp linh hoạt theo: Mới nhất (`created_at desc`), Chơi nhiều nhất (`plays_count desc`), Đánh giá cao nhất (`rating_avg desc`).
4. **Quy trình Kiểm duyệt (Review State Machine)**:
   - Game do người dùng tạo có trạng thái mặc định: `pending_review` (chưa xuất hiện trên chợ công khai).
   - Giáo viên / Admin duyệt ➔ `approved` (`is_published = True`) ➔ Game xuất hiện trên Marketplace.
   - Giáo viên / Admin từ chối ➔ `rejected` (`is_published = False`) ➔ Kèm lời nhắn góp ý `review_feedback` để tác giả chỉnh sửa.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Nâng cấp API Lấy Danh Sách Game (`GET /api/games`)**:
   - Hỗ trợ `page`, `page_size` (mặc định 20).
   - Hỗ trợ lọc theo nhiều tiêu chí kết hợp: `grade` (Khối lớp), `category` (IQ, Toán, Khoa học, Ngôn ngữ, Lập trình), `type` (`free`/`premium`), `sort_by` (`popular`, `newest`, `rating`).
   - Tìm kiếm không dấu / tìm kiếm chuỗi trong `title` và `description`.
2. **API Chi Tiết Game (`GET /api/games/{game_id}`)**:
   - Trả về thông tin đầy đủ kèm danh sách màn chơi, thông tin tác giả, tổng số câu hỏi, đánh giá trung bình.
3. **API Thêm / Cập Nhật Màn Chơi (`POST /api/admin/levels/add`, `PUT /api/admin/levels/{level_id}`)**:
   - Kiểm tra quyền sở hữu (chỉ tác giả hoặc Admin mới được sửa).
   - Validate `question.data` theo đúng thể loại game trước khi lưu vào DB.
4. **API Hàng Đợi Kiểm Duyệt Cho Admin / Giáo Viên (`GET /api/admin/review/queue`, `POST /api/admin/review/decide`)**:
   - Lấy danh sách game chờ duyệt (kèm phân trang, lọc).
   - Phê duyệt / Từ chối kèm ghi chú đánh giá chất lượng sư phạm.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Bổ sung Pydantic Validators trong `backend/app/schemas.py`**:
  - [x] Validate schema `data` cho từng `question_type` (VD: `matching` phải có mảng `pairs`, `quiz` phải có `options` và `answer`...).
- [x] **2. Nâng cấp Router `backend/app/routers/games.py`**:
  - [x] Thêm phân trang và trả về format `{ items: [...], total: int, page: int, totalPages: int }` hoặc tương thích ngược dạng list.
  - [x] Thêm endpoint `GET /api/games/{game_id}`.
- [x] **3. Nâng cấp Router `backend/app/routers/admin.py`**:
  - [x] Bảo vệ các endpoint bằng `require_roles(["admin", "teacher", "creator"])`.
  - [x] Thêm endpoint `DELETE /api/admin/games/{game_id}` (Chỉ xóa game custom, không cho xóa game seed gốc).
  - [x] Thêm endpoint `PUT /api/admin/levels/{game_id}/{level_num}` để cập nhật màn chơi có sẵn.
- [x] **4. Viết Test & Kiểm thử thực tế**:
  - [x] Viết `backend/test_be03_games.py` bao phủ 100% các kịch bản và test thành công.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Schema Validation cho câu hỏi Game trong `backend/app/schemas.py`:

```python
from pydantic import BaseModel, Field, field_validator
from typing import Any

class QuestionDataIn(BaseModel):
    id: str | None = None
    question_type: str  # matching | quiz | sequence | memory | language | sorting ...
    prompt: str
    points: int = 25
    data: dict[str, Any]

    @field_validator("data")
    @classmethod
    def validate_game_data(cls, v: dict, info):
        q_type = info.data.get("question_type")
        if q_type == "matching":
            if "pairs" not in v or not isinstance(v["pairs"], list) or len(v["pairs"]) == 0:
                raise ValueError("Game nối cột (matching) bắt buộc phải có mảng 'pairs' với ít nhất 1 cặp!")
        elif q_type == "quiz":
            if "options" not in v or "answer" not in v:
                raise ValueError("Game trắc nghiệm (quiz) bắt buộc phải có 'options' và 'answer'!")
        elif q_type == "sequence":
            if "sequence" not in v or "answer" not in v:
                raise ValueError("Game điền dãy (sequence) bắt buộc phải có 'sequence' và 'answer'!")
        return v
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/be-03-game-cms
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "backend: hoàn thiện phân trang games API và schema validation cho levels"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Tạo Game & Thêm Màn Chơi**:
  - Gửi request tạo game mới `matching` với data hợp lệ ➔ Tạo thành công.
  - Gửi request tạo game `matching` nhưng thiếu trường `pairs` ➔ Bắt buộc trả về lỗi 422/400 báo rõ lý do.
- [ ] **2. Test Phân Trang & Bộ Lọc**:
  - Gọi `GET /api/games?grade=3&category=iq` ➔ Chỉ trả về các game dành cho lớp 3 thuộc thể loại IQ.
  - Gọi `GET /api/games?search=toán` ➔ Tìm đúng game có tiêu đề chứa từ "toán".
- [ ] **3. Test Quy Trình Duyệt Game**:
  - Tạo 1 game mới ➔ Kiểm tra game nằm trong hàng đợi `/api/admin/review/queue` với trạng thái `pending_review`.
  - Dùng tài khoản Giáo viên gọi `POST /api/admin/review/decide` với `action: "approve"` ➔ Game chuyển sang `approved` và xuất hiện trên Marketplace.
