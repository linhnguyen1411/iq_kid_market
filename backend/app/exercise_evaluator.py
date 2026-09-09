import json
from typing import Any, Tuple, Optional


def normalize_sequence(val: Any) -> list[str]:
    """Chuyển chuỗi hoặc danh sách khối lệnh về dạng mảng chuẩn hóa (lowercase, trimmed)."""
    if val is None:
        return []
    if isinstance(val, list):
        return [str(item).strip().lower() for item in val if str(item).strip()]
    if isinstance(val, str):
        # Hỗ trợ cả json string lẫn chuỗi phân tách bằng dấu phẩy
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            try:
                parsed = json.loads(val)
                if isinstance(parsed, list):
                    return [str(item).strip().lower() for item in parsed if str(item).strip()]
            except Exception:
                pass
        return [item.strip().lower() for item in val.split(",") if item.strip()]
    return [str(val).strip().lower()]


def parse_scene_or_data(lesson: Any) -> dict:
    """Trích xuất dữ liệu bài tập (start_scene_json hoặc content json)."""
    raw = getattr(lesson, "start_scene_json", None)
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except Exception:
        return {}


def unroll_maze_sequence(seq: list[str]) -> list[str]:
    """Bung các khối lặp như repeat_2[move_forward], repeat_3[move_forward] thành các bước nguyên tử."""
    unrolled = []
    for item in seq:
        if item == "repeat_2[move_forward]":
            unrolled.extend(["move_forward", "move_forward"])
        elif item == "repeat_3[move_forward]":
            unrolled.extend(["move_forward", "move_forward", "move_forward"])
        else:
            unrolled.append(item)
    return unrolled


def simulate_maze_path(
    submitted_seq: list[str],
    start_scene: dict,
) -> Tuple[bool, str, Optional[str]]:
    """Mô phỏng đường đi của nhân vật trên bản đồ mê cung 2D.
    Trả về: (reached_target, message, hint)
    """
    cat_pos = start_scene.get("cat_pos")
    star_pos = start_scene.get("star_pos")
    if not cat_pos or not star_pos or len(cat_pos) < 2 or len(star_pos) < 2:
        return False, "Không đủ dữ liệu bản đồ để mô phỏng đường đi.", None

    grid_size = start_scene.get("grid_size", 4)
    raw_obstacles = start_scene.get("obstacles", [])
    obstacles = {tuple(obs) for obs in raw_obstacles if len(obs) >= 2}

    cur_x, cur_y = cat_pos[0], cat_pos[1]
    cur_dir = start_scene.get("cat_dir", "right")  # 'right', 'down', 'left', 'up'
    order = ["right", "down", "left", "up"]

    expanded_cmds = unroll_maze_sequence(submitted_seq)

    for cmd in expanded_cmds:
        if cmd == "move_forward":
            if cur_dir == "right": cur_x += 1
            elif cur_dir == "down": cur_y += 1
            elif cur_dir == "left": cur_x -= 1
            elif cur_dir == "up": cur_y -= 1
        elif cmd == "jump_forward":
            if cur_dir == "right": cur_x += 2
            elif cur_dir == "down": cur_y += 2
            elif cur_dir == "left": cur_x -= 2
            elif cur_dir == "up": cur_y -= 2
        elif cmd == "turn_right":
            idx = order.index(cur_dir) if cur_dir in order else 0
            cur_dir = order[(idx + 1) % 4]
        elif cmd == "turn_left":
            idx = order.index(cur_dir) if cur_dir in order else 0
            cur_dir = order[(idx + 3) % 4]
        elif cmd == "meow_sound":
            pass

        # Kiểm tra va chạm biên mép bản đồ
        if not (0 <= cur_x < grid_size and 0 <= cur_y < grid_size):
            return False, "Kịch bản chưa chính xác: Nhân vật đã đi ra ngoài mép bản đồ!", "Hãy kiểm tra hướng xoay và số bước di chuyển."

        # Kiểm tra va chạm chướng ngại vật
        if (cur_x, cur_y) in obstacles:
            return False, "Kịch bản chưa chính xác: Nhân vật đã va phải chướng ngại vật!", "Hãy dùng lệnh rẽ hướng để tránh chướng ngại vật."

    if [cur_x, cur_y] == list(star_pos):
        return True, "Tuyệt vời! Nhân vật đã hoàn thành xuất sắc đường đi trong mê cung! 🌟", None

    return (
        False,
        "Kịch bản chưa đưa nhân vật đến đúng vị trí Ngôi Sao!",
        f"Nhân vật dừng lại ở ({cur_x}, {cur_y}), trong khi ngôi sao ở ({star_pos[0]}, {star_pos[1]}).",
    )


