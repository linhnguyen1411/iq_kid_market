# IQ Kids Market

Nền tảng game trí tuệ cho trẻ em: React (Vite) frontend + FastAPI backend + PostgreSQL, có ví/điểm thưởng, hệ thống game-engine mở rộng được, và tính năng AI-generate màn chơi (Gemini, có fallback khi không có API key).

Repo: https://github.com/linhnguyen1411/iq_kid_market

---

## 1. Kiến trúc dự án

```
iq_kid_market/
├── src/                      # Frontend: React 19 + TypeScript + Vite + Tailwind v4
│   ├── App.tsx                # Toàn bộ UI/flow chính (không cần sửa khi đổi backend)
│   ├── components/
│   │   └── game-engines/       # Mỗi loại game = 1 engine riêng (xem GAME_ENGINE_RULES.md)
│   ├── data/
│   └── types.ts
├── backend/                  # Backend: FastAPI + SQLAlchemy + PostgreSQL
│   ├── app/
│   │   ├── main.py             # App FastAPI, CORS, tạo bảng + seed lúc khởi động
│   │   ├── database.py         # SQLAlchemy engine/session
│   │   ├── models.py           # ORM models
│   │   ├── schemas.py          # Pydantic schemas
│   │   ├── seed.py             # Seed user demo + dữ liệu mẫu
│   │   ├── seed_data.json
│   │   ├── default_templates.py
│   │   ├── ai_content.py       # Fallback generator + tích hợp Gemini
│   │   └── routers/            # session, games, wallet, attempts, admin, misc
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── Dockerfile                 # Build frontend (Vite build + preview)
├── docker-compose.yml         # db + backend + frontend
├── vite.config.ts             # Proxy /api/* -> backend (localhost:8000 mặc định)
├── GAME_ENGINE_RULES.md       # Rule bắt buộc khi thêm/sửa game engine
└── package.json

```

- Frontend gọi `fetch('/api/...')` như cũ; Vite dev server và Vite preview (trong Docker) đều proxy `/api/*` sang backend FastAPI, nên **không cần sửa** `App.tsx` dù chạy local hay Docker.
- Backend tự tạo bảng (`Base.metadata.create_all`) và tự seed dữ liệu mẫu (3 user demo, 5 game thật/100 màn, achievements, scratch courses) nếu bảng `users` đang rỗng — không dùng Alembic ở giai đoạn MVP này.

---

## 2. Thiết lập Local — KHÔNG dùng Docker

Yêu cầu cài sẵn: **Node.js ≥ 18**, **Python ≥ 3.12** (hoặc 3.10+), **PostgreSQL 15+ cài native** (không dùng Docker ở phần này — nếu muốn chạy Postgres bằng Docker, xem thẳng mục 3).

**Nếu chưa có Postgres, cài native theo OS:**

Linux (Debian/Ubuntu):

```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "CREATE USER iqkids_user WITH PASSWORD 'iqkids_password';"
sudo -u postgres psql -c "CREATE DATABASE iqkids_db OWNER iqkids_user;"

```

macOS (Homebrew):

```bash
brew install postgresql@15
brew services start postgresql@15

# Homebrew Postgres không có sẵn role "postgres" — superuser mặc định trùng tên user macOS của bạn,
# nên kết nối trực tiếp vào DB "postgres" (không cần -U) để tạo role/db mới:
psql postgres -c "CREATE USER iqkids_user WITH PASSWORD 'iqkids_password';"
psql postgres -c "CREATE DATABASE iqkids_db OWNER iqkids_user;"

# Verify role đã được tạo đúng (tránh lỗi "role does not exist" khi chạy seed):
psql postgres -c "\du" | grep iqkids_user

```

> Nếu máy bạn có nhiều bản Postgres (ví dụ vừa cài qua brew vừa có sẵn Postgres.app), `psql`/port 5432 có thể trỏ nhầm instance. Kiểm tra bằng `which psql` và `brew services list`; nếu cần, dừng instance cũ trước khi chạy các lệnh trên.

