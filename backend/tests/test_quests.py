from datetime import datetime, timedelta, timezone
from app import models
from app.daily_quests import VIETNAM_TZ, update_daily_streak, vietnam_date


def test_daily_quests_are_created_and_progressed(client, student_auth, db_session):
    uid = student_auth["user_id"]
    response = client.get(f"/api/quests/daily?userId={uid}")
    assert response.status_code == 200
    quests = response.json()
    assert len(quests) == 3
    assert {quest["type"] for quest in quests} == {"play_count", "score_reach", "scratch_complete"}

    # Hoàn thành 1 màn chơi -> play_count = 1, chưa COMPLETED
    res1 = client.post("/api/attempts/submit", json={"userId": uid, "gameId": "g1", "levelNum": 1, "score": 90, "completed": True})
    assert res1.status_code == 200

    quests = client.get(f"/api/quests/daily?userId={uid}").json()
    play_quest = next(quest for quest in quests if quest["type"] == "play_count")
    assert play_quest["current_progress"] == 1
    assert play_quest["status"] == "IN_PROGRESS"

    # Thử claim khi chưa hoàn thành -> 400 Bad Request
    claim_incomplete = client.post(f"/api/quests/{play_quest['id']}/claim", json={"userId": uid})
    assert claim_incomplete.status_code == 400

    # Hoàn thành màn 2 với 100 điểm -> play_count đạt 2 và score_reach đạt 1 -> cả 2 COMPLETED
    res2 = client.post("/api/attempts/submit", json={"userId": uid, "gameId": "g1", "levelNum": 2, "score": 100, "completed": True})
    assert res2.status_code == 200

    quests = client.get(f"/api/quests/daily?userId={uid}").json()
    play_quest = next(quest for quest in quests if quest["type"] == "play_count")
    score_quest = next(quest for quest in quests if quest["type"] == "score_reach")
    assert play_quest["status"] == "COMPLETED"
    assert score_quest["status"] == "COMPLETED"

    # Claim phần thưởng thành công
    claim = client.post(f"/api/quests/{play_quest['id']}/claim", json={"userId": uid})
    assert claim.status_code == 200
    assert claim.json()["coinAwarded"] > 0

    # Claim trùng lặp -> 409 Conflict
    duplicate = client.post(f"/api/quests/{play_quest['id']}/claim", json={"userId": uid})
    assert duplicate.status_code == 409


def test_lucky_spin_requires_play_and_is_idempotent(client, student_auth, db_session):
    uid = student_auth["user_id"]
    # Chưa chơi game hôm nay -> 400
    blocked = client.post("/api/gamification/lucky-spin", json={"userId": uid})
    assert blocked.status_code == 400

    # Chơi xong 1 màn -> mở khóa lượt quay
    client.post("/api/attempts/submit", json={"userId": uid, "gameId": "g1", "levelNum": 1, "score": 80, "completed": True})
    spin = client.post("/api/gamification/lucky-spin", json={"userId": uid})
    assert spin.status_code == 200
    assert spin.json()["spun"] is True
    assert spin.json()["rewardCode"] is not None

    # Quay lần 2 trong cùng ngày -> 409
    duplicate = client.post("/api/gamification/lucky-spin", json={"userId": uid})
    assert duplicate.status_code == 409


