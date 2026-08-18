"""
Port 1:1 từ server.ts (getFallbackTemplateData + generateFallbackGame + prompt Gemini).
Dùng khi:
  - Chưa cấu hình GEMINI_API_KEY -> trả về game mẫu dựng sẵn (fallback).
  - Có GEMINI_API_KEY -> gọi Gemini sinh game thật (generate_game_with_gemini).
"""
import os
import json
import time
from typing import Optional


def get_fallback_template_data(template: str, topic: str, level_num: int) -> dict:
    if template == "quiz":
        return {
            "options": [
                f"A. {topic} tối ưu hóa",
                "B. Phương án gây bối rối",
                "C. Sai lệch thông tin phụ",
                "D. Đang gây nhiễu học sinh",
            ],
            "answer": "A",
            "explanation": f"Đáp án A chính là cốt lõi chính xác khi chúng ta khám phá về {topic}.",
        }
    if template == "matching":
        return {
            "pairs": [
                {"left": f"Đầu A ({topic})", "right": "Lời vế sau A"},
                {"left": f"Đầu B ({topic})", "right": "Lời vế sau B"},
                {"left": f"Đầu C ({topic})", "right": "Lời vế sau C"},
                {"left": f"Đầu D ({topic})", "right": "Lời vế sau D"},
            ]
        }
    if template == "sequence":
        return {
            "sequence": [str(5 * level_num), str(10 * level_num), str(15 * level_num), "?"],
            "options": [str(20 * level_num), "50", "30", "0"],
            "answer": str(20 * level_num),
            "explanation": f"Quy luật tịnh tiến cộng đều đặn thêm {5 * level_num} đơn vị.",
        }
    if template == "memory":
        return {"theme": "trai_cay", "items": ["🍎", "🍌", "🍓", "🍊"]}
    if template == "language":
        return {
            "type": "fill_in_the_blank",
            "sentence": "Con mèo bắt con _ dưới gầm tủ nhà bé.",
            "options": ["chuột 🐭", "chim 🐦", "chó 🐶", "bướm 🦋"],
            "answer": "chuột 🐭",
            "explanation": "Trong tự nhiên mèo săn bắt chuột bảo vệ mùa màng.",
        }
    if template == "observation":
        return {
            "type": "spot_different",
            "grid": [
                ["⭐", "⭐", "⭐", "⭐"],
                ["⭐", "🌟", "⭐", "⭐"],
                ["⭐", "⭐", "⭐", "⭐"],
            ],
            "answer": "🌟",
            "target_row": 1,
            "target_col": 1,
            "explanation": "Ngôi sao đa sắc lấp lánh (🌟) nổi bật hơn nhiều so với nguyên bản!",
        }
    if template == "sorting":
        return {
            "instruction": "Sắp xếp theo thứ tự thứ sinh trưởng hoặc tăng dần",
            "items": [
                {"id": "1", "label": "Hạt giống mầm 🌱"},
                {"id": "2", "label": "Cây nhỏ nở lá 🌿"},
                {"id": "3", "label": "Nụ hoa rực hồng 🌸"},
                {"id": "4", "label": "Quả chín ngọt ngào 🍎"},
            ],
            "correct_sequence_ids": ["1", "2", "3", "4"],
            "explanation": "Vòng đời phát triển hạt tạo nên cây ăn quả mọng tuyệt hảo!",
        }
    if template == "flashcard":
        return {
            "cards": [
                {"front": f"Thuật ngữ {topic}", "back": "Giá trị định nghĩa chi tiết",
                 "fact": "Sự thật bất ngờ thú vị", "pronounce": "Cách đọc chuẩn mực"},
                {"front": f"Góc ghi nhớ ({topic})", "back": "Lưu bút bách khoa lý giải",
                 "fact": "Ý tưởng thúc đẩy tư duy", "pronounce": "Từ khóa chính"},
            ],
            "explanation": "Bài học ghi nhớ tốc ký bổ trợ!",
        }
    if template == "scratch":
        return {
            "cat_pos": [0, 0],
            "star_pos": [2, 0],
            "start_scene_json": '{"cat_pos":[0,0],"star_pos":[2,0]}',
            "target_block_sequence": "move_forward,move_forward",
            "explanation": "Vượt 2 ô thẳng hướng để mèo đoạt sao lấp lánh.",
        }
    # coding hoặc mặc định
    return {
        "challenge": "Sửa lỗi cú pháp lệnh gán dữ liệu logic:",
        "code_block": "biến x = 5\nprint(x)",
        "options": [
            "Sửa 'biến x = 5' thành 'x = 5'",
            "Thêm dấu ngoặc vuông",
            "Xoá hoàn toàn biến",
        ],
        "answer": "Sửa 'biến x = 5' thành 'x = 5'",
        "explanation": "Trong Python, khai báo biến không sử dụng từ khóa 'biến'.",
    }


