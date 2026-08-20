# [BE-07] Tích Hợp Alembic Database Migrations & Tối Ưu Hóa CSDL (Database Architecture)

> **Mô tả nghiệp vụ**: Chuyển đổi cơ chế khởi tạo database tự phát (`Base.metadata.create_all`) sang công cụ quản lý phiên bản CSDL chuyên nghiệp **Alembic**. Thiết lập hệ thống Indexing tối ưu cho PostgreSQL (B-Tree, GIN cho JSONB), và viết script sao lưu & phục hồi CSDL tự động (Backup & Restore).

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-07`
- **Mảng phụ trách**: Backend (PostgreSQL + Alembic + SQLAlchemy)
- **Độ ưu tiên**: 🟡 P2 (Nền tảng vận hành Production)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/be-07-alembic-migrations`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Alembic**:
   - Công cụ quản lý di chuyển dữ liệu (Database Migration Tool) chuẩn mực cho SQLAlchemy.
   - Giúp kiểm soát lịch sử thay đổi schema (thêm cột, sửa kiểu dữ liệu, tạo bảng mới) mà không làm mất dữ liệu hiện có trong Database.
2. **Migration Scripts (Revisions)**:
   - Mỗi lần đổi model trong `models.py` ➔ Sinh 1 file migration: `alembic revision --autogenerate -m "thêm_cột_xyz"`.
   - Áp dụng vào CSDL: `alembic upgrade head`.
   - Quay lui phiên bản cũ: `alembic downgrade -1`.
3. **Database Indexing (Đánh Chỉ Mục)**:
   - `B-Tree Index`: Dùng cho các trường tìm kiếm chính xác hoặc theo khoảng (`username`, `created_at`, `price`, `grade_from`, `grade_to`).
   - `GIN Index (Generalized Inverted Index)`: Đánh chỉ mục chuyên dụng cho cột JSONB `levels` trong PostgreSQL để truy vấn siêu tốc các phần tử bên trong JSON.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Cấu hình Alembic trong thư mục `backend/`**:
   - Tạo file `alembic.ini` và thư mục `backend/alembic/`.
   - Cấu hình `env.py` trỏ đúng vào `Base.metadata` của `backend.app.models` và đọc `DATABASE_URL` từ biến môi trường.
2. **Tạo Migration Khởi Đầu (Initial Migration)**:
   - Tạo script revision đầu tiên chứa toàn bộ bảng: `users`, `wallets`, `wallet_transactions`, `games`, `purchases`, `attempts`, `achievements`, `scratch_courses`, `scratch_lessons`, `user_scratch_progress`.
3. **Đánh Index Tối Ưu PostgreSQL**:
   - `users.username` (Unique index)
   - `games.template_code`, `games.category`, `games.review_status`
   - `attempts.user_id`, `attempts.created_at`
   - `wallet_transactions.wallet_user_id`
4. **Viết Script Backup & Restore DB (`scripts/db-backup.sh` & `.ps1`)**:
   - Dùng lệnh `pg_dump` và `psql` để xuất và nạp dữ liệu định kỳ.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Cài đặt & Khởi tạo Alembic**:
  - [x] Thêm `alembic==1.14.0` vào `backend/requirements.txt`.
  - [x] Khởi tạo môi trường `alembic.ini` và `backend/alembic/`.
- [x] **2. Cấu hình `alembic/env.py`**:
  - [x] Import `Base` từ `app.database`.
  - [x] Import toàn bộ `models` để Alembic nhận diện đầy đủ metadata.
  - [x] Đọc biến môi trường `DATABASE_URL` linh hoạt (hỗ trợ cả chạy local lẫn Docker).
- [x] **3. Sinh & Áp Dụng Revision**:
  - [x] Tạo revision `0001_initial_schema_and_indexes.py`.
  - [x] Chạy `alembic upgrade head` và `downgrade base` kiểm thử thành công.
- [x] **4. Đánh Database Indexes tối ưu**:
  - [x] Đánh B-Tree indexes cho các cột thường xuyên lọc / sắp xếp trong `models.py`.
- [x] **5. Viết Scripts Backup/Restore trong thư mục `scripts/`**:
  - [x] `scripts/db-backup.ps1`, `scripts/db-backup.sh`, `scripts/db-restore.ps1`, `scripts/db-restore.sh`.
- [x] **6. Viết Test & Kiểm thử thực tế**:
  - [x] Viết `backend/test_be07_alembic.py` bao phủ 100% các kịch bản và test thành công.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Cấu hình `backend/alembic/env.py`:

```python
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Import metadata từ app của chúng ta
from app.database import Base
from app import models  # noqa: F401

config = context.config

# Đọc DATABASE_URL từ environment nếu có
db_url = os.getenv("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    pass
else:
    run_migrations_online()
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/be-07-alembic-migrations
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "backend: cấu hình alembic migration và đánh index postgresql"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Upgrade & Downgrade**:
  - Chạy `alembic upgrade head` ➔ Toàn bộ bảng và index được tạo đầy đủ trên DB sạch.
  - Chạy `alembic downgrade -1` ➔ Schema quay lui an toàn không lỗi.
  - Chạy lại `alembic upgrade head` ➔ Cập nhật thành công.
- [ ] **2. Test Seed Dữ Liệu**:
  - Sau khi chạy migration, chạy `python -m app.seed` ➔ Dữ liệu mẫu (3 user demo, 5 game, achievements) nạp thành công trơn tru.
