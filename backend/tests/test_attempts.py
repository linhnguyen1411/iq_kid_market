import pytest
from datetime import datetime, timedelta
from app import models


def _mini_game(db_session, game_id="g_mini_xp"):
    """Game 2 màn — đủ để test thưởng clear-all một lần."""
    existing = db_session.get(models.Game, game_id)
    if existing:
        return existing
    game = models.Game(
        id=game_id,
        title="Mini XP Test",
        description="test",
        thumbnail="🧠",
        price=0,
        grade_from=1,
        grade_to=5,
        template_code="quiz",
        category="iq",
        review_status="approved",
        is_published=True,
        levels=[
            {
                "level_num": 1,
                "title": "Màn 1",
                "xp_reward": 100,
                "coin_reward": 10,
                "questions": [{"question_type": "quiz", "prompt": "1+1?", "data": {"answer": "2"}}],
            },
            {
                "level_num": 2,
                "title": "Màn 2",
                "xp_reward": 150,
                "coin_reward": 20,
                "questions": [{"question_type": "quiz", "prompt": "2+2?", "data": {"answer": "4"}}],
            },
        ],
    )
    db_session.add(game)
    db_session.commit()
    return game


def test_submit_attempt_awards_only_on_full_game_clear(client, student_auth, db_session):
    """XP/xu chỉ cộng 1 lần khi hoàn thành hết màn; màn lẻ và chơi lại = 0."""
    _mini_game(db_session)
    uid = student_auth["user_id"]
    wallet = db_session.get(models.Wallet, uid)
    balance_before = wallet.balance
    user = db_session.get(models.User, uid)

    # Màn 1 — chưa clear hết game → không thưởng game
    res1 = client.post("/api/attempts/submit", json={
        "userId": uid,
        "gameId": "g_mini_xp",
        "levelNum": 1,
        "score": 100,
        "completed": True,
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    assert data1["xpAwarded"] == 0
    assert data1["coinReward"] == 0
    assert data1.get("gameCleared") is False
    assert data1.get("alreadyRewarded") is False

    db_session.refresh(user)
    db_session.refresh(wallet)
    xp_after_partial = user.xp or 0  # có thể gồm bonus achievement, không gồm XP game
    assert wallet.balance == balance_before

    # Màn 2 — clear lần đầu → thưởng tổng XP/xu của game
    res2 = client.post("/api/attempts/submit", json={
        "userId": uid,
        "gameId": "g_mini_xp",
        "levelNum": 2,
        "score": 100,
        "completed": True,
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["xpAwarded"] == 250  # 100 + 150
    assert data2["coinReward"] == 30  # 10 + 20
    assert data2.get("gameCleared") is True
    assert data2.get("alreadyRewarded") is False

    db_session.refresh(user)
    db_session.refresh(wallet)
    assert (user.xp or 0) == xp_after_partial + 250
    assert wallet.balance == balance_before + 30

    # Chơi lại màn 1 — không thưởng thêm
    res3 = client.post("/api/attempts/submit", json={
        "userId": uid,
        "gameId": "g_mini_xp",
        "levelNum": 1,
        "score": 100,
        "completed": True,
    })
    assert res3.status_code == 200
    assert res3.json()["xpAwarded"] == 0
    assert res3.json()["coinReward"] == 0
    assert res3.json().get("gameCleared") is False
    assert res3.json().get("alreadyRewarded") is True

    db_session.refresh(user)
    db_session.refresh(wallet)
    assert (user.xp or 0) == xp_after_partial + 250
    assert wallet.balance == balance_before + 30


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


def test_user_achievements_not_unlocked_on_single_level(client, student_auth):
    """Chơi 1 màn không được nhận badge seed (math_pro cần clear cả g2)."""
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
    math_pro = next((a for a in ach_list if a["badge_code"] == "math_pro" or a["id"] == "a1"), None)
    assert math_pro is not None
    assert math_pro["unlocked"] is False


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