Windows (PowerShell, sau khi cài PostgreSQL từ https://www.postgresql.org/download/windows/ — installer đã bao gồm `psql` và tự chạy service):

```powershell
psql -U postgres -c "CREATE USER iqkids_user WITH PASSWORD 'iqkids_password';"
psql -U postgres -c "CREATE DATABASE iqkids_db OWNER iqkids_user;"

```

### 2.1. Backend

**Linux / macOS (bash):**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL="postgresql+psycopg2://iqkids_user:iqkids_password@localhost:5432/iqkids_db"
export GEMINI_API_KEY=""   # để trống = tự fallback, không gọi AI thật
export CORS_ORIGINS="http://localhost:3000,http://localhost:5173"

python -m app.seed          # tạo bảng + seed dữ liệu, chỉ cần chạy 1 lần
uvicorn app.main:app --reload --port 8000

```

**Windows (PowerShell):**

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

> Nếu PowerShell chặn chạy script (`Activate.ps1`), mở PowerShell với quyền admin và chạy 1 lần: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

Sau khi chạy: API ở `http://localhost:8000`, Swagger docs tự sinh ở `http://localhost:8000/docs`.

### 2.2. Frontend (mở terminal khác)

**Linux / macOS / Windows (giống nhau, npm là cross-platform):**

```bash
npm install
npm run dev

```

- Vite chạy ở `http://localhost:5173` mặc định, đã proxy sẵn `/api/*` → `http://localhost:8000`.
- `App.tsx` không cần sửa gì thêm.

---

## 3. Thiết lập bằng Docker (khuyên dùng cho demo/deploy)

Yêu cầu: **Docker** + **Docker Compose** (Docker Desktop trên Windows đã có sẵn cả hai; trên Linux cần cài `docker-compose-plugin` hoặc `docker-compose` riêng).

Các lệnh dưới đây **giống nhau trên Linux và Windows** vì chạy qua Docker CLI — chỉ khác cú pháp copy file nếu không có `cp`.

**Linux / macOS (bash):**

```bash
cp backend/.env.example backend/.env
# Mở backend/.env, điền GEMINI_API_KEY nếu có; để trống thì tự fallback

docker compose up --build

```

**Windows (PowerShell):**

```powershell
Copy-Item backend/.env.example backend/.env
# Mở backend/.env, điền GEMINI_API_KEY nếu có; để trống thì tự fallback

docker compose up --build

```

> Dùng `docker compose` (Docker Compose V2, khuyến nghị) hoặc `docker-compose` (V1) tuỳ phiên bản Docker đã cài.

Sau khi lên xong:


| Service     | URL                   | Ghi chú                                                          |
| ----------- | --------------------- | ---------------------------------------------------------------- |
| Frontend    | http://localhost:3000 | Vite build + `vite preview`, proxy `/api` sang service `backend` |
| Backend API | http://localhost:8000 | Docs: http://localhost:8000/docs                                 |
| PostgreSQL  | localhost:5432        | user/pass/db: `iqkids_user` / `iqkids_password` / `iqkids_db`    |


Lần chạy đầu tiên, `backend` tự đợi `db` healthy (`depends_on: condition: service_healthy`), tự tạo bảng và tự seed dữ liệu nếu bảng `users` rỗng.

Các lệnh hữu ích khác:

```bash
docker compose up --build -d      # chạy nền
docker compose logs -f backend    # xem log riêng 1 service
docker compose down               # dừng, giữ lại volume postgres_data
docker compose down -v            # dừng và XOÁ LUÔN dữ liệu Postgres (reset sạch)

```

---

## 4. Rule chuẩn / Development Principles

### 4.1. Nguyên tắc chung

- **Frontend không phụ thuộc backend cụ thể.** `App.tsx` chỉ gọi `fetch('/api/...')` — mọi thay đổi backend (ngôn ngữ, framework, hạ tầng) không được kéo theo sửa route path hay response shape đã thống nhất.
- **Không giữ hạ tầng "ma".** Không khai báo service/dependency trong `docker-compose.yml` hay `requirements.txt` nếu không có code nào thực sự dùng tới (bài học từ việc dọn Redis/MinIO cũ — xem `backend/README.md`).
- **MVP dùng** `create_all()`**, không dùng Alembic** — chấp nhận được cho dev/demo. Trước khi lên production hoặc khi cần schema có version, bắt buộc chuyển sang Alembic (`alembic init`, generate revision từ `app/models.py`) trước khi merge thay đổi schema.
- **Auth hiện tại chỉ là placeholder** (`userId` truyền tay qua query/body, không có JWT/session thật). Không được coi đây là chuẩn bảo mật — phải thêm auth thật trước khi lên production.
- **Biến môi trường không hardcode.** Luôn đọc qua `os.getenv` (backend) / `.env` (frontend nếu có), không commit secret thật vào `.env` — chỉ commit `.env.example`.

### 4.2. Backend (FastAPI)

- Mỗi domain nghiệp vụ (session, games, wallet, attempts, admin, misc...) có 1 router riêng trong `app/routers/`. Không dồn logic không liên quan vào 1 file.
- `seed_data.json` là dữ liệu **export nguyên vẹn** — không sửa tay trực tiếp, luôn generate lại từ nguồn gốc (`src/data/seedData.ts` hoặc script tương ứng) để tránh lệch dữ liệu giữa frontend/backend.
- Response shape (field name, kiểu dữ liệu) của mọi route `/api/*` phải giữ nguyên khi refactor nội bộ backend — vì frontend không được sửa theo.

### 4.3. Frontend / Game Engine

Toàn bộ rule chi tiết về kiến trúc game engine nằm ở `GAME_ENGINE_RULES.md` — bắt buộc đọc trước khi đụng vào bất kỳ game/level nào. Tóm tắt các nguyên tắc bất biến:

- Mỗi loại game = 1 file component riêng trong `src/components/game-engines/`, tự quản lý state, tự vẽ UI, tự chấm đúng/sai.
- `QuestionRenderer.tsx` chỉ lo shell (header/timer/success-screen) và lookup `GAME_ENGINES[question.question_type]` — **không bao giờ chứa logic của 1 game cụ thể**.
- Thêm game mới = thêm 1 file engine + đăng ký đúng 1 dòng trong `registry.ts`. Không sửa `QuestionRenderer.tsx`, không đụng vào engine khác.
- Mọi engine tuân theo đúng interface `GameEngineProps { question, onComplete }`, không nhận thêm props ngoài quy ước. State điểm/thời gian toàn cục là việc của `QuestionRenderer.tsx`, không phải của engine.
- Dùng chung tiện ích có sẵn (`playSynthSound`, `shuffleArray` từ `soundUtils.ts`) thay vì viết lại.

### 4.4. Git / Review

- Commit message rõ ràng theo phạm vi thay đổi (`backend: ...`, `frontend: ...`, `game-engine: ...`).
- PR đụng tới schema Postgres hoặc route `/api/*` phải nêu rõ trong mô tả PR: có breaking change với frontend hay không.
- PR thêm game engine mới bắt buộc đối chiếu với `GAME_ENGINE_RULES.md` trước khi merge.

