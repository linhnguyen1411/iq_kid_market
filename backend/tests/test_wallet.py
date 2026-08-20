import pytest
from app import models


def test_insufficient_balance_error(client, student_auth, teacher_auth, db_session):
    # Giáo viên tạo game 150.000 xu (vượt số dư 90k của học sinh)
    game = models.Game(
        id="expensive_game_1",
        title="Toán Học Siêu Cấp 💎",
        price=150000,
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
    # Tạo game 30.000 xu
    game = models.Game(
        id="share_game_1",
        title="Khám Phá Vũ Trụ 🚀",
        price=30000,
        template_code="quiz",
        creator_id=teacher_auth["user_id"],
        creator_name="Cô Lan Pytest",
        is_published=True,
    )
    db_session.add(game)
    db_session.commit()

    # Học sinh ví 90.000, Giáo viên ví 500.000
    res = client.post("/api/games/purchase", json={
        "userId": student_auth["user_id"],
        "gameId": "share_game_1",
    }, headers=student_auth["headers"])

    assert res.status_code == 200
    assert res.json()["success"] is True

    # Kiểm tra số dư ví
    w_student = db_session.get(models.Wallet, student_auth["user_id"])
    w_teacher = db_session.get(models.Wallet, teacher_auth["user_id"])

    assert w_student.balance == 60000  # 90k - 30k
    assert w_teacher.balance == 524000  # 500k + (30k * 80% = 24k)


def test_prevent_duplicate_purchase(client, student_auth, db_session):
    # Game g2 trong seed giá 25k
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


def test_create_and_confirm_topup(client, student_auth, db_session):
    # Sinh mã nạp tiền VietQR
    res_intent = client.post("/api/wallet/create-topup-intent", json={
        "userId": student_auth["user_id"],
        "amount": 50000,
    }, headers=student_auth["headers"])
    assert res_intent.status_code == 200
    tx_id = res_intent.json()["tx_id"]
    assert "vietqr.io" in res_intent.json()["qr_url"]

    # Xác nhận nạp tiền
    res_confirm = client.post("/api/wallet/confirm-topup", json={
        "userId": student_auth["user_id"],
        "amount": 50000,
        "tx_id": tx_id,
    }, headers=student_auth["headers"])
    assert res_confirm.status_code == 200
    assert res_confirm.json()["balance"] == 140000  # 90k + 50k

    # Xác nhận trùng lặp -> Chặn 400
    res_duplicate = client.post("/api/wallet/confirm-topup", json={
        "userId": student_auth["user_id"],
        "amount": 50000,
        "tx_id": tx_id,
    }, headers=student_auth["headers"])
    assert res_duplicate.status_code == 400


def test_creator_earnings_dashboard(client, teacher_auth):
    res = client.get("/api/wallet/creator-earnings", headers=teacher_auth["headers"])
    assert res.status_code == 200
    data = res.json()
    assert "totalRevenue" in data
    assert "availableBalance" in data
    assert "totalSalesCount" in data

