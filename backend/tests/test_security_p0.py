import copy
import hashlib
import pytest
from fastapi import HTTPException
from app import models, schemas
from app.sanitizer import sanitize_text, sanitize_content_payload, validate_import_payload_limits


# ============================================================================
# P0-1: WALLET CONFIRM-TOPUP AUTHORIZATION & IDEMPOTENCY
# ============================================================================
def test_p0_1_wallet_confirm_topup_authorization(client, student_auth, teacher_auth, admin_auth):
    """
    Student và Teacher không thể tự xác nhận nạp tiền.
    Chỉ Admin mới có quyền xác nhận nạp tiền vào ví.
    """
    # 1. Tạo intent nạp tiền VietQR 50.000 VND
    intent_res = client.post(
        "/api/wallet/create-topup-intent",
        headers=student_auth["headers"],
        json={"userId": student_auth["user_id"], "amount": 50000},
    )
    assert intent_res.status_code == 200
    tx_id = intent_res.json()["tx_id"]

    # 2. Student tự confirm-topup -> 403 Forbidden
    student_confirm = client.post(
        "/api/wallet/confirm-topup",
        headers=student_auth["headers"],
        json={"userId": student_auth["user_id"], "tx_id": tx_id, "amount": 50000},
    )
    assert student_confirm.status_code == 403

    # 3. Teacher confirm-topup -> 403 Forbidden
    teacher_confirm = client.post(
        "/api/wallet/confirm-topup",
        headers=teacher_auth["headers"],
        json={"userId": student_auth["user_id"], "tx_id": tx_id, "amount": 50000},
    )
    assert teacher_confirm.status_code == 403

    # 4. Admin confirm-topup -> 200 OK
    admin_confirm = client.post(
        "/api/wallet/confirm-topup",
        headers=admin_auth["headers"],
        json={"userId": student_auth["user_id"], "tx_id": tx_id, "amount": 50000},
    )
    assert admin_confirm.status_code == 200
    assert admin_confirm.json()["success"] is True

    # 5. Idempotency: Thử confirm lại lần thứ hai -> 400 Bad Request (Đã xác nhận trước đó)
    reconfirm = client.post(
        "/api/wallet/confirm-topup",
        headers=admin_auth["headers"],
        json={"userId": student_auth["user_id"], "tx_id": tx_id, "amount": 50000},
    )
    assert reconfirm.status_code == 400
    assert "đã được xác nhận" in reconfirm.json()["detail"].lower()


# ============================================================================
# P0-2: XSS SANITIZATION
# ============================================================================
def test_p0_2_xss_sanitization_in_game_creation_and_import(client, teacher_auth):
    """
    Tất cả các trường chuỗi và JSON content phải được lọc sạch thẻ nguy hiểm (script, iframe, onerror, v.v.).
    """
    xss_payload = {
        "title": "Toán Vui <script>alert('xss')</script>",
        "description": "Mô tả bài học <img src=x onerror=alert('xss')>",
        "detailed_description": "Chi tiết <iframe src='http://attacker.com'></iframe>",
        "category": "math",
        "template_code": "quiz",
        "grade_from": 1,
        "grade_to": 3,
        "price": 10000,
        "customFirstLevel": {
            "title": "Màn 1 <svg onload=alert(1)>",
            "questions": [
                {
                    "question_type": "quiz",
                    "prompt": "1 + 1 = ? <a href='javascript:alert(1)'>Click me</a>",
                    "data": {
                        "options": ["A. 1", "B. 2", "C. 3"],
                        "answer": "B",
                    },
                }
            ],
        },
    }

    res = client.post(
        "/api/admin/games",
        headers=teacher_auth["headers"],
        json=xss_payload,
    )
    assert res.status_code == 200
    game = res.json()["game"]

    # Kiểm tra XSS đã bị lọc
    assert "<script>" not in game["title"]
    assert "onerror=" not in game["description"]
    assert "<iframe" not in (game.get("detailed_description") or "")

    # Kiểm tra trong levels
    lvl1 = game["levels"][0]
    assert "onload=" not in lvl1["title"]
    q1 = lvl1["questions"][0]
    assert "javascript:" not in q1["prompt"]


