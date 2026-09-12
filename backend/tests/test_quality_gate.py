import pytest
from app import models
from app.content_quality_gate import score_game_content


def test_quality_gate_pure_scoring_function():
    """Unit test trực tiếp hàm score_game_content() cho cả 2 kịch bản Excellent và Poor."""
    # 1. Kịch bản Excellent (10 màn GDPT chuẩn)
    excellent_levels = [
        {
            "level_num": i,
            "title": f"Màn {i}",
            "questions": [
                {
                    "question_type": "math",
                    "prompt": f"Phép tính số {i}: {i} + {i} = ?",
                    "data": {"expression": f"{i} + {i}", "answer": str(i + i)},
                }
            ],
        }
        for i in range(1, 11)
    ]
    meta_excellent = {
        "title": "Toán Tư Duy Phép Cộng Lớp 1",
        "description": "Bộ 10 màn toán rèn luyện kỹ năng tư duy và phản xạ số học theo chuẩn GDPT.",
        "grade_from": 1,
        "grade_to": 2,
        "template_code": "math",
        "thumbnail": "🔢",
    }
    rep_exc = score_game_content(excellent_levels, meta_excellent, "game_exc_01")
    assert rep_exc["total_score"] >= 80
    assert rep_exc["grade"] == "EXCELLENT"
    assert rep_exc["is_publishable"] is True
    assert len(rep_exc["dimensions"]) == 5

    # 2. Kịch bản Poor (1 màn, vi phạm an toàn trẻ em)
    poor_levels = [
        {
            "level_num": 1,
            "title": "Màn 1",
            "questions": [
                {
                    "question_type": "quiz",
                    "prompt": "Hướng dẫn sử dụng vũ khí nguy hiểm sát thương cao?",
                    "data": {"options": ["A", "B"], "answer": "A"},
                }
            ],
        }
    ]
    meta_poor = {
        "title": "test",
        "description": "nháp",
        "grade_from": None,
        "grade_to": None,
        "template_code": "quiz",
        "thumbnail": "",
    }
    rep_poor = score_game_content(poor_levels, meta_poor, "game_poor_01")
    assert rep_poor["total_score"] < 40
    assert rep_poor["grade"] == "POOR"
    assert rep_poor["is_publishable"] is False
    safety_dim = next(d for d in rep_poor["dimensions"] if d["dimension_key"] == "child_safety")
    assert safety_dim["score"] == 0
    assert len(safety_dim["issues"]) > 0


