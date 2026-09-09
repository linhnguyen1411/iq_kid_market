import os
import sys

# Đảm bảo in Tiếng Việt UTF-8 không bị lỗi cp1252 trên Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, SessionLocal
from .routers import session, games, wallet, attempts, admin, misc, auth, scratch, quests, projects
from . import seed as seed_module

app = FastAPI(title="IQ Kids Market API", version="1.0.0")

# CORS: cho phép frontend Vite (dev) gọi thẳng /api/* khi không dùng proxy
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(session.router)
app.include_router(games.router)
app.include_router(wallet.router)
app.include_router(attempts.router)
app.include_router(admin.router)
app.include_router(scratch.router)
app.include_router(projects.router)
app.include_router(misc.router)
app.include_router(quests.router)


from sqlalchemy import inspect, text

def ensure_scratch_columns(target_engine):
    try:
        insp = inspect(target_engine)
        tables = insp.get_table_names()
        with target_engine.connect() as conn:
            if "scratch_courses" in tables:
                course_cols = [c["name"] for c in insp.get_columns("scratch_courses")]
                if "course_type" not in course_cols:
                    conn.execute(text("ALTER TABLE scratch_courses ADD COLUMN course_type VARCHAR(50) DEFAULT 'algorithm_maze'"))
                    conn.commit()
                if "price" not in course_cols:
                    conn.execute(text("ALTER TABLE scratch_courses ADD COLUMN price INTEGER DEFAULT 0"))
                    conn.commit()
            if "scratch_lessons" in tables:
                lesson_cols = [c["name"] for c in insp.get_columns("scratch_lessons")]
                if "engine_type" not in lesson_cols:
                    conn.execute(text("ALTER TABLE scratch_lessons ADD COLUMN engine_type VARCHAR(50) DEFAULT 'algorithm_maze'"))
                    conn.commit()
    except Exception as e:
        print(f"[db_compat] Notice: {e}")


@app.on_event("startup")
def on_startup():
    # MVP: dùng create_all thay vì Alembic. Khi lên production thật,
    # thay bằng migration có version (xem ghi chú trong README backend).
    Base.metadata.create_all(bind=engine)
    ensure_scratch_columns(engine)
    with SessionLocal() as db:
        seed_module.run_seed(db)
        seed_module.ensure_admin_user(db)
        seed_module.ensure_game_categories(db)
        seed_module.ensure_scratch_catalog(db)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