def evaluate_exercise(
    engine_type: str,
    submitted_value: Any,
    lesson: Any,
) -> Tuple[bool, str, Optional[str]]:
    """
    Bộ chấm điểm trung tâm cho 5 dạng bài tập lập trình:
    1. algorithm_maze: So khớp chuỗi bước đi hoặc mô phỏng đường đi trên mê cung 2D.
    2. block_sequence: So khớp thứ tự khối lệnh chuẩn (Parsons problem).
    3. block_quiz: So sánh đáp án trắc nghiệm đã chọn với đáp án chuẩn.
    4. block_predict: So sánh kết quả dự đoán với hành vi chuẩn của kịch bản.
    5. block_debug: Kiểm tra chuỗi kịch bản đã được sửa lỗi hoàn chỉnh.

    Trả về: (is_correct, message, hint)
    """
    engine = (engine_type or "algorithm_maze").strip().lower()
    data = parse_scene_or_data(lesson)

    # -------------------------------------------------------------
    # 1. ALGORITHM MAZE (So khớp chuỗi bước đi hoặc mô phỏng đường đi)
    # -------------------------------------------------------------
    if engine == "algorithm_maze":
        target_seq = normalize_sequence(
            data.get("target_sequence")
            or getattr(lesson, "target_block_sequence", None)
        )
        submitted_seq = normalize_sequence(submitted_value)

        if not submitted_seq:
            return (
                False,
                "Bạn chưa xếp khối lệnh nào vào kịch bản!",
                "Hãy bấm chọn các khối lệnh cần thiết trước khi nhấn nộp bài.",
            )

        # Cách 1: So khớp chính xác chuỗi khối lệnh mục tiêu
        if submitted_seq == target_seq:
            return (True, "Tuyệt vời! Nhân vật đã hoàn thành xuất sắc đường đi trong mê cung! 🌟", None)

        # Cách 2: So khớp tương đương sau khi bung vòng lặp (unroll loop equivalence)
        unrolled_submitted = unroll_maze_sequence(submitted_seq)
        unrolled_target = unroll_maze_sequence(target_seq)
        if target_seq and unrolled_submitted == unrolled_target:
            hint = "Mẹo nhỏ: Bạn có thể sử dụng khối 'Vòng lặp' để kịch bản ngắn gọn hơn nữa nhé!" if len(submitted_seq) > len(target_seq) else None
            return (True, "Tuyệt vời! Nhân vật đã hoàn thành xuất sắc đường đi trong mê cung! 🌟", hint)

        # Cách 3: Kiểm tra đường đi qua mô phỏng tọa độ mê cung 2D
        has_coords = data.get("cat_pos") is not None and data.get("star_pos") is not None
        if has_coords:
            reached, sim_msg, sim_hint = simulate_maze_path(submitted_seq, data)
            if reached:
                hint = "Mẹo nhỏ: Bạn có thể sử dụng khối 'Vòng lặp' để kịch bản ngắn gọn hơn nữa nhé!" if target_seq and len(submitted_seq) > len(target_seq) else None
                return (True, sim_msg, hint)
            else:
                return (False, sim_msg, sim_hint)

        # Fallback gợi ý khi không có tọa độ bản đồ
        if len(submitted_seq) < len(target_seq):
            hint = f"Kịch bản còn thiếu khối lệnh. Cần có {len(target_seq)} khối lệnh cả thảy."
        elif len(submitted_seq) > len(target_seq):
            hint = f"Kịch bản đang có khối lệnh thừa. Bạn đang dùng {len(submitted_seq)} khối, chỉ cần {len(target_seq)} khối."
        else:
            hint = "Số lượng khối lệnh đã đủ nhưng vị trí chưa chính xác. Hãy kiểm tra lại thứ tự từng bước nhé!"

        return (
            False,
            "Kịch bản khối lệnh chưa hoàn toàn chính xác. Hãy thử kiểm tra lại!",
            hint,
        )

    # -------------------------------------------------------------
    # 2. BLOCK SEQUENCE (Parsons problem - sắp xếp đúng thứ tự khối)
    # -------------------------------------------------------------
    elif engine == "block_sequence":
        target_seq = normalize_sequence(
            data.get("target_sequence")
            or getattr(lesson, "target_block_sequence", None)
        )
        submitted_seq = normalize_sequence(submitted_value)

        if not submitted_seq:
            return (
                False,
                "Bạn chưa xếp khối lệnh nào vào kịch bản!",
                "Hãy bấm chọn các khối lệnh cần thiết trước khi nhấn nộp bài.",
            )

        if submitted_seq == target_seq:
            return (True, "Chính xác! Bạn đã sắp xếp kịch bản theo đúng trình tự logic thuật toán! 🧩🎉", None)

        if len(submitted_seq) < len(target_seq):
            hint = f"Kịch bản còn thiếu khối lệnh. Cần có {len(target_seq)} khối lệnh cả thảy."
        elif len(submitted_seq) > len(target_seq):
            hint = f"Kịch bản đang có khối lệnh thừa. Bạn đang dùng {len(submitted_seq)} khối, chỉ cần {len(target_seq)} khối."
        else:
            hint = "Số lượng khối lệnh đã đủ nhưng vị trí chưa chính xác. Hãy kiểm tra lại thứ tự từng bước nhé!"

        return (
            False,
            "Kịch bản khối lệnh chưa hoàn toàn chính xác. Hãy thử kiểm tra lại!",
            hint,
        )

    # -------------------------------------------------------------
    # 3. BLOCK QUIZ (Trắc nghiệm khối lệnh)
    # -------------------------------------------------------------
    elif engine == "block_quiz":
        target_answer = str(
            data.get("answer")
            or getattr(lesson, "target_block_sequence", "")
        ).strip().lower()

        # submitted_value có thể là chuỗi đáp án hoặc danh sách 1 phần tử
        if isinstance(submitted_value, list):
            sub_str = str(submitted_value[0] if submitted_value else "").strip().lower()
        else:
            sub_str = str(submitted_value or "").strip().lower()

        if not sub_str:
            return (False, "Vui lòng chọn một phương án trả lời!", None)

        if sub_str == target_answer or sub_str in target_answer.split(";"):
            explanation = data.get("explanation") or "Bạn đã nhận biết chính xác chức năng của khối lệnh!"
            return (True, f"Chính xác! 🎉 {explanation}", None)

        return (
            False,
            "Đáp án chưa đúng rồi. Hãy quan sát kỹ màu sắc và chức năng của khối lệnh nhé!",
            data.get("hint") or "Đọc kỹ yêu cầu và thử lại với phương án khác.",
        )

    # -------------------------------------------------------------
    # 4. BLOCK PREDICT (Đoán kết quả kịch bản Scratch)
    # -------------------------------------------------------------
    elif engine == "block_predict":
        target_answer = str(
            data.get("answer")
            or getattr(lesson, "target_block_sequence", "")
        ).strip().lower()

        if isinstance(submitted_value, list):
            sub_str = str(submitted_value[0] if submitted_value else "").strip().lower()
        else:
            sub_str = str(submitted_value or "").strip().lower()

        if not sub_str:
            return (False, "Vui lòng chọn kết quả dự đoán của bạn!", None)

        if sub_str == target_answer or sub_str in target_answer.split(";"):
            explanation = data.get("explanation") or "Khả năng phân tích và lần vết mã nguồn (code tracing) của bạn rất tốt!"
            return (True, f"Xuất sắc! Dự đoán hoàn toàn chuẩn xác! 🔮 {explanation}", None)

        return (
            False,
            "Kết quả dự đoán chưa khớp với hành vi của kịch bản.",
            data.get("hint") or "Hãy lần vết từng lệnh từ trên xuống dưới theo chiều mũi tên.",
        )

    # -------------------------------------------------------------
    # -------------------------------------------------------------
    # 5. BLOCK DEBUG (Tìm và sửa lỗi khối lệnh)
    # -------------------------------------------------------------
    elif engine == "block_debug":
        target_seq = normalize_sequence(
            data.get("target_sequence")
            or getattr(lesson, "target_block_sequence", None)
        )
        submitted_seq = normalize_sequence(submitted_value)

        # Có thể nộp index khối bị lỗi hoặc chuỗi kịch bản đã sửa xong
        bug_index = data.get("bug_index")
        if bug_index is not None and isinstance(submitted_value, (int, str)) and str(submitted_value).isdigit():
            if int(submitted_value) == int(bug_index):
                return (True, "Chính xác! Bạn đã phát hiện đúng vị trí khối lệnh gây lỗi! 🐞🔍", None)

        if submitted_seq and target_seq and submitted_seq == target_seq:
            return (True, "Tuyệt vời! Bạn đã gỡ lỗi thành công và khôi phục kịch bản chuẩn! 🛠️🎉", None)

        return (
            False,
            "Kịch bản sau khi sửa vẫn còn lỗi hoặc chưa đúng khối cần thay thế.",
            data.get("hint") or "Quan sát xem khối lệnh nào đi ngược hướng hoặc không hợp lý.",
        )

    # -------------------------------------------------------------
    # 6. SCRATCH STUDIO (Bộ chấm điểm ngữ nghĩa AST & Runtime Telemetry)
    # -------------------------------------------------------------
    elif engine in ("scratch_studio", "scratch"):
        return evaluate_scratch_studio(submitted_value, lesson)

    # Fallback cho các engine mở rộng trong tương lai
    target_seq = normalize_sequence(getattr(lesson, "target_block_sequence", None))
    submitted_seq = normalize_sequence(submitted_value)
    if submitted_seq == target_seq:
        return (True, "Hoàn thành bài học thành công!", None)

    return (False, "Bài làm chưa chính xác. Vui lòng thử lại!", None)


