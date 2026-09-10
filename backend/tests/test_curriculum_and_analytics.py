import pytest
import json
from datetime import datetime
from app import models
from app.exercise_evaluator import evaluate_exercise
from app.routers.scratch import check_and_unlock_scratch_achievements


def test_scratch_11_level_curriculum_structure(db_session):
    """Kiểm tra lộ trình 11 cấp độ của khóa học sc4 chuẩn CSTA/MIT."""
    course = db_session.get(models.ScratchCourse, "sc4")
    assert course is not None, "Khóa học sc4 phải tồn tại"
    assert course.total_lessons == 11, f"Khóa sc4 phải có 11 bài học, thực tế: {course.total_lessons}"

    lessons = (
        db_session.query(models.ScratchLesson)
        .filter_by(course_id="sc4")
        .order_by(models.ScratchLesson.lesson_num)
        .all()
    )
    assert len(lessons) == 11, f"Phải có đủ 11 bài học trong DB, thực tế: {len(lessons)}"

    expected_titles = [
        "Tuần Tự",
        "Sự Kiện",
        "Chuyển Động",
        "Vòng Lặp",
        "Điều Kiện",
        "Biến Số",
        "Cảm Biến",
        "Phát & Nhận Tin",
        "Cơ Chế Game",
        "Mini Project",
        "Full Project",
    ]

    for idx, lesson in enumerate(lessons):
        assert lesson.lesson_num == idx + 1
        assert expected_titles[idx].lower() in lesson.title.lower(), f"Bài {idx+1} phải chứa {expected_titles[idx]}"
        assert lesson.engine_type == "scratch_studio"
        assert lesson.start_scene_json, f"Bài {idx+1} phải có start_scene_json"
        
        cfg = json.loads(lesson.start_scene_json)
        assert "evaluation_config" in cfg, f"Bài {idx+1} phải có evaluation_config"


def test_evaluate_conditionals_and_sensing(db_session):
    """Kiểm tra chấm điểm ngữ nghĩa cho bài học Cấu Trúc Điều Kiện & Cảm Biến."""
    lesson5 = db_session.query(models.ScratchLesson).filter_by(course_id="sc4", lesson_num=5).first()
    assert lesson5 is not None

    # Nộp thiếu khối điều kiện scratch_if
    payload_missing = {
        "sequence": ["scratch_when_flag_clicked", "scratch_move_steps"],
        "blocks": [
            {"type": "scratch_when_flag_clicked", "fields": {}},
            {"type": "scratch_move_steps", "fields": {"STEPS": 20}},
        ],
        "telemetry": {"has_run": True, "actions": {"total_steps": 20}, "final_state": {"x": 20, "y": 0}},
    }
    is_correct, msg, hint = evaluate_exercise("scratch_studio", payload_missing, lesson5)
    assert not is_correct
    assert "Nếu ... thì" in msg or "thiếu" in msg

    # Nộp đúng đủ các khối
    payload_valid = {
        "sequence": [
            "scratch_when_flag_clicked",
            "scratch_move_steps",
            "scratch_if",
            "scratch_touching_edge",
            "scratch_bounce_on_edge",
        ],
        "blocks": [
            {"type": "scratch_when_flag_clicked", "fields": {}},
            {"type": "scratch_move_steps", "fields": {"STEPS": 20}},
            {"type": "scratch_if", "fields": {}},
            {"type": "scratch_touching_edge", "fields": {}},
            {"type": "scratch_bounce_on_edge", "fields": {}},
        ],
        "telemetry": {"has_run": True, "actions": {"total_steps": 20}, "final_state": {"x": 20, "y": 0}},
    }
    is_correct, msg, hint = evaluate_exercise("scratch_studio", payload_valid, lesson5)
    assert is_correct
    assert "chinh phục cấu trúc rẽ nhánh điều kiện" in msg


