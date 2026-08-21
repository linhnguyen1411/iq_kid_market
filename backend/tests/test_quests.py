from app import models


def test_daily_quests_are_created_and_progressed(client, student_auth, db_session):
    uid = student_auth["user_id"]
    response = client.get(f"/api/quests/daily?userId={uid}")
    assert response.status_code == 200
    quests = response.json()
    assert len(quests) == 3
    assert {quest["type"] for quest in quests} == {"play_count", "score_reach", "scratch_complete"}

    for level in (1, 2):
        result = client.post("/api/attempts/submit", json={"userId": uid, "gameId": "g1", "levelNum": level, "score": 100, "completed": True})
        assert result.status_code == 200

    quests = client.get(f"/api/quests/daily?userId={uid}").json()
    play_quest = next(quest for quest in quests if quest["type"] == "play_count")
    score_quest = next(quest for quest in quests if quest["type"] == "score_reach")
    assert play_quest["status"] == "COMPLETED"
    assert score_quest["status"] == "COMPLETED"

    claim = client.post(f"/api/quests/{play_quest['id']}/claim", json={"userId": uid})
    assert claim.status_code == 200
    assert claim.json()["coinAwarded"] > 0
    duplicate = client.post(f"/api/quests/{play_quest['id']}/claim", json={"userId": uid})
    assert duplicate.status_code == 409


def test_lucky_spin_requires_play_and_is_idempotent(client, student_auth):
    uid = student_auth["user_id"]
    blocked = client.post("/api/gamification/lucky-spin", json={"userId": uid})
    assert blocked.status_code == 400
    client.post("/api/attempts/submit", json={"userId": uid, "gameId": "g1", "levelNum": 1, "score": 80, "completed": True})
    spin = client.post("/api/gamification/lucky-spin", json={"userId": uid})
    assert spin.status_code == 200
    assert spin.json()["spun"] is True
    duplicate = client.post("/api/gamification/lucky-spin", json={"userId": uid})
    assert duplicate.status_code == 409


def test_login_reward_is_claimed_once(client, student_auth, db_session):
    uid = student_auth["user_id"]
    first = client.post("/api/gamification/login-reward", json={"userId": uid})
    assert first.status_code == 200
    assert first.json()["claimed"] is True
    second = client.post("/api/gamification/login-reward", json={"userId": uid})
    assert second.status_code == 200
    assert second.json()["claimed"] is False
    assert db_session.query(models.LoginRewardClaim).filter_by(user_id=uid).count() == 1