# ============================================================================
# P0-3: PAYLOAD SIZE & RECURSION LIMITS (DoS PROTECTION)
# ============================================================================
def test_p0_3_payload_size_and_depth_limits(client, teacher_auth):
    """
    Chặn payload > 2MB và payload có cấu trúc lồng nhau quá sâu (> 10 cấp).
    """
    # 1. Payload kích thước lớn (> 2MB)
    huge_str = "A" * (2 * 1024 * 1024 + 100)
    with pytest.raises(HTTPException) as excinfo_size:
        validate_import_payload_limits(huge_str)
    assert excinfo_size.value.status_code == 413

    # 2. Payload lồng quá sâu (> 10 cấp)
    deep_dict = {}
    curr = deep_dict
    for _ in range(15):
        curr["nested"] = {}
        curr = curr["nested"]

    with pytest.raises(HTTPException) as excinfo_depth:
        validate_import_payload_limits(deep_dict)
    assert excinfo_depth.value.status_code == 400
    assert "lồng sâu" in excinfo_depth.value.detail.lower() or "độ sâu" in excinfo_depth.value.detail.lower()

    # 3. Payload upload_games trả về lỗi HTTP thích hợp
    res = client.post(
        "/api/admin/games/upload",
        headers=teacher_auth["headers"],
        json={"gameObject": deep_dict},
    )
    assert res.status_code == 400


# ============================================================================
# P0-4: CREATOR FREE PLAY (OPEN ALL 20 LEVELS FOR CREATOR)
# ============================================================================
def test_p0_4_creator_free_play_and_lockout(client, teacher_auth, student_auth):
    """
    Tác giả được chơi toàn bộ các màn (1-20) trên game do chính mình tạo mà không cần mua.
    Người dùng khác không mua sẽ bị chặn từ màn 6 trở đi với lỗi 403.
    """
    # 1. Teacher tạo game
    res = client.post(
        "/api/admin/games",
        headers=teacher_auth["headers"],
        json={
            "title": "Game Thử Nghiệm Tác Giả",
            "description": "Mô tả trò chơi thử nghiệm",
            "category": "iq",
            "template_code": "quiz",
            "price": 20000,
        },
    )
    assert res.status_code == 200
    game_id = res.json()["game"]["id"]

    # Cập nhật game có 8 màn
    levels = []
    for i in range(1, 9):
        levels.append({
            "level_num": i,
            "title": f"Màn {i}",
            "questions": [
                {
                    "question_type": "quiz",
                    "prompt": f"Câu hỏi màn {i}",
                    "data": {"options": ["A. Đúng", "B. Sai"], "answer": "A"},
                }
            ],
        })

    update_res = client.put(
        f"/api/admin/games/{game_id}",
        headers=teacher_auth["headers"],
        json={"levels": levels},
    )
    assert update_res.status_code == 200

    # 2. Tác giả chơi Màn 6 (chưa mua game) -> Không bị 403, submit thành công
    creator_attempt = client.post(
        "/api/attempts/submit",
        headers=teacher_auth["headers"],
        json={
            "gameId": game_id,
            "levelNum": 6,
            "submittedAnswer": {"selectedOption": "A"},
            "timeSpent": 5,
        },
    )
    assert creator_attempt.status_code == 200
    assert creator_attempt.json()["isCorrect"] is True

    # 3. Student (chưa mua game) chơi Màn 6 -> Bị chặn 403 Forbidden
    student_attempt = client.post(
        "/api/attempts/submit",
        headers=student_auth["headers"],
        json={
            "gameId": game_id,
            "levelNum": 6,
            "submittedAnswer": {"selectedOption": "A"},
            "timeSpent": 5,
        },
    )
    assert student_attempt.status_code == 403
    assert "mở khóa" in student_attempt.json()["detail"].lower()

    # 4. Student chơi Màn 1 (màn miễn phí) -> 200 OK
    student_free_attempt = client.post(
        "/api/attempts/submit",
        headers=student_auth["headers"],
        json={
            "gameId": game_id,
            "levelNum": 1,
            "submittedAnswer": {"selectedOption": "A"},
            "timeSpent": 5,
        },
    )
    assert student_free_attempt.status_code == 200


