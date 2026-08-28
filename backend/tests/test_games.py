import pytest
from app import models


def test_list_games_pagination_and_filters(client):
    # Lọc khối lớp 2 kèm phân trang
    res = client.get("/api/games?grade=2&page=1&pageSize=2&paginated=true")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) <= 2

    # Lọc theo thể loại
    res_iq = client.get("/api/games?category=iq")
    assert res_iq.status_code == 200


def test_get_game_detail(client):
    res = client.get("/api/games/g1")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "g1"
    assert "levels" in data

    # Game không tồn tại -> 404
    res_404 = client.get("/api/games/non_existent_id")
    assert res_404.status_code == 404


def test_add_and_update_level_validation(client, teacher_auth):
    # Thêm câu hỏi quiz thiếu answer vào game g1 -> Chặn 400
    res_invalid = client.post("/api/admin/levels/add", json={
        "gameId": "g1",
        "title": "Màn 1 lỗi",
        "question": {
            "id": "q_err_1",
            "question_type": "quiz",
            "prompt": "1 + 1 = ?",
            "data": {
                "options": ["A. 1", "B. 2"],
                # Thiếu answer!
            },
        },
    }, headers=teacher_auth["headers"])
    assert res_invalid.status_code == 400

    # Thêm câu hỏi quiz hợp lệ -> 200
    res_valid = client.post("/api/admin/levels/add", json={
        "gameId": "g1",
        "title": "Màn 1 chuẩn",
        "question": {
            "id": "q_ok_1",
            "question_type": "quiz",
            "prompt": "1 + 1 = ?",
            "data": {
                "options": ["A. 1", "B. 2", "C. 3"],
                "answer": "B",
            },
        },
    }, headers=teacher_auth["headers"])
    assert res_valid.status_code == 200


def test_review_queue_approve_reject(client, teacher_auth, admin_auth, db_session):
    # Tạo game chờ duyệt
    game = models.Game(
        id="pending_game_pytest",
        title="Game Chờ Duyệt 📝",
        template_code="math",
        creator_id=teacher_auth["user_id"],
        review_status="pending_review",
        is_published=False,
    )
    db_session.add(game)
    db_session.commit()

    # Giáo viên không được duyệt
    res_teacher = client.post("/api/admin/review/decide", json={
        "gameId": "pending_game_pytest",
        "action": "approve",
    }, headers=teacher_auth["headers"])
    assert res_teacher.status_code == 403

    # Admin duyệt game
    res_approve = client.post("/api/admin/review/decide", json={
        "gameId": "pending_game_pytest",
        "action": "approve",
    }, headers=admin_auth["headers"])
    assert res_approve.status_code == 200

    db_session.refresh(game)
    assert game.review_status == "approved"
    assert game.is_published is True


def test_delete_game_safe(client, admin_auth):
    # Cấm xóa game gốc (seed)
    res_del_seed = client.delete("/api/admin/games/g1", headers=admin_auth["headers"])
    assert res_del_seed.status_code == 400
    assert "không thể xóa" in res_del_seed.json()["detail"].lower()