def test_evaluate_variables_and_broadcast(db_session):
    """Kiểm tra chấm điểm ngữ nghĩa cho bài học Biến Số & Phát Tin Nhắn."""
    lesson6 = db_session.query(models.ScratchLesson).filter_by(course_id="sc4", lesson_num=6).first()
    assert lesson6 is not None

    # Biến số chưa đủ điểm
    payload_low_var = {
        "sequence": ["scratch_when_flag_clicked", "scratch_set_variable_to", "scratch_change_variable_by"],
        "blocks": [
            {"type": "scratch_when_flag_clicked", "fields": {}},
            {"type": "scratch_set_variable_to", "fields": {"VAR": "điểm", "VALUE": 0}},
            {"type": "scratch_change_variable_by", "fields": {"VAR": "điểm", "CHANGE": 2}},
        ],
        "telemetry": {
            "has_run": True,
            "variables": {"điểm": 2},
            "actions": {},
            "final_state": {},
        },
    }
    is_correct, msg, hint = evaluate_exercise("scratch_studio", payload_low_var, lesson6)
    assert not is_correct
    assert "chưa đạt mốc yêu cầu tối thiểu" in msg

    # Biến số đạt mốc 10 điểm
    payload_valid_var = {
        "sequence": ["scratch_when_flag_clicked", "scratch_set_variable_to", "scratch_change_variable_by"],
        "blocks": [
            {"type": "scratch_when_flag_clicked", "fields": {}},
            {"type": "scratch_set_variable_to", "fields": {"VAR": "điểm", "VALUE": 0}},
            {"type": "scratch_change_variable_by", "fields": {"VAR": "điểm", "CHANGE": 10}},
        ],
        "telemetry": {
            "has_run": True,
            "variables": {"điểm": 10},
            "actions": {},
            "final_state": {},
        },
    }
    is_correct, msg, hint = evaluate_exercise("scratch_studio", payload_valid_var, lesson6)
    assert is_correct

    # Kiểm tra bài 8 (Broadcast)
    lesson8 = db_session.query(models.ScratchLesson).filter_by(course_id="sc4", lesson_num=8).first()
    assert lesson8 is not None

    payload_broadcast = {
        "sequence": [
            "scratch_when_flag_clicked",
            "scratch_broadcast_message",
            "scratch_when_receive_message",
            "scratch_say_for_secs",
        ],
        "blocks": [
            {"type": "scratch_when_flag_clicked", "fields": {}},
            {"type": "scratch_broadcast_message", "fields": {"MESSAGE": "chien_thang"}},
            {"type": "scratch_when_receive_message", "fields": {"MESSAGE": "chien_thang"}},
            {"type": "scratch_say_for_secs", "fields": {"MESSAGE": "Chiến thắng rồi!"}},
        ],
        "telemetry": {
            "has_run": True,
            "actions": {
                "messages_broadcasted": ["chien_thang"],
                "messages_said": ["Chiến thắng rồi!"],
            },
            "final_state": {},
        },
    }
    is_correct, msg, hint = evaluate_exercise("scratch_studio", payload_broadcast, lesson8)
    assert is_correct


