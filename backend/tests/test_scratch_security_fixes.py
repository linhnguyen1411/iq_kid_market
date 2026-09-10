import pytest
from app import models


def test_scratch_submit_requires_authentication(client):
    """Kiểm tra: Không có Token JWT -> Bắt buộc từ chối với mã 401 Unauthorized."""
    res = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc1",
        "lessonNum": 1,
        "submittedSequence": ["move_forward", "move_forward"],
    })
    assert res.status_code == 401
    assert "Phiên đăng nhập" in res.json().get("detail", "") or "Not authenticated" in str(res.json())


def test_scratch_submit_and_prevent_duplicate_rewards(client, student_auth, db_session):
    """
    Kiểm tra:
    1. Submit lần đầu -> Thưởng XP và xu đầy đủ.
    2. Submit lại cùng bài đã hoàn thành -> KHÔNG cộng thêm XP/xu (Chặn Infinite XP/Coin Exploit).
    """
    headers = student_auth["headers"]
    user_id = student_auth["user_id"]

    user_before = db_session.get(models.User, user_id)
    initial_xp = user_before.xp or 0
    initial_balance = user_before.wallet.balance if user_before.wallet else 0

    # 1. Nộp đúng lần đầu
    res1 = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc1",
        "lessonNum": 1,
        "submittedSequence": ["move_forward", "move_forward"],
    }, headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["success"] is True
    assert data1["xpAwarded"] > 0
    assert data1["coinAwarded"] > 0
    assert data1["alreadyRewarded"] is False

    db_session.expire_all()
    user_after_1 = db_session.get(models.User, user_id)
    xp_after_1 = user_after_1.xp
    balance_after_1 = user_after_1.wallet.balance
    assert xp_after_1 == initial_xp + data1["xpAwarded"]
    assert balance_after_1 == initial_balance + data1["coinAwarded"]

    # 2. Nộp lại cùng bài lần 2 (Re-submit)
    res2 = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc1",
        "lessonNum": 1,
        "submittedSequence": ["move_forward", "move_forward"],
    }, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is True
    assert data2["xpAwarded"] == 0  # Không được cộng thêm XP
    assert data2["coinAwarded"] == 0  # Không được cộng thêm Xu
    assert data2["alreadyRewarded"] is True
    assert "hoàn thành thử thách này trước đó" in data2["message"]

    db_session.expire_all()
    user_after_2 = db_session.get(models.User, user_id)
    assert user_after_2.xp == xp_after_1  # XP giữ nguyên
    assert user_after_2.wallet.balance == balance_after_1  # Ví xu giữ nguyên


def test_scratch_submit_wrong_sequence_fails(client, student_auth):
    """Kiểm tra: Nộp chuỗi khối lệnh sai -> Báo lỗi, không thưởng điểm."""
    headers = student_auth["headers"]
    res = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc1",
        "lessonNum": 1,
        "submittedSequence": ["turn_left", "turn_right"],
    }, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["xpAwarded"] == 0
    assert data["coinAwarded"] == 0
    assert data["nextLessonNum"] is None


def test_scratch_course_and_engine_type_metadata(client):
    """Kiểm tra Phase 2 & 3: Metadata course_type và engine_type được trả về và filter hoạt động đúng."""
    res = client.get("/api/scratch/courses")
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) >= 2
    for c in courses:
        assert "course_type" in c
        assert c["course_type"] in ("algorithm_maze", "scratch_studio")
        for l in c.get("lessons", []):
            assert "engine_type" in l
            assert l["engine_type"] in ("algorithm_maze", "block_sequence", "block_quiz", "block_predict", "block_debug", "scratch_studio")

    # Test filtering by course_type
    res_maze = client.get("/api/scratch/courses?type=algorithm_maze")
    assert res_maze.status_code == 200
    maze_courses = res_maze.json()
    assert len(maze_courses) > 0
    assert all(c["course_type"] == "algorithm_maze" for c in maze_courses)

    res_studio = client.get("/api/scratch/courses?type=scratch_studio")
    assert res_studio.status_code == 200
    studio_courses = res_studio.json()
    assert len(studio_courses) > 0
    assert all(c["course_type"] == "scratch_studio" for c in studio_courses)

    res_empty = client.get("/api/scratch/courses?type=non_existent_type")
    assert res_empty.status_code == 200
    assert len(res_empty.json()) == 0


