import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://iqkids_user:iqkids_password@localhost:5432/iqkids_db",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency: 1 DB session / request, luôn đóng lại sau khi xong."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
