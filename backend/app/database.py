import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Đọc cấu hình từ biến môi trường
DEFAULT_PG_URL = "postgresql+psycopg2://iqkids_user:iqkids_password@localhost:5432/iqkids_db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_PG_URL)

Base = declarative_base()


def _create_database_engine():
    """
    Khởi tạo SQLAlchemy Engine:
    - Ưu tiên kết nối PostgreSQL nếu sẵn sàng.
    - Tự động Fallback sang SQLite cục bộ (iqkids_dev.db) nếu PostgreSQL chưa bật,
      giúp Developer chạy script dev-local tức thì mà không bị crash Connection Refused.
    """
    target_url = DATABASE_URL

    if "postgresql" in target_url:
        try:
            # Thử kết nối nhanh với timeout ngắn
            test_engine = create_engine(
                target_url,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 3},
            )
            with test_engine.connect() as conn:
                pass
            print(f"✅ [Database] Kết nối PostgreSQL thành công ({target_url.split('@')[-1]}).")
            return test_engine
        except Exception as e:
            fallback_sqlite_url = "sqlite:///./iqkids_dev.db"
            print("⚠️  [Database Warning] Không thể kết nối tới PostgreSQL (Port 5432):", file=sys.stderr)
            print(f"    Chi tiết: {e}", file=sys.stderr)
            print(
                f"⚡ [Database Fallback] Tự động chuyển sang CSDL SQLite cục bộ: {fallback_sqlite_url} để tiếp tục Dev nhanh!",
                file=sys.stderr,
            )
            return create_engine(fallback_sqlite_url, connect_args={"check_same_thread": False})

    # Nếu đã cấu hình sẵn SQLite hoặc DB khác
    connect_args = {"check_same_thread": False} if "sqlite" in target_url else {}
    return create_engine(target_url, pool_pre_ping=True, connect_args=connect_args)


engine = _create_database_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency: 1 DB session / request, luôn đóng lại sau khi xong."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