def test_quality_report_excellent_game(client, admin_auth, db_session):
    """Admin có thể xem báo cáo chất lượng game đạt chuẩn (>= 80 điểm, EXCELLENT)."""
    # Tạo game 10 màn chuẩn
    levels = [
        {
            "level_num": i,
            "title": f"Màn {i}",
            "questions": [
                {
                    "question_type": "math",
                    "prompt": f"Hãy tính kết quả của phép toán: {i} + 10 = ?",
                    "data": {"expression": f"{i} + 10", "answer": str(i + 10)},
                }
            ],
        }
        for i in range(1, 11)
    ]
    game = models.Game(
        id="game_qg_excellent_01",
        title="Toán Tư Duy Nâng Cao Chuẩn GDPT",
        description="Khóa học toán tư duy 10 màn rèn luyện tính toán logic cho học sinh tiểu học.",
        detailed_description="Mục tiêu bài học giúp các em nắm vững phép cộng trong phạm vi 20.",
        thumbnail="📐",
        price=10,
        grade_from=1,
        grade_to=3,
        template_code="math",
        category="math",
        creator_id=admin_auth["user_id"],
        creator_name="Admin Teacher",
        review_status="pending_review",
        is_published=False,
        levels=levels,
        is_seed=False,
    )
    db_session.add(game)
    db_session.commit()

    res = client.get(
        f"/api/admin/games/{game.id}/quality-report",
        headers=admin_auth["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["game_id"] == game.id
    assert data["total_score"] >= 80
    assert data["grade"] == "EXCELLENT"
    assert data["is_publishable"] is True
    assert len(data["dimensions"]) == 5
    assert "stats" in data
    assert data["stats"]["total_levels"] == 10


def test_quality_report_poor_content(client, admin_auth, db_session):
    """Game vi phạm an toàn trẻ em hoặc thiếu màn bị đánh giá POOR (< 40)."""
    levels = [
        {
            "level_num": 1,
            "title": "Màn 1",
            "questions": [
                {
                    "question_type": "quiz",
                    "prompt": "Vũ khí giết người nguy hiểm nhất là gì?",
                    "data": {"options": ["Dao", "Súng"], "answer": "Súng"},
                }
            ],
        }
    ]
    game = models.Game(
        id="game_qg_poor_01",
        title="asdf",
        description="ngắn",
        thumbnail="",
        price=0,
        grade_from=1,
        grade_to=2,
        template_code="quiz",
        category="iq",
        creator_id=admin_auth["user_id"],
        review_status="pending_review",
        is_published=False,
        levels=levels,
        is_seed=False,
    )
    db_session.add(game)
    db_session.commit()

    res = client.get(
        f"/api/admin/games/{game.id}/quality-report",
        headers=admin_auth["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_score"] < 40
    assert data["grade"] == "POOR"
    assert data["is_publishable"] is False


def test_quality_report_admin_only(client, teacher_auth):
    """Tài khoản Teacher/Creator thường không được truy cập endpoint /quality-report của Admin (403)."""
    res = client.get(
        "/api/admin/games/game_qg_excellent_01/quality-report",
        headers=teacher_auth["headers"],
    )
    assert res.status_code == 403


def test_quality_report_nonexistent_game(client, admin_auth):
    """Yêu cầu báo cáo cho game không tồn tại trả về 404."""
    res = client.get(
        "/api/admin/games/game_non_existent_999999/quality-report",
        headers=admin_auth["headers"],
    )
    assert res.status_code == 404


def test_review_queue_includes_quality_score(client, admin_auth, db_session):
    """Hàng đợi kiểm duyệt (/api/admin/review/queue) trả về cả quality_score và quality_grade cho mỗi game."""
    res = client.get(
        "/api/admin/review/queue",
        headers=admin_auth["headers"],
    )
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    if items:
        first_item = items[0]
        assert "quality_score" in first_item
        assert "quality_grade" in first_item
        assert isinstance(first_item["quality_score"], int)
        assert first_item["quality_grade"] in ["EXCELLENT", "GOOD", "FAIR", "POOR"]


def test_decide_review_records_quality_score(client, admin_auth, db_session):
    """Khi Admin phê duyệt hoặc từ chối, quality_score được ghi lại vào GameVersion và trả về trong kết quả."""
    levels = [
        {
            "level_num": i,
            "title": f"Màn {i}",
            "questions": [
                {
                    "question_type": "math",
                    "prompt": f"Phép cộng {i} + 5 = ?",
                    "data": {"expression": f"{i} + 5", "answer": str(i + 5)},
                }
            ],
        }
        for i in range(1, 6)
    ]
    game = models.Game(
        id="game_decide_qg_test_01",
        title="Toán Tư Duy Lớp 2 Phép Cộng",
        description="Khóa học 5 màn cơ bản về phép cộng cho các bé lớp 2.",
        detailed_description="Rèn luyện kỹ năng tính nhẩm nhanh.",
        thumbnail="📐",
        price=15,
        grade_from=2,
        grade_to=3,
        template_code="math",
        category="math",
        creator_id=admin_auth["user_id"],
        review_status="pending_review",
        is_published=False,
        levels=levels,
        is_seed=False,
    )
    db_session.add(game)
    db_session.flush()

    gv = models.GameVersion(
        id="gv_decide_qg_test_01_v1",
        game_id=game.id,
        version_num=1,
        status="pending_review",
        changelog="Bản nháp gửi duyệt",
        levels=levels,
        title=game.title,
        description=game.description,
        detailed_description=game.detailed_description,
        price=game.price,
        template_code=game.template_code,
        category=game.category,
    )
    db_session.add(gv)
    db_session.commit()

    res = client.post(
        "/api/admin/review/decide",
        json={
            "gameId": game.id,
            "action": "approve",
            "feedback": "Phê duyệt thông qua chất lượng!",
        },
        headers=admin_auth["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "quality_score" in data["game"]
    assert isinstance(data["game"]["quality_score"], int)
    assert data["game"]["quality_score"] > 0

    # Kiểm tra trong DB: GameVersion đã được cập nhật quality_score
    updated_gv = db_session.get(models.GameVersion, gv.id)
    assert updated_gv.quality_score is not None
    assert updated_gv.quality_score == data["game"]["quality_score"]
