import pytest
from app.exercise_evaluator import evaluate_exercise


class DummyLesson:
    def __init__(self, target_block_sequence=None, start_scene_json=None, engine_type=None):
        self.target_block_sequence = target_block_sequence
        self.start_scene_json = start_scene_json
        self.engine_type = engine_type


def test_evaluate_algorithm_maze():
    lesson = DummyLesson(target_block_sequence="move_forward,turn_right,move_forward")
    
    # Đúng
    ok, msg, hint = evaluate_exercise("algorithm_maze", ["move_forward", "turn_right", "move_forward"], lesson)
    assert ok is True
    assert "hoàn thành xuất sắc" in msg

    # Thiếu khối
    ok, msg, hint = evaluate_exercise("algorithm_maze", ["move_forward"], lesson)
    assert ok is False
    assert "thiếu" in (hint or "")

    # Thừa khối
    ok, msg, hint = evaluate_exercise("algorithm_maze", ["move_forward", "move_forward", "move_forward", "turn_left"], lesson)
    assert ok is False
    assert "thừa" in (hint or "")


def test_evaluate_block_sequence():
    lesson = DummyLesson(target_block_sequence="when_green_flag,move_10_steps,say_meow")

    # Đúng thứ tự
    ok, msg, hint = evaluate_exercise("block_sequence", ["when_green_flag", "move_10_steps", "say_meow"], lesson)
    assert ok is True
    assert "Chính xác" in msg

    # Sai thứ tự
    ok, msg, hint = evaluate_exercise("block_sequence", ["move_10_steps", "when_green_flag", "say_meow"], lesson)
    assert ok is False
    assert "vị trí chưa chính xác" in (hint or "")


def test_evaluate_block_quiz():
    lesson = DummyLesson(
        start_scene_json='{"answer": "move_10_steps", "explanation": "Khối di chuyển 10 bước nằm trong nhóm Motion."}'
    )

    # Đúng
    ok, msg, hint = evaluate_exercise("block_quiz", "move_10_steps", lesson)
    assert ok is True
    assert "Khối di chuyển 10 bước nằm trong nhóm Motion" in msg

    # Sai
    ok, msg, hint = evaluate_exercise("block_quiz", "turn_right", lesson)
    assert ok is False
    assert "chưa đúng" in msg


def test_evaluate_block_predict():
    lesson = DummyLesson(
        start_scene_json='{"answer": "cat_at_20", "explanation": "Nhân vật di chuyển 2 lần 10 bước nên tọa độ X là 20."}'
    )

    # Đúng
    ok, msg, hint = evaluate_exercise("block_predict", "cat_at_20", lesson)
    assert ok is True
    assert "Dự đoán hoàn toàn chuẩn xác" in msg

    # Sai
    ok, msg, hint = evaluate_exercise("block_predict", "cat_at_0", lesson)
    assert ok is False
    assert "chưa khớp" in msg


def test_evaluate_block_debug():
    lesson = DummyLesson(
        target_block_sequence="when_flag,move_forward,say_hello",
        start_scene_json='{"bug_index": 1, "target_sequence": ["when_flag", "move_forward", "say_hello"]}'
    )

    # Sửa đúng kịch bản
    ok, msg, hint = evaluate_exercise("block_debug", ["when_flag", "move_forward", "say_hello"], lesson)
    assert ok is True
    assert "gỡ lỗi thành công" in msg

    # Nộp đúng index khối lỗi
    ok, msg, hint = evaluate_exercise("block_debug", 1, lesson)
    assert ok is True
    assert "đúng vị trí khối lệnh gây lỗi" in msg

    # Sai
    ok, msg, hint = evaluate_exercise("block_debug", ["when_flag", "turn_left"], lesson)
    assert ok is False
    assert "vẫn còn lỗi" in msg