BLOCK_NAMES_VN = {
    "scratch_when_flag_clicked": "Khi bấm vào cờ xanh ⛳",
    "scratch_when_sprite_clicked": "Khi bấm vào nhân vật 🐱",
    "scratch_when_key_pressed": "Khi bấm phím ⌨️",
    "scratch_broadcast_message": "Phát tin nhắn 📢",
    "scratch_when_receive_message": "Khi nhận tin nhắn 📨",
    "scratch_move_steps": "Di chuyển bước ➡️",
    "scratch_turn_right": "Quay phải ↷",
    "scratch_turn_left": "Quay trái ↶",
    "scratch_goto_xy": "Đi tới điểm x: y:",
    "scratch_point_direction": "Đặt hướng",
    "scratch_change_x_by": "Thay đổi x",
    "scratch_change_y_by": "Thay đổi y",
    "scratch_bounce_on_edge": "Bật lại nếu chạm cạnh 🔲",
    "scratch_say_for_secs": "Nói trong vài giây 💬",
    "scratch_say": "Nói 💬",
    "scratch_change_size_by": "Thay đổi kích thước",
    "scratch_set_size_to": "Đặt kích thước",
    "scratch_show": "Hiện 👁️",
    "scratch_hide": "Ẩn 🙈",
    "scratch_play_sound_meow": "Phát âm thanh Meo Meo 🐱",
    "scratch_play_drum": "Đánh trống nhịp 🥁",
    "scratch_wait_secs": "Đợi giây ⏳",
    "scratch_repeat": "Lặp lại N lần 🔄",
    "scratch_forever": "Liên tục 🔁",
    "scratch_if": "Nếu ... thì ❓",
    "scratch_if_else": "Nếu ... thì ... nếu không thì",
    "scratch_touching_edge": "Đang chạm cạnh sân khấu? 🔲",
    "scratch_touching_mouse": "Đang chạm con trỏ chuột? 🖱️",
    "scratch_set_variable_to": "Đặt biến thành 🔢",
    "scratch_change_variable_by": "Thay đổi biến một lượng ➕",
    "scratch_random_number": "Lấy ngẫu nhiên 🎲",
}


