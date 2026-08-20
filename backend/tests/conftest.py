import pytest
import sys
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Đảm bảo import app và models
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import Base, get_db
from app import seed as seed_module

TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Tạo schema CSDL in-memory sạch và nạp seed data cho mỗi test function."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    seed_module.run_seed(session, force=True)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient với override get_db trỏ vào test session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def student_auth(client):
    """Tạo tài khoản học sinh và trả về token."""
    res = client.post("/api/auth/register", json={
        "username": "student_pytest",
        "password": "password123",
        "name": "Bé Pytest 🧠",
        "role": "student",
        "grade": 2,
    })
    data = res.json()
    token = data["access_token"]
    return {
        "user": data["user"],
        "user_id": data["user"]["id"],
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture(scope="function")
def teacher_auth(client):
    """Tạo tài khoản giáo viên và trả về token."""
    res = client.post("/api/auth/register", json={
        "username": "teacher_pytest",
        "password": "password123",
        "name": "Cô Lan Pytest 👩‍🏫",
        "role": "teacher",
    })
    data = res.json()
    token = data["access_token"]
    return {
        "user": data["user"],
        "user_id": data["user"]["id"],
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.fixture(scope="function")
def admin_auth(client):
    """Tạo tài khoản admin và trả về token."""
    res = client.post("/api/auth/register", json={
        "username": "admin_pytest",
        "password": "password123",
        "name": "Quản Trị Viên Pytest 🛡️",
        "role": "admin",
    })
    data = res.json()
    token = data["access_token"]
    return {
        "user": data["user"],
        "user_id": data["user"]["id"],
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }
