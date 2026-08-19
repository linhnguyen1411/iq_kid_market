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

#### 📁 Cấu trúc Thư mục Dự án:

```
iq_kid_market/
├── src/                               # Frontend: React 19 + TypeScript + Vite + Tailwind v4
│   ├── App.tsx                        # Toàn bộ UI / Flow chính (gọi API qua /api/*)
│   ├── components/
│   │   ├── QuestionRenderer.tsx       # Shell điều phối & render game engines
│   │   ├── ScratchSimulator.tsx       # Trình giả lập lập trình khối lệnh Scratch
│   │   ├── TechArchBoard.tsx          # Bảng sơ đồ kiến trúc
│   │   └── game-engines/              # 10 Engine game độc lập (Coding, Matching, Memory, Quiz...)
│   │       ├── registry.ts            # Đăng ký engine mapping
│   │       ├── soundUtils.ts          # Bộ phát âm thanh Web Audio API & tiện ích
│   │       └── types.ts
│   ├── data/
│   │   └── seedData.ts                # Dữ liệu gốc định nghĩa 100 màn chơi & Scratch courses
│   └── types.ts
├── backend/                           # Backend: Python FastAPI + SQLAlchemy + PostgreSQL
│   ├── app/
│   │   ├── main.py                    # FastAPI entrypoint, CORS, startup auto-seed
│   │   ├── database.py                # Cấu hình SQLAlchemy engine & session
│   │   ├── models.py                  # Định nghĩa ORM Models (User, Wallet, Game, Attempt...)
│   │   ├── schemas.py                 # Pydantic schemas (Request / Response validation)
│   │   ├── seed.py                    # Script khởi tạo 3 user demo & seed data
│   │   ├── seed_data.json             # Dữ liệu export nguyên vẹn từ seedData.ts
│   │   ├── default_templates.py       # Template mẫu cho 10 loại game engine
│   │   ├── ai_content.py              # Xử lý sinh nội dung qua Gemini AI & fallback mẫu
│   │   └── routers/                   # Module hoá API: session, games, wallet, attempts, admin, misc
│   ├── requirements.txt               # Dependencies backend
│   ├── .env.example                   # Biến môi trường mẫu cho backend
│   ├── Dockerfile                     # Dockerfile build backend container
├── docs/                              # Tài liệu kiến trúc & quy chuẩn dự án
│   ├── DEPLOY_LOCAL_GUIDE.md          # Hướng dẫn deploy local & tổng quan kiến trúc
│   └── GAME_ENGINE_RULES.md           # Rule bắt buộc khi thêm/sửa game engine
├── scripts/                           # Bộ script deploy tự động (Windows, Linux, macOS)
│   ├── deploy-local.bat
│   ├── deploy-local.ps1
│   └── deploy-local.sh
├── data/                              # Dữ liệu phụ trợ & backup
│   └── db.json
├── Dockerfile                         # Dockerfile build frontend container (Vite preview)
├── docker-compose.yml                 # Khởi chạy 3 services: db (Postgres) + backend + frontend
├── vite.config.ts                     # Cấu hình Vite & Proxy /api/* -> http://localhost:8000
└── package.json
```

> [!NOTE]
> **Điểm nổi bật về kiến trúc**:
> 1. **Dọn sạch hạ tầng ma**: Đã loại bỏ hoàn toàn Redis, MinIO và `server.ts`/`db.json` cũ để codebase tinh gọn, tập trung vào kiến trúc chuẩn FastAPI + PostgreSQL.
> 2. **Frontend không phụ thuộc backend**: `App.tsx` chỉ giao tiếp qua endpoint chuẩn `/api/*`. Vite tự động cấu hình proxy sang backend (cả ở chế độ dev local `localhost:8000` và docker `backend:8000`).

---

## 🛠️ 2. HƯỚNG DẪN TRIỂN KHAI LOCAL (DEPLOYMENT)

Bạn có thể lựa chọn 1 trong 2 phương pháp triển khai dưới đây:

---

### 🐳 PHƯƠNG PHÁP 1: TRIỂN KHAI VỚI DOCKER COMPOSE (KHUYẾN NGHỊ)
> **Yêu cầu**: Máy đã cài đặt **Docker** & **Docker Compose** (Docker Desktop trên Windows/macOS hoặc Docker Engine trên Linux).

Chế độ này sẽ tự động khởi dựng cụm **3 Containers**:
1. `iqkids_db`: PostgreSQL 15 Database (Cổng `5432`)
2. `iqkids_backend`: Python FastAPI Backend (Cổng `8000`)
3. `iqkids_frontend`: React 19 Frontend - Vite Build & Preview (Cổng `3000`)

