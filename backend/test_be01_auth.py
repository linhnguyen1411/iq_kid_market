"""
Script kiểm thử toàn diện Task BE-01: Hệ Thống Xác Thực & Phân Quyền Nâng Cao (Auth, JWT & RBAC)
"""
import os
import sys

# Hỗ trợ UTF-8 output trên Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Đảm bảo import được backend app
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app import models, auth_utils

# Cấu hình SQLite In-Memory Database với StaticPool cho Testing
TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_be01_all_scenarios():
    print("🚀 BẮT ĐẦU KIỂM THỬ TASK BE-01: AUTH, JWT & RBAC...\n")

    # 1. TEST ĐĂNG KÝ HỌC SINH MỚI
    print("1️⃣ [Test Register]: Đăng ký tài khoản học sinh...")
    res = client.post("/api/auth/register", json={
        "username": "be_nam",
        "password": "password123",
        "name": "Bé Nam Lớp 3",
        "role": "student",
        "grade": 3,
        "avatar": "wise_owl"
    })
    assert res.status_code == 200, f"Register fail: {res.text}"
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["username"] == "be_nam"
    assert data["wallet"]["balance"] == 90000
    student_access_token = data["access_token"]
    student_refresh_token = data["refresh_token"]
    print("   ✅ Đăng ký học sinh thành công! Đã nhận Access Token & Refresh Token.")

    # 2. TEST ĐĂNG KÝ GIÁO VIÊN VÀ ADMIN
    print("2️⃣ [Test Register]: Đăng ký Giáo viên và Admin...")
    res_teacher = client.post("/api/auth/register", json={
        "username": "co_huong",
        "password": "password123",
        "name": "Cô Hương Dạy Toán",
        "role": "teacher",
    })
    assert res_teacher.status_code == 200
    teacher_token = res_teacher.json()["access_token"]

    res_admin = client.post("/api/auth/register", json={
        "username": "admin_boss",
        "password": "password123",
        "name": "Admin Tổng",
        "role": "admin",
    })
    assert res_admin.status_code == 200
    admin_token = res_admin.json()["access_token"]
    print("   ✅ Đăng ký Giáo viên và Admin thành công.")

    # 3. TEST ĐĂNG NHẬP VÀ RATE LIMITING
    print("3️⃣ [Test Login & Rate Limiting]...")
    # Login đúng
    res_login = client.post("/api/auth/login", json={
        "username": "be_nam",
        "password": "password123"
    })
    assert res_login.status_code == 200
    assert "refresh_token" in res_login.json()
    print("   ✅ Đăng nhập đúng mật khẩu thành công.")

    # Thử login sai 5 lần liên tiếp để kích hoạt Rate Limiter
    print("   ⏳ Thử nghiệm Rate Limiting (nhập sai liên tiếp 5 lần)...")
    for i in range(5):
        client.post("/api/auth/login", json={"username": "be_nam", "password": "wrong_password"})
    
    # Lần thứ 6 phải trả về HTTP 429 Too Many Requests
    res_locked = client.post("/api/auth/login", json={"username": "be_nam", "password": "password123"})
    assert res_locked.status_code == 429, f"Expected 429 but got {res_locked.status_code}: {res_locked.text}"
    print("   ✅ Rate Limiter hoạt động chuẩn xác! Đã chặn truy cập với mã 429.")

    # Clear rate limit để tiếp tục test
    auth_utils.clear_failed_login("be_nam")

    # 4. TEST REFRESH TOKEN
    print("4️⃣ [Test Refresh Token]...")
    res_ref = client.post("/api/auth/refresh", json={
        "refresh_token": student_refresh_token
    })
    assert res_ref.status_code == 200, f"Refresh token fail: {res_ref.text}"
    ref_data = res_ref.json()
    assert "access_token" in ref_data
    assert "refresh_token" in ref_data
    print("   ✅ Cấp mới Access Token bằng Refresh Token thành công.")

    # 5. TEST RESET PASSWORD
    print("5️⃣ [Test Reset Password Qua Mã PIN Phụ Huynh]...")
    # Sai PIN
    res_wrong_pin = client.post("/api/auth/reset-password", json={
        "username": "be_nam",
        "parent_pin": "9999",
        "new_password": "new_password_888"
    })
    assert res_wrong_pin.status_code == 400
    print("   ✅ Chặn reset khi sai mã PIN phụ huynh.")

    # Đúng PIN 1234
    res_reset = client.post("/api/auth/reset-password", json={
        "username": "be_nam",
        "parent_pin": "1234",
        "new_password": "new_password_888"
    })
    assert res_reset.status_code == 200
    # Đăng nhập bằng pass mới
    res_login_new = client.post("/api/auth/login", json={
        "username": "be_nam",
        "password": "new_password_888"
    })
    assert res_login_new.status_code == 200
    student_access_token = res_login_new.json()["access_token"]
    print("   ✅ Reset mật khẩu thành công và đăng nhập được bằng mật khẩu mới.")

    # 6. TEST PHÂN QUYỀN RBAC (ROLE-BASED ACCESS CONTROL)
    print("6️⃣ [Test RBAC: Kiểm tra chặn quyền trái phép]...")
    
    # Học sinh cố tình gọi API duyệt game -> BẮT BUỘC 403 Forbidden
    res_student_forbidden = client.post(
        "/api/admin/review/decide",
        json={"gameId": "g1", "action": "approve"},
        headers={"Authorization": f"Bearer {student_access_token}"}
    )
    assert res_student_forbidden.status_code == 403, f"Expected 403 but got {res_student_forbidden.status_code}"
    print("   ✅ Học sinh bị chặn 403 khi cố truy cập API duyệt game của Admin/Giáo viên.")

    # Giáo viên gọi API duyệt game -> Cho phép qua lớp RBAC (nếu không có gameId thì 404, không được bị 403)
    res_teacher_allowed = client.post(
        "/api/admin/review/decide",
        json={"gameId": "non_existent_game", "action": "approve"},
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert res_teacher_allowed.status_code in [200, 404], f"Expected 200/404 but got {res_teacher_allowed.status_code}"
    assert res_teacher_allowed.status_code != 403
    print("   ✅ Giáo viên vượt qua lớp kiểm tra RBAC thành công.")

    # Học sinh cố tình gọi Reset All Games -> BẮT BUỘC 403 Forbidden
    res_student_reset = client.post(
        "/api/admin/games/reset",
        headers={"Authorization": f"Bearer {student_access_token}"}
    )
    assert res_student_reset.status_code == 403
    print("   ✅ Học sinh bị chặn 403 khi gọi API Reset Game của Admin.")

    # Admin gọi Reset All Games -> 200 OK
    res_admin_reset = client.post(
        "/api/admin/games/reset",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin_reset.status_code == 200
    print("   ✅ Admin thực thi API Reset Game thành công 200 OK.")

    print("\n🎉 TẤT CẢ CÁC TEST CASES CỦA TASK BE-01 ĐÃ PASSED 100%! CHUẨN XÁC VÀ BẢO MẬT TUYỆT ĐỐI.")


if __name__ == "__main__":
    test_be01_all_scenarios()
