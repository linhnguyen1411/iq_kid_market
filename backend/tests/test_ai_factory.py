"""Tests for Phase 8: Admin AI Content Factory & Deterministic Algorithmic Verification."""
import pytest
from app import models
from app.deterministic_verifier import (
    safe_eval_math_expression,
    verify_and_normalize_ai_question,
)


def test_batch_generate_admin_only(client, admin_auth, teacher_auth):
    """Quyền truy cập AI Factory: Giáo viên/Creator bị 403, Admin được phép 200."""
    payload = {
        "topic": "Phép cộng trong phạm vi 20",
        "template_code": "quiz",
        "count": 3,
        "grade": 2,
        "category": "math",
        "save_to_bank": False,
    }

    # 1. Giáo viên gọi -> 403 Forbidden
    res_teacher = client.post(
        "/api/admin/ai/batch-generate-questions",
        json=payload,
        headers=teacher_auth["headers"],
    )
    assert res_teacher.status_code == 403

    # 2. Admin gọi -> 200 OK
    res_admin = client.post(
        "/api/admin/ai/batch-generate-questions",
        json=payload,
        headers=admin_auth["headers"],
    )
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert data["success"] is True
    assert data["total_requested"] == 3
    assert len(data["items"]) == 3
    assert all(it["is_verified"] for it in data["items"])


