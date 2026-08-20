import pytest
from app.ai_content import clean_json_string, is_content_safe_for_kids, generate_game_with_gemini


def test_scratch_courses_and_submission(client, student_auth, teacher_auth):
    # 1. Lấy danh sách khóa học
    res_courses = client.get(f"/api/scratch/courses?userId={student_auth['user_id']}")
    assert res_courses.status_code == 200
    courses = res_courses.json()
    assert len(courses) > 0
    c_id = courses[0]["id"]
    lessons = courses[0]["lessons"]
    assert lessons[0]["isLocked"] is False
    assert lessons[1]["isLocked"] is True

    # 2. Nộp đúng khối lệnh bài 1 -> Mở khóa bài 2
    target_seq = lessons[0]["target_block_sequence"]
    res_submit = client.post("/api/scratch/lessons/submit", json={
        "userId": student_auth["user_id"],
        "courseId": c_id,
        "lessonNum": 1,
        "submittedSequence": target_seq,
    })
    assert res_submit.status_code == 200
    assert res_submit.json()["success"] is True
    assert res_submit.json()["nextLessonNum"] == 2


def test_ai_pipeline_safety_and_fallback(client, teacher_auth):
    # 1. Kiểm tra filter an toàn
    safe_ok, _ = is_content_safe_for_kids("Toán học vũ trụ 🚀")
    assert safe_ok is True

    safe_fail, reason = is_content_safe_for_kids("Game đánh nhau bạo lực")
    assert safe_fail is False

    # 2. Kiểm tra JSON Sanitizer
    dirty_json = "```json\n{\n  \"name\": \"Test AI\",\n}\n```"
    cleaned = clean_json_string(dirty_json)
    assert "```" not in cleaned
    assert '\"name\": \"Test AI\"' in cleaned

    # 3. Test API Admin sinh game AI
    res_ai = client.post("/api/admin/games/ai-generate", json={
        "topic": "Hệ Mặt Trời",
        "template_code": "quiz",
        "grade_from": 1,
        "grade_to": 3,
    }, headers=teacher_auth["headers"])
    assert res_ai.status_code == 200
    assert len(res_ai.json()["game"]["levels"]) == 3