def test_scratch_evaluator_multiple_valid_solutions():
    """Kiểm tra nguyên tắc cốt lõi của Phase 5: Nhiều giải pháp đúng khác nhau đều ĐẠT."""
    lesson = DummyLesson(
        start_scene_json='''{
            "evaluation_config": {
                "required_events": ["scratch_when_flag_clicked"],
                "required_blocks": ["scratch_move_steps"],
                "runtime_assertions": {
                    "min_steps_moved": 80,
                    "target_position": { "min_x": 70 }
                }
            }
        }''',
        engine_type="scratch_studio"
    )

    # Giải pháp 1: 1 khối di chuyển 100 bước
    sol1 = {
        "blocks": [
            {"type": "scratch_when_flag_clicked", "fields": {}},
            {"type": "scratch_move_steps", "fields": {"STEPS": 100}}
        ],
        "telemetry": {
            "has_run": True,
            "final_state": {"x": 100, "y": 0, "direction": 90},
            "actions": {"total_steps": 100, "total_turns": 0, "messages_said": [], "sounds_played": []}
        }
    }
    ok1, msg1, _ = evaluate_exercise("scratch_studio", sol1, lesson)
    assert ok1 is True
    assert "Tuyệt vời" in msg1 or "thành công" in msg1

    # Giải pháp 2: 2 khối di chuyển (50 + 50 bước)
    sol2 = {
        "blocks": [
            {"type": "scratch_when_flag_clicked", "fields": {}},
            {"type": "scratch_move_steps", "fields": {"STEPS": 50}},
            {"type": "scratch_move_steps", "fields": {"STEPS": 50}}
        ],
        "telemetry": {
            "has_run": True,
            "final_state": {"x": 100, "y": 0, "direction": 90},
            "actions": {"total_steps": 100, "total_turns": 0, "messages_said": [], "sounds_played": []}
        }
    }
    ok2, msg2, _ = evaluate_exercise("scratch_studio", sol2, lesson)
    assert ok2 is True

    # Giải pháp 3: Dùng vòng lặp lặp lại 10 lần khối 10 bước
    sol3 = {
        "blocks": [
            {"type": "scratch_when_flag_clicked", "fields": {}},
            {"type": "scratch_repeat", "fields": {"TIMES": 10}},
            {"type": "scratch_move_steps", "fields": {"STEPS": 10}}
        ],
        "telemetry": {
            "has_run": True,
            "final_state": {"x": 100, "y": 0, "direction": 90},
            "actions": {"total_steps": 100, "total_turns": 0, "messages_said": [], "sounds_played": []}
        }
    }
    ok3, msg3, _ = evaluate_exercise("scratch_studio", sol3, lesson)
    assert ok3 is True


def test_scratch_evaluator_require_run_check():
    """Kiểm tra yêu cầu học sinh phải bấm Cờ Xanh chạy thử trước khi nộp bài."""
    lesson = DummyLesson(
        start_scene_json='''{
            "evaluation_config": {
                "required_events": ["scratch_when_flag_clicked"],
                "runtime_assertions": { "min_steps_moved": 50 }
            }
        }'''
    )
    unrun_submission = {
        "blocks": [{"type": "scratch_when_flag_clicked"}],
        "telemetry": {"has_run": False}
    }
    ok, msg, hint = evaluate_exercise("scratch_studio", unrun_submission, lesson)
    assert ok is False
    assert "chưa bấm Cờ Xanh" in msg


def test_scratch_evaluator_missing_event():
    """Kiểm tra thông báo khi thiếu khối sự kiện bắt buộc."""
    lesson = DummyLesson(
        start_scene_json='''{
            "evaluation_config": {
                "required_events": ["scratch_when_flag_clicked"]
            }
        }'''
    )
    missing_flag = {
        "blocks": [{"type": "scratch_move_steps"}],
        "telemetry": {"has_run": True}
    }
    ok, msg, hint = evaluate_exercise("scratch_studio", missing_flag, lesson)
    assert ok is False
    assert "thiếu khối sự kiện" in msg


