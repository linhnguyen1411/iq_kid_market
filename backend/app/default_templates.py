"""Port 1:1 từ server.ts app.post("/api/admin/games") - default level data theo template_code."""
import time


def build_default_level(template_code: str) -> dict:
    ts = int(time.time() * 1000)

    data_by_template = {
        "quiz": {
            "options": ["Đáp án Đúng", "Đáp án Sai số 1", "Đáp án Sai số 2", "Đáp án Sai số 3"],
            "answer": "Đáp án Đúng",
            "explanation": "Sử dụng tri thức để lựa chọn chuẩn xác!",
        },
        "matching": {
            "pairs": [
                {"left": "Apple 🍎", "right": "Màu Đỏ"},
                {"left": "Banana 🍌", "right": "Màu Vàng"},
                {"left": "Frog 🐸", "right": "Màu Xanh"},
            ]
        },
        "sequence": {
            "sequence": ["2", "4", "8", "?"],
            "options": ["16", "10", "12", "14"],
            "answer": "16",
            "explanation": "Quy luật gấp đôi từng bước: 2x2=4, 4x2=8, 8x2=16!",
        },
        "memory": {"theme": "trai_cay", "items": ["🍎", "🍌", "🍇", "🍊"]},
        "language": {
            "type": "fill_in_the_blank",
            "sentence": "Bé thích học tiếng _ quả đất",
            "options": ["Anh", "Hàn", "Nhật", "Pháp"],
            "answer": "Anh",
            "explanation": "Học ngoại ngữ thật vui và dễ dàng.",
        },
        "observation": {
            "type": "spot_different",
            "grid": [["🐶", "🐶", "🐶"], ["🐶", "🦁", "🐶"], ["🐶", "🐶", "🐶"]],
            "answer": "🦁",
            "target_row": 1,
            "target_col": 1,
            "explanation": "Nhìn kĩ dòng 2 cột 2 là một bạn Sư Tử dũng cảm!",
        },
        "sorting": {
            "instruction": "Sắp xếp quy trình trồng hoa nảy mầm",
            "items": [
                {"id": "1", "label": "Gieo hạt mầm xuống đất 🌱"},
                {"id": "2", "label": "Tưới nước mỗi ngày 🌿"},
                {"id": "3", "label": "Đơm bông ngát hương 🌸"},
            ],
            "correct_sequence_ids": ["1", "2", "3"],
            "explanation": "Gieo mầm -> Tưới cây -> Ra hoa thơm ngát.",
        },
        "flashcard": {
            "cards": [{"front": "Watermelon", "back": "Quả dưa hấu",
                       "fact": "Có chứa 92% là nước giải khát!", "pronounce": "ˈwɔːtəmelən"}],
            "explanation": "Thẻ từ vựng trái cây mùa hè.",
        },
        "scratch": {
            "cat_pos": [0, 0], "star_pos": [3, 0],
            "start_scene_json": '{"cat_pos":[0,0],"star_pos":[3,0]}',
            "target_block_sequence": "move_forward,move_forward,move_forward",
            "explanation": "Con kéo 3 khối di chuyển liên tục để cứu Sao vàng.",
        },
        "coding": {
            "challenge": "Bé ơi hãy sửa dòng mã lỗi logic sau:",
            "code_block": "let total = 10;\nfor (let i = 0; i < 5; i++) {\n  total += 1;\n}\n// Mong muốn total = 15",
            "options": ["Giữ nguyên mã đúng", "Thay bởi total += 5", "Thay dòng khởi tạo"],
            "answer": "Giữ nguyên mã đúng",
            "explanation": "Tổng số cộng dồn 5 bước khởi chạy đã ra đúng 15!",
        },
    }

    question_data = data_by_template.get(template_code, data_by_template["coding"])
    prompt = ("Bé hãy chọn phương án chính xác nhất:" if template_code == "quiz"
              else "Bé hãy giải mã thử thách logic học đường:")

    return {
        "id": f"custom_g{ts}_l1",
        "level_num": 1,
        "title": "Màn chơi 1: Nhập Môn Trí Tuệ",
        "xp_reward": 80,
        "coin_reward": 15,
        "questions": [{
            "id": f"custom_q_{ts}_1",
            "question_type": template_code,
            "prompt": prompt,
            "points": 25,
            "data": question_data,
        }],
    }


def default_thumbnail(template_code: str) -> str:
    return {"matching": "⚡", "sequence": "🧩", "quiz": "❓"}.get(template_code, "🧠")
