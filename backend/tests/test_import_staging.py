import pytest
from app import models


def test_get_import_templates(client, teacher_auth):
    """API cung cấp đầy đủ 10 template JSON chuẩn và prompt hướng dẫn cho AI ngoài."""
    res = client.get("/api/admin/games/import-templates", headers=teacher_auth["headers"])
    assert res.status_code == 200
    data = res.json()
    assert "templates" in data
    assert "promptGuidelines" in data

    templates = data["templates"]
    expected_engines = [
        "quiz", "matching", "sequence", "math", "memory",
        "sorting", "language", "flashcard", "observation", "coding"
    ]
    for eng in expected_engines:
        assert eng in templates
        assert templates[eng]["template_code"] == eng
        assert len(templates[eng]["levels"]) >= 1


def test_import_preview_valid_pack_no_db_mutation(client, teacher_auth, db_session):
    """Quality Gate preview: Trả về kết quả hợp lệ và TUYỆT ĐỐI KHÔNG lưu vào DB."""
    pack = {
        "title": "Toán Tư Duy Thử Nghiệm",
        "template_code": "math",
        "category": "math",
        "grade_from": 1,
        "grade_to": 2,
        "price": 0,
        "levels": [
            {
                "level_num": 1,
                "title": "Màn 1",
                "questions": [
                    {
                        "question_type": "math",
                        "prompt": "5 + 3 = ?",
                        "data": {"expression": "5 + 3", "answer": "8"},
                    }
                ],
            },
            {
                "level_num": 2,
                "title": "Màn 2",
                "questions": [
                    {
                        "question_type": "math",
                        "prompt": "10 - 4 = ?",
                        "data": {"expression": "10 - 4", "answer": "6"},
                    }
                ],
            },
        ],
    }

    count_before = db_session.query(models.Game).count()

    res = client.post(
        "/api/admin/games/import-preview",
        json={"gameObject": pack},
        headers=teacher_auth["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert len(data["errors"]) == 0
    # Cảnh báo vì < 5 màn chơi
    assert any("tối thiểu 5 màn" in w for w in data["warnings"])
    assert data["stats"]["total_levels"] == 2
    assert data["stats"]["total_questions"] == 2
    assert data["stats"]["safe_for_kids"] is True

    # Xác nhận DB không bị thay đổi bất kỳ bản ghi nào
    count_after = db_session.query(models.Game).count()
    assert count_after == count_before


def test_import_preview_xss_stripped(client, teacher_auth):
    """Mã độc XSS trong title, prompt hoặc options phải được làm sạch hoàn toàn."""
    pack = {
        "title": "Game XSS <script>alert('hacked')</script>",
        "template_code": "quiz",
        "levels": [
            {
                "level_num": 1,
                "questions": [
                    {
                        "question_type": "quiz",
                        "prompt": "Thử XSS <img src=x onerror=alert(1)> nào?",
                        "data": {
                            "options": [
                                "Đáp án 1 <script>bad()</script>",
                                "Đáp án 2",
                            ],
                            "answer": "Đáp án 2",
                        },
                    }
                ],
            }
        ],
    }

    res = client.post(
        "/api/admin/games/import-preview",
        json={"gameObject": pack},
        headers=teacher_auth["headers"],
    )
    assert res.status_code == 200
    game = res.json()["game"]
    assert "<script>" not in game["title"]
    assert "onerror=" not in game["levels"][0]["questions"][0]["prompt"]


def test_import_preview_invalid_engine_data(client, teacher_auth):
    """Dữ liệu câu hỏi sai quy cách theo Engine bị Quality Gate từ chối."""
    # Quiz sai: answer không thuộc options
    pack_bad_quiz = {
        "title": "Quiz Sai Đáp Án",
        "template_code": "quiz",
        "levels": [
            {
                "level_num": 1,
                "questions": [
                    {
                        "question_type": "quiz",
                        "prompt": "Câu hỏi trắc nghiệm?",
                        "data": {
                            "options": ["A", "B"],
                            "answer": "C không tồn tại",
                        },
                    }
                ],
            }
        ],
    }
    res = client.post(
        "/api/admin/games/import-preview",
        json={"gameObject": pack_bad_quiz},
        headers=teacher_auth["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert any("Đáp án" in err for err in data["errors"])


def test_import_preview_child_safety_detection(client, teacher_auth):
    """Nội dung chứa từ ngữ cấm hoặc bạo lực bị Quality Gate phát hiện."""
    pack_unsafe = {
        "title": "Game Không Lành Mạnh",
        "template_code": "quiz",
        "levels": [
            {
                "level_num": 1,
                "questions": [
                    {
                        "question_type": "quiz",
                        "prompt": "Hướng dẫn sử dụng vũ khí giết người nguy hiểm?",
                        "data": {
                            "options": ["Cách 1", "Cách 2"],
                            "answer": "Cách 1",
                        },
                    }
                ],
            }
        ],
    }
    res = client.post(
        "/api/admin/games/import-preview",
        json={"gameObject": pack_unsafe},
        headers=teacher_auth["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert data["stats"]["safe_for_kids"] is False
    assert any("trẻ em" in err for err in data["errors"])


def test_import_preview_internal_duplicate_warning(client, teacher_auth):
    """Cảnh báo khi các màn trong cùng game có câu hỏi trùng lặp ngữ nghĩa."""
    pack_dup = {
        "title": "Game Trùng Màn",
        "template_code": "quiz",
        "levels": [
            {
                "level_num": 1,
                "questions": [
                    {
                        "question_type": "quiz",
                        "prompt": "Thủ đô Việt Nam là gì?",
                        "data": {
                            "options": ["Hà Nội", "Đà Nẵng"],
                            "answer": "Hà Nội",
                        },
                    }
                ],
            },
            {
                "level_num": 2,
                "questions": [
                    {
                        "question_type": "quiz",
                        "prompt": "  thủ đô việt nam, là gì?!  ",  # normalized_hash sẽ trùng
                        "data": {
                            "options": ["Đà Nẵng", "Hà Nội"],  # đảo options
                            "answer": "Hà Nội",
                        },
                    }
                ],
            },
        ],
    }
    res = client.post(
        "/api/admin/games/import-preview",
        json={"gameObject": pack_dup},
        headers=teacher_auth["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert any("trùng lặp" in w for w in data["warnings"])


def test_upload_games_no_padding_spam_and_creates_version(client, teacher_auth, db_session):
    """Khi nạp game thực tế: Giữ đúng số màn tác giả đưa vào (KHÔNG nhân bản đủ 20) và tạo GameVersion v1."""
    pack = {
        "title": "Bộ 3 Màn Chơi Thực Tế",
        "template_code": "math",
        "category": "math",
        "levels": [
            {
                "level_num": 1,
                "title": "Màn 1",
                "questions": [
                    {
                        "question_type": "math",
                        "prompt": "1 + 1 = ?",
                        "data": {"expression": "1 + 1", "answer": "2"},
                    }
                ],
            },
            {
                "level_num": 2,
                "title": "Màn 2",
                "questions": [
                    {
                        "question_type": "math",
                        "prompt": "2 + 2 = ?",
                        "data": {"expression": "2 + 2", "answer": "4"},
                    }
                ],
            },
            {
                "level_num": 3,
                "title": "Màn 3",
                "questions": [
                    {
                        "question_type": "math",
                        "prompt": "3 + 3 = ?",
                        "data": {"expression": "3 + 3", "answer": "6"},
                    }
                ],
            },
        ],
    }

    res = client.post(
        "/api/admin/games/upload",
        json={"gameObject": pack},
        headers=teacher_auth["headers"],
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    game_id = data["gameIds"][0]

    # Kiểm tra trong DB: Game chỉ có đúng 3 màn, KHÔNG bị pad thành 20 màn
    game = db_session.get(models.Game, game_id)
    assert game is not None
    assert len(game.levels) == 3

    # Kiểm tra GameVersion v1 cũng được tạo với đúng 3 màn
    versions = db_session.query(models.GameVersion).filter(models.GameVersion.game_id == game_id).all()
    assert len(versions) == 1
    v1 = versions[0]
    assert v1.version_num == 1
    assert v1.status == "pending_review"
    assert len(v1.levels) == 3
