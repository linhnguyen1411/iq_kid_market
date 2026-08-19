# 📘 DỰ ÁN IQ KID MARKET - HƯỚNG DẪN DEPLOY LOCAL & TÀI LIỆU KIẾN TRÚC

Tài liệu hướng dẫn triển khai môi trường phát triển cục bộ (Local Development) và tổng quan kiến trúc hệ thống chuẩn cho dự án **IQ Kid Market**.

---

## 🎯 1. TỔNG QUAN DỰ ÁN

### 1.1 IQ Kid Market là gì?
**IQ Kid Market** là nền tảng **EdTech kết hợp Gamification (Học mà chơi)** dành cho học sinh từ **Lớp 1 đến Lớp 9** tại Việt Nam.
- **Học sinh**: Rèn luyện tư duy IQ qua hệ thống mini-game tương tác sinh động, học lập trình khối lệnh trực quan trong Scratch Simulator, tích lũy điểm thưởng XP và leo Bảng xếp hạng (Leaderboard).
- **Giáo viên / Nhà sáng tạo**: Thiết kế bộ câu hỏi/game IQ custom theo nhiều engine khác nhau, tạo khóa học Scratch và đưa lên Chợ game.
- **Phụ huynh**: Theo dõi tiến độ học tập, quản lý tài chính và nạp tiền vào Ví phụ huynh để mua mở khóa game giáo dục cho con.
- **AI Tutor & AI Game Generator**: Tích hợp Google Gemini AI (Python SDK `google-genai`) hỗ trợ giải đáp thắc mắc và sinh câu hỏi IQ tự động (có cơ chế tự động Fallback offline nếu không cấu hình API Key).

---

### 1.2 Kiến trúc Hệ thống (System Architecture)

Hệ thống được thiết kế theo mô hình tách biệt Frontend - Backend rõ ràng, chuẩn hóa theo stack hiện đại:

```
                          +-------------------------------------------------------+
                          |               IQ KID MARKET FRONTEND                  |
                          |     (React 19 + TypeScript + Vite + Tailwind v4)      |
                          |           Proxy tự động: /api/* -> Port 8000          |
                          +-------------------------------------------------------+
                                                      |
                                                      | HTTP / REST API (/api/*)
                                                      v
                          +-------------------------------------------------------+
                          |                FASTAPI BACKEND SERVICE                |
                          |       - Python 3.12 (hoặc 3.10+) + FastAPI            |
                          |       - SQLAlchemy ORM + Auto-seed on startup         |
                          |       - Auto-generated Prefix IDs (Stripe-style)      |
                          |       - Google Gemini AI Integration (google-genai)   |
                          |       - Routers: session, games, wallet, attempts...  |
                          +-------------------------------------------------------+
                                                      |
                                                      | SQLAlchemy Engine (port 5432)
                                                      v
                          +-------------------------------------------------------+
                          |                 POSTGRESQL 15 DATABASE                |
                          |           (Users, Wallets, Games, Attempts...)        |
                          +-------------------------------------------------------+
```

---

### 1.3 Cơ chế Tự động sinh Khóa chính (Auto-Generated Prefix IDs)

Hệ thống áp dụng chuẩn **Stripe-style Prefix ID** tự động ở cấp độ Model & Backend:
- `users`: Tự động sinh `usr_<uuid12>` (vd: `usr_3f8a9c12b4e5`).
- `wallet_transactions`: Tự động sinh `tx_<timestamp_ms>_<entropy>` (vừa time-sortable, vừa unique 100%).
- `games`: Tự động sinh `game_<timestamp_ms>_<entropy>` (vd: `game_1786508943128_3f8a9c`).
- `attempts`: Tự động sinh `att_<timestamp_ms>_<entropy>`.
- `achievements`: Tự động sinh `ach_<entropy>`.
- `scratch_courses`: Tự động sinh `sc_<entropy>`.
- `purchases` & `scratch_lessons`: Tự động tăng (`SERIAL / autoincrement`).

> [!TIP]
> **Ưu điểm khi lên Production**:
> - Nhìn vào ID trong log/URL/DB là nhận biết ngay loại thực thể.
> - Đảm bảo tính duy nhất 100% khi hệ thống mở rộng đa server/sharding mà không sợ xung đột ID.
> - Chống tấn công dò quét dữ liệu (ID enumeration attack) so với số nguyên tăng dần `1, 2, 3...`.

---

## 🛠️ 2. HƯỚNG DẪN TRIỂN KHAI LOCAL (DEPLOYMENT)

---

### 🐳 PHƯƠNG PHÁP 1: TRIỂN KHAI VỚI DOCKER COMPOSE (KHUYẾN NGHỊ)
> **Yêu cầu**: Máy đã cài đặt và bật **Docker Desktop**.

Chế độ này sẽ tự động khởi dựng cụm **3 Containers**:
1. `iqkids_db`: PostgreSQL 15 Database (Cổng `5432`)
2. `iqkids_backend`: Python FastAPI Backend (Cổng `8000`)
3. `iqkids_frontend`: React 19 Frontend - Vite Build & Preview (Cổng `3000`)

#### Các bước thực hiện:

1. **Chuẩn bị file môi trường**:
   - **Windows (PowerShell)**:
     ```powershell
     Copy-Item backend/.env.example backend/.env
     ```
   - **Linux / macOS (Bash)**:
     ```bash
     cp backend/.env.example backend/.env
     ```
   *(Tùy chọn: Điền `GEMINI_API_KEY` vào file `backend/.env` nếu muốn dùng AI thật; để trống sẽ tự động fallback sang bài tập mẫu).*