def evaluate_scratch_studio(
    submitted_value: Any,
    lesson: Any,
) -> Tuple[bool, str, Optional[str]]:
    """
    Bộ chấm điểm ngữ nghĩa (Semantic Evaluator) cho Scratch Studio:
    - Bóc tách AST khối lệnh và Telemetry vận hành thời gian thực của Sprite.
    - Hỗ trợ nhiều giải pháp đúng (Multiple Valid Solutions).
    - Kiểm tra ràng buộc: required_events, required_blocks, forbidden_blocks, max_blocks.
    - Kiểm tra runtime assertions: min_steps_moved, target_position, said_message, sound_played.
    """
    # 1. Bóc tách submitted_value (dict hoặc json string hoặc list)
    payload = {}
    if isinstance(submitted_value, dict):
        payload = submitted_value
    elif isinstance(submitted_value, str):
        submitted_str = submitted_value.strip()
        if submitted_str.startswith("{") and submitted_str.endswith("}"):
            try:
                payload = json.loads(submitted_str)
            except Exception:
                pass
        elif submitted_str.startswith("[") and submitted_str.endswith("]"):
            try:
                parsed_list = json.loads(submitted_str)
                if isinstance(parsed_list, list):
                    payload = {"sequence": parsed_list}
            except Exception:
                pass

    if not payload and isinstance(submitted_value, list):
        payload = {"sequence": submitted_value}

    # Trích xuất danh sách blocks và telemetry
    blocks = payload.get("blocks") or []
    telemetry = payload.get("telemetry") or {}
    sequence = payload.get("sequence") or []

    # Nếu không có blocks nhưng có sequence
    if not blocks and sequence:
        blocks = [{"type": str(item), "fields": {}} for item in sequence]

    if not blocks and not sequence:
        return (
            False,
            "Không gian làm việc đang trống!",
            "Hãy kéo thả các khối lệnh cần thiết vào màn hình làm việc trước khi nộp bài nhé! 💡",
        )

    # Đọc cấu hình đánh giá từ lesson
    data = parse_scene_or_data(lesson)
    eval_cfg = data.get("evaluation_config") or {}

    # Tập hợp các block types học sinh đã sử dụng
    present_types = {str(b.get("type", "")).strip() for b in blocks if isinstance(b, dict)}
    if sequence:
        present_types.update(str(s).strip() for s in sequence)

    # 2. Kiểm tra yêu cầu chạy thử kịch bản trước khi nộp
    runtime_assertions = eval_cfg.get("runtime_assertions") or {}
    require_run = eval_cfg.get("require_run_before_submit", bool(runtime_assertions))
    if require_run and not telemetry.get("has_run", False):
        return (
            False,
            "Bạn chưa bấm Cờ Xanh ⛳ để chạy thử kịch bản!",
            "Hãy bấm nút Cờ Xanh trên Sân Khấu để xem chú Mèo hoạt động trước khi nhấn Nộp bài nhé.",
        )

    # 3. Kiểm tra khối sự kiện bắt buộc (required_events)
    required_events = eval_cfg.get("required_events") or []
    for evt in required_events:
        evt_str = str(evt).strip()
        if evt_str not in present_types:
            name_vn = BLOCK_NAMES_VN.get(evt_str, evt_str)
            return (
                False,
                f"Kịch bản còn thiếu khối sự kiện '{name_vn}'!",
                "Mọi kịch bản Scratch cần bắt đầu bằng khối sự kiện (như Cờ Xanh ⛳ hoặc Nhấp vào Sprite 🐱).",
            )

    # 4. Kiểm tra các khái niệm / khối lệnh bắt buộc (required_blocks)
    required_blocks = eval_cfg.get("required_blocks") or []
    for blk in required_blocks:
        blk_str = str(blk).strip()
        if blk_str not in present_types:
            name_vn = BLOCK_NAMES_VN.get(blk_str, blk_str)
            return (
                False,
                f"Kịch bản chưa sử dụng khối lệnh '{name_vn}'!",
                f"Bài học này yêu cầu bạn áp dụng khối '{name_vn}' để hoàn thành thử thách.",
            )

    # 5. Kiểm tra các khối lệnh bị cấm (forbidden_blocks)
    forbidden_blocks = eval_cfg.get("forbidden_blocks") or []
    for blk in forbidden_blocks:
        blk_str = str(blk).strip()
        if blk_str in present_types:
            name_vn = BLOCK_NAMES_VN.get(blk_str, blk_str)
            return (
                False,
                f"Bài học không cho phép sử dụng khối '{name_vn}'.",
                "Hãy thử tìm cách giải quyết bài toán bằng các khối lệnh được hướng dẫn.",
            )

    # 6. Kiểm tra giới hạn số lượng khối lệnh (max_blocks & min_blocks)
    max_blocks = eval_cfg.get("max_blocks")
    if max_blocks and len(blocks) > int(max_blocks):
        return (
            False,
            f"Kịch bản của bạn đang dùng {len(blocks)} khối lệnh, vượt quá giới hạn {max_blocks} khối!",
            "💡 Gợi ý: Hãy dùng khối vòng lặp 'lặp lại 🔄' để gom các câu lệnh trùng lặp lại gọn gàng hơn.",
        )

    min_blocks = eval_cfg.get("min_blocks")
    if min_blocks and len(blocks) < int(min_blocks):
        return (
            False,
            f"Kịch bản quá ngắn ({len(blocks)} khối). Cần ít nhất {min_blocks} khối lệnh.",
            "Hãy bổ sung đầy đủ các bước thao tác theo yêu cầu bài học.",
        )

    # 7. Kiểm tra Runtime Telemetry Assertions (Hành vi thực tế của Sprite)
    actions = telemetry.get("actions") or {}
    final_state = telemetry.get("final_state") or {}

    # a. Quãng đường di chuyển tối thiểu
    if "min_steps_moved" in runtime_assertions:
        min_steps = float(runtime_assertions["min_steps_moved"])
        total_steps = float(actions.get("total_steps", 0))
        if total_steps < min_steps:
            return (
                False,
                f"Nhân vật mới di chuyển được {round(total_steps)} bước (yêu cầu ít nhất {round(min_steps)} bước).",
                "Hãy tăng số bước hoặc lặp lại câu lệnh di chuyển để Mèo đi đủ quãng đường.",
            )

    # b. Vị trí đích (target_position: min_x, max_x, min_y, max_y)
    if "target_position" in runtime_assertions:
        pos_cfg = runtime_assertions["target_position"]
        curr_x = float(final_state.get("x", 0))
        curr_y = float(final_state.get("y", 0))

        if "min_x" in pos_cfg and curr_x < float(pos_cfg["min_x"]):
            return (
                False,
                f"Tọa độ X của Mèo hiện tại là {round(curr_x)}, chưa đạt tới mốc tối thiểu {pos_cfg['min_x']}.",
                "Hãy cho Mèo di chuyển sang phải nhiều hơn để chạm mốc mục tiêu.",
            )
        if "max_x" in pos_cfg and curr_x > float(pos_cfg["max_x"]):
            return (
                False,
                f"Tọa độ X của Mèo hiện tại là {round(curr_x)}, đã vượt quá giới hạn {pos_cfg['max_x']}.",
                "Hãy điều chỉnh giảm số bước di chuyển lại để không vượt quá đích.",
            )
        if "min_y" in pos_cfg and curr_y < float(pos_cfg["min_y"]):
            return (
                False,
                f"Tọa độ Y của Mèo hiện tại là {round(curr_y)}, chưa đạt tới mốc tối thiểu {pos_cfg['min_y']}.",
                "Hãy kiểm tra hướng di chuyển theo trục dọc Y.",
            )

    # c. Nội dung lời nói (said_message)
    if "said_message" in runtime_assertions:
        expected_msg = str(runtime_assertions["said_message"]).strip().lower()
        messages = [str(m).strip().lower() for m in actions.get("messages_said", [])]
        speech_bubble = final_state.get("speechBubble")
        if isinstance(speech_bubble, dict) and "text" in speech_bubble:
            messages.append(str(speech_bubble["text"]).strip().lower())

        if not any(expected_msg in m for m in messages):
            return (
                False,
                f"Nhân vật chưa nói lời thoại chứa từ khóa '{expected_msg}'.",
                "Hãy kiểm tra khối lệnh 'nói ... 💬' và nhập nội dung đúng theo hướng dẫn bài học.",
            )

    # d. Âm thanh đã phát (sound_played)
    if "sound_played" in runtime_assertions:
        expected_sound = str(runtime_assertions["sound_played"]).strip().lower()
        sounds = [str(s).strip().lower() for s in actions.get("sounds_played", [])]
        if expected_sound not in sounds:
            sound_name = "tiếng Meo Meo 🐱" if expected_sound == "meow" else f"âm thanh {expected_sound}"
            return (
                False,
                f"Chưa nghe thấy {sound_name} được phát ra trong kịch bản.",
                "Hãy ghép khối phát âm thanh phù hợp để hoàn thành thử thách.",
            )

    # e. Kiểm tra biến số (min_variable_value)
    variables = telemetry.get("variables") or {}
    if "min_variable_value" in runtime_assertions:
        var_cfg = runtime_assertions["min_variable_value"]
        if isinstance(var_cfg, dict):
            for v_name, min_val in var_cfg.items():
                actual_val = float(variables.get(v_name, 0))
                if actual_val < float(min_val):
                    return (
                        False,
                        f"Giá trị biến '{v_name}' hiện tại là {actual_val}, chưa đạt mốc yêu cầu tối thiểu {min_val}.",
                        f"Hãy sử dụng khối 'đặt {v_name}' hoặc 'thay đổi {v_name}' để biến đạt ít nhất {min_val}.",
                    )

    # f. Tin nhắn đã phát (broadcast_message)
    if "broadcast_message" in runtime_assertions:
        expected_msg = str(runtime_assertions["broadcast_message"]).strip().lower()
        broadcasts = [str(b).strip().lower() for b in actions.get("messages_broadcasted", [])]
        if not any(expected_msg in b for b in broadcasts):
            return (
                False,
                f"Kịch bản chưa phát tin nhắn '{expected_msg}'.",
                "Hãy dùng khối 'phát tin nhắn 📢' với đúng nội dung thông báo bài học yêu cầu.",
            )

    # 8. Fallback khi không cấu hình evaluation_config cụ thể
    if not eval_cfg:
        target_seq = normalize_sequence(getattr(lesson, "target_block_sequence", None))
        if target_seq:
            # Cho phép thứ tự linh hoạt nếu có đủ các khối cần thiết
            target_set = set(target_seq)
            if not target_set.issubset(present_types):
                missing = [BLOCK_NAMES_VN.get(t, t) for t in target_set - present_types]
                return (
                    False,
                    f"Kịch bản còn thiếu các khối lệnh: {', '.join(missing)}.",
                    "Hãy kiểm tra lại yêu cầu bài học và bổ sung các khối lệnh còn thiếu.",
                )

    success_msg = (
        eval_cfg.get("custom_success_message")
        or "Tuyệt vời! Bạn đã hoàn thành xuất sắc thử thách Scratch Studio! 🐱🎉🚀"
    )
    return (True, success_msg, None)

