import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Đảm bảo mã hoá utf-8 an toàn trên console
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# Cấu hình CSDL PostgreSQL duy nhất cho toàn bộ hệ thống
DEFAULT_PG_URL = "postgresql+psycopg2://iqkids_user:iqkids_password@localhost:5432/iqkids_db"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_PG_URL)

Base = declarative_base()


def _create_database_engine():
    """Khởi tạo SQLAlchemy Engine kết nối trực tiếp đến PostgreSQL."""
    target_url = DATABASE_URL
    try:
        engine_inst = create_engine(
            target_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            connect_args={"connect_timeout": 5},
        )
        with engine_inst.connect() as conn:
            pass
        print(f"✅ [Database] Kết nối PostgreSQL thành công ({target_url.split('@')[-1]}).")
        return engine_inst
    except Exception as e:
        print(f"❌ [Database Fatal Error] Không thể kết nối PostgreSQL tại {target_url.split('@')[-1]}:", file=sys.stderr)
        print(f"    Chi tiết lỗi: {e}", file=sys.stderr)
        print("💡 Vui lòng đảm bảo PostgreSQL đang chạy (`brew services start postgresql@15`).", file=sys.stderr)
        raise e


engine = _create_database_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency: 1 DB session / request, luôn đóng lại sau khi hoàn tất."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
