"""
Script kiểm thử toàn diện Task BE-03: API Quản Lý Game, Levels JSONB & Hàng Đợi Kiểm Duyệt (Game CMS)
"""
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app import models, seed as seed_module

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

# Nạp seed data khởi tạo
with TestingSessionLocal() as db:
    seed_module.run_seed(db, force=True)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_be03_games_cms_scenarios():
    print("🚀 BẮT ĐẦU KIỂM THỬ TASK BE-03: GAME CMS, LEVEL VALIDATION & REVIEW QUEUE...\n")

    # 1. ĐĂNG NHẬP GIÁO VIÊN & HỌC SINH
    print("1️⃣ [Chuẩn bị tài khoản]: Đăng ký và lấy Token Giáo viên...")
    res_teacher = client.post("/api/auth/register", json={
        "username": "teacher_cms",
        "password": "password123",
        "name": "Cô Lan CMS",
        "role": "teacher",
    })
    teacher_token = res_teacher.json()["access_token"]
    teacher_id = res_teacher.json()["user"]["id"]
    headers_teacher = {"Authorization": f"Bearer {teacher_token}"}
    print("   ✅ Đã lấy Token Giáo viên.")

    # 2. TEST LỌC, TÌM KIẾM, SẮP XẾP & PHÂN TRANG GAMES (GET /api/games)
    print("2️⃣ [Test Danh Sách Game]: Lọc theo Khối Lớp, Thể Loại, Tìm Kiếm & Phân Trang...")
    # Lọc lớp 2
    res_grade = client.get("/api/games?grade=2")
    assert res_grade.status_code == 200
    games_g2 = res_grade.json()
    assert len(games_g2) > 0
    print(f"   ✅ Lọc theo khối lớp 2: Tìm thấy {len(games_g2)} games.")

    # Phân trang paginated=true
    res_page = client.get("/api/games?paginated=true&page=1&pageSize=2")
    assert res_page.status_code == 200
    page_data = res_page.json()
    assert "items" in page_data
    assert "total" in page_data
    assert "total_pages" in page_data
    assert len(page_data["items"]) <= 2
    assert page_data["page"] == 1
    print(f"   ✅ Phân trang chuẩn: Total {page_data['total']} games, Total Pages: {page_data['total_pages']}.")

    # Sắp xếp
    res_sort = client.get("/api/games?sortBy=newest")
    assert res_sort.status_code == 200

    # 3. TEST CHI TIẾT GAME (GET /api/games/{id})
    print("3️⃣ [Test Chi Tiết Game]: Lấy thông tin game theo ID...")
    res_detail = client.get("/api/games/g1")
    assert res_detail.status_code == 200
    g1 = res_detail.json()
    assert g1["id"] == "g1"
    assert len(g1["levels"]) > 0

    # ID không tồn tại
    res_404 = client.get("/api/games/non_existent_id")
    assert res_404.status_code == 404
    print("   ✅ Chi tiết game trả về đúng và bắt lỗi 404 khi ID không tồn tại.")

    # 4. TEST TẠO GAME & VALIDATE SCHEMA DATA CÂU HỎI
    print("4️⃣ [Test Tạo Game & Validate Data Câu Hỏi]...")
    # Tạo game mới
    res_create = client.post(
        "/api/admin/games",
        json={
            "title": "Nối Cột Trái Cây 🍎",
            "description": "Nối tên tiếng Anh với hình quả",
            "template_code": "matching",
            "category": "language",
            "price": 0,
            "creatorId": teacher_id,
        },
        headers=headers_teacher,
    )
    assert res_create.status_code == 200
    custom_game_id = res_create.json()["game"]["id"]

    # Thêm màn matching hợp lệ
    res_level_valid = client.post(
        "/api/admin/levels/add",
        json={
            "gameId": custom_game_id,
            "title": "Màn 2: Trái cây nhiệt đới",
            "question": {
                "question_type": "matching",
                "prompt": "Hãy nối đúng quả với màu sắc tương ứng:",
                "points": 25,
                "data": {
                    "pairs": [
                        {"left": "Quả Táo 🍎", "right": "Màu Đỏ"},
                        {"left": "Quả Chuối 🍌", "right": "Màu Vàng"},
                    ]
                },
            },
        },
        headers=headers_teacher,
    )
    assert res_level_valid.status_code == 200
    print("   ✅ Thêm màn chơi matching hợp lệ thành công.")

    # Thêm màn matching thiếu pairs -> Bị chặn 400
    res_level_invalid = client.post(
        "/api/admin/levels/add",
        json={
            "gameId": custom_game_id,
            "title": "Màn 3 lỗi",
            "question": {
                "question_type": "matching",
                "prompt": "Lỗi thiếu pairs",
                "data": {"invalid_key": 123},
            },
        },
        headers=headers_teacher,
    )
    assert res_level_invalid.status_code == 400
    assert "pairs" in res_level_invalid.json()["detail"].lower()
    print("   ✅ Validator đã chặn thành công dữ liệu matching không hợp lệ.")

    # Thêm màn quiz thiếu answer -> Bị chặn 400
    res_quiz_invalid = client.post(
        "/api/admin/levels/add",
        json={
            "gameId": custom_game_id,
            "title": "Màn quiz lỗi",
            "question": {
                "question_type": "quiz",
                "prompt": "1 + 1 bằng mấy?",
                "data": {"options": ["2", "3", "4"]},  # thiếu answer
            },
        },
        headers=headers_teacher,
    )
    assert res_quiz_invalid.status_code == 400
    print("   ✅ Validator đã chặn thành công câu hỏi quiz thiếu đáp án.")

    # 5. TEST CẬP NHẬT MÀN CHƠI (PUT /api/admin/levels/{id}/{num})
    print("5️⃣ [Test Cập Nhật Màn Chơi]...")
    res_put_level = client.put(
        f"/api/admin/levels/{custom_game_id}/2",
        json={
            "title": "Màn 2: Trái cây đã đổi tên ✨",
            "xp_reward": 100,
        },
        headers=headers_teacher,
    )
    assert res_put_level.status_code == 200
    print("   ✅ Cập nhật thông tin màn chơi thành công.")

    # 6. TEST HÀNG ĐỢI KIỂM DUYỆT (REVIEW QUEUE & DECIDE)
    print("6️⃣ [Test Hàng Đợi Kiểm Duyệt Giáo Án]...")
    res_queue = client.get("/api/admin/review/queue", headers=headers_teacher)
    assert res_queue.status_code == 200
    queue_games = res_queue.json()
    assert any(g["id"] == custom_game_id for g in queue_games)

    # Duyệt game (approve)
    res_approve = client.post(
        "/api/admin/review/decide",
        json={"gameId": custom_game_id, "action": "approve", "feedback": "Game rất xuất sắc!"},
        headers=headers_teacher,
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["game"]["review_status"] == "approved"
    assert res_approve.json()["game"]["is_published"] is True
    print("   ✅ Phê duyệt game thành công, game đã được kích hoạt xuất bản.")

    # 7. TEST XÓA GAME (DELETE /api/admin/games/{id})
    print("7️⃣ [Test Xóa Game An Toàn]...")
    # Thử xóa game seed gốc -> Bị chặn 400
    res_del_seed = client.delete("/api/admin/games/g1", headers=headers_teacher)
    assert res_del_seed.status_code == 400
    assert "gốc" in res_del_seed.json()["detail"].lower()
    print("   ✅ Chặn xóa game gốc hệ thống thành công (Mã lỗi 400).")

    # Xóa game custom do mình tạo -> Thành công 200
    res_del_custom = client.delete(f"/api/admin/games/{custom_game_id}", headers=headers_teacher)
    assert res_del_custom.status_code == 200
    print("   ✅ Xóa game custom thành công.")

    print("\n🎉 TẤT CẢ CÁC TEST CASES CỦA TASK BE-03 ĐÃ PASSED 100%! HỆ THỐNG CMS & KIỂM DUYỆT ĐẠT CHUẨN.")


if __name__ == "__main__":
    test_be03_games_cms_scenarios()
