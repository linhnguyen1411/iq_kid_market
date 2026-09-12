import pytest
from app import models
from app.content_hasher import compute_dual_hashes, normalize_text, normalize_for_duplicate


def test_hasher_normalization_and_order_preservation():
    """Kiểm tra logic băm kép (dual hashing) và engine-aware normalization."""
    # 1. Text normalization: lowercase, unicode NFC, dấu câu, khoảng trắng
    t1 = "  Hà   Nội, Thủ Đô!?  "
    t2 = "hà nội thủ đô"
    assert normalize_text(t1) == normalize_text(t2)

    # 2. Quiz: Đảo thứ tự options -> content_hash khác nhau nhưng normalized_hash GIỐNG NHAU
    q_prompt = "Thủ đô của Việt Nam là gì?"
    data_opts_1 = {"options": ["Hà Nội", "Đà Nẵng", "TP.HCM"], "answer": "Hà Nội"}
    data_opts_2 = {"options": ["TP.HCM", "Hà Nội", "Đà Nẵng"], "answer": "Hà Nội"}
    c1, n1 = compute_dual_hashes("quiz", q_prompt, data_opts_1)
    c2, n2 = compute_dual_hashes("quiz", q_prompt, data_opts_2)
    assert c1 != c2  # Khác canonical JSON vì thứ tự mảng options khác nhau
    assert n1 == n2  # Cùng nội dung ngữ nghĩa sau khi chuẩn hóa

    # 3. Sequence: BẢO LƯU THỨ TỰ -> thứ tự đảo nhau PHẢI sinh normalized_hash KHÁC NHAU
    s_prompt = "Điền số tiếp theo vào dãy"
    seq_data_1 = {"sequence": ["1", "2", "3"], "answer": "4"}
    seq_data_2 = {"sequence": ["3", "2", "1"], "answer": "4"}
    _, s_norm_1 = compute_dual_hashes("sequence", s_prompt, seq_data_1)
    _, s_norm_2 = compute_dual_hashes("sequence", s_prompt, seq_data_2)
    assert s_norm_1 != s_norm_2  # Bảo lưu thứ tự tuyệt đối cho sequence


def test_create_question_validation(client, teacher_auth):
    """Tạo câu hỏi với validation engine contract."""
    # 1. Hợp lệ: Quiz
    res_ok = client.post(
        "/api/questions",
        json={
            "engine_code": "quiz",
            "grade": 2,
            "subject": "Tiếng Việt",
            "topic": "Từ chỉ sự vật",
            "difficulty": 1,
            "prompt": "Từ nào sau đây chỉ con vật?",
            "data": {
                "options": ["Cái bàn", "Con mèo", "Ngôi nhà"],
                "answer": "Con mèo",
            },
            "visibility": "private",
            "status": "ready",
        },
        headers=teacher_auth["headers"],
    )
    assert res_ok.status_code == 201
    q_data = res_ok.json()
    assert q_data["id"].startswith("q_")
    assert q_data["content_hash"]
    assert q_data["normalized_hash"]
    assert q_data["creator_id"] == teacher_auth["user_id"]
    assert q_data["usage_count"] == 0

    # 2. Không hợp lệ: Quiz có đáp án không nằm trong options -> 400
    res_invalid_quiz = client.post(
        "/api/questions",
        json={
            "engine_code": "quiz",
            "prompt": "Câu hỏi sai?",
            "data": {
                "options": ["Đáp án A", "Đáp án B"],
                "answer": "Đáp án C không có",
            },
        },
        headers=teacher_auth["headers"],
    )
    assert res_invalid_quiz.status_code == 400
    assert "Đáp án" in res_invalid_quiz.json()["detail"]

    # 3. Không hợp lệ: Matching thiếu trường left/right -> 400
    res_invalid_matching = client.post(
        "/api/questions",
        json={
            "engine_code": "matching",
            "prompt": "Nối cặp đúng",
            "data": {
                "pairs": [{"left": "Con mèo"}],  # thiếu right
            },
        },
        headers=teacher_auth["headers"],
    )
    assert res_invalid_matching.status_code == 400


