import pytest
from app import models


def test_build_game_from_bank_own_and_system_questions(client, teacher_auth, admin_auth, db_session):
    """Tác giả ghép game thành công từ câu hỏi của mình và câu hỏi hệ thống (Snapshot Pattern)."""
    # 1. Teacher tạo câu hỏi private
    res_q1 = client.post(
        "/api/questions",
        json={
            "engine_code": "quiz",
            "prompt": "Câu hỏi của Cô Lan?",
            "data": {"options": ["A1", "B1"], "answer": "A1"},
            "visibility": "private",
        },
        headers=teacher_auth["headers"],
    )
    assert res_q1.status_code == 201
    q1_id = res_q1.json()["id"]

    # 2. Admin tạo câu hỏi system
    res_q2 = client.post(
        "/api/questions",
        json={
            "engine_code": "quiz",
            "prompt": "Câu hỏi hệ thống chung?",
            "data": {"options": ["X", "Y"], "answer": "X"},
            "visibility": "system",
        },
        headers=admin_auth["headers"],
    )
    assert res_q2.status_code == 201
    q2_id = res_q2.json()["id"]

    # 3. Teacher ghép game từ q1 và q2
    res_build = client.post(
        "/api/admin/games/build-from-bank",
        json={
            "title": "Game Ghép Từ Kho Câu Hỏi",
            "description": "Bộ bài kiểm tra tổng hợp",
            "template_code": "quiz",
            "category": "iq",
            "grade_from": 1,
            "grade_to": 3,
            "price": 10,
            "question_ids": [q1_id, q2_id],
        },
        headers=teacher_auth["headers"],
    )
    assert res_build.status_code == 200
    b_data = res_build.json()
    assert b_data["success"] is True
    game_id = b_data["game_id"]
    assert b_data["levels_count"] == 2
    assert b_data["version_num"] == 1

    # 4. Kiểm tra trong DB: Game và GameVersion v1 được tạo snapshot đầy đủ
    game = db_session.get(models.Game, game_id)
    assert game is not None
    assert len(game.levels) == 2
    assert game.levels[0]["questions"][0]["question_bank_id"] == q1_id
    assert game.levels[1]["questions"][0]["question_bank_id"] == q2_id
    assert game.creator_id == teacher_auth["user_id"]

    versions = db_session.query(models.GameVersion).filter(models.GameVersion.game_id == game_id).all()
    assert len(versions) == 1
    v1 = versions[0]
    assert v1.version_num == 1
    assert len(v1.levels) == 2

    # 5. Kiểm tra usage_count của câu hỏi được tăng lên
    db_session.refresh(db_session.get(models.Question, q1_id))
    db_session.refresh(db_session.get(models.Question, q2_id))
    assert db_session.get(models.Question, q1_id).usage_count >= 1
    assert db_session.get(models.Question, q2_id).usage_count >= 1


def test_build_game_from_bank_anti_theft_lockout(client, teacher_auth):
    """Creator B bị chặn 403 khi cố ý bốc câu hỏi riêng tư của Creator A."""
    # 1. Teacher A tạo câu hỏi private
    res_a = client.post(
        "/api/questions",
        json={
            "engine_code": "quiz",
            "prompt": "Bí mật độc quyền của Cô Lan?",
            "data": {"options": ["Alpha", "Beta"], "answer": "Alpha"},
            "visibility": "private",
        },
        headers=teacher_auth["headers"],
    )
    q_private_id = res_a.json()["id"]

    # 2. Đăng ký Teacher B
    res_reg_b = client.post(
        "/api/auth/register",
        json={
            "username": "teacher_thief",
            "password": "password123",
            "name": "Thầy Trộm Bản Quyền",
            "role": "teacher",
        },
    )
    token_b = res_reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Teacher B cố ý lấy q_private_id của Teacher A để tạo game thương mại
    res_build_b = client.post(
        "/api/admin/games/build-from-bank",
        json={
            "title": "Game Đạo Nhái",
            "template_code": "quiz",
            "question_ids": [q_private_id],
        },
        headers=headers_b,
    )
    assert res_build_b.status_code == 403
    assert "quyền sử dụng câu hỏi riêng tư" in res_build_b.json()["detail"]