def test_login_reward_7day_cycle_and_streak(client, student_auth, db_session):
    uid = student_auth["user_id"]
    u = db_session.get(models.User, uid)
    u.streak = 1
    u.last_active_date = None
    db_session.commit()

    # Ngày 1: Nhận thưởng 10 xu, streak = 1
    first = client.post("/api/gamification/login-reward", json={"userId": uid})
    assert first.status_code == 200
    data1 = first.json()
    assert data1["claimed"] is True
    assert data1["day"] == 1
    assert data1["coinAwarded"] == 10
    assert data1["streak"] == 1

    # Cùng ngày claim tiếp -> claimed = False
    second = client.post("/api/gamification/login-reward", json={"userId": uid})
    assert second.status_code == 200
    assert second.json()["claimed"] is False
    assert db_session.query(models.LoginRewardClaim).filter_by(user_id=uid).count() == 1

    # Giả lập ngày 7: streak = 7 -> thưởng 100 xu, day = 7
    u = db_session.get(models.User, uid)
    u.streak = 6
    u.last_active_date = datetime.utcnow() - timedelta(days=1)
    db_session.query(models.LoginRewardClaim).delete()
    db_session.commit()

    day7_claim = client.post("/api/gamification/login-reward", json={"userId": uid})
    assert day7_claim.status_code == 200
    data7 = day7_claim.json()
    assert data7["claimed"] is True
    assert data7["day"] == 7
    assert data7["coinAwarded"] == 100
    assert data7["streak"] == 7

    # Giả lập ngày 8: streak = 8 -> xoay vòng về day = 1 (10 xu)
    u = db_session.get(models.User, uid)
    u.streak = 7
    u.last_active_date = datetime.utcnow() - timedelta(days=1)
    db_session.query(models.LoginRewardClaim).delete()
    db_session.commit()

    day8_claim = client.post("/api/gamification/login-reward", json={"userId": uid})
    assert day8_claim.status_code == 200
    data8 = day8_claim.json()
    assert data8["claimed"] is True
    assert data8["day"] == 1
    assert data8["coinAwarded"] == 10
    assert data8["streak"] == 8


def test_timezone_streak_boundary(db_session):
    user = models.User(
        id="u_tz_test",
        username="tz_tester",
        name="Timezone Tester",
        role="student",
        streak=1,
    )
    db_session.add(user)
    db_session.flush()

    # Kịch bản: user active lúc 15:00 giờ VN (tương ứng 08:00 UTC) ngày 2026-08-24
    dt_vn_day1 = datetime(2026, 8, 24, 8, 0, 0)
    streak1 = update_daily_streak(user, dt_vn_day1)
    assert streak1 == 1

    # User active tiếp lúc 23:30 UTC ngày 2026-08-24 (= 06:30 sáng 2026-08-25 giờ VN)
    dt_utc_boundary = datetime(2026, 8, 24, 23, 30, 0)
    streak2 = update_daily_streak(user, dt_utc_boundary)
    # Vì giờ VN đã sang ngày mới 2026-08-25 -> streak phải TĂNG lên 2!
    assert streak2 == 2

    # User active tiếp lúc 02:00 UTC ngày 2026-08-25 (= 09:00 sáng 2026-08-25 giờ VN)
    dt_same_day_vn = datetime(2026, 8, 25, 2, 0, 0)
    streak3 = update_daily_streak(user, dt_same_day_vn)
    # Cùng ngày 2026-08-25 giờ VN -> streak giữ nguyên 2
    assert streak3 == 2


def test_quest_authorization_forbidden_mismatch(client, student_auth, teacher_auth):
    # Dùng JWT token của teacher nhưng cố tình thao tác userId của student
    headers = teacher_auth["headers"]
    target_student_id = student_auth["user_id"]

    res = client.get(f"/api/quests/daily?userId={target_student_id}", headers=headers)
    assert res.status_code == 403

    res_claim = client.post("/api/gamification/login-reward", json={"userId": target_student_id}, headers=headers)
    assert res_claim.status_code == 403


def test_scratch_quest_progress(client, student_auth, db_session):
    uid = student_auth["user_id"]
    # Khởi tạo quest
    client.get(f"/api/quests/daily?userId={uid}")

    # Lấy thông tin bài học 1
    courses = client.get(f"/api/scratch/courses?userId={uid}").json()
    c_id = courses[0]["id"]
    target_seq = courses[0]["lessons"][0]["target_block_sequence"]

    # Nộp bài scratch đúng khối lệnh
    res = client.post("/api/scratch/lessons/submit", json={
        "userId": uid,
        "courseId": c_id,
        "lessonNum": 1,
        "submittedSequence": target_seq,
    })
    assert res.status_code == 200

    quests = client.get(f"/api/quests/daily?userId={uid}").json()
    scratch_quest = next(q for q in quests if q["type"] == "scratch_complete")
    assert scratch_quest["current_progress"] == 1
    assert scratch_quest["status"] == "COMPLETED"