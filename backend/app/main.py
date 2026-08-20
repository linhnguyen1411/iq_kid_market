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
from .routers import session, games, wallet, attempts, admin, misc, auth, scratch
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
app.include_router(misc.router)


@app.on_event("startup")
def on_startup():
    # MVP: dùng create_all thay vì Alembic. Khi lên production thật,
    # thay bằng migration có version (xem ghi chú trong README backend).
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_module.run_seed(db)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