def test_quest_progress_and_achievement_on_save_project(client, student_auth, db_session):
    """Kiểm tra quest scratch_project_save và huy hiệu scratch_creator khi lưu dự án."""
    headers = student_auth["headers"]
    user_id = student_auth["user_id"]

    # Tạo dự án mới qua API
    res = client.post(
        "/api/scratch/projects",
        json={
            "title": "Dự Án Sáng Tạo Của Tôi",
            "description": "Thử nghiệm game Scratch đầu tay",
            "project_data": {"sprite": {"x": 0, "y": 0}},
        },
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Dự Án Sáng Tạo Của Tôi"

    # Kiểm tra nhiệm vụ ngày quest_scratch_project_save
    from app.daily_quests import ensure_daily_quests
    quests = ensure_daily_quests(db_session, user_id)
    save_quest = next((q for q in quests if q.quest_id == "quest_scratch_project_save"), None)
    assert save_quest is not None
    assert save_quest.current_progress >= 1

    # Kiểm tra mở khóa huy hiệu scratch_creator
    ua = (
        db_session.query(models.UserAchievement)
        .filter_by(user_id=user_id, achievement_id="scratch_creator")
        .first()
    )
    assert ua is not None, "Phải tự động mở khóa huy hiệu scratch_creator khi tạo dự án"


def test_achievement_progression_and_analytics_endpoint(client, student_auth, db_session):
    """Kiểm tra mở khóa scratch_first_code, scratch_loop_wizard, scratch_master và GET /api/scratch/analytics."""
    headers = student_auth["headers"]
    user_id = student_auth["user_id"]

    # 1. Ban đầu: chưa làm bài nào
    res = client.get("/api/scratch/analytics", headers=headers)
    assert res.status_code == 200
    analytics = res.json()
    assert analytics["total_completed_lessons"] == 0
    assert analytics["total_curriculum_lessons"] == 11
    assert analytics["completion_rate"] == 0
    assert len(analytics["skills_mastery"]) == 8

    # 2. Hoàn thành bài 1 (Tuần tự)
    res1 = client.post(
        "/api/scratch/lessons/submit",
        json={
            "courseId": "sc4",
            "lessonNum": 1,
            "submittedSequence": {
                "sequence": ["scratch_when_flag_clicked", "scratch_say_for_secs"],
                "blocks": [
                    {"type": "scratch_when_flag_clicked", "fields": {}},
                    {"type": "scratch_say_for_secs", "fields": {"MESSAGE": "Xin chào các bạn!"}},
                ],
                "telemetry": {
                    "has_run": True,
                    "actions": {"messages_said": ["Xin chào các bạn!"]},
                    "final_state": {},
                },
            },
        },
        headers=headers,
    )
    assert res1.status_code == 200
    assert res1.json()["success"] is True

    # Kiểm tra mở khóa huy hiệu scratch_first_code
    ua_first = (
        db_session.query(models.UserAchievement)
        .filter_by(user_id=user_id, achievement_id="scratch_first_code")
        .first()
    )
    assert ua_first is not None, "Phải mở khóa scratch_first_code khi làm bài 1"

    # Mua khóa học và hoàn thành các bài 2, 3 để đủ điều kiện làm bài 4
    db_session.add(models.CoursePurchase(user_id=user_id, course_id="sc4", purchased_price=50))
    db_session.add(models.UserScratchProgress(
        id=f"usp_{user_id}_sc4_2", user_id=user_id, course_id="sc4", lesson_id=1, lesson_num=2, completed=True
    ))
    db_session.add(models.UserScratchProgress(
        id=f"usp_{user_id}_sc4_3", user_id=user_id, course_id="sc4", lesson_id=1, lesson_num=3, completed=True
    ))
    db_session.commit()

    # 3. Hoàn thành bài 4 (Vòng lặp)
    res4 = client.post(
        "/api/scratch/lessons/submit",
        json={
            "courseId": "sc4",
            "lessonNum": 4,
            "submittedSequence": {
                "sequence": ["scratch_when_flag_clicked", "scratch_repeat", "scratch_move_steps", "scratch_turn_right"],
                "blocks": [
                    {"type": "scratch_when_flag_clicked", "fields": {}},
                    {"type": "scratch_repeat", "fields": {"TIMES": 4}},
                    {"type": "scratch_move_steps", "fields": {"STEPS": 40}},
                    {"type": "scratch_turn_right", "fields": {"DEGREES": 90}},
                ],
                "telemetry": {
                    "has_run": True,
                    "actions": {"total_steps": 40},
                    "final_state": {},
                },
            },
        },
        headers=headers,
    )
    assert res4.status_code == 200
    assert res4.json()["success"] is True

    # Kiểm tra mở khóa scratch_loop_wizard
    ua_loop = (
        db_session.query(models.UserAchievement)
        .filter_by(user_id=user_id, achievement_id="scratch_loop_wizard")
        .first()
    )
    assert ua_loop is not None, "Phải mở khóa scratch_loop_wizard khi làm bài 4"

    # 4. Kiểm tra lại GET /api/scratch/analytics
    res_after = client.get("/api/scratch/analytics", headers=headers)
    assert res_after.status_code == 200
    data_after = res_after.json()
    assert data_after["total_completed_lessons"] >= 2
    assert data_after["total_stars"] >= 6

    # Kỹ năng sequence và loops phải đạt 100%
    skill_seq = next(s for s in data_after["skills_mastery"] if s["skill"] == "sequence")
    assert skill_seq["mastery_percent"] == 100

    skill_loop = next(s for s in data_after["skills_mastery"] if s["skill"] == "loops")
    assert skill_loop["mastery_percent"] == 100

    # Huy hiệu scratch_first_code và scratch_loop_wizard đã mở khóa
    badge_first = next(b for b in data_after["badges"] if b["id"] == "scratch_first_code")
    assert badge_first["unlocked"] is True

    badge_loop = next(b for b in data_after["badges"] if b["id"] == "scratch_loop_wizard")
    assert badge_loop["unlocked"] is True
