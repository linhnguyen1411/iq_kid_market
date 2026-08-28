import pytest
from datetime import datetime, timedelta
from app import models


def test_submit_attempt_and_level_up(client, student_auth, db_session):
    res = client.post("/api/attempts/submit", json={
        "userId": student_auth["user_id"],
        "gameId": "g1",
        "levelNum": 1,
        "score": 100,
        "completed": True,
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["xpAwarded"] >= 100
    assert data["coinReward"] == 20

    # Kiểm tra ví đã được thưởng xu
    wallet = db_session.get(models.Wallet, student_auth["user_id"])
    assert wallet.balance == 90020  # 90k + 20


def test_daily_streak_progression(client, student_auth, db_session):
    uid = student_auth["user_id"]
    # Lần 1: Streak = 1
    res1 = client.post("/api/attempts/submit", json={
        "userId": uid,
        "gameId": "g1",
        "levelNum": 1,
        "score": 100,
        "completed": True,
    })
    assert res1.json()["newStreak"] == 1

    # Lần 2 (cùng ngày): Streak giữ nguyên 1
    res2 = client.post("/api/attempts/submit", json={
        "userId": uid,
        "gameId": "g1",
        "levelNum": 2,
        "score": 100,
        "completed": True,
    })
    assert res2.json()["newStreak"] == 1

    # Giả lập ngày hôm sau
    u = db_session.get(models.User, uid)
    u.last_active_date = datetime.utcnow() - timedelta(days=1)
    db_session.commit()

    res3 = client.post("/api/attempts/submit", json={
        "userId": uid,
        "gameId": "g1",
        "levelNum": 3,
        "score": 100,
        "completed": True,
    })
    assert res3.json()["newStreak"] == 2


def test_leaderboard_filters(client):
    # Toàn trường
    res_all = client.get("/api/scores/leaderboard")
    assert res_all.status_code == 200
    assert len(res_all.json()) > 0

    # Theo game g1
    res_g1 = client.get("/api/scores/leaderboard?gameId=g1")
    assert res_g1.status_code == 200
    assert len(res_g1.json()) > 0


def test_user_achievements(client, student_auth):
    # Nộp điểm hoàn thành màn 1 -> Mở khóa first_game
    client.post("/api/attempts/submit", json={
        "userId": student_auth["user_id"],
        "gameId": "g1",
        "levelNum": 1,
        "score": 100,
        "completed": True,
    })

    res = client.get(f"/api/achievements/user/{student_auth['user_id']}")
    assert res.status_code == 200
    ach_list = res.json()
    first_ach = next((a for a in ach_list if a["id"] == "a1" or a["badge_code"] == "first_game"), None)
    assert first_ach is not None
    assert first_ach["unlocked"] is True


def test_admin_preview_no_scoring(client, admin_auth, db_session):
    """Admin chơi thử: mở màn trả phí, không ghi attempt / XP / xu."""
    uid = admin_auth["user_id"]
    user = db_session.get(models.User, uid)
    xp_before = user.xp or 0
    wallet = db_session.get(models.Wallet, uid)
    balance_before = wallet.balance if wallet else 0
    attempts_before = db_session.query(models.Attempt).filter_by(user_id=uid).count()

    res = client.post("/api/attempts/submit", json={
        "userId": uid,
        "gameId": "g1",
        "levelNum": 15,  # màn trả phí
        "score": 100,
        "completed": True,
    }, headers=admin_auth["headers"])
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["xpAwarded"] == 0
    assert data["coinReward"] == 0

    db_session.refresh(user)
    assert (user.xp or 0) == xp_before
    if wallet:
        db_session.refresh(wallet)
        assert wallet.balance == balance_before
    assert db_session.query(models.Attempt).filter_by(user_id=uid).count() == attempts_before