def test_student_forbidden_access(client, student_auth, teacher_auth):
    """Học sinh bị chặn 403 tuyệt đối khỏi ngân hàng câu hỏi."""
    # Thử GET danh sách
    res_get = client.get("/api/questions", headers=student_auth["headers"])
    assert res_get.status_code == 403

    # Thử POST tạo
    res_post = client.post(
        "/api/questions",
        json={
            "engine_code": "quiz",
            "prompt": "Test?",
            "data": {"options": ["A", "B"], "answer": "A"},
        },
        headers=student_auth["headers"],
    )
    assert res_post.status_code == 403


def test_creator_privacy_isolation(client, teacher_auth):
    """Cô Lan (Creator A) tạo câu hỏi private; Thầy Nam (Creator B) không được xem hay sửa."""
    # 1. Teacher A tạo câu hỏi riêng tư
    res_a = client.post(
        "/api/questions",
        json={
            "engine_code": "quiz",
            "grade": 3,
            "subject": "Toán",
            "prompt": "Bí mật của Cô Lan: 10 + 20 = ?",
            "data": {"options": ["20", "30", "40"], "answer": "30"},
            "visibility": "private",
        },
        headers=teacher_auth["headers"],
    )
    assert res_a.status_code == 201
    q_id = res_a.json()["id"]

    # 2. Tạo Teacher B
    res_reg_b = client.post(
        "/api/auth/register",
        json={
            "username": "teacher_nam",
            "password": "password123",
            "name": "Thầy Nam 👨‍🏫",
            "role": "teacher",
        },
    )
    token_b = res_reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Teacher B xem danh sách: câu hỏi của Teacher A KHÔNG được xuất hiện
    res_list_b = client.get("/api/questions", headers=headers_b)
    assert res_list_b.status_code == 200
    items_b = res_list_b.json()["items"]
    assert all(item["id"] != q_id for item in items_b)

    # 4. Teacher B cố tình truy cập trực tiếp ID của câu hỏi Teacher A -> 403
    res_detail_b = client.get(f"/api/questions/{q_id}", headers=headers_b)
    assert res_detail_b.status_code == 403

    # 5. Teacher B cố tình sửa câu hỏi của Teacher A -> 403
    res_put_b = client.put(
        f"/api/questions/{q_id}",
        json={"prompt": "Thầy Nam sửa lén"},
        headers=headers_b,
    )
    assert res_put_b.status_code == 403

    # 6. Teacher B cố tình xóa câu hỏi của Teacher A -> 403
    res_del_b = client.delete(f"/api/questions/{q_id}", headers=headers_b)
    assert res_del_b.status_code == 403


def test_system_questions_permissions(client, admin_auth, teacher_auth):
    """Admin tạo câu hỏi system; Creator xem được nhưng KHÔNG được sửa hay xóa."""
    # 1. Creator cố tạo question có visibility='system' -> 403
    res_creator_sys = client.post(
        "/api/questions",
        json={
            "engine_code": "math",
            "prompt": "Câu hỏi hệ thống do creator tự xưng",
            "data": {"expression": "2 x 2", "answer": "4"},
            "visibility": "system",
        },
        headers=teacher_auth["headers"],
    )
    assert res_creator_sys.status_code == 403

    # 2. Admin tạo question system -> 201 Thành công
    res_admin_sys = client.post(
        "/api/questions",
        json={
            "engine_code": "math",
            "prompt": "Bảng cửu chương 2: 2 x 3 = ?",
            "data": {"expression": "2 x 3", "answer": "6"},
            "visibility": "system",
            "status": "ready",
        },
        headers=admin_auth["headers"],
    )
    assert res_admin_sys.status_code == 201
    sys_qid = res_admin_sys.json()["id"]

    # 3. Creator xem danh sách: câu hỏi system PHẢI xuất hiện
    res_list_teacher = client.get("/api/questions", headers=teacher_auth["headers"])
    assert res_list_teacher.status_code == 200
    ids = [item["id"] for item in res_list_teacher.json()["items"]]
    assert sys_qid in ids

    # 4. Creator xem chi tiết câu hỏi system -> OK
    res_detail = client.get(f"/api/questions/{sys_qid}", headers=teacher_auth["headers"])
    assert res_detail.status_code == 200

    # 5. Creator sửa câu hỏi system -> 403
    res_edit = client.put(
        f"/api/questions/{sys_qid}",
        json={"prompt": "Creator muốn sửa câu hỏi system"},
        headers=teacher_auth["headers"],
    )
    assert res_edit.status_code == 403

    # 6. Creator xóa câu hỏi system -> 403
    res_delete = client.delete(f"/api/questions/{sys_qid}", headers=teacher_auth["headers"])
    assert res_delete.status_code == 403

    # 7. Admin sửa câu hỏi system -> OK
    res_admin_edit = client.put(
        f"/api/questions/{sys_qid}",
        json={"prompt": "Admin cập nhật: 2 x 3 = bao nhiêu?"},
        headers=admin_auth["headers"],
    )
    assert res_admin_edit.status_code == 200
    assert "bao nhiêu" in res_admin_edit.json()["prompt"]