def test_batch_generate_count_clamped_to_max_5(client, admin_auth):
    """Giới hạn nghiêm ngặt số lượng: Dù client gửi count=10 hay 100, chỉ sinh tối đa 5."""
    payload = {
        "topic": "Hình học trực quan",
        "template_code": "quiz",
        "count": 10,  # Vượt quá giới hạn 5
        "grade": 1,
        "category": "geometry",
    }
    res = client.post(
        "/api/admin/ai/batch-generate-questions",
        json=payload,
        headers=admin_auth["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_requested"] == 10
    # Nghiêm ngặt: total_generated và số lượng item không vượt quá 5
    assert data["total_generated"] <= 5
    assert len(data["items"]) <= 5


def test_deterministic_math_verification():
    """Kiểm tra bộ thẩm định toán học xác định qua AST (Không dùng eval())."""
    # 1. Các biểu thức toán học hợp lệ
    assert safe_eval_math_expression("24 + 16") == 40
    assert safe_eval_math_expression("50 - 15 = ?") == 35
    assert safe_eval_math_expression("10 * 5 / 2") == 25
    assert safe_eval_math_expression("12 x 4") == 48
    assert safe_eval_math_expression("100 : 4") == 25

    # 2. Biểu thức nguy hiểm, mã độc hoặc lỗi chia cho 0 -> trả về None
    assert safe_eval_math_expression("__import__('os').system('dir')") is None
    assert safe_eval_math_expression("eval('2+2')") is None
    assert safe_eval_math_expression("10 / 0") is None
    assert safe_eval_math_expression("") is None

    # 3. Thẩm định câu hỏi toán: AI trả lời sai -> Bị từ chối
    valid, err, _ = verify_and_normalize_ai_question(
        template_code="math",
        prompt="Tính kết quả phép tính 15 + 25 = ?",
        data={"expression": "15 + 25", "options": ["40", "30", "50"], "answer": "99"},
    )
    assert valid is False
    assert "sai lệch" in err

    # 4. Thẩm định câu hỏi toán: AI trả lời đúng -> Được phê duyệt
    valid, err, norm_data = verify_and_normalize_ai_question(
        template_code="math",
        prompt="Tính kết quả phép tính 15 + 25 = ?",
        data={"expression": "15 + 25", "options": ["40", "30", "50"], "answer": "40"},
    )
    assert valid is True
    assert err is None
    assert norm_data["answer"] == "40"


def test_deterministic_quiz_verification():
    """Kiểm tra thẩm định trắc nghiệm: Đáp án đúng bắt buộc phải nằm trong options."""
    # 1. Đáp án đúng nằm trong options -> Hợp lệ
    valid, err, norm_data = verify_and_normalize_ai_question(
        template_code="quiz",
        prompt="Động vật nào sau đây biết gáy báo thức vào buổi sáng?",
        data={
            "options": ["Con Chó", "Con Gà Trống", "Con Mèo", "Con Lợn"],
            "answer": "Con Gà Trống",
        },
    )
    assert valid is True
    assert err is None

    # 2. Đáp án dạng chữ cái (A, B, C, D) -> Tự động ánh xạ chuẩn xác
    valid, err, norm_data = verify_and_normalize_ai_question(
        template_code="quiz",
        prompt="Thủ đô của Việt Nam là thành phố nào?",
        data={
            "options": ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Cần Thơ"],
            "answer": "A",
        },
    )
    assert valid is True
    assert norm_data["answer"] == "Hà Nội"

    # 3. Đáp án không hề tồn tại trong options -> Bị từ chối
    valid, err, _ = verify_and_normalize_ai_question(
        template_code="quiz",
        prompt="Loài hoa nào là biểu tượng của mùa xuân miền Bắc?",
        data={
            "options": ["Hoa Mai", "Hoa Cúc", "Hoa Lan"],
            "answer": "Hoa Đào",
        },
    )
    assert valid is False
    assert "không tồn tại trong danh sách lựa chọn" in err

    # 4. Options có ít hơn 2 lựa chọn -> Bị từ chối
    valid, err, _ = verify_and_normalize_ai_question(
        template_code="quiz",
        prompt="Đố vui?",
        data={"options": ["Một lựa chọn duy nhất"], "answer": "Một lựa chọn duy nhất"},
    )
    assert valid is False


def test_deterministic_matching_verification():
    """Kiểm tra thẩm định trò chơi ghép đôi: Phải đủ 2 vế và tối thiểu 2 cặp."""
    # 1. Cặp ghép hợp lệ
    valid, err, norm_data = verify_and_normalize_ai_question(
        template_code="matching",
        prompt="Hãy ghép tên con vật với tiếng kêu tương ứng của chúng:",
        data={
            "pairs": [
                {"left": "Con Mèo", "right": "Meo meo"},
                {"left": "Con Chó", "right": "Gâu gâu"},
                {"left": "Con Vịt", "right": "Cạp cạp"},
            ]
        },
    )
    assert valid is True
    assert len(norm_data["pairs"]) == 3

    # 2. Chỉ có 1 cặp -> Bị từ chối (yêu cầu tối thiểu 2 cặp)
    valid, err, _ = verify_and_normalize_ai_question(
        template_code="matching",
        prompt="Ghép cặp:",
        data={"pairs": [{"left": "A", "right": "1"}]},
    )
    assert valid is False
    assert "tối thiểu 2 cặp" in err

    # 3. Cặp bị thiếu vế phải -> Bị từ chối
    valid, err, _ = verify_and_normalize_ai_question(
        template_code="matching",
        prompt="Ghép cặp:",
        data={"pairs": [{"left": "Con Mèo", "right": ""}, {"left": "Con Chó", "right": "Gâu gâu"}]},
    )
    assert valid is False
    assert "thiếu vế" in err


def test_batch_generate_saves_to_question_bank(client, admin_auth, db_session):
    """Khi bật save_to_bank=True, câu hỏi thẩm định hợp lệ được lưu vào Question Bank (visibility='system')."""
    payload = {
        "topic": "Hệ Mặt Trời và các hành tinh",
        "template_code": "quiz",
        "count": 3,
        "grade": 3,
        "category": "science",
        "save_to_bank": True,
    }

    res = client.post(
        "/api/admin/ai/batch-generate-questions",
        json=payload,
        headers=admin_auth["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["saved_to_bank_count"] >= 1
    assert data["total_verified"] >= 1

    saved_items = [it for it in data["items"] if it.get("saved_question_id")]
    assert len(saved_items) == data["saved_to_bank_count"]

    first_qid = saved_items[0]["saved_question_id"]
    db_q = db_session.get(models.Question, first_qid)
    assert db_q is not None
    assert db_q.visibility == "system"
    assert db_q.status == "ready"
    assert db_q.creator_id == admin_auth["user_id"]

    # Gọi lại lần 2 với cùng nội dung: Cơ chế dedup nhận diện normalized_hash, không tạo trùng lặp
    res_repeat = client.post(
        "/api/admin/ai/batch-generate-questions",
        json=payload,
        headers=admin_auth["headers"],
    )
    assert res_repeat.status_code == 200
    data_repeat = res_repeat.json()
    # Các câu hỏi đã có sẵn sẽ tăng usage_count, số lượng record mới tạo là 0
    assert data_repeat["saved_to_bank_count"] == 0


def test_ai_factory_child_safety_filter(client, admin_auth):
    """Bộ lọc an toàn trẻ em: Chủ đề hoặc nội dung nguy hại bị từ chối ngay lập tức."""
    # 1. Chủ đề chứa từ khóa bạo lực
    payload_unsafe = {
        "topic": "Vũ khí và súng đạn chiến tranh",
        "template_code": "quiz",
        "count": 3,
    }
    res = client.post(
        "/api/admin/ai/batch-generate-questions",
        json=payload_unsafe,
        headers=admin_auth["headers"],
    )
    assert res.status_code == 400
    assert "an toàn" in res.json()["detail"].lower() or "không phù hợp" in res.json()["detail"].lower()

    # 2. Đề bài thẩm định vi phạm an toàn trẻ em
    valid, err, _ = verify_and_normalize_ai_question(
        template_code="quiz",
        prompt="Cách chế tạo vũ khí nguy hiểm?",
        data={"options": ["A", "B"], "answer": "A"},
    )
    assert valid is False
    assert "an toàn trẻ em" in err.lower()
