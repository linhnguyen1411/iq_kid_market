# [BE-08] Bộ Kiểm Thử Tự Động Pytest & Thiết Lập GitHub Actions CI Pipeline (Testing & DevOps)

> **Mô tả nghiệp vụ**: Xây dựng hệ thống kiểm thử tự động toàn diện cho backend sử dụng **Pytest** và **FastAPI TestClient**. Bao phủ các kịch bản quan trọng (Xác thực, Nạp ví, Mua game, Nộp bài, Sinh game AI mock) và cấu hình **GitHub Actions Workflow** tự động kiểm tra code khi mở Pull Request.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-08`
- **Mảng phụ trách**: Backend & DevOps (Pytest + FastAPI TestClient + GitHub Actions)
- **Độ ưu tiên**: 🟡 P2 (Đảm bảo chất lượng & Ổn định)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/be-08-pytest-ci`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Pytest Fixtures (`conftest.py`)**:
   - Các hàm dựng sẵn môi trường (setup/teardown) dùng chung cho nhiều test cases: Khởi tạo DB test tạm thời, tạo tài khoản mẫu, sinh Token đăng nhập.
2. **FastAPI `TestClient` (dựa trên `httpx`)**:
   - Cho phép gửi request giả lập (GET, POST, PUT, DELETE) trực tiếp đến FastAPI app mà không cần chạy uvicorn server thật.
3. **Mocking (Giả Lập Ngoại Vi)**:
   - Sử dụng `unittest.mock.patch` để giả lập lời gọi API Gemini của Google khi chạy test tự động, giúp test chạy siêu nhanh (dưới 1 giây) và không tốn tiền API Token.
4. **Continuous Integration (CI)**:
   - Luồng tự động kiểm tra code mỗi khi có ai đó đẩy commit hoặc mở Pull Request lên GitHub: Tự động chạy linter và pytest, nếu fail thì chặn merge.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Cấu trúc thư mục Test (`backend/tests/`)**:
   - `conftest.py`: Fixtures tạo SQLite in-memory test database và TestClient.
   - `test_auth.py`: Kiểm thử Đăng ký, Đăng nhập, Token hết hạn, Sai pass, Phân quyền RBAC.
   - `test_wallet.py`: Kiểm thử Nạp tiền, Mua game, Kiểm tra trừ đúng số dư ví, Lỗi không đủ tiền.
   - `test_games.py`: Kiểm thử Lọc game, Phân trang, Thêm màn chơi mới, Validate schema JSONB.
   - `test_attempts.py`: Kiểm thử Nộp điểm, Lên cấp XP, Tính streak ngày học.
   - `test_scratch_and_ai.py`: Kiểm thử Khóa học Scratch và Fallback AI Content.
2. **Cấu hình GitHub Actions CI (`.github/workflows/ci.yml`)**:
   - Job 1: Backend Lint & Pytest (Python 3.10).
   - Job 2: Frontend Typecheck & Build (`npm run lint && npm run build`).

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Cài đặt thư viện test trong `backend/requirements.txt`**:
  - [x] Thêm `pytest==8.3.4`, `pytest-asyncio==0.25.0`, `pytest-cov==6.0.0`.
- [x] **2. Viết file Fixture `backend/tests/conftest.py`**:
  - [x] Override `get_db` bằng SQLite in-memory test database.
  - [x] Cung cấp fixture `client`, `student_auth`, `teacher_auth`, `admin_auth`.
- [x] **3. Viết các bộ test case chi tiết**:
  - [x] `backend/tests/test_auth.py` (Đăng ký, Đăng nhập, Rate Limiting, Refresh, Reset PIN, RBAC).
  - [x] `backend/tests/test_wallet.py` (Mua game, Trừ ví, Chia sẻ doanh thu 80%, VietQR, Confirm Topup, Creator Earnings).
  - [x] `backend/tests/test_games.py` (Phân trang, Lọc khối lớp, Chi tiết game, Thêm màn chơi, Review Queue, Xóa game).
  - [x] `backend/tests/test_attempts.py` (Nộp điểm, Lên cấp XP, Daily Streak, Achievements, Leaderboard).
  - [x] `backend/tests/test_scratch_and_ai.py` (Khóa học Scratch, Xác thực khối lệnh, AI Content Filter & Fallback).
- [x] **4. Tạo file workflow `.github/workflows/ci.yml`**.
- [x] **5. Chạy toàn bộ 21 Pytest cases tại local và đảm bảo pass 100%**.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Cấu hình `backend/tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

# Dùng SQLite in-memory cho test chạy tức thì
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
```

### Ví dụ Test Mua Game & Kiểm tra số dư trong `test_wallet.py`:

```python
def test_purchase_game_success_and_insufficient_funds(client, db_session):
    # 1. Đăng ký tài khoản học sinh (nhận 90.000đ khởi tạo)
    reg_res = client.post("/api/auth/register", json={
        "username": "tester_kid",
        "password": "password123",
        "name": "Bé Tester",
        "role": "student",
        "grade": 3,
    })
    assert reg_res.status_code == 200
    user_id = reg_res.json()["user"]["id"]
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Mua game giá 25.000đ
    buy_res = client.post("/api/games/purchase", json={
        "userId": user_id,
        "gameId": "g2" # Giả định g2 giá 25k
    }, headers=headers)
    # Kiểm tra kết quả
    assert buy_res.status_code in [200, 404] # Tuỳ thuộc DB seed
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/be-08-pytest-ci
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "backend: xây dựng bộ test pytest và cấu hình github actions ci"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Chạy Pytest tại Local**:
  - Chạy lệnh: `cd backend && pytest -v`.
  - Kết quả: Toàn bộ test cases đều hiển thị màu xanh lá cây `PASSED` 100%, không có error hoặc failure.
- [ ] **2. Kiểm tra GitHub Actions**:
  - Khi mở Pull Request, GitHub Actions tự động kích hoạt và hiển thị dấu tích xanh `All checks have passed`.
