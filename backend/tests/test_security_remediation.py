import io
import zipfile
import pytest
from app import models
from app.sb3_serializer import import_sb3_bytes

def test_score_spoofing_prevented_by_server_evaluator(client, student_auth):
    uid = student_auth["user_id"]
    headers = student_auth["headers"]

    # Client gửi gian lận điểm 100, completed=True nhưng không gửi đáp án đúng
    res = client.post("/api/attempts/submit", json={
        "userId": uid,
        "gameId": "g1",
        "levelNum": 1,
        "score": 100,
        "completed": True,
        "xpAwarded": 1000,
        "submittedAnswer": {"pairs": [{"left": "Wrong", "right": "Pair"}]},
    }, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["isCorrect"] is False
    assert data["score"] == 0
    assert data["xpAwarded"] == 0
    assert data["coinReward"] == 0

def test_unauthenticated_attempt_rejected(client, student_auth):
    res = client.post("/api/attempts/submit", json={
        "userId": student_auth["user_id"],
        "gameId": "g1",
        "levelNum": 1,
        "submittedAnswer": {"pairs": []},
    })
    assert res.status_code == 401

def test_attempt_history_idor_prevention(client, student_auth, teacher_auth):
    # Teacher cố xem lịch sử của student
    res = client.get(
        f"/api/attempts/history?userId={student_auth['user_id']}",
        headers=teacher_auth["headers"],
    )
    assert res.status_code == 403

def test_wallet_topup_authorization_and_idor(client, student_auth, teacher_auth):
    # Student hoặc teacher không phải admin không thể nạp ví trực tiếp
    res = client.post("/api/wallet/topup", json={
        "userId": student_auth["user_id"],
        "amount": 100000,
    }, headers=student_auth["headers"])
    assert res.status_code == 403

    # Teacher cố xác nhận nạp tiền cho Student
    res_idor = client.post("/api/wallet/confirm-topup", json={
        "userId": student_auth["user_id"],
        "tx_id": "tx_fake_123",
        "amount": 50000,
    }, headers=teacher_auth["headers"])
    assert res_idor.status_code == 403

def test_learner_game_detail_answer_sanitization(client, student_auth, teacher_auth):
    # 1. Học sinh truy cập game -> không thấy answer
    res_student = client.get("/api/games/g1", headers=student_auth["headers"])
    assert res_student.status_code == 200
    game_data = res_student.json()
    for lv in game_data.get("levels") or []:
        for q in lv.get("questions") or []:
            q_data = q.get("data") or {}
            assert "answer" not in q_data
            assert "solution" not in q_data

    # 2. Khách vãng lai (không đăng nhập) -> không thấy answer
    res_public = client.get("/api/games/g1")
    assert res_public.status_code == 200
    pub_data = res_public.json()
    for lv in pub_data.get("levels") or []:
        for q in lv.get("questions") or []:
            q_data = q.get("data") or {}
            assert "answer" not in q_data
            assert "solution" not in q_data

def test_teacher_cannot_edit_system_seed_game(client, teacher_auth, admin_auth, db_session):
    # 1. Không thể sửa game hệ thống (is_seed = True)
    res = client.put("/api/admin/games/g1", json={
        "title": "Hacked System Game",
        "category": "iq",
    }, headers=teacher_auth["headers"])
    assert res.status_code in (400, 403)
    assert "Không thể sửa trò chơi gốc" in res.json().get("detail", "")

    # 2. Không thể sửa game của giáo viên khác (IDOR)
    other_game = models.Game(
        id="game_of_another_teacher",
        title="Other Teacher Game",
        template_code="math",
        creator_id="different_teacher_id",
        is_seed=False,
    )
    db_session.add(other_game)
    db_session.commit()

    res_idor = client.put("/api/admin/games/game_of_another_teacher", json={
        "title": "Tampered Title",
    }, headers=teacher_auth["headers"])
    assert res_idor.status_code == 403

    # 3. Giáo viên KHÔNG THỂ xóa game seed gốc
    res_del_teacher = client.delete("/api/admin/games/g1", headers=teacher_auth["headers"])
    assert res_del_teacher.status_code == 400

    # 4. Admin CÓ THỂ xóa game seed gốc
    res_del_admin = client.delete("/api/admin/games/g1", headers=admin_auth["headers"])
    assert res_del_admin.status_code == 200
    assert db_session.get(models.Game, "g1") is None

def test_sb3_zip_slip_and_zip_bomb_protection():
    # 1. Zip Slip (Path traversal)
    buf_slip = io.BytesIO()
    with zipfile.ZipFile(buf_slip, "w") as zf:
        zf.writestr("../../evil.txt", "malicious content")
        zf.writestr("project.json", "{}")
    buf_slip.seek(0)

    with pytest.raises(Exception) as exc_info:
        import_sb3_bytes(buf_slip.read())
    assert "chứa đường dẫn không an toàn" in str(exc_info.value) or "không an toàn" in str(exc_info.value)

    # 2. Zip Bomb (Kích thước tệp giải nén vượt ngưỡng)
    buf_bomb = io.BytesIO()
    with zipfile.ZipFile(buf_bomb, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("project.json", "0" * (51 * 1024 * 1024))
    buf_bomb.seek(0)

    with pytest.raises(Exception) as exc_bomb:
        import_sb3_bytes(buf_bomb.read())
    assert "quá lớn" in str(exc_bomb.value) or "vượt quá ngưỡng" in str(exc_bomb.value)