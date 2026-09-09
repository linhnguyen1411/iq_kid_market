"""
Script kiểm thử toàn diện Task BE-05: Hệ Thống Chấm Điểm, Daily Streak & Bảng Xếp Hạng (Gamification)
"""
import os
import sys
from datetime import datetime, timedelta

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


def test_be05_gamification_scenarios():
    print("🚀 BẮT ĐẦU KIỂM THỬ TASK BE-05: GAMIFICATION, STREAK & LEADERBOARD...\n")

    # 1. TẠO TÀI KHOẢN HỌC SINH MỚI
    print("1️⃣ [Chuẩn bị dữ liệu]: Đăng ký tài khoản học sinh mới...")
    res_student = client.post("/api/auth/register", json={
        "username": "kid_gamer",
        "password": "password123",
        "name": "Bé Siêu Trí Tuệ 🧠",
        "role": "student",
        "grade": 3,
    })
    assert res_student.status_code == 200
    student_id = res_student.json()["user"]["id"]
    print(f"   ✅ Học sinh đã tạo: ID={student_id}, XP=0, Level=1, Streak=0.")

    # 2. TEST NỘP ĐIỂM — XP/xu chỉ cộng khi clear toàn bộ game (1 lần)
    print("2️⃣ [Test Nộp Điểm]: Màn lẻ không thưởng; clear hết màn mới nhận XP...")
    from app import models as _models
    mini = _models.Game(
        id="g_be05_mini",
        title="BE05 Mini",
        description="test",
        thumbnail="🧠",
        price=0,
        grade_from=1,
        grade_to=5,
        template_code="quiz",
        category="iq",
        review_status="approved",
        is_published=True,
        levels=[
            {"level_num": 1, "title": "M1", "xp_reward": 100, "coin_reward": 10, "questions": []},
            {"level_num": 2, "title": "M2", "xp_reward": 150, "coin_reward": 20, "questions": []},
        ],
    )
    with TestingSessionLocal() as db:
        db.add(mini)
        db.commit()

    res_sub1 = client.post("/api/attempts/submit", json={
        "userId": student_id,
        "gameId": "g_be05_mini",
        "levelNum": 1,
        "score": 100,
        "completed": True,
        "duration": 20,
    })
    assert res_sub1.status_code == 200
    data1 = res_sub1.json()
    assert data1["success"] is True
    assert data1["xpAwarded"] == 0
    assert data1["coinReward"] == 0
    assert data1["newStreak"] == 1
    print(f"   ✅ Màn 1 chưa clear game: +0 XP, Streak = {data1['newStreak']}.")

    res_clear = client.post("/api/attempts/submit", json={
        "userId": student_id,
        "gameId": "g_be05_mini",
        "levelNum": 2,
        "score": 100,
        "completed": True,
    })
    assert res_clear.status_code == 200
    data_clear = res_clear.json()
    assert data_clear["xpAwarded"] == 250
    assert data_clear["coinReward"] == 30
    print(f"   ✅ Clear toàn bộ game: +{data_clear['xpAwarded']} XP (1 lần).")

    # 3. TEST DAILY STREAK LOGIC
    print("3️⃣ [Test Daily Streak]: Kiểm tra tính toán chuỗi ngày học...")
    # Cùng ngày nộp tiếp -> Streak giữ nguyên = 1
    res_sub2 = client.post("/api/attempts/submit", json={
        "userId": student_id,
        "gameId": "g1",
        "levelNum": 2,
        "score": 100,
        "completed": True,
    })
    assert res_sub2.json()["newStreak"] == 1
    print("   ✅ Học nhiều lần trong cùng 1 ngày: Streak giữ nguyên 1.")

    # Giả lập lần học trước là ngày hôm qua (yesterday) -> Streak phải tăng lên 2
    with TestingSessionLocal() as db:
        u = db.get(models.User, student_id)
        u.last_active_date = datetime.utcnow() - timedelta(days=1)
        u.streak = 1
        db.commit()

    res_sub3 = client.post("/api/attempts/submit", json={
        "userId": student_id,
        "gameId": "g1",
        "levelNum": 3,
        "score": 100,
        "completed": True,
    })
    assert res_sub3.json()["newStreak"] == 2
    print("   ✅ Học tiếp ngày hôm sau: Streak tăng thành công từ 1 lên 2.")

    # Giả lập lần học trước là 3 ngày trước (bỏ lỡ) -> Streak reset về 1
    with TestingSessionLocal() as db:
        u = db.get(models.User, student_id)
        u.last_active_date = datetime.utcnow() - timedelta(days=3)
        u.streak = 5
        db.commit()

    res_sub4 = client.post("/api/attempts/submit", json={
        "userId": student_id,
        "gameId": "g1",
        "levelNum": 4,
        "score": 100,
        "completed": True,
    })
    assert res_sub4.json()["newStreak"] == 1
    print("   ✅ Bỏ lỡ 3 ngày: Streak reset chuẩn xác về 1.")

    # 4. TEST BẢNG XẾP HẠNG (LEADERBOARD)
    print("4️⃣ [Test Bảng Xếp Hạng]: GET /api/scores/leaderboard...")
    # Leaderboard tổng thể theo XP
    res_lb_all = client.get("/api/scores/leaderboard")
    assert res_lb_all.status_code == 200
    lb_items = res_lb_all.json()
    assert len(lb_items) > 0
    assert "xp" in lb_items[0]
    assert "streak" in lb_items[0]
    print(f"   ✅ Bảng xếp hạng toàn trường: Top 1 là {lb_items[0]['name']} ({lb_items[0]['xp']} XP).")

    # Leaderboard theo game g1
    res_lb_g1 = client.get("/api/scores/leaderboard?gameId=g1")
    assert res_lb_g1.status_code == 200
    lb_g1_items = res_lb_g1.json()
    assert len(lb_g1_items) > 0
    assert lb_g1_items[0]["gameId"] == "g1"
    print(f"   ✅ Bảng xếp hạng game g1: Top 1 đạt {lb_g1_items[0]['score']} điểm.")

    # 5. TEST CHI TIẾT HUY HIỆU & TIẾN ĐỘ USER (GET /api/achievements/user/{id})
    print("5️⃣ [Test Huy Hiệu & Tiến Độ]: GET /api/achievements/user/{userId}...")
    res_ach = client.get(f"/api/achievements/user/{student_id}")
    assert res_ach.status_code == 200
    ach_list = res_ach.json()
    assert len(ach_list) > 0
    target_ach = next((a for a in ach_list if a.get("id") == "a1" or a.get("badge_code") == "math_pro"), None)
    assert target_ach is not None
    assert "unlocked" in target_ach
    assert "progress_percent" in target_ach
    print("   ✅ Kiểm tra danh sách huy hiệu và tiến độ thành công.")

    # 6. TEST LỊCH SỬ NỘP BÀI (GET /api/attempts/history)
    print("6️⃣ [Test Lịch Sử Làm Bài]: GET /api/attempts/history...")
    res_hist = client.get(f"/api/attempts/history?userId={student_id}")
    assert res_hist.status_code == 200
    hist_items = res_hist.json()
    assert len(hist_items) >= 4
    assert hist_items[0]["gameId"] == "g1"
    print(f"   ✅ Lấy được {len(hist_items)} bản ghi lịch sử làm bài.")

    print("\n🎉 TẤT CẢ CÁC TEST CASES CỦA TASK BE-05 ĐÃ PASSED 100%! ĐỘNG CƠ GAMIFICATION HOẠT ĐỘNG HOÀN HẢO.")


if __name__ == "__main__":
    test_be05_gamification_scenarios()