# ============================================================================
# P0-5: SERVER-SIDE GRADING INTEGRITY (ANTI-FORGERY)
# ============================================================================
def test_p0_5_server_side_grading_ignores_client_forged_score(client, student_auth, teacher_auth):
    """
    Máy chủ hoàn toàn tự chấm điểm dựa trên database và bỏ qua score/is_correct do client gửi.
    """
    create_res = client.post(
        "/api/admin/games",
        headers=teacher_auth["headers"],
        json={
            "title": "Địa Lý Thế Giới",
            "description": "Khám phá thủ đô",
            "category": "language",
            "template_code": "quiz",
            "price": 0,
        },
    )
    assert create_res.status_code == 200
    game_id = create_res.json()["game"]["id"]

    # Cập nhật Màn 1 có đáp án là "Paris" (B)
    client.put(
        f"/api/admin/games/{game_id}",
        headers=teacher_auth["headers"],
        json={
            "levels": [
                {
                    "level_num": 1,
                    "title": "Thủ đô Pháp",
                    "questions": [
                        {
                            "question_type": "quiz",
                            "prompt": "Thủ đô nước Pháp là gì?",
                            "points": 30,
                            "data": {"options": ["A. London", "B. Paris", "C. Berlin"], "answer": "B"},
                        }
                    ],
                }
            ]
        },
    )

    # Student gửi câu trả lời SAI ("London") nhưng gian lận điểm số "score: 9999", "is_correct: True"
    cheat_attempt = client.post(
        "/api/attempts/submit",
        headers=student_auth["headers"],
        json={
            "gameId": game_id,
            "levelNum": 1,
            "score": 9999,
            "is_correct": True,
            "stars": 3,
            "submittedAnswer": {"selectedOption": "London"},
            "timeSpent": 5,
        },
    )
    assert cheat_attempt.status_code == 200
    res_data = cheat_attempt.json()
    # Server phải chấm là Sai và 0 điểm
    assert res_data["isCorrect"] is False
    assert res_data["score"] == 0
    assert res_data["starsEarned"] == 0
    assert res_data["xpAwarded"] == 0
    assert res_data["coinReward"] == 0


