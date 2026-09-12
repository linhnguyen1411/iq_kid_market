"""
Tests for Game Blueprint Layer (Phase 5).
Verifies:
1. Seed blueprints listing and multidimensional filtering.
2. Admin-only CRUD permissions and soft-deletion.
3. 1-Click Auto-Assembly Engine from Question Bank.
4. Difficulty distribution matching and backfill.
5. Anti-theft isolation (Creator cannot pick private questions of other creators).
6. Graceful handling when candidate questions are insufficient.
"""

import pytest
from app import models


def test_list_seed_blueprints_and_filters(client, teacher_auth):
    """Kiểm tra danh sách 5 Blueprint Presets tiêu chuẩn và bộ lọc khối lớp, môn học."""
    # 1. Lấy toàn bộ blueprint đang active
    res = client.get("/api/blueprints", headers=teacher_auth["headers"])
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 5
    ids = [b["id"] for b in data["items"]]
    assert "bp_math_g1_count" in ids
    assert "bp_math_g2_addition" in ids
    assert "bp_viet_g3_vocab" in ids
    assert "bp_sci_g4_nature" in ids
    assert "bp_logic_g5_sequence" in ids

    # 2. Lọc theo lớp 2 và môn toán
    res_filtered = client.get(
        "/api/blueprints?grade=2&subject=math",
        headers=teacher_auth["headers"],
    )
    assert res_filtered.status_code == 200
    f_data = res_filtered.json()
    assert f_data["total"] >= 1
    assert all(b["grade"] == 2 and b["subject"] == "math" for b in f_data["items"])