#### Các bước thực hiện:

1. **Chuẩn bị file môi trường**:
   - **Linux / macOS (Bash)**:
     ```bash
     cp backend/.env.example backend/.env
     ```
   - **Windows (PowerShell)**:
     ```powershell
     Copy-Item backend/.env.example backend/.env
     ```
   *(Tùy chọn: Mở file `backend/.env` điền `GEMINI_API_KEY` nếu bạn muốn dùng AI thật; nếu để trống hệ thống sẽ tự động fallback sang dữ liệu mẫu).*

2. **Build và khởi chạy cụm Containers**:
   ```bash
   docker compose up --build
   ```
   *(Hoặc thêm cờ `-d` nếu muốn chạy nền: `docker compose up --build -d`)*

3. **Truy cập dịch vụ sau khi khởi chạy**:
   - 🌐 **Frontend App**: [http://localhost:3000](http://localhost:3000)
   - ⚡ **FastAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - 🗄️ **PostgreSQL**: `localhost:5432` (User: `iqkids_user` | Password: `iqkids_password` | Database: `iqkids_db`)

4. **Các lệnh quản trị Docker hữu ích**:
   ```bash
   docker compose logs -f backend    # Xem log riêng service backend
   docker compose down               # Dừng hệ thống, giữ lại volume dữ liệu Postgres
   docker compose down -v            # Dừng và XÓA HẲN dữ liệu Postgres (Reset về trắng)
   ```

---

### 💻 PHƯƠNG PHÁP 2: TRIỂN KHAI NATIVE (KHÔNG DÙNG DOCKER)
> **Yêu cầu cài đặt sẵn trên máy**:
> - **Node.js**: Phiên bản ≥ 18
> - **Python**: Phiên bản ≥ 3.12 (hoặc 3.10+)
> - **PostgreSQL**: Phiên bản 15+ cài trực tiếp trên OS

#### Bước 1: Khởi tạo PostgreSQL Database

- **Trên Windows (PowerShell sau khi cài PostgreSQL)**:
  ```powershell
  psql -U postgres -c "CREATE USER iqkids_user WITH PASSWORD 'iqkids_password';"
  psql -U postgres -c "CREATE DATABASE iqkids_db OWNER iqkids_user;"
  ```

- **Trên macOS (Homebrew)**:
  ```bash
  brew install postgresql@15
  brew services start postgresql@15
  psql postgres -c "CREATE USER iqkids_user WITH PASSWORD 'iqkids_password';"
  psql postgres -c "CREATE DATABASE iqkids_db OWNER iqkids_user;"
  ```

- **Trên Linux (Debian / Ubuntu)**:
  ```bash
  sudo apt update && sudo apt install -y postgresql postgresql-contrib
  sudo systemctl enable --now postgresql
  sudo -u postgres psql -c "CREATE USER iqkids_user WITH PASSWORD 'iqkids_password';"
  sudo -u postgres psql -c "CREATE DATABASE iqkids_db OWNER iqkids_user;"
  ```

#### Bước 2: Cài đặt và chạy Backend (FastAPI)

- **Trên Windows (PowerShell)**:
  ```powershell
  cd backend
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  pip install -r requirements.txt

  $env:DATABASE_URL = "postgresql+psycopg2://iqkids_user:iqkids_password@localhost:5432/iqkids_db"
  $env:GEMINI_API_KEY = ""
  $env:CORS_ORIGINS = "http://localhost:3000,http://localhost:5173"

  python -m app.seed
  uvicorn app.main:app --reload --port 8000
  ```
  *(Nếu PowerShell báo lỗi chặn script `Activate.ps1`, mở PowerShell quyền Admin và chạy: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`)*

- **Trên Linux / macOS (Bash)**:
  ```bash
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt

  export DATABASE_URL="postgresql+psycopg2://iqkids_user:iqkids_password@localhost:5432/iqkids_db"
  export GEMINI_API_KEY=""
  export CORS_ORIGINS="http://localhost:3000,http://localhost:5173"

  python -m app.seed
  uvicorn app.main:app --reload --port 8000
  ```

#### Bước 3: Cài đặt và chạy Frontend (Vite)

Mở một cửa sổ Terminal mới tại thư mục gốc dự án:
```bash
npm install
npm run dev
```

- Ứng dụng chạy tại: **`http://localhost:5173`**
- Vite tự động proxy mọi request `/api/*` sang `http://localhost:8000`.

---

### 2.3. 🔄 Quy Trình Cập Nhật Code Mới & Mẹo Chạy Local (Workflow & Pro Tips)

Khi bạn hoặc đồng nghiệp có code mới (hoặc sau khi chạy `git pull`), hãy áp dụng quy trình sau:

#### 🚀 Cách 1: Nhanh nhất với Docker Compose (Khuyên dùng)
Mỗi khi có code mới, thay đổi model hoặc cập nhật thư viện:
```powershell
docker compose up --build
```
> [!TIP]
> **Mẹo Reset CSDL Sạch Sẽ (Clean Reset)**:
> Nếu có thay đổi lớn về bảng CSDL hoặc bạn muốn nạp lại toàn bộ dữ liệu mẫu ban đầu:
> ```powershell
> docker compose down -v
> docker compose up --build
> ```
> *(Cờ `-v` sẽ xóa volume `postgres_data` cũ và tự động khởi tạo lại DB mới cùng dữ liệu seed).*

---

#### 💻 Cách 2: Dành cho lúc đang trực tiếp Lập trình (Dev Mode Hot-Reload)
Để code mà không cần khởi động lại server thủ công:

- **🟢 Terminal 1 (Backend FastAPI)**:
  ```powershell
  cd backend
  .\venv\Scripts\Activate.ps1
  pip install -r requirements.txt      # Chạy khi có thư viện mới
  uvicorn app.main:app --reload --port 8000
  ```
  *(Cờ `--reload` giúp server tự khởi động lại trong 0.5s ngay khi bạn vừa lưu file `.py`).*

- **🔵 Terminal 2 (Frontend React + Vite)**:
  ```powershell
  npm install                         # Chạy khi có package mới
  npm run dev
  ```
  *(Vite sử dụng HMR - Hot Module Replacement: Mọi chỉnh sửa giao diện `.tsx` hoặc `.css` sẽ phản chiếu tức thì lên trình duyệt trong 0.1s mà không cần bấm F5).*

---

## 👥 3. TÀI KHOẢN MẪU ĐỂ TEST HỆ THỐNG (DEMO SEED DATA)

Hệ thống tự động khởi tạo các tài khoản mẫu với mật khẩu mặc định là **`123456`**, đầy đủ số dư ví, quyền hạn và dữ liệu kiểm thử:

| ID | Username | Mật khẩu mặc định | Tên hiển thị | Vai trò (Role) | Cấu hình & Trạng thái khởi tạo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `u1` | `kid_binh` | **`123456`** | Thế Bình 🌟 | **Học sinh (Student)** | - Học sinh Lớp 2, Level 1, 120 XP, Streak 3 ngày.<br>- Số dư ví: **90.000 đ**.<br>- Đã mở khóa game: `g1` (Ghép Cặp Thần Tốc).<br>- Có sẵn lịch sử làm bài & điểm trên Bảng xếp hạng. |
| `u2` | `giao_vien_lan` | **`123456`** | Cô Lan Anh 👩‍🏫 | **Giáo viên / Creator** | - Level 5, 450 XP.<br>- Số dư ví: **500.000 đ**.<br>- Đã mở khóa game: `g1`, `g2`, `g3`.<br>- Toàn quyền vào Studio Sáng Tạo: Tạo Game mới, Thiết kế AI, Level Builder. |
| `u3` | `phu_huynh_dung` | **`123456`** | Bố Tiến Dũng 👨‍💼 | **Phụ huynh (Parent)** | - Level 1, 0 XP.<br>- Số dư ví: **1.000.000 đ**.<br>- Đã liên kết mua mở khóa game `g1`, `g2` cho con, xem tiến độ học của con. |

> [!TIP]
> **Đăng nhập nhanh 1 chạm (1-Click Demo Login)**: Trên giao diện Modal Đăng nhập (`AuthModal`), bạn có thể nhấp trực tiếp vào các nút mẫu `🐯 Bé Bình`, `👩‍🏫 Cô Lan`, `👨‍💼 Bố Dũng` để điền tự động username và mật khẩu tức thì.
> 
> **Đăng ký tài khoản mới (Register)**: Người dùng mới có thể bấm nút **"Đăng Ký ✨"** ở Header, chọn Avatar linh vật 3D, chọn khối lớp (Lớp 1-9), chọn vai trò để nhận ngay quà tặng chào mừng (90.000đ + 100 XP cho Học sinh, 500.000đ cho Giáo viên, 1.000.000đ cho Phụ huynh).

---

## 📋 4. NGUYÊN TẮC PHÁT TRIỂN & QUY CHUẨN ĐÓNG GÓP (PRINCIPLES)

1. **Bảo toàn giao tiếp Frontend - Backend**:
   - `App.tsx` chỉ gọi `fetch('/api/...')`. Không sửa path API hoặc cấu trúc dữ liệu response khi refactor backend.
2. **Quy chuẩn Game Engine (`GAME_ENGINE_RULES.md`)**:
   - Mỗi thể loại game là một component độc lập trong `src/components/game-engines/`.
   - `QuestionRenderer.tsx` chỉ giữ vai trò khung chứa (shell), không can thiệp logic chấm điểm riêng của từng mini-game.
   - Thêm game mới: tạo engine component mới + đăng ký 1 dòng vào `registry.ts`.
3. **Quản lý Cơ sở dữ liệu**:
   - Giai đoạn MVP sử dụng `Base.metadata.create_all()` khi khởi động app và `app.seed` để nạp dữ liệu.
   - Dữ liệu `seed_data.json` được sinh tự động từ `src/data/seedData.ts`, không sửa tay trực tiếp.
4. **Biến môi trường**:
   - Không commit thông tin nhạy cảm (API Keys, Passwords) vào Git. Luôn dùng `.env` và commit file mẫu `.env.example`.

---

## 📌 5. TỔNG KẾT DANH MỤC FILE LIÊN QUAN

| Tệp tin | Vị trí | Mô tả |
| :--- | :--- | :--- |
| [`README.md`](file:///D:/encee/workspace/web/iq_kid_market/README.md) | `./` | Tài liệu chính thức của dự án |
| [`docs/DEPLOY_LOCAL_GUIDE.md`](file:///D:/encee/workspace/web/iq_kid_market/docs/DEPLOY_LOCAL_GUIDE.md) | `docs/` | Hướng dẫn chi tiết triển khai Local & Kiến trúc |
| [`docs/GAME_ENGINE_RULES.md`](file:///D:/encee/workspace/web/iq_kid_market/docs/GAME_ENGINE_RULES.md) | `docs/` | Quy tắc xây dựng & mở rộng Game Engine |
| [`docs/PLAN_AUTH_SYSTEM.md`](file:///D:/encee/workspace/web/iq_kid_market/docs/PLAN_AUTH_SYSTEM.md) | `docs/` | Kế hoạch thiết kế & triển khai Auth (Register/Login) |
| [`scripts/dev-local.bat`](file:///D:/encee/workspace/web/iq_kid_market/scripts/dev-local.bat) | `scripts/` | ⚡ Chạy Dev nhanh 1-Click trên Windows (Không cần Docker build) |
| [`scripts/dev-local.ps1`](file:///D:/encee/workspace/web/iq_kid_market/scripts/dev-local.ps1) | `scripts/` | ⚡ Script PowerShell Dev nhanh có Hot-Reload |
| [`scripts/dev-local.sh`](file:///D:/encee/workspace/web/iq_kid_market/scripts/dev-local.sh) | `scripts/` | ⚡ Shell script Dev nhanh cho Linux/macOS |
| [`scripts/deploy-local.bat`](file:///D:/encee/workspace/web/iq_kid_market/scripts/deploy-local.bat) | `scripts/` | 🐳 Script chạy full Docker trên Windows |
| [`scripts/deploy-local.ps1`](file:///D:/encee/workspace/web/iq_kid_market/scripts/deploy-local.ps1) | `scripts/` | 🐳 Script PowerShell deploy Docker |
| [`scripts/deploy-local.sh`](file:///D:/encee/workspace/web/iq_kid_market/scripts/deploy-local.sh) | `scripts/` | 🐳 Shell script deploy Docker cho Linux/macOS |
| [`docker-compose.yml`](file:///D:/encee/workspace/web/iq_kid_market/docker-compose.yml) | `./` | Cấu hình Docker Compose (3 services: db, backend, frontend) |
| [`Dockerfile`](file:///D:/encee/workspace/web/iq_kid_market/Dockerfile) | `./` | Dockerfile cho Frontend |
| [`backend/Dockerfile`](file:///D:/encee/workspace/web/iq_kid_market/backend/Dockerfile) | `backend/` | Dockerfile cho Backend FastAPI |
| [`backend/README.md`](file:///D:/encee/workspace/web/iq_kid_market/backend/README.md) | `backend/` | Tài liệu chuyên sâu về Backend FastAPI & Database |