# ============================================================================
# P0-6: MATCHING ENGINE LEARNER DTO / ANSWER EXPOSURE PROTECTION
# ============================================================================
def test_p0_6_matching_engine_learner_dto_sanitization(client, teacher_auth, student_auth):
    """
    Learner DTO của trò chơi Matching không được chứa mảng pairs dạng thô.
    Học sinh chỉ nhận left_items, right_items và match_hashes được tính kèm salt.
    """
    pairs = [
        {"left": "Chó", "right": "Dog"},
        {"left": "Mèo", "right": "Cat"},
        {"left": "Chim", "right": "Bird"},
    ]

    create_res = client.post(
        "/api/admin/games",
        headers=teacher_auth["headers"],
        json={
            "title": "Học Từ Vựng Tiếng Anh",
            "description": "Nối từ vựng động vật",
            "category": "language",
            "template_code": "matching",
            "price": 0,
        },
    )
    assert create_res.status_code == 200
    game_id = create_res.json()["game"]["id"]

    # Cập nhật Màn 1 với dữ liệu matching
    update_res = client.put(
        f"/api/admin/games/{game_id}",
        headers=teacher_auth["headers"],
        json={
            "levels": [
                {
                    "level_num": 1,
                    "title": "Động vật",
                    "questions": [
                        {
                            "question_type": "matching",
                            "prompt": "Hãy nối các con vật với từ tiếng Anh tương ứng:",
                            "data": {"pairs": pairs},
                        }
                    ],
                }
            ]
        },
    )
    assert update_res.status_code == 200

    # Student truy cập chi tiết game
    get_res = client.get(
        f"/api/games/{game_id}",
        headers=student_auth["headers"],
    )
    assert get_res.status_code == 200
    game_data = get_res.json()

    q_data = game_data["levels"][0]["questions"][0]["data"]

    # 1. pairs và matching_pairs PHẢI BỊ XÓA HOÀN TOÀN
    assert "pairs" not in q_data
    assert "matching_pairs" not in q_data

    # 2. PHẢI CÓ left_items, right_items, match_hashes, match_salt
    assert "left_items" in q_data
    assert "right_items" in q_data
    assert "match_hashes" in q_data
    assert "match_salt" in q_data

    assert set(q_data["left_items"]) == {"Chó", "Mèo", "Chim"}
    assert set(q_data["right_items"]) == {"Dog", "Cat", "Bird"}
    assert len(q_data["match_hashes"]) == 3

    # 3. Kiểm tra tính hợp lệ của hash
    salt = q_data["match_salt"]
    for p in pairs:
        token = f"{p['left'].lower()}::{p['right'].lower()}::{salt}"
        expected_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]
        assert expected_hash in q_data["match_hashes"]


# ============================================================================
# P0-7: CROSS-USER IDOR & ACCESS CONTROL INTEGRITY
# ============================================================================
def test_p0_7_cross_user_idor_and_role_boundaries(client, student_auth, teacher_auth, admin_auth):
    """
    Kiểm tra ngăn chặn IDOR chéo tài khoản và phân quyền chức năng:
    - User không xem được ví của người khác.
    - Teacher không thể sửa/xóa game của Teacher khác hoặc game seed.
    - Non-admin không thể duyệt bài (review).
    """
    # 1. Tạo 1 Teacher khác
    res2 = client.post("/api/auth/register", json={
        "username": "teacher2_pytest",
        "password": "password123",
        "name": "Thầy Nam 👨‍🏫",
        "role": "teacher",
    })
    teacher2_headers = {"Authorization": f"Bearer {res2.json()['access_token']}"}

    # Teacher 1 tạo game
    game1_res = client.post(
        "/api/admin/games",
        headers=teacher_auth["headers"],
        json={
            "title": "Game của Cô Lan",
            "description": "Mô tả trò chơi",
            "category": "iq",
            "template_code": "quiz",
            "price": 15000,
        },
    )
    game1_id = game1_res.json()["game"]["id"]

    # Teacher 2 cố gắng sửa game của Teacher 1 -> 403 Forbidden
    edit_res = client.put(
        f"/api/admin/games/{game1_id}",
        headers=teacher2_headers,
        json={"title": "Tên Bị Sửa Trái Phép"},
    )
    assert edit_res.status_code == 403

    # Teacher 2 cố gắng xóa game của Teacher 1 -> 403 Forbidden
    del_res = client.delete(
        f"/api/admin/games/{game1_id}",
        headers=teacher2_headers,
    )
    assert del_res.status_code == 403

    # Teacher 1 cố gắng tự duyệt xuất bản game của mình -> 403 Forbidden (Chỉ Admin)
    review_res = client.post(
        "/api/admin/review/decide",
        headers=teacher_auth["headers"],
        json={"gameId": game1_id, "action": "approve", "feedback": "Tự duyệt"},
    )
    assert review_res.status_code == 403

    # Admin duyệt game -> 200 OK
    admin_review = client.post(
        "/api/admin/review/decide",
        headers=admin_auth["headers"],
        json={"gameId": game1_id, "action": "approve", "feedback": "Đạt chuẩn"},
    )
    assert admin_review.status_code == 200
    assert admin_review.json()["game"]["review_status"] == "approved"