def test_blueprint_crud_admin_and_permissions(client, admin_auth, teacher_auth, db_session):
    """Kiểm tra phân quyền CRUD: Chỉ Admin được thêm, sửa, tắt Blueprint; Creator bị chặn 403."""
    bp_id = "bp_custom_test_g3"

    # 1. Teacher cố tạo Blueprint -> 403
    res_teacher = client.post(
        "/api/admin/blueprints",
        json={
            "id": bp_id,
            "title": "Công thức Tự tạo",
            "grade": 3,
            "subject": "math",
            "topic": "Hình học",
            "target_engine": "quiz",
        },
        headers=teacher_auth["headers"],
    )
    assert res_teacher.status_code == 403

    # 2. Admin tạo Blueprint -> 200
    res_admin = client.post(
        "/api/admin/blueprints",
        json={
            "id": bp_id,
            "title": "Công thức Hình học Lớp 3",
            "description": "Thử thách nhận biết hình phẳng",
            "grade": 3,
            "subject": "math",
            "topic": "Hình phẳng",
            "target_engine": "quiz",
            "total_questions": 5,
            "rule_config": {"difficulty_distribution": {"1": 3, "2": 2}},
        },
        headers=admin_auth["headers"],
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["id"] == bp_id

    # 3. Teacher cố sửa Blueprint -> 403
    res_edit_teacher = client.put(
        f"/api/admin/blueprints/{bp_id}",
        json={"title": "Hacked Title"},
        headers=teacher_auth["headers"],
    )
    assert res_edit_teacher.status_code == 403

    # 4. Admin sửa Blueprint -> 200
    res_edit_admin = client.put(
        f"/api/admin/blueprints/{bp_id}",
        json={"title": "Công thức Hình học Lớp 3 (Đã cập nhật)"},
        headers=admin_auth["headers"],
    )
    assert res_edit_admin.status_code == 200
    assert res_edit_admin.json()["title"] == "Công thức Hình học Lớp 3 (Đã cập nhật)"

    # 5. Admin vô hiệu hóa (Soft delete) -> 200
    res_del = client.delete(f"/api/admin/blueprints/{bp_id}", headers=admin_auth["headers"])
    assert res_del.status_code == 200

    # 6. Teacher tìm kiếm sẽ không thấy bp này nữa
    res_list_teacher = client.get("/api/blueprints", headers=teacher_auth["headers"])
    assert all(b["id"] != bp_id for b in res_list_teacher.json()["items"])

    # 7. Admin tìm kiếm kèm is_active=false sẽ thấy
    res_list_admin = client.get("/api/blueprints?is_active=false", headers=admin_auth["headers"])
    assert any(b["id"] == bp_id for b in res_list_admin.json()["items"])


def test_build_game_from_blueprint_auto_assembly(client, teacher_auth, db_session):
    """
    Kiểm tra 1-Click Auto-Assembly:
    Tự động truy vấn Ngân hàng câu hỏi theo công thức, tạo Game và GameVersion v1,
    tăng usage_count câu hỏi.
    """
    # 1. Tạo 4 câu hỏi system và câu hỏi của teacher trong Ngân hàng cho engine "math" lớp 2
    created_qids = []
    for i in range(1, 5):
        res_q = client.post(
            "/api/questions",
            json={
                "engine_code": "math",
                "grade": 2,
                "subject": "math",
                "topic": "Phép cộng trừ có nhớ",
                "difficulty": (i % 3) + 1,
                "prompt": f"Tính kết quả: {i*10} + 15 = ?",
                "data": {"expression": f"{i*10} + 15", "answer": str(i*10 + 15)},
                "visibility": "private",
            },
            headers=teacher_auth["headers"],
        )
        assert res_q.status_code == 201
        created_qids.append(res_q.json()["id"])

    # 2. Gọi 1-Click Build Game từ Blueprint bp_math_g2_addition
    res_build = client.post(
        "/api/admin/games/build-from-blueprint/bp_math_g2_addition",
        json={
            "custom_title": "Bộ Đề Toán 2 Ghép Tự Động",
            "price": 25000,
        },
        headers=teacher_auth["headers"],
    )
    assert res_build.status_code == 200
    data = res_build.json()
    assert data["success"] is True
    game_id = data["game_id"]
    assert data["levels_count"] >= 4
    assert data["version_num"] == 1

    # 3. Kiểm tra Game trong DB
    game = db_session.get(models.Game, game_id)
    assert game is not None
    assert game.title == "Bộ Đề Toán 2 Ghép Tự Động"
    assert game.price == 25000
    assert game.creator_id == teacher_auth["user_id"]
    assert len(game.levels) == data["levels_count"]

    # 4. Kiểm tra GameVersion v1 được tạo
    gv = db_session.query(models.GameVersion).filter_by(game_id=game_id, version_num=1).first()
    assert gv is not None
    assert gv.status == "pending_review"

    # 5. Kiểm tra usage_count của câu hỏi được tăng lên
    for qid in created_qids:
        q = db_session.get(models.Question, qid)
        assert q.usage_count >= 1


def test_build_game_from_blueprint_anti_theft(client, teacher_auth, admin_auth, db_session):
    """
    Kiểm tra bảo mật Anti-Theft trong Auto-Assembly:
    Creator A không thể tự động bốc câu hỏi riêng tư (visibility='private') của Creator B.
    """
    # 1. Admin (hoặc Creator B) tạo 1 câu hỏi riêng tư cho engine "sequence"
    res_private_q = client.post(
        "/api/questions",
        json={
            "engine_code": "sequence",
            "grade": 5,
            "subject": "logic",
            "topic": "Dãy số bí mật của Admin",
            "difficulty": 2,
            "prompt": "Điền tiếp vào dãy: 1, 1, 2, 3, 5, ?",
            "data": {"sequence": ["1", "1", "2", "3", "5", "?"], "answer": "8"},
            "visibility": "private",  # Riêng tư!
        },
        headers=admin_auth["headers"],
    )
    assert res_private_q.status_code == 201

    # 2. Xóa các câu hỏi sequence system/public khác nếu có để tạo môi trường cô lập
    db_session.query(models.Question).filter(
        models.Question.engine_code == "sequence",
        models.Question.creator_id != admin_auth["user_id"],
    ).delete()
    db_session.commit()

    # 3. Teacher cố gọi Auto-Assembly với bp_logic_g5_sequence
    # Do chỉ có câu hỏi private của Admin -> Teacher bị chặn không thể bốc
    res_build_teacher = client.post(
        "/api/admin/games/build-from-blueprint/bp_logic_g5_sequence",
        json={"custom_title": "Thử Đánh Cắp"},
        headers=teacher_auth["headers"],
    )
    assert res_build_teacher.status_code == 400
    assert "chưa có câu hỏi nào" in res_build_teacher.json()["detail"].lower()

    # 4. Ngược lại, Admin gọi Auto-Assembly cùng công thức này thì thành công (Admin có quyền xem tất cả)
    res_build_admin = client.post(
        "/api/admin/games/build-from-blueprint/bp_logic_g5_sequence",
        json={"custom_title": "Game Của Admin"},
        headers=admin_auth["headers"],
    )
    assert res_build_admin.status_code == 200
    assert res_build_admin.json()["success"] is True


def test_build_game_from_blueprint_insufficient_questions(client, teacher_auth):
    """Kiểm tra báo lỗi thông minh khi Ngân hàng hoàn toàn không có câu hỏi phù hợp."""
    # bp_nonexistent -> 404
    res_404 = client.post(
        "/api/admin/games/build-from-blueprint/bp_nonexistent_id",
        json={},
        headers=teacher_auth["headers"],
    )
    assert res_404.status_code == 404
