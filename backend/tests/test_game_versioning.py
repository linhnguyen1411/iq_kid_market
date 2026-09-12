import time
import pytest
from app import models, schemas
from app.schemas import sanitize_question_data_for_learner


def test_game_creation_creates_initial_version(client, teacher_auth, db_session):
    """Tạo game mới qua CMS tự động tạo GameVersion v1 nháp/chờ duyệt."""
    res = client.post(
        "/api/admin/games",
        json={
            "title": "Toán Tư Duy Lớp 2",
            "description": "Giáo án toán tư duy cơ bản",
            "detailed_description": "Mô tả chi tiết bài học",
            "template_code": "math",
            "category": "math",
            "price": 50,
            "grade_from": 2,
            "grade_to": 3,
            "customFirstLevel": {
                "title": "Phép tính cộng",
                "questions": [
                    {
                        "question_type": "math",
                        "prompt": "5 + 5 = ?",
                        "points": 25,
                        "data": {"expression": "5 + 5", "answer": "10"},
                    }
                ],
            },
        },
        headers=teacher_auth["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    game_id = data["game"]["id"]

    game = db_session.get(models.Game, game_id)
    assert game is not None
    assert game.review_status == "pending_review"
    assert game.is_published is False

    versions = (
        db_session.query(models.GameVersion)
        .filter(models.GameVersion.game_id == game_id)
        .all()
    )
    assert len(versions) == 1
    v1 = versions[0]
    assert v1.version_num == 1
    assert v1.status == "pending_review"
    assert v1.title == "Toán Tư Duy Lớp 2"
    assert len(v1.levels) >= 1
    assert v1.levels[0]["questions"][0]["data"]["answer"] == "10"


def test_game_version_lifecycle_approve_publishes_snapshot(client, admin_auth, teacher_auth, db_session):
    """Admin duyệt game -> GameVersion v1 trở thành published snapshot và gán current_version_num."""
    res_create = client.post(
        "/api/admin/games",
        json={
            "title": "Khám Phá Vũ Trụ",
            "description": "Khoa học vũ trụ",
            "template_code": "quiz",
            "category": "iq",
            "price": 80,
        },
        headers=teacher_auth["headers"],
    )
    game_id = res_create.json()["game"]["id"]

    res_approve = client.post(
        "/api/admin/review/decide",
        json={"gameId": game_id, "action": "approve", "feedback": "Giáo án chuẩn EdTech"},
        headers=admin_auth["headers"],
    )
    assert res_approve.status_code == 200
    appr_data = res_approve.json()
    assert appr_data["success"] is True
    assert appr_data["game"]["is_published"] is True
    assert appr_data["game"]["review_status"] == "approved"
    assert appr_data["game"]["current_version_num"] == 1

    v1 = (
        db_session.query(models.GameVersion)
        .filter_by(game_id=game_id, version_num=1)
        .first()
    )
    assert v1.status == "published"
    assert v1.published_at is not None


def test_published_version_snapshot_immutability_on_creator_edit(
    client, admin_auth, teacher_auth, student_auth, db_session
):
    """Khi tác giả sửa game đã xuất bản, snapshot cũ (v1) giữ nguyên bất biến, tạo bản nháp mới v2."""
    res_create = client.post(
        "/api/admin/games",
        json={
            "title": "Kho Báu Trí Tuệ",
            "description": "Bản gốc v1",
            "template_code": "quiz",
            "category": "iq",
            "price": 100,
            "customFirstLevel": {
                "title": "Màn 1 Gốc",
                "questions": [
                    {
                        "question_type": "quiz",
                        "prompt": "Thủ đô của Việt Nam là?",
                        "points": 25,
                        "data": {
                            "question": "Thủ đô của Việt Nam là?",
                            "options": ["Hà Nội", "Huế", "Đà Nẵng", "TP.HCM"],
                            "answer": "Hà Nội",
                        },
                    }
                ],
            },
        },
        headers=teacher_auth["headers"],
    )
    game_id = res_create.json()["game"]["id"]

    client.post(
        "/api/admin/review/decide",
        json={"gameId": game_id, "action": "approve"},
        headers=admin_auth["headers"],
    )

    res_update = client.post(
        f"/api/admin/games/{game_id}/update",
        json={
            "title": "Kho Báu Trí Tuệ (Đã sửa)",
            "levels": [
                {
                    "id": f"l1_{game_id}",
                    "level_num": 1,
                    "title": "Màn 1 Mới Cải Tiến",
                    "xp_reward": 100,
                    "coin_reward": 30,
                    "questions": [
                        {
                            "id": f"q1_{game_id}",
                            "question_type": "quiz",
                            "prompt": "Hành tinh nào gần Mặt Trời nhất?",
                            "points": 30,
                            "data": {
                                "question": "Hành tinh nào gần Mặt Trời nhất?",
                                "options": ["Sao Thủy", "Sao Kim", "Trái Đất", "Sao Hỏa"],
                                "answer": "Sao Thủy",
                            },
                        }
                    ],
                }
            ],
        },
        headers=teacher_auth["headers"],
    )
    assert res_update.status_code == 200

    v1 = db_session.query(models.GameVersion).filter_by(game_id=game_id, version_num=1).first()
    assert v1.status == "published"
    assert v1.levels[0]["questions"][0]["prompt"] == "Thủ đô của Việt Nam là?"

    v2 = db_session.query(models.GameVersion).filter_by(game_id=game_id, version_num=2).first()
    assert v2 is not None
    assert v2.status == "pending_review"
    assert v2.levels[0]["questions"][0]["prompt"] == "Hành tinh nào gần Mặt Trời nhất?"

    res_student = client.get(f"/api/games/{game_id}", headers=student_auth["headers"])
    assert res_student.status_code == 200
    student_data = res_student.json()
    assert student_data["current_version_num"] == 1
    student_q = student_data["levels"][0]["questions"][0]
    assert student_q["prompt"] == "Thủ đô của Việt Nam là?"
    assert "answer" not in student_q["data"]

    res_teacher = client.get(f"/api/games/{game_id}", headers=teacher_auth["headers"])
    assert res_teacher.status_code == 200
    teacher_data = res_teacher.json()
    assert teacher_data["current_version_num"] == 2
    teacher_q = teacher_data["levels"][0]["questions"][0]
    assert teacher_q["prompt"] == "Hành tinh nào gần Mặt Trời nhất?"
    assert teacher_q["data"]["answer"] == "Sao Thủy"


def test_admin_approval_promotes_draft_to_published_and_archives_v1(
    client, admin_auth, teacher_auth, student_auth, db_session
):
    """Khi Admin phê duyệt draft v2: v2 trở thành published, v1 chuyển sang archived."""
    res_create = client.post(
        "/api/admin/games",
        json={
            "title": "Thử Thách Logic",
            "description": "Mô tả",
            "template_code": "math",
            "category": "math",
        },
        headers=teacher_auth["headers"],
    )
    game_id = res_create.json()["game"]["id"]
    client.post(
        "/api/admin/review/decide",
        json={"gameId": game_id, "action": "approve"},
        headers=admin_auth["headers"],
    )

    client.post(
        "/api/admin/levels/add",
        json={
            "gameId": game_id,
            "level_num": 2,
            "title": "Màn 2 Nâng Cao",
            "question": {
                "question_type": "math",
                "prompt": "10 - 4 = ?",
                "points": 25,
                "data": {"expression": "10 - 4", "answer": "6"},
            },
        },
        headers=teacher_auth["headers"],
    )

    res_appr2 = client.post(
        "/api/admin/review/decide",
        json={"gameId": game_id, "action": "approve", "feedback": "Duyệt v2"},
        headers=admin_auth["headers"],
    )
    assert res_appr2.status_code == 200

    v1 = db_session.query(models.GameVersion).filter_by(game_id=game_id, version_num=1).first()
    v2 = db_session.query(models.GameVersion).filter_by(game_id=game_id, version_num=2).first()
    assert v1.status == "archived"
    assert v2.status == "published"

    game = db_session.get(models.Game, game_id)
    assert game.current_version_num == 2


def test_purchase_and_attempt_records_game_version_id(
    client, admin_auth, teacher_auth, student_auth, db_session
):
    """Mua game và gửi attempt ghi nhận chính xác game_version_id của snapshot xuất bản."""
    res_create = client.post(
        "/api/admin/games",
        json={
            "title": "IQ Đố Vui Phiên Bản",
            "description": "Game kiểm tra snapshot purchase",
            "template_code": "math",
            "category": "math",
            "price": 20,
            "customFirstLevel": {
                "title": "Màn 1",
                "questions": [
                    {
                        "question_type": "math",
                        "prompt": "7 + 3 = ?",
                        "points": 25,
                        "data": {"expression": "7 + 3", "answer": "10"},
                    }
                ],
            },
        },
        headers=teacher_auth["headers"],
    )
    game_id = res_create.json()["game"]["id"]
    client.post(
        "/api/admin/review/decide",
        json={"gameId": game_id, "action": "approve"},
        headers=admin_auth["headers"],
    )

    student_wallet = (
        db_session.query(models.Wallet)
        .filter_by(user_id=student_auth["user_id"])
        .first()
    )
    student_wallet.balance = 500
    db_session.commit()

    res_buy = client.post(
        "/api/games/purchase",
        json={"gameId": game_id, "userId": student_auth["user_id"]},
        headers=student_auth["headers"],
    )
    assert res_buy.status_code == 200

    purchase = (
        db_session.query(models.Purchase)
        .filter_by(user_id=student_auth["user_id"], game_id=game_id)
        .first()
    )
    assert purchase is not None
    assert purchase.game_version_id is not None

    v1 = db_session.query(models.GameVersion).filter_by(game_id=game_id, version_num=1).first()
    assert purchase.game_version_id == v1.id

    res_att = client.post(
        "/api/attempts/submit",
        json={
            "gameId": game_id,
            "levelNum": 1,
            "submittedAnswer": "10",
            "duration": 10,
        },
        headers=student_auth["headers"],
    )
    assert res_att.status_code == 200
    att_data = res_att.json()
    assert att_data["isCorrect"] is True

    attempt = (
        db_session.query(models.Attempt)
        .filter_by(user_id=student_auth["user_id"], game_id=game_id, level_num=1)
        .first()
    )
    assert attempt is not None
    assert attempt.game_version_id == v1.id


def test_legacy_game_without_game_version_works_cleanly(client, student_auth, db_session):
    """Game legacy (không có GameVersion nào trong DB) vẫn hoạt động hoàn hảo: fallback levels."""
    legacy_id = f"legacy_game_{int(time.time()*1000)}"
    legacy_game = models.Game(
        id=legacy_id,
        title="Game Di Sản 2024",
        description="Game không có bản ghi GameVersion",
        template_code="math",
        category="math",
        price=0,
        review_status="approved",
        is_published=True,
        is_seed=False,
        current_version_num=None,
        levels=[
            {
                "id": f"{legacy_id}_l1",
                "level_num": 1,
                "title": "Màn Di Sản 1",
                "questions": [
                    {
                        "id": f"{legacy_id}_q1",
                        "question_type": "math",
                        "prompt": "4 + 4 = ?",
                        "points": 25,
                        "data": {"expression": "4 + 4", "answer": "8"},
                    }
                ],
            }
        ],
    )
    db_session.add(legacy_game)
    db_session.commit()

    res_detail = client.get(f"/api/games/{legacy_id}", headers=student_auth["headers"])
    assert res_detail.status_code == 200
    d_data = res_detail.json()
    assert len(d_data["levels"]) == 1
    assert "answer" not in d_data["levels"][0]["questions"][0]["data"]

    res_att = client.post(
        "/api/attempts/submit",
        json={
            "gameId": legacy_id,
            "levelNum": 1,
            "submittedAnswer": "8",
        },
        headers=student_auth["headers"],
    )
    assert res_att.status_code == 200
    assert res_att.json()["isCorrect"] is True

    attempt = (
        db_session.query(models.Attempt)
        .filter_by(game_id=legacy_id, level_num=1)
        .first()
    )
    assert attempt is not None
    assert attempt.game_version_id is None


def test_engine_content_contract_sanitization_across_all_engines():
    """Kiểm tra sanitize_question_data_for_learner đảm bảo an toàn cho toàn bộ 10 Base Engines."""
    # 1. Quiz
    quiz_data = {"question": "Q?", "options": ["A", "B", "C"], "answer": "A"}
    san_quiz = sanitize_question_data_for_learner("quiz", quiz_data)
    assert "answer" not in san_quiz
    assert san_quiz["options"] == ["A", "B", "C"]

    # 2. Math
    math_data = {"expression": "12 * 12", "answer": "144"}
    san_math = sanitize_question_data_for_learner("math", math_data)
    assert "answer" not in san_math
    assert san_math["expression"] == "12 * 12"

    # 3. True / False
    tf_data = {"statement": "Mặt Trời mọc ở hướng Đông", "answer": True}
    san_tf = sanitize_question_data_for_learner("true_false", tf_data)
    assert "answer" not in san_tf
    assert san_tf["statement"] == "Mặt Trời mọc ở hướng Đông"

    # 4. Fill in the blank
    fill_data = {"sentence": "Nước sôi ở ___ độ C.", "answer": "100"}
    san_fill = sanitize_question_data_for_learner("fill_blank", fill_data)
    assert "answer" not in san_fill

    # 5. Matching (Phase 0 hash token preservation)
    matching_data = {
        "pairs": [
            {"left": "Chó", "right": "Dog"},
            {"left": "Mèo", "right": "Cat"},
        ]
    }
    san_matching = sanitize_question_data_for_learner("matching", matching_data)
    assert "pairs" not in san_matching
    assert "left_items" in san_matching
    assert "right_items" in san_matching
    assert "match_hashes" in san_matching

    # 6. Sequence
    seq_data = {"sequence": [2, 4, 6, "___"], "answer": "8"}
    san_seq = sanitize_question_data_for_learner("sequence", seq_data)
    assert "answer" not in san_seq
    assert "options" in san_seq
    assert len(san_seq["options"]) >= 3

    # 7. Sorting
    sort_data = {"items": ["1", "2", "3", "4"], "correct_order": ["1", "2", "3", "4"]}
    san_sort = sanitize_question_data_for_learner("sorting", sort_data)
    assert "correct_order" not in san_sort
    assert "target_order" not in san_sort
    assert len(san_sort["items"]) == 4

    # 8. Unscramble
    unscramble_data = {"scrambled": "O H L E L", "answer": "HELLO"}
    san_unscramble = sanitize_question_data_for_learner("unscramble", unscramble_data)
    assert "answer" not in san_unscramble
    assert "word" not in san_unscramble
    assert "tokens" in san_unscramble

    # 9. Observation
    obs_data = {"image_url": "img.png", "target_object": "apple", "solution": {"x": 10, "y": 20}, "hint": "Gần góc"}
    san_obs = sanitize_question_data_for_learner("observation", obs_data)
    assert "solution" not in san_obs
    assert "hint" not in san_obs
    assert san_obs["target_object"] == "apple"

    # 10. Logic Grid
    logic_data = {"clues": ["A > B"], "solution": {"A": 1, "B": 2}}
    san_logic = sanitize_question_data_for_learner("logic_grid", logic_data)
    assert "solution" not in san_logic
    assert "clues" in san_logic
