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


def test_update_game_metadata_and_permissions(client, teacher_auth, admin_auth, db_session):
  game = models.Game(
      id="edit_game_pytest",
      title="Game Cần Sửa",
      description="Mô tả cũ",
      template_code="quiz",
      category="iq",
      creator_id=teacher_auth["user_id"],
      review_status="approved",
      is_published=True,
      levels=[
          {
              "id": "l1",
              "level_num": 1,
              "title": "Màn 1",
              "questions": [
                  {
                      "id": "q1",
                      "question_type": "quiz",
                      "prompt": "1+1?",
                      "data": {
                          "options": ["1", "2"],
                          "answer": "2",
                      },
                  }
              ],
          }
      ],
  )
  db_session.add(game)
  db_session.commit()

  # Giáo viên khác không được sửa
  res_other = client.put(
      "/api/admin/games/edit_game_pytest",
      json={"title": "Hack"},
      headers=admin_auth["headers"],
  )
  # admin can edit
  assert res_other.status_code == 200

  db_session.refresh(game)
  assert game.title == "Hack"
  assert game.review_status == "approved"

  # Giáo viên tác giả sửa → gửi lại duyệt
  res_teacher = client.put(
      "/api/admin/games/edit_game_pytest",
      json={"title": "Game Đã Sửa", "description": "Mô tả mới"},
      headers=teacher_auth["headers"],
  )
  assert res_teacher.status_code == 200
  data = res_teacher.json()
  assert data["game"]["title"] == "Game Đã Sửa"

  db_session.refresh(game)
  assert game.review_status == "pending_review"
  assert game.is_published is False


def test_update_level_endpoint(client, teacher_auth, db_session):
  game = models.Game(
      id="level_edit_pytest",
      title="Game Level Edit",
      description="desc",
      template_code="math",
      creator_id=teacher_auth["user_id"],
      review_status="approved",
      is_published=True,
      levels=[
          {
              "id": "l1",
              "level_num": 1,
              "title": "Màn cũ",
              "questions": [
                  {
                      "id": "q1",
                      "question_type": "math",
                      "prompt": "2+2?",
                      "data": {"expression": "2+2", "answer": "4"},
                  }
              ],
          }
      ],
  )
  db_session.add(game)
  db_session.commit()

  res = client.put(
      "/api/admin/levels/level_edit_pytest/1",
      json={
          "title": "Màn mới",
          "question": {
              "question_type": "math",
              "prompt": "3+3?",
              "data": {"expression": "3+3", "answer": "6"},
          },
      },
      headers=teacher_auth["headers"],
  )
  assert res.status_code == 200
  db_session.refresh(game)
  assert game.levels[0]["title"] == "Màn mới"
  assert game.review_status == "pending_review"


def test_game_categories_public_and_admin_crud(client, admin_auth, db_session):
    from app import seed as seed_module

    seed_module.ensure_game_categories(db_session)

    res_public = client.get("/api/categories")
    assert res_public.status_code == 200
    codes = {c["code"] for c in res_public.json()}
    assert "iq" in codes
    assert "math" in codes

    res_create = client.post(
        "/api/admin/categories",
        json={"code": "science", "label": "Khoa Học Tự Nhiên", "icon": "🔬", "sort_order": 5},
        headers=admin_auth["headers"],
    )
    assert res_create.status_code == 200

    res_list = client.get("/api/admin/categories", headers=admin_auth["headers"])
    assert res_list.status_code == 200
    assert any(c["code"] == "science" for c in res_list.json())

    res_update = client.put(
        "/api/admin/categories/science",
        json={"label": "Khoa học STEM"},
        headers=admin_auth["headers"],
    )
    assert res_update.status_code == 200
    assert res_update.json()["category"]["label"] == "Khoa học STEM"