def test_question_update_recomputes_dual_hashes(client, teacher_auth):
    """Khi prompt hoặc data thay đổi, dual hashes tự động được cập nhật chính xác."""
    res_init = client.post(
        "/api/questions",
        json={
            "engine_code": "quiz",
            "prompt": "Câu hỏi ban đầu?",
            "data": {"options": ["1", "2"], "answer": "1"},
        },
        headers=teacher_auth["headers"],
    )
    q = res_init.json()
    qid = q["id"]
    old_c_hash = q["content_hash"]
    old_n_hash = q["normalized_hash"]

    # Cập nhật prompt và data
    res_up = client.put(
        f"/api/questions/{qid}",
        json={
            "prompt": "Câu hỏi sau khi cập nhật nội dung mới?",
            "data": {"options": ["10", "20"], "answer": "20"},
        },
        headers=teacher_auth["headers"],
    )
    assert res_up.status_code == 200
    updated_q = res_up.json()
    assert updated_q["content_hash"] != old_c_hash
    assert updated_q["normalized_hash"] != old_n_hash


def test_safe_deletion_rules(client, teacher_auth, db_session):
    """Kiểm tra quy tắc xóa an toàn: usage_count == 0 xóa cứng, usage_count > 0 lưu trữ."""
    # 1. Câu hỏi usage_count == 0 -> Hard delete
    res1 = client.post(
        "/api/questions",
        json={
            "engine_code": "quiz",
            "prompt": "Câu hỏi chưa dùng bao giờ?",
            "data": {"options": ["A", "B"], "answer": "A"},
        },
        headers=teacher_auth["headers"],
    )
    q1_id = res1.json()["id"]

    res_del1 = client.delete(f"/api/questions/{q1_id}", headers=teacher_auth["headers"])
    assert res_del1.status_code == 200
    assert res_del1.json()["status"] == "deleted"

    # Kiểm tra không còn trong DB
    assert db_session.get(models.Question, q1_id) is None

    # 2. Câu hỏi usage_count > 0 -> Soft archive
    res2 = client.post(
        "/api/questions",
        json={
            "engine_code": "quiz",
            "prompt": "Câu hỏi đã dùng trong 2 game?",
            "data": {"options": ["X", "Y"], "answer": "X"},
        },
        headers=teacher_auth["headers"],
    )
    q2_id = res2.json()["id"]

    # Giả lập câu hỏi đã được gắn vào game và tăng usage_count
    q2 = db_session.get(models.Question, q2_id)
    q2.usage_count = 3
    db_session.commit()

    res_del2 = client.delete(f"/api/questions/{q2_id}", headers=teacher_auth["headers"])
    assert res_del2.status_code == 200
    assert res_del2.json()["status"] == "archived"

    # Trong DB vẫn còn nhưng trạng thái là 'archived'
    db_session.refresh(q2)
    assert q2.status == "archived"