def generate_fallback_game(
    topic: str, template: str, grade_from: int, grade_to: int,
    category: str, price: int, creator_id: Optional[str], creator_name: str
) -> dict:
    base_id = f"ai_fallback_{int(time.time() * 1000)}"
    levels = [
        {
            "level_num": 1, "title": "Màn 1: Tiếp Cận Toàn Cầu",
            "xp_reward": 80, "coin_reward": 15,
            "questions": [{
                "id": f"{base_id}_q1", "question_type": template,
                "prompt": f'Tìm hiểu về "{topic}". Hãy thực hành giải mã thử thách mức 1 nhẹ nhàng!',
                "points": 20, "data": get_fallback_template_data(template, topic, 1),
            }],
        },
        {
            "level_num": 2, "title": "Màn 2: Đột Phá Tri Thức",
            "xp_reward": 100, "coin_reward": 20,
            "questions": [{
                "id": f"{base_id}_q2", "question_type": template,
                "prompt": f'Nâng cấp cấp độ về chủ đề "{topic}". Hãy tinh lọc tư duy để tìm ra đáp án!',
                "points": 25, "data": get_fallback_template_data(template, topic, 2),
            }],
        },
        {
            "level_num": 3, "title": "Màn 3: Master Siêu Việt Nhí",
            "xp_reward": 150, "coin_reward": 35,
            "questions": [{
                "id": f"{base_id}_q3", "question_type": template,
                "prompt": f'Chùm thử thách cuối cùng của bài học "{topic}". Giành vinh quang tuyệt đối!',
                "points": 40, "data": get_fallback_template_data(template, topic, 3),
            }],
        },
    ]

    return {
        "id": base_id,
        "title": f"AI: {topic} 🤖",
        "description": f'Trải nghiệm học tập tự động được sinh bởi AI về "{topic}".',
        "detailed_description": (
            f'Rèn luyện toàn diện khả năng phản xạ và tư duy chiều sâu của học sinh xung quanh '
            f'nội dung "{topic}". Trò chơi được tối ưu hóa đặc thù cho các bé lớp {grade_from} - Lớp {grade_to}.'
        ),
        "thumbnail": "🤖",
        "price": price,
        "grade_from": grade_from,
        "grade_to": grade_to,
        "template_code": template,
        "creator_id": creator_id or "system",
        "creator_name": creator_name,
        "review_status": "pending_review",
        "is_published": False,
        "rating_avg": 5.0,
        "plays_count": 8,
        "category": category,
        "levels": levels,
    }


GEMINI_DATA_SCHEMA_RULES = """
QUY TẮC THUỘC TÍNH "data" CHO TỪNG MẪU GAME SÁNG TẠO:
1. Nếu template_code là "quiz":
   { "options": ["A. Trả lời thứ nhất", "B. Trả lời thứ hai", "C. ...", "D. ..."],
     "answer": "A" hoặc "B" hoặc "C" hoặc "D" đại diện cho đáp án đúng,
     "explanation": "Có lời giải sư phạm chi tiết để nuôi dưỡng trí thức cho bé." }

2. Nếu template_code là "matching":
   { "pairs": [ { "left": "Cặp trái 1", "right": "Cặp phải tương ứng 1" }, ... (4 cặp) ] }

3. Nếu template_code là "sequence":
   { "sequence": ["Giá trị 1", "Giá trị 2", "Giá trị 3", "?"],
     "options": ["Số đúng điền dấu chấm hỏi", "Số nhiễu 1", "Số nhiễu 2", "Số nhiễu 3"],
     "answer": "Số đúng điền dấu chấm hỏi",
     "explanation": "Chỉ rõ quy luật toán học logic." }

4. Nếu template_code là "memory":
   { "theme": "con_vat" hoặc "trai_cay" hoặc "truong_hoc",
     "items": ["Emoji_A", "Emoji_B", "Emoji_C", "Emoji_D"] }

5. Nếu template_code là "language":
   { "type": "fill_in_the_blank" hoặc "unscramble",
     "sentence": "Câu đố ngữ pháp", "options": [...], "answer": "...",
     "scrambled_words": [...], "correct_order": [...],
     "explanation": "..." }

6. Nếu template_code là "observation":
   { "type": "spot_different", "grid": [[...],[...],[...]],
     "answer": "...", "target_row": 1, "target_col": 1, "explanation": "..." }

7. Nếu template_code là "sorting":
   { "instruction": "...", "items": [{"id":"1","label":"..."}, ...],
     "correct_sequence_ids": ["1","2","3","4"], "explanation": "..." }

8. Nếu template_code là "flashcard":
   { "cards": [{"front":"...","back":"...","fact":"...","pronounce":"..."}, ...],
     "explanation": "..." }

9. Nếu template_code là "scratch":
   { "cat_pos": [0,0], "star_pos": [3,2],
     "start_scene_json": "{\\"cat_pos\\":[0,0],\\"star_pos\\":[3,2]}",
     "target_block_sequence": "move_forward,move_forward,move_forward", "explanation": "..." }

10. Nếu template_code là "coding":
    { "challenge": "...", "code_block": "...", "options": [...], "answer": "...", "explanation": "..." }
"""


