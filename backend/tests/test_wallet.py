import pytest
from app import models


def test_insufficient_balance_error(client, student_auth, teacher_auth, db_session):
    # Học sinh mới có 0 Token, giáo viên tạo game 50 Token -> Không đủ số dư
    game = models.Game(
        id="expensive_game_1",
        title="Toán Học Siêu Cấp 💎",
        price=50,
        template_code="math",
        creator_id=teacher_auth["user_id"],
        creator_name="Cô Lan Pytest",
        is_published=True,
    )
    db_session.add(game)
    db_session.commit()

    res = client.post("/api/games/purchase", json={
        "userId": student_auth["user_id"],
        "gameId": "expensive_game_1",
    }, headers=student_auth["headers"])

    assert res.status_code == 400
    assert "không đủ" in res.json()["detail"].lower()


def test_purchase_game_and_revenue_sharing(client, student_auth, teacher_auth, db_session):
    # Cấp 90 Token cho học sinh để test mua game
    w_student = db_session.get(models.Wallet, student_auth["user_id"])
    w_student.balance = 90
    db_session.commit()

    # Tạo game 30 Token
    game = models.Game(
        id="share_game_1",
        title="Khám Phá Vũ Trụ 🚀",
        price=30,
        template_code="quiz",
        creator_id=teacher_auth["user_id"],
        creator_name="Cô Lan Pytest",
        is_published=True,
    )
    db_session.add(game)
    db_session.commit()

    res = client.post("/api/games/purchase", json={
        "userId": student_auth["user_id"],
        "gameId": "share_game_1",
    }, headers=student_auth["headers"])

    assert res.status_code == 200
    assert res.json()["success"] is True

    # Kiểm tra số dư ví
    db_session.refresh(w_student)
    w_teacher = db_session.get(models.Wallet, teacher_auth["user_id"])

    assert w_student.balance == 60  # 90 - 30
    assert w_teacher.balance == 24  # 0 + (30 * 80% = 24)


def test_prevent_duplicate_purchase(client, student_auth, db_session):
    # Cấp 50 Token cho học sinh
    w_student = db_session.get(models.Wallet, student_auth["user_id"])
    w_student.balance = 50
    db_session.commit()

    # Game g2 trong seed giá 15 Token
    res1 = client.post("/api/games/purchase", json={
        "userId": student_auth["user_id"],
        "gameId": "g2",
    }, headers=student_auth["headers"])
    assert res1.status_code == 200

    # Mua lại lần 2 -> Chặn 400
    res2 = client.post("/api/games/purchase", json={
        "userId": student_auth["user_id"],
        "gameId": "g2",
    }, headers=student_auth["headers"])
    assert res2.status_code == 400


def test_create_and_confirm_topup(client, student_auth, admin_auth, db_session):
    # Sinh mã nạp tiền VietQR 50.000 VND
    res_intent = client.post("/api/wallet/create-topup-intent", json={
        "userId": student_auth["user_id"],
        "amount": 50000,
    }, headers=student_auth["headers"])
    assert res_intent.status_code == 200
    tx_id = res_intent.json()["tx_id"]
    assert "vietqr.io" in res_intent.json()["qr_url"]

    # 1. Học sinh / User tự xác nhận nạp tiền -> Bị chặn 403 Forbidden (P0 Fix)
    res_student_confirm = client.post("/api/wallet/confirm-topup", json={
        "userId": student_auth["user_id"],
        "amount": 50000,
        "tx_id": tx_id,
    }, headers=student_auth["headers"])
    assert res_student_confirm.status_code == 403

    # 2. Quản trị viên (Admin) xác nhận nạp tiền hợp lệ -> 200 OK
    res_admin_confirm = client.post("/api/wallet/confirm-topup", json={
        "userId": student_auth["user_id"],
        "amount": 50000,
        "tx_id": tx_id,
    }, headers=admin_auth["headers"])
    assert res_admin_confirm.status_code == 200
    assert res_admin_confirm.json()["balance"] == 50  # 0 + 50 Token

    # 3. Xác nhận trùng lặp -> Chặn 400
    res_duplicate = client.post("/api/wallet/confirm-topup", json={
        "userId": student_auth["user_id"],
        "amount": 50000,
        "tx_id": tx_id,
    }, headers=admin_auth["headers"])
    assert res_duplicate.status_code == 400


def test_creator_earnings_dashboard(client, teacher_auth):
    res = client.get("/api/wallet/creator-earnings", headers=teacher_auth["headers"])
    assert res.status_code == 200
    data = res.json()
    assert "totalRevenue" in data
    assert "availableBalance" in data
    assert "totalSalesCount" in data