2. **Khởi chạy hệ thống**:
   ```bash
   docker compose up -d --build
   ```

3. **Truy cập dịch vụ**:
   - 🌐 **Frontend App**: [http://localhost:3000](http://localhost:3000)
   - ⚡ **FastAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - 🗄️ **PostgreSQL**: `localhost:5432` (User: `iqkids_user` | Password: `iqkids_password` | Database: `iqkids_db`)

4. **Các lệnh quản trị Docker hữu ích**:
   ```bash
   docker compose logs -f            # Xem log real-time toàn bộ dịch vụ
   docker compose down               # Dừng hệ thống (giữ lại dữ liệu DB)
   docker compose down -v            # Dừng và XOÁ TOÀN BỘ volume dữ liệu cũ (Reset sạch)
   ```

---

### 💻 PHƯƠNG PHÁP 2: TRIỂN KHAI NATIVE (KHÔNG DÙNG DOCKER)
> **Yêu cầu cài đặt sẵn trên máy**:
> - **Node.js**: Phiên bản ≥ 18
> - **Python**: Phiên bản ≥ 3.12 (hoặc 3.10+)
> - **PostgreSQL**: Phiên bản 15+ cài native

#### Bước 1: Khởi tạo PostgreSQL Database
- **Windows (PowerShell)**:
  ```powershell
  psql -U postgres -c "CREATE USER iqkids_user WITH PASSWORD 'iqkids_password';"
  psql -U postgres -c "CREATE DATABASE iqkids_db OWNER iqkids_user;"
  ```
- **macOS / Linux**:
  ```bash
  psql postgres -c "CREATE USER iqkids_user WITH PASSWORD 'iqkids_password';"
  psql postgres -c "CREATE DATABASE iqkids_db OWNER iqkids_user;"
  ```

#### Bước 2: Khởi chạy Backend (FastAPI)
- **Windows (PowerShell)**:
  ```powershell
  cd backend
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  pip install -r requirements.txt

  $env:DATABASE_URL = "postgresql+psycopg2://iqkids_user:iqkids_password@localhost:5432/iqkids_db"
  $env:GEMINI_API_KEY = ""
  $env:CORS_ORIGINS = "http://localhost:3000,http://localhost:5173"

  python -m app.seed --reset
  uvicorn app.main:app --reload --port 8000
  ```

- **Linux / macOS (Bash)**:
  ```bash
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt

  export DATABASE_URL="postgresql+psycopg2://iqkids_user:iqkids_password@localhost:5432/iqkids_db"
  export GEMINI_API_KEY=""
  export CORS_ORIGINS="http://localhost:3000,http://localhost:5173"

  python -m app.seed --reset
  uvicorn app.main:app --reload --port 8000
  ```

#### Bước 3: Khởi chạy Frontend (Vite)
Mở Terminal mới tại thư mục gốc:
```bash
npm install
npm run dev
```
Truy cập giao diện tại: **`http://localhost:5173`**

---

## 🔄 3. HƯỚNG DẪN RESET DATABASE SẠCH TỪ ĐẦU (CLEAN RESET)

Nếu bạn đã thao tác nộp dữ liệu vào DB và muốn **xoá sạch toàn bộ để nạp lại từ đầu** theo cấu trúc mới:

### Cách 1: Sử dụng Docker Compose (Nhanh nhất & Triệt để nhất)
```powershell
# Bước 1: Dừng container và xoá volume dữ liệu cũ
docker compose down -v

# Bước 2: Khởi động lại (hệ thống sẽ tự tạo bảng mới và tự động seed lại dữ liệu)
docker compose up -d --build
```

### Cách 2: Sử dụng Script Python Native
```powershell
cd backend
python -m app.seed --reset
```
*Lệnh `--reset` sẽ tự động `DROP ALL TABLES`, tạo lại toàn bộ cấu trúc bảng mới và nạp lại toàn bộ 3 user demo, 100 màn chơi, khoá học Scratch.*

### Cách 3: Sử dụng Menu Script Tự Động
Chạy `.\deploy-local.ps1` hoặc `deploy-local.bat`, sau đó chọn **[4] Reset sạch Database & Seed lại từ đầu**.

---

## 👥 4. TÀI KHOẢN MẪU ĐỂ TEST HỆ THỐNG

| ID | Username | Tên hiển thị | Vai trò (Role) | Cấu hình & Trạng thái khởi tạo |
| :--- | :--- | :--- | :--- | :--- |
| `u1` | `kid_binh` | Thế Bình 🌟 | **Học sinh (Student)** | - Học sinh Lớp 2, Level 1, 120 XP, Streak 3 ngày.<br>- Số dư ví: **90.000 đ**.<br>- Đã mở khóa game: `g1` (Ghép Cặp Thần Tốc).<br>- Có sẵn lịch sử làm bài & điểm trên Bảng xếp hạng. |
| `u2` | `giao_vien_lan` | Cô Lan Anh 👩‍🏫 | **Giáo viên (Teacher)** | - Level 5, 450 XP.<br>- Số dư ví: **500.000 đ**.<br>- Đã mở khóa game: `g1`, `g2`, `g3`.<br>- Có quyền tạo game custom và khóa học Scratch. |
| `u3` | `phu_huynh_dung` | Bố Tiến Dũng 👨‍💼 | **Phụ huynh (Parent)** | - Level 1, 0 XP.<br>- Số dư ví: **1.000.000 đ**.<br>- Đã liên kết mua mở khóa game `g1`, `g2` cho con. |