def test_scratch_submit_unified_exercise_types(client, student_auth):
    """Kiểm tra Phase 3: Submit và chấm điểm tự động cho các loại bài tập mới (sc3)."""
    headers = student_auth["headers"]

    # 1. Block Sequence: Sai -> Nhận gợi ý
    res_wrong_seq = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc3",
        "lessonNum": 1,
        "submittedSequence": ["when_flag"]
    }, headers=headers)
    assert res_wrong_seq.status_code == 200
    data_wrong = res_wrong_seq.json()
    assert data_wrong["success"] is False
    assert data_wrong["hint"] is not None

    # 2. Block Sequence: Đúng -> Nhận XP và unlock lesson 2
    res_seq = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc3",
        "lessonNum": 1,
        "submittedSequence": ["when_flag", "move_10_steps", "say_hello"]
    }, headers=headers)
    assert res_seq.status_code == 200
    data_seq = res_seq.json()
    assert data_seq["success"] is True
    assert data_seq["xpAwarded"] == 150
    assert data_seq["nextLessonNum"] == 2

    # 3. Block Quiz: Đúng
    res_quiz = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc3",
        "lessonNum": 2,
        "submittedSequence": ["move_10_steps"]
    }, headers=headers)
    assert res_quiz.status_code == 200
    assert res_quiz.json()["success"] is True

    # 4. Block Predict: Đúng
    res_predict = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc3",
        "lessonNum": 3,
        "submittedSequence": ["x20_down"]
    }, headers=headers)
    assert res_predict.status_code == 200
    assert res_predict.json()["success"] is True

    # 5. Block Debug: Đúng
    res_debug = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc3",
        "lessonNum": 4,
        "submittedSequence": [
            "Khi bấm cờ xanh ⛳",
            "Di chuyển 10 bước ➡️",
            "Quay phải 90° ↪️",
            "Nói \"Chào bạn!\" 💬"
        ]
    }, headers=headers)
    assert res_debug.status_code == 200
    assert res_debug.json()["success"] is True


def test_scratch_studio_semantic_submission(client, student_auth, db_session):
    """Kiểm tra quy trình nộp bài Scratch Studio với payload AST & Telemetry phong phú."""
    headers = student_auth["headers"]

    # 1. Lesson 1 (Mèo Chào Hỏi): Chưa bấm Cờ Xanh chạy thử -> Bị từ chối kèm nhắc nhở
    res_unrun = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc4",
        "lessonNum": 1,
        "submittedSequence": {
            "blocks": [
                {"type": "scratch_when_flag_clicked"},
                {"type": "scratch_say_for_secs", "fields": {"MESSAGE": "Chào bạn!"}}
            ],
            "telemetry": {
                "has_run": False
            }
        }
    }, headers=headers)
    assert res_unrun.status_code == 200
    data_unrun = res_unrun.json()
    assert data_unrun["success"] is False
    assert "chưa bấm Cờ Xanh" in data_unrun["message"]

    # 2. Lesson 1 (Mèo Chào Hỏi): Đã chạy thử và có nội dung chào hỏi -> Thành công!
    res_pass = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc4",
        "lessonNum": 1,
        "submittedSequence": {
            "blocks": [
                {"type": "scratch_when_flag_clicked"},
                {"type": "scratch_say_for_secs", "fields": {"MESSAGE": "Xin chào mọi người!"}}
            ],
            "telemetry": {
                "has_run": True,
                "actions": {
                    "messages_said": ["Xin chào mọi người!"],
                    "total_steps": 0,
                    "total_turns": 0,
                    "sounds_played": []
                },
                "final_state": {"speechBubble": {"text": "Xin chào mọi người!"}}
            }
        }
    }, headers=headers)
    assert res_pass.status_code == 200
    data_pass = res_pass.json()
    assert data_pass["success"] is True
    assert data_pass["xpAwarded"] == 100
    assert data_pass["nextLessonNum"] == 2

    # 3. Thử nộp Lesson 2 khi CHƯA mua khóa học -> Bị chặn 403!
    res_unbought = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc4",
        "lessonNum": 2,
        "submittedSequence": {
            "blocks": [{"type": "scratch_when_sprite_clicked"}],
            "telemetry": {"has_run": True}
        }
    }, headers=headers)
    assert res_unbought.status_code == 403

    # Cấp Token và Mua khóa học sc4
    wallet = db_session.query(models.Wallet).filter_by(user_id=student_auth["user_id"]).first()
    wallet.balance = 100
    db_session.commit()

    res_buy = client.post("/api/scratch/courses/sc4/purchase", headers=headers)
    assert res_buy.status_code == 200
    assert res_buy.json()["isPurchased"] is True

    # 4. Lesson 2 (Sự Kiện — Click Nhân Vật): Sau khi mua và đã hoàn thành bài 1 -> Thành công!
    res_l2 = client.post("/api/scratch/lessons/submit", json={
        "courseId": "sc4",
        "lessonNum": 2,
        "submittedSequence": {
            "blocks": [
                {"type": "scratch_when_sprite_clicked"},
                {"type": "scratch_play_sound_meow"}
            ],
            "telemetry": {
                "has_run": True,
                "actions": {
                    "total_steps": 0,
                    "total_turns": 0,
                    "messages_said": [],
                    "sounds_played": ["meow"]
                },
                "final_state": {"x": 0, "y": 0, "direction": 90}
            }
        }
    }, headers=headers)
    assert res_l2.status_code == 200
    assert res_l2.json()["success"] is True
    assert res_l2.json()["xpAwarded"] == 120


