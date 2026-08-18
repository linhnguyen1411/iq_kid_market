# IQ Kids Market — Backend (FastAPI + Postgres)

Thay thế hoàn toàn `server.ts` (Node/Express + file `db.json`) bằng FastAPI + Postgres thật.
Tất cả route `/api/*` giữ nguyên path, request/response shape — **frontend (`App.tsx`) không cần sửa 1 dòng nào.**

## Chạy nhanh (docker-compose, khuyên dùng)

```bash
cp backend/.env.example backend/.env   # điền GEMINI_API_KEY nếu có, không có thì bỏ trống (auto fallback)
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 (docs tự sinh: http://localhost:8000/docs)
- Postgres: localhost:5432 (user/pass/db: `iqkids_user` / `iqkids_password` / `iqkids_db`)

Lần chạy đầu tiên, backend tự tạo bảng (`create_all`) và tự nạp seed data (3 user demo + 5 game thật/100 màn + achievements + scratch courses) nếu bảng `users` đang rỗng.

## Chạy backend riêng lẻ (không Docker, để dev nhanh với Cursor)

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Cần Postgres chạy sẵn (local hoặc docker run postgres:15-alpine)
export DATABASE_URL="postgresql+psycopg2://iqkids_user:iqkids_password@localhost:5432/iqkids_db"
python -m app.seed          # tạo bảng + seed data 1 lần
uvicorn app.main:app --reload --port 8000
```

Frontend chạy `npm run dev` như cũ (Vite đã có proxy `/api/*` → `http://localhost:8000` sẵn trong `vite.config.ts`, không cần cấu hình gì thêm).

## Những gì đã đổi so với bản Node cũ

| | Trước (server.ts) | Sau (FastAPI) |
|---|---|---|
| Ngôn ngữ | Node/Express (TypeScript) | Python/FastAPI |
| Lưu trữ | 1 file `db.json` phẳng, mất khi xoá file | Postgres thật, có schema, có FK, có transaction |
| Games/Levels/Questions | Mảng JS trong RAM (seed + custom tách rời) | 1 bảng `games` (Postgres JSONB cho `levels`), hợp nhất seed + custom bằng cờ `is_seed` |
| Leaderboard | Bảng `scores` ghi trùng với `attempts` | Suy ra trực tiếp từ `attempts` JOIN `users`, bỏ trùng lặp dữ liệu |
| AI Generate (Gemini) | `@google/genai` (JS SDK) | `google-genai` (Python SDK), cùng 1 prompt tiếng Việt |
| Redis / MinIO trong docker-compose cũ | Khai báo nhưng **không có code nào dùng tới** | Đã bỏ hẳn — dọn sạch, không giữ hạ tầng ma |

## Giới hạn đã biết (MVP, chưa phải production-grade)

- **Không có Alembic migration** — dùng `Base.metadata.create_all()` lúc khởi động. Đủ cho dev/demo; khi lên production hoặc cần thay đổi schema có version, nên thêm Alembic (`alembic init`, generate revision từ `app/models.py`).
- **Không có auth thật** (JWT/session) — `userId` vẫn truyền tay qua query/body, y hệt hành vi gốc của `server.ts`. Đây là bước tiếp theo nên làm nếu app lên production thật.
- **AI-generate cần `GEMINI_API_KEY`** trong `.env` để gọi Gemini thật; không set thì tự động fallback sang game mẫu dựng sẵn (giữ đúng hành vi gốc).

## Cấu trúc

```
backend/
  app/
    main.py              # FastAPI app, CORS, đăng ký router, tạo bảng + seed lúc khởi động
    database.py           # SQLAlchemy engine/session
    models.py              # ORM models (users, wallets, games, purchases, attempts, achievements, scratch...)
    schemas.py             # Pydantic request/response
    seed.py                 # Nạp user demo + seed_data.json vào Postgres
    seed_data.json          # Export nguyên vẹn từ src/data/seedData.ts (KHÔNG chép tay, tránh sai lệch)
    default_templates.py    # Data mẫu mặc định khi tạo game mới (10 loại game engine)
    ai_content.py            # Fallback game generator + tích hợp Gemini
    routers/
      session.py, games.py, wallet.py, attempts.py, admin.py, misc.py
  requirements.txt
  Dockerfile
  .env.example
```
