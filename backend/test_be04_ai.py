"""
Script kiểm thử toàn diện Task BE-04: Pipeline Sinh Game Tự Động Bằng Google Gemini AI
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
from app.ai_content import (
    clean_json_string,
    is_content_safe_for_kids,
    generate_game_with_gemini,
    generate_single_question_with_gemini,
)
from app import schemas

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
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


def test_be04_ai_pipeline_scenarios():
    print("🚀 BẮT ĐẦU KIỂM THỬ TASK BE-04: GOOGLE GEMINI AI PIPELINE & SAFE FALLBACK...\n")

    # 1. TEST JSON SANITIZER
    print("1️⃣ [Test JSON Sanitizer]: Kiểm tra xử lý chuỗi JSON lỗi & markdown...")
    raw_markdown = "```json\n{\n  \"title\": \"Game Test\",\n  \"score\": 100,\n}\n```"
    cleaned = clean_json_string(raw_markdown)
    assert "```" not in cleaned
    assert '\"title\": \"Game Test\"' in cleaned
    assert '\"score\": 100' in cleaned
    assert ",}" not in cleaned.replace(" ", "").replace("\n", "")
    print("   ✅ JSON Sanitizer bóc tách markdown và sửa lỗi trailing comma chuẩn xác.")

    # 2. TEST CONTENT SAFETY FILTER
    print("2️⃣ [Test Content Safety Filter]: Lọc từ khóa nhạy cảm không an toàn cho học sinh...")
    safe_ok, _ = is_content_safe_for_kids("Khám phá các loài hoa mùa xuân 🌸")
    assert safe_ok is True

    unsafe_res, reason = is_content_safe_for_kids("Game đánh nhau bạo lực đường phố")
    assert unsafe_res is False
    assert "bạo lực" in reason or "không phù hợp" in reason
    print("   ✅ Bộ lọc an toàn trẻ em đã chặn thành công chủ đề nhạy cảm.")

    # 3. TEST GENERATE GAME TRỌN GÓI 3 MÀN (FALLBACK & STRUCTURE)
    print("3️⃣ [Test Sinh Game AI 3 Màn]: Kiểm tra cấu trúc game 3 cấp độ...")
    game_result = generate_game_with_gemini(
        topic="Khám Phá Các Hành Tinh",
        template_code="quiz",
        grade_from=2,
        grade_to=5,
        category="science",
    )
    assert "title" in game_result
    assert "levels" in game_result
    assert len(game_result["levels"]) == 3
    # Validate cấu trúc câu hỏi
    for lvl in game_result["levels"]:
        assert "questions" in lvl
        q = lvl["questions"][0]
        assert q["question_type"] == "quiz"
        # Validate data
        schemas.AddLevelQuestionIn.validate_game_data("quiz", q["data"])
    print("   ✅ Sinh game trọn gói 3 màn hoàn chỉnh, 100% hợp lệ cấu trúc GAME_ENGINE_RULES.")

    # 4. TEST GENERATE CÂU HỎI ĐƠN LẺ CHO GIÁO VIÊN
    print("4️⃣ [Test Sinh Câu Hỏi Đơn Lẻ]: Gợi ý nhanh 1 câu hỏi...")
    single_q = generate_single_question_with_gemini(
        topic="Cộng trừ phạm vi 20",
        template_code="math",
        grade=1,
    )
    assert "id" in single_q
    assert single_q["question_type"] == "math"
    assert "expression" in single_q["data"]
    print("   ✅ Sinh câu hỏi đơn lẻ thành công.")

    # 5. TEST API POST /api/admin/games/ai-generate
    print("5️⃣ [Test API Sinh Game Trọn Gói]: POST /api/admin/games/ai-generate...")
    # Đăng ký tài khoản giáo viên
    res_teacher = client.post("/api/auth/register", json={
        "username": "teacher_ai",
        "password": "password123",
        "name": "Cô Lan AI",
        "role": "teacher",
    })
    teacher_token = res_teacher.json()["access_token"]
    headers = {"Authorization": f"Bearer {teacher_token}"}

    res_api_game = client.post(
        "/api/admin/games/ai-generate",
        json={
            "topic": "Động Vật Hoang Dã Châu Phi",
            "template_code": "matching",
            "grade_from": 1,
            "grade_to": 3,
            "category": "science",
        },
        headers=headers,
    )
    assert res_api_game.status_code == 200
    created_game = res_api_game.json()["game"]
    assert created_game["review_status"] == "pending_review"
    assert len(created_game["levels"]) == 3
    print("   ✅ API Sinh Game lưu CSDL thành công và chuyển vào hàng đợi kiểm duyệt.")

    # Thử chủ đề không an toàn -> Bị chặn 400
    res_unsafe = client.post(
        "/api/admin/games/ai-generate",
        json={
            "topic": "Học cách chơi cờ bạc",
            "template_code": "quiz",
        },
        headers=headers,
    )
    assert res_unsafe.status_code == 400
    assert "không phù hợp" in res_unsafe.json()["detail"].lower()
    print("   ✅ API đã chặn chủ đề không an toàn với mã lỗi 400.")

    # 6. TEST API POST /api/admin/ai/generate-question
    print("6️⃣ [Test API Sinh Câu Hỏi Đơn Lẻ]: POST /api/admin/ai/generate-question...")
    res_api_q = client.post(
        "/api/admin/ai/generate-question",
        json={
            "topic": "Từ Vựng Trái Cây Tiếng Anh",
            "template_code": "flashcard",
            "grade": 2,
        },
        headers=headers,
    )
    assert res_api_q.status_code == 200
    q_data = res_api_q.json()["question"]
    assert q_data["question_type"] == "flashcard"
    assert "cards" in q_data["data"]
    print("   ✅ API Sinh Câu Hỏi Đơn Lẻ phản hồi chuẩn xác.")

    print("\n🎉 TẤT CẢ CÁC TEST CASES CỦA TASK BE-04 ĐÃ PASSED 100%! PIPELINE GEMINI AI HOẠT ĐỘNG HOÀN HẢO.")


if __name__ == "__main__":
    test_be04_ai_pipeline_scenarios()