def test_snapshot_immutability(client, teacher_auth, db_session):
    """Nguyên tắc bất biến: Sửa câu hỏi trong Question Bank KHÔNG làm biến đổi Game đã ghép."""
    # 1. Tạo câu hỏi trong bank
    res_q = client.post(
        "/api/questions",
        json={
            "engine_code": "quiz",
            "prompt": "Nội dung ban đầu trước khi sửa?",
            "data": {"options": ["Đáp án 1", "Đáp án 2"], "answer": "Đáp án 1"},
        },
        headers=teacher_auth["headers"],
    )
    qid = res_q.json()["id"]

    # 2. Ghép thành game
    res_build = client.post(
        "/api/admin/games/build-from-bank",
        json={
            "title": "Game Kiểm Thử Bất Biến",
            "template_code": "quiz",
            "question_ids": [qid],
        },
        headers=teacher_auth["headers"],
    )
    game_id = res_build.json()["game_id"]

    # 3. Sau đó sửa câu hỏi trong Question Bank
    res_edit_q = client.put(
        f"/api/questions/{qid}",
        json={
            "prompt": "Nội dung câu hỏi ĐÃ BỊ THAY ĐỔI trong ngân hàng!",
            "data": {"options": ["Mới 1", "Mới 2"], "answer": "Mới 2"},
        },
        headers=teacher_auth["headers"],
    )
    assert res_edit_q.status_code == 200

    # 4. Kiểm tra Game đã ghép: Nội dung trong màn chơi vẫn giữ nguyên bản snapshot ban đầu!
    game = db_session.get(models.Game, game_id)
    prompt_in_game = game.levels[0]["questions"][0]["prompt"]
    assert prompt_in_game == "Nội dung ban đầu trước khi sửa?"
    assert "ĐÃ BỊ THAY ĐỔI" not in prompt_in_game


def test_add_questions_from_bank_to_existing_game(client, teacher_auth, db_session):
    """Bổ sung thêm câu hỏi từ Ngân hàng vào một Game hiện có."""
    # 1. Tạo game có sẵn 1 màn
    res_create_game = client.post(
        "/api/admin/games",
        json={
            "title": "Game Toán 1 Màn",
            "description": "Mô tả game toán 1 màn",
            "template_code": "math",
            "category": "math",
            "customFirstLevel": {
                "title": "Màn 1",
                "questions": [
                    {
                        "question_type": "math",
                        "prompt": "1 + 1 = ?",
                        "data": {"expression": "1 + 1", "answer": "2"},
                    }
                ],
            },
        },
        headers=teacher_auth["headers"],
    )
    game_id = res_create_game.json()["game"]["id"]

    # 2. Tạo câu hỏi trong bank
    res_q = client.post(
        "/api/questions",
        json={
            "engine_code": "math",
            "prompt": "2 + 2 = ?",
            "data": {"expression": "2 + 2", "answer": "4"},
        },
        headers=teacher_auth["headers"],
    )
    qid = res_q.json()["id"]

    # 3. Bổ sung qid vào game_id
    res_add = client.post(
        f"/api/admin/games/{game_id}/add-from-bank",
        json={"question_ids": [qid]},
        headers=teacher_auth["headers"],
    )
    assert res_add.status_code == 200
    assert res_add.json()["added_count"] == 1
    assert res_add.json()["total_levels"] == 2

    # 4. Kiểm tra DB
    game = db_session.get(models.Game, game_id)
    assert len(game.levels) == 2
    assert game.levels[1]["level_num"] == 2
    assert game.levels[1]["questions"][0]["question_bank_id"] == qid


def test_extract_questions_from_game_to_bank(client, teacher_auth, db_session):
    """Trích xuất câu hỏi từ Game hiện có vào Ngân hàng câu hỏi kèm chống trùng."""
    # 1. Tạo game có 2 màn
    res_create = client.post(
        "/api/admin/games",
        json={
            "title": "Game Cần Trích Xuất",
            "description": "Mô tả game trích xuất",
            "template_code": "quiz",
            "category": "iq",
            "customFirstLevel": {
                "title": "Màn Trích Xuất 1",
                "questions": [
                    {
                        "question_type": "quiz",
                        "prompt": "Mặt trời mọc ở hướng nào?",
                        "data": {"options": ["Đông", "Tây"], "answer": "Đông"},
                    }
                ],
            },
        },
        headers=teacher_auth["headers"],
    )
    game_id = res_create.json()["game"]["id"]

    # 2. Gọi extract-to-bank lần 1
    res_ext1 = client.post(
        f"/api/admin/games/{game_id}/extract-to-bank",
        headers=teacher_auth["headers"],
    )
    assert res_ext1.status_code == 200
    data1 = res_ext1.json()
    assert data1["extracted_count"] == 1
    assert data1["skipped_duplicate_count"] == 0
    extracted_qid = data1["question_ids"][0]

    # Kiểm tra trong DB
    q = db_session.get(models.Question, extracted_qid)
    assert q is not None
    assert q.creator_id == teacher_auth["user_id"]
    assert q.source_game_id == game_id
    assert q.usage_count >= 1

    # 3. Gọi extract-to-bank lần 2 trên cùng game -> Tự động nhận diện duplicate và không tạo thêm bản ghi rác!
    res_ext2 = client.post(
        f"/api/admin/games/{game_id}/extract-to-bank",
        headers=teacher_auth["headers"],
    )
    assert res_ext2.status_code == 200
    data2 = res_ext2.json()
    assert data2["extracted_count"] == 0
    assert data2["skipped_duplicate_count"] == 1