def build_gemini_prompt(topic: str, template_code: str, grade_from: int, grade_to: int, category: str) -> str:
    ts = int(time.time() * 1000)
    return f"""Sáng tạo một trò chơi EdTech hoàn chỉnh dành cho học sinh Việt Nam.
Chủ đề học tập cụ thể: "{topic}"
Loại mẫu trò chơi (template_code): "{template_code}"
Độ tuổi mục tiêu: Lớp {grade_from} đến Lớp {grade_to}
Phân loại chủ đề: {category}

Bạn PHẢI trả về duy nhất một cấu trúc đối tượng JSON hợp lệ như sau:
{{
  "id": "ai_g_{ts}",
  "title": "Tên trò chơi xuất sắc bằng tiếng Việt (kèm biểu tượng emoji sinh động)",
  "description": "Lời giới thiệu tóm tắt ngắn (bằng Tiếng Việt)",
  "detailed_description": "Mô tả giá trị sư phạm (bằng Tiếng Việt)",
  "thumbnail": "1 emoji ngộ nghĩnh",
  "price": {price if (price := 0) else 0},
  "grade_from": {grade_from},
  "grade_to": {grade_to},
  "template_code": "{template_code}",
  "category": "{category}",
  "levels": [
    {{ "level_num": 1, "title": "Màn 1: Khởi Động Đột Phá", "xp_reward": 80, "coin_reward": 15,
       "questions": [{{ "id": "ai_q_{ts}_1", "question_type": "{template_code}",
       "prompt": "Yêu cầu chi tiết hướng dẫn trẻ học cho màn số 1", "points": 20,
       "data": [ĐỐI TƯỢNG DATA CHI TIẾT THEO THỂ LOẠI {template_code}] }}] }},
    {{ "level_num": 2, "title": "Màn 2: Thử Thách Vực Sâu", "xp_reward": 100, "coin_reward": 20,
       "questions": [{{ "id": "ai_q_{ts}_2", "question_type": "{template_code}",
       "prompt": "Yêu cầu câu đố/hướng dẫn nâng cấp của màn 2", "points": 25,
       "data": [ĐỐI TƯỢNG DATA CHI TIẾT THEO THỂ LOẠI {template_code}] }}] }},
    {{ "level_num": 3, "title": "Màn 3: Thành Tựu Thông Thái", "xp_reward": 150, "coin_reward": 35,
       "questions": [{{ "id": "ai_q_{ts}_3", "question_type": "{template_code}",
       "prompt": "Thử thách chung kết siêu cấp bách khoa để hoàn thành màn số 3", "points": 40,
       "data": [ĐỐI TƯỢNG DATA CHI TIẾT THEO THỂ LOẠI {template_code}] }}] }}
  ]
}}
{GEMINI_DATA_SCHEMA_RULES}
"""


def generate_game_with_gemini(topic: str, template_code: str, grade_from: int, grade_to: int, category: str) -> dict:
    """Gọi Gemini thật. Cần package `google-genai` + biến môi trường GEMINI_API_KEY."""
    from google import genai
    from google.genai import types

    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    prompt = build_gemini_prompt(topic, template_code, grade_from, grade_to, category)

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    output_text = response.text or "{}"
    generated_game = json.loads(output_text)

    if not generated_game.get("title") or not generated_game.get("levels"):
        raise ValueError(f"Phản hồi JSON của Gemini bị thiếu trường hoặc không chuẩn định dạng: {output_text}")

    return generated_game