def test_scratch_evaluator_said_message_assertion():
    """Kiểm tra nội dung lời nói (case-insensitive & substring match)."""
    lesson = DummyLesson(
        start_scene_json='''{
            "evaluation_config": {
                "runtime_assertions": { "said_message": "chào" }
            }
        }'''
    )
    # Đúng
    sub_correct = {
        "blocks": [{"type": "scratch_say_for_secs"}],
        "telemetry": {
            "has_run": True,
            "actions": {"messages_said": ["Xin chào các bạn!"]},
            "final_state": {}
        }
    }
    ok, msg, _ = evaluate_exercise("scratch_studio", sub_correct, lesson)
    assert ok is True

    # Sai
    sub_wrong = {
        "blocks": [{"type": "scratch_say_for_secs"}],
        "telemetry": {
            "has_run": True,
            "actions": {"messages_said": ["Tạm biệt nhé!"]},
            "final_state": {}
        }
    }
    ok, msg, hint = evaluate_exercise("scratch_studio", sub_wrong, lesson)
    assert ok is False
    assert "chưa nói lời thoại chứa từ khóa 'chào'" in msg


def test_scratch_evaluator_sound_played_assertion():
    """Kiểm tra assertion về âm thanh đã phát trong kịch bản."""
    lesson = DummyLesson(
        start_scene_json='''{
            "evaluation_config": {
                "runtime_assertions": { "sound_played": "meow" }
            }
        }'''
    )
    sub = {
        "blocks": [{"type": "scratch_play_sound_meow"}],
        "telemetry": {
            "has_run": True,
            "actions": {"sounds_played": ["meow"]},
            "final_state": {}
        }
    }
    ok, msg, _ = evaluate_exercise("scratch_studio", sub, lesson)
    assert ok is True


def test_scratch_evaluator_max_blocks_limit():
    """Kiểm tra giới hạn số lượng khối lệnh tối đa để rèn luyện tư duy tối ưu."""
    lesson = DummyLesson(
        start_scene_json='''{
            "evaluation_config": {
                "max_blocks": 3
            }
        }'''
    )
    too_many_blocks = {
        "blocks": [
            {"type": "scratch_when_flag_clicked"},
            {"type": "scratch_move_steps"},
            {"type": "scratch_move_steps"},
            {"type": "scratch_move_steps"}
        ],
        "telemetry": {"has_run": True}
    }
    ok, msg, hint = evaluate_exercise("scratch_studio", too_many_blocks, lesson)
    assert ok is False
    assert "vượt quá giới hạn 3 khối" in msg
    assert "vòng lặp" in (hint or "")


def test_algorithm_maze_lesson_3_loop_and_unrolled_equivalence():
    """Kiểm tra Bài 3 (sc1 lesson 3): Cả vòng lặp repeat_3 lẫn 3 lần move_forward đều thắng."""
    lesson = DummyLesson(
        target_block_sequence="repeat_3[move_forward]",
        start_scene_json='{"cat_pos":[0,0],"star_pos":[3,0]}'
    )

    # 1. Dùng vòng lặp repeat_3[move_forward]
    ok, msg, hint = evaluate_exercise("algorithm_maze", ["repeat_3[move_forward]"], lesson)
    assert ok is True
    assert "hoàn thành xuất sắc" in msg

    # 2. Dùng 3 lần đi thẳng (move_forward x3)
    ok, msg, hint = evaluate_exercise("algorithm_maze", ["move_forward", "move_forward", "move_forward"], lesson)
    assert ok is True
    assert "hoàn thành xuất sắc" in msg or "vượt qua mê cung" in msg
    assert hint is not None and "Vòng lặp" in hint

    # 3. Đi thiếu bước (chỉ 2 bước) -> Chưa đến đích
    ok, msg, hint = evaluate_exercise("algorithm_maze", ["move_forward", "move_forward"], lesson)
    assert ok is False
    assert "(2, 0)" in (hint or "") or "thiếu" in (hint or "")


