"""
Hệ thống sinh nội dung học tập thông minh EdTech tích hợp Google Gemini AI SDK.
- Hỗ trợ 10 loại Game Engine (matching, quiz, sequence, memory, language, observation, sorting, flashcard, scratch, coding).
- Structured JSON Output + JSON Sanitizer & Auto-fixer.
- Bộ lọc an toàn nội dung trẻ em K-12.
- Graceful Fallback Mode khi không có API Key hoặc hết quota.
"""
import os
import re
import json
import time
from typing import Optional

from .game_config import DEFAULT_LEVEL_COUNT, FREE_LEVEL_COUNT, DEFAULT_UNLOCK_PRICE

# Danh sách từ khóa cấm/nhạy cảm không phù hợp với lứa tuổi học sinh
UNSAFE_KEYWORDS = [
    "bạo lực", "đánh nhau", "vũ khí", "súng", "dao", "cờ bạc", "ma túy", "rượu", "thuốc lá",
    "khiêu dâm", "sex", "tự tử", "chết chóc", "máu me", "khủng bố", "lừa đảo",
]


def is_content_safe_for_kids(text: str) -> tuple[bool, str]:
    """Kiểm tra an toàn nội dung cho học sinh K-12."""
    lower_text = text.lower()
    for kw in UNSAFE_KEYWORDS:
        if kw in lower_text:
            return False, f"Chủ đề chứa nội dung không phù hợp với trẻ em ({kw}). Vui lòng chọn chủ đề mang tính giáo dục!"
    return True, ""


def clean_json_string(raw_text: str) -> str:
    """
    Làm sạch chuỗi JSON:
    - Bóc tách khối markdown ```json ... ```
    - Sử dụng Regex bóc đúng đối tượng { ... }
    - Tự động sửa lỗi Trailing Commas (dấu phẩy thừa ở cuối mảng/object)
    """
    if not raw_text:
        return "{}"

    cleaned = raw_text.strip()

    # Bóc markdown block
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    cleaned = cleaned.strip()

    # Tìm khối JSON đầu tiên nếu có văn bản thừa bao quanh
    json_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
    if json_match:
        cleaned = json_match.group(1).strip()

    # Sửa lỗi Trailing Commas: ", \n }" hoặc ", \n ]"
    cleaned = re.sub(r",\s*([\}\]])", r"\1", cleaned)

    return cleaned


def get_fallback_template_data(template: str, topic: str, level_num: int) -> dict:
    """Tạo dữ liệu câu hỏi mẫu chuẩn sư phạm theo đúng quy tắc GAME_ENGINE_RULES.md."""
    if template == "quiz":
        return {
            "options": [
                f"A. {topic} - Khái niệm trọng tâm",
                "B. Phương án gây nhiễu 1",
                "C. Phương án gây nhiễu 2",
                "D. Phương án gây nhiễu 3",
            ],
            "answer": "A",
            "explanation": f"Đáp án A chính là cốt lõi chính xác khi chúng ta khám phá về chủ đề '{topic}'.",
        }
    if template == "matching":
        return {
            "pairs": [
                {"left": f"Cặp 1 ({topic})", "right": "Đặc điểm 1 tương ứng"},
                {"left": f"Cặp 2 ({topic})", "right": "Đặc điểm 2 tương ứng"},
                {"left": f"Cặp 3 ({topic})", "right": "Đặc điểm 3 tương ứng"},
                {"left": f"Cặp 4 ({topic})", "right": "Đặc điểm 4 tương ứng"},
            ]
        }
    if template == "sequence":
        step = 5 * level_num
        return {
            "sequence": [str(step), str(step * 2), str(step * 3), "?"],
            "options": [str(step * 4), str(step * 4 + 5), str(step * 3 + 2), "0"],
            "answer": str(step * 4),
            "explanation": f"Quy luật toán học: Mỗi số sau bằng số trước cộng thêm {step} đơn vị.",
        }
    if template == "memory":
        return {"theme": "trai_cay", "items": ["🍎", "🍌", "🍓", "🍊", "🍇", "🍉"]}
    if template == "language":
        return {
            "type": "fill_in_the_blank",
            "sentence": f"Khám phá chủ đề '{topic}' giúp chúng ta mở mang _ rất nhiều.",
            "options": ["kiến thức 📚", "quần áo 👕", "đồ chơi 🧸", "bánh kẹo 🍬"],
            "answer": "kiến thức 📚",
            "explanation": "Học tập và rèn luyện tư duy luôn mang lại kiến thức bổ ích cho học sinh.",
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
            "explanation": "Ngôi sao đa sắc lấp lánh (🌟) là điểm khác biệt duy nhất trong khung quan sát!",
        }
    if template == "sorting":
        return {
            "instruction": f"Sắp xếp quy trình tìm hiểu về '{topic}' theo đúng trình tự:",
            "items": [
                {"id": "1", "label": "Bước 1: Quan sát hiện tượng 🌱"},
                {"id": "2", "label": "Bước 2: Thu thập thông tin 🔍"},
                {"id": "3", "label": "Bước 3: Phân tích quy luật 💡"},
                {"id": "4", "label": "Bước 4: Tổng kết ứng dụng 🏆"},
            ],
            "correct_sequence_ids": ["1", "2", "3", "4"],
            "explanation": "Quy trình khoa học tuần tự giúp bé hiểu sâu và nhớ lâu hơn.",
        }
    if template == "flashcard":
        return {
            "cards": [
                {
                    "front": f"Khái niệm: {topic}",
                    "back": "Nội dung định nghĩa chi tiết dễ nhớ",
                    "fact": "Một sự thật khoa học vô cùng thú vị!",
                    "pronounce": "Cách đọc chuẩn mực",
                },
                {
                    "front": f"Ứng dụng của {topic}",
                    "back": "Cách ứng dụng vào đời sống hàng ngày",
                    "fact": "Giúp ích rất nhiều cho việc học tập",
                    "pronounce": "Từ khóa chính",
                },
            ],
            "explanation": "Ghi nhớ nhanh qua thẻ Flashcard sinh động.",
        }
    if template == "scratch":
        return {
            "cat_pos": [0, 0],
            "star_pos": [2, 0],
            "start_scene_json": '{"cat_pos":[0,0],"star_pos":[2,0]}',
            "target_block_sequence": "move_forward,move_forward",
            "explanation": "Ghép 2 khối lệnh 'Đi thẳng' để Mèo Scratch thu thập ngôi sao thành công.",
        }
    if template == "math":
        return {
            "expression": f"{12 * level_num} + {8 * level_num} = ?",
            "options": [str(20 * level_num), str(20 * level_num + 5), str(20 * level_num - 5), "10"],
            "answer": str(20 * level_num),
            "explanation": f"Thực hiện phép tính cộng: {12 * level_num} + {8 * level_num} = {20 * level_num}.",
        }
    # coding hoặc mặc định
    return {
        "challenge": "Sửa lỗi cú pháp lệnh gán dữ liệu:",
        "code_block": "biến diem_so = 100\nprint(diem_so)",
        "options": [
            "Sửa 'biến diem_so = 100' thành 'diem_so = 100'",
            "Thêm dấu ngoặc vuông",
            "Xoá hoàn toàn biến",
        ],
        "answer": "Sửa 'biến diem_so = 100' thành 'diem_so = 100'",
        "explanation": "Trong ngôn ngữ lập trình Python, khai báo biến không dùng từ khóa 'biến'.",
    }


def _level_title(level_num: int, topic: str) -> str:
    if level_num <= FREE_LEVEL_COUNT:
        return f"Màn {level_num}: Làm quen — {topic} 🌱"
    if level_num <= 12:
        return f"Màn {level_num}: Thử thách — {topic} ⚡"
    if level_num <= 18:
        return f"Màn {level_num}: Nâng cao — {topic} 🚀"
    return f"Màn {level_num}: Chinh phục — {topic} 🏆"


def build_level(base_id: str, template: str, topic: str, level_num: int) -> dict:
    """Tạo 1 màn chơi hoàn chỉnh (1 câu hỏi) theo độ khó tăng dần."""
    xp = 60 + level_num * 8
    coins = 10 + level_num * 2
    points = 15 + level_num
    return {
        "level_num": level_num,
        "title": _level_title(level_num, topic),
        "xp_reward": xp,
        "coin_reward": coins,
        "is_free": level_num <= FREE_LEVEL_COUNT,
        "questions": [{
            "id": f"{base_id}_q{level_num}",
            "question_type": template,
            "prompt": f'Màn {level_num}: Khám phá "{topic}" (độ khó {level_num}/{DEFAULT_LEVEL_COUNT}):',
            "points": points,
            "data": get_fallback_template_data(template, topic, level_num),
        }],
    }


def ensure_level_count(
    levels: list | None,
    topic: str,
    template: str,
    base_id: str,
    count: int = DEFAULT_LEVEL_COUNT,
) -> list:
    """Chuẩn hoá đúng `count` màn: cắt bớt nếu thừa, pad fallback nếu thiếu."""
    normalized: list = []
    seen = set()
    for raw in levels or []:
        if not isinstance(raw, dict):
            continue
        try:
            num = int(raw.get("level_num") or 0)
        except (TypeError, ValueError):
            continue
        if num < 1 or num > count or num in seen:
            continue
        seen.add(num)
        item = dict(raw)
        item["level_num"] = num
        item["is_free"] = num <= FREE_LEVEL_COUNT
        if not item.get("title"):
            item["title"] = _level_title(num, topic)
        if not item.get("questions"):
            item["questions"] = build_level(base_id, template, topic, num)["questions"]
        normalized.append(item)

    by_num = {int(lv["level_num"]): lv for lv in normalized}
    result = []
    for n in range(1, count + 1):
        result.append(by_num.get(n) or build_level(base_id, template, topic, n))
    return result


def generate_fallback_game(
    topic: str,
    template: str,
    grade_from: int,
    grade_to: int,
    category: str,
    price: int = DEFAULT_UNLOCK_PRICE,
    creator_id: Optional[str] = None,
    creator_name: str = "Hệ Thống Giáo Án EdTech",
) -> dict:
    """Tạo bộ game đủ DEFAULT_LEVEL_COUNT màn khi không có Gemini."""
    base_id = f"ai_fallback_{int(time.time() * 1000)}"
    levels = [build_level(base_id, template, topic, n) for n in range(1, DEFAULT_LEVEL_COUNT + 1)]

    return {
        "id": base_id,
        "title": f"{topic} Kỳ Thú 🤖",
        "description": (
            f'Bộ {DEFAULT_LEVEL_COUNT} màn chơi về "{topic}" '
            f'({FREE_LEVEL_COUNT} màn miễn phí, {DEFAULT_LEVEL_COUNT - FREE_LEVEL_COUNT} màn mở khóa bằng ví).'
        ),
        "detailed_description": (
            f'Rèn luyện toàn diện năng lực phản xạ, tư duy logic và kiến thức bài bản xung quanh '
            f'nội dung "{topic}". Gồm {DEFAULT_LEVEL_COUNT} màn hoàn chỉnh cho học sinh '
            f'Lớp {grade_from} - Lớp {grade_to}. {FREE_LEVEL_COUNT} màn đầu miễn phí; '
            f'{DEFAULT_LEVEL_COUNT - FREE_LEVEL_COUNT} màn còn lại mở khóa bằng ví xu.'
        ),
        "thumbnail": "🤖",
        "price": price if price and price > 0 else DEFAULT_UNLOCK_PRICE,
        "grade_from": grade_from,
        "grade_to": grade_to,
        "template_code": template,
        "creator_id": creator_id or "system",
        "creator_name": creator_name,
        "review_status": "pending_review",
        "is_published": False,
        "rating_avg": 5.0,
        "plays_count": 0,
        "category": category,
        "levels": levels,
    }


def get_fallback_single_question(topic: str, template_code: str, grade: int = 2) -> dict:
    """Tạo 1 câu hỏi đơn lẻ mẫu theo chủ đề."""
    ts = int(time.time() * 1000)
    return {
        "id": f"ai_single_q_{ts}",
        "question_type": template_code,
        "prompt": f'Thử thách rèn luyện tư duy: Khám phá kiến thức "{topic}" (Dành cho Lớp {grade}):',
        "points": 25,
        "data": get_fallback_template_data(template_code, topic, 1),
    }


GEMINI_DATA_SCHEMA_RULES = """
QUY TẮC CẤU TRÚC THUỘC TÍNH "data" CHO TỪNG LOẠI GAME ENGINE:
1. "quiz":
   { "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
     "answer": "A",
     "explanation": "Lời giải thích sư phạm chi tiết." }

2. "matching":
   { "pairs": [ { "left": "Vế trái 1", "right": "Vế phải 1 tương ứng" }, { "left": "Vế trái 2", "right": "Vế phải 2" }, { "left": "Vế trái 3", "right": "Vế phải 3" }, { "left": "Vế trái 4", "right": "Vế phải 4" } ] }

3. "sequence":
   { "sequence": ["2", "4", "6", "?"],
     "options": ["8", "10", "12", "14"],
     "answer": "8",
     "explanation": "Quy luật cộng dồn thêm 2 đơn vị." }

4. "memory":
   { "theme": "trai_cay", "items": ["🍎", "🍌", "🍓", "🍊", "🍇", "🍉"] }

5. "language":
   { "type": "fill_in_the_blank",
     "sentence": "Học sinh luôn chăm chỉ _ bài tập về nhà.",
     "options": ["làm ✍️", "xé 📄", "bỏ ❌", "quên 💤"],
     "answer": "làm ✍️",
     "explanation": "Chăm chỉ làm bài tập giúp củng cố kiến thức đã học." }

6. "observation":
   { "type": "spot_different", "grid": [["⭐","⭐","⭐"],["⭐","🌟","⭐"],["⭐","⭐","⭐"]],
     "answer": "🌟", "target_row": 1, "target_col": 1, "explanation": "🌟 là biểu tượng khác biệt duy nhất." }

7. "sorting":
   { "instruction": "Sắp xếp vòng đời của loài bướm:",
     "items": [{"id":"1","label":"Trứng 🥚"},{"id":"2","label":"Sâu bướm 🐛"},{"id":"3","label":"Nhộng kén 🥥"},{"id":"4","label":"Bướm rực rỡ 🦋"}],
     "correct_sequence_ids": ["1","2","3","4"], "explanation": "Vòng đời sinh trưởng tự nhiên của bướm." }

8. "flashcard":
   { "cards": [{"front":"Mặt trước","back":"Mặt sau","fact":"Sự thật thú vị","pronounce":"Phát âm"}],
     "explanation": "Thẻ học nhanh ghi nhớ lâu." }

9. "scratch":
   { "cat_pos": [0,0], "star_pos": [2,0],
     "start_scene_json": "{\\"cat_pos\\":[0,0],\\"star_pos\\":[2,0]}",
     "target_block_sequence": "move_forward,move_forward", "explanation": "Di chuyển 2 bước thẳng để thu thập sao." }

10. "math":
    { "expression": "15 + 25 = ?", "options": ["40", "30", "50", "45"], "answer": "40", "explanation": "15 cộng 25 bằng 40." }

11. "coding":
    { "challenge": "Sửa lỗi cú pháp lệnh gán dữ liệu:", "code_block": "biến x = 5", "options": ["Sửa thành x = 5", "Thêm dấu ngoặc", "Xóa biến"], "answer": "Sửa thành x = 5", "explanation": "Python không dùng từ khóa biến." }
"""


def build_gemini_prompt(topic: str, template_code: str, grade_from: int, grade_to: int, category: str) -> str:
    ts = int(time.time() * 1000)
    paid = DEFAULT_LEVEL_COUNT - FREE_LEVEL_COUNT
    return f"""Bạn là Chuyên Gia Thiết Kế Giáo Án EdTech Việt Nam. Hãy tạo 1 trò chơi học tập ĐỦ {DEFAULT_LEVEL_COUNT} MÀN hoàn chỉnh.
Chủ đề: "{topic}"
template_code: "{template_code}"
Đối tượng: Lớp {grade_from} đến Lớp {grade_to}
Thể loại: {category}

QUY TẮC MÀN CHƠI:
- Đúng {DEFAULT_LEVEL_COUNT} phần tử trong "levels", level_num từ 1 đến {DEFAULT_LEVEL_COUNT}.
- Màn 1–{FREE_LEVEL_COUNT}: miễn phí (is_free=true), độ khó nhẹ.
- Màn {FREE_LEVEL_COUNT + 1}–{DEFAULT_LEVEL_COUNT}: trả phí mở khóa ví (is_free=false), độ khó tăng dần.
- Mỗi màn có đúng 1 câu hỏi trong "questions", data đúng schema của "{template_code}".
- Nội dung tiếng Việt, phù hợp học sinh tiểu học, không trùng lặp đáp án giữa các màn.

Trả về DUY NHẤT JSON hợp lệ (không markdown, không giải thích):
{{
  "id": "ai_g_{ts}",
  "title": "Tên trò chơi Tiếng Việt + 1 emoji",
  "description": "Tóm tắt mục tiêu bài học",
  "detailed_description": "Giá trị sư phạm; nêu rõ {FREE_LEVEL_COUNT} màn free + {paid} màn mở khóa ví",
  "thumbnail": "1 emoji",
  "price": {DEFAULT_UNLOCK_PRICE},
  "grade_from": {grade_from},
  "grade_to": {grade_to},
  "template_code": "{template_code}",
  "category": "{category}",
  "levels": [
    {{
      "level_num": 1,
      "title": "Màn 1: ...",
      "xp_reward": 80,
      "coin_reward": 15,
      "is_free": true,
      "questions": [{{
        "id": "ai_q_{ts}_1",
        "question_type": "{template_code}",
        "prompt": "Hướng dẫn màn 1",
        "points": 20,
        "data": {{ }}
      }}]
    }}
  ]
}}
(Lặp cấu trúc level đủ {DEFAULT_LEVEL_COUNT} màn; chỉ minh họa màn 1 ở trên.)

{GEMINI_DATA_SCHEMA_RULES}
"""


def generate_game_with_gemini(
    topic: str,
    template_code: str,
    grade_from: int = 1,
    grade_to: int = 5,
    category: str = "iq",
) -> dict:
    """Gọi Gemini sinh game đủ DEFAULT_LEVEL_COUNT màn. Fallback nếu không có API key."""
    safe, msg = is_content_safe_for_kids(topic)
    if not safe:
        raise ValueError(msg)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return generate_fallback_game(topic, template_code, grade_from, grade_to, category)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        prompt = build_gemini_prompt(topic, template_code, grade_from, grade_to, category)

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )

        output_text = clean_json_string(response.text or "{}")
        game_data = json.loads(output_text)

        if not game_data.get("title") or not game_data.get("levels"):
            raise ValueError("Phản hồi Gemini thiếu trường title hoặc levels.")

        game_id = game_data.get("id") or f"ai_g_{int(time.time() * 1000)}"
        game_data["id"] = game_id
        game_data["levels"] = ensure_level_count(
            game_data.get("levels"),
            topic=topic,
            template=template_code,
            base_id=game_id,
            count=DEFAULT_LEVEL_COUNT,
        )
        if not game_data.get("price") or int(game_data.get("price") or 0) <= 0:
            game_data["price"] = DEFAULT_UNLOCK_PRICE
        return game_data
    except Exception as e:
        print(f"⚠️ [Gemini AI Warning] Không thể kết nối Gemini API: {e} -> Tự động chuyển Fallback Mode an toàn.")
        return generate_fallback_game(topic, template_code, grade_from, grade_to, category)


def generate_single_question_with_gemini(
    topic: str,
    template_code: str,
    grade: int = 2,
    category: str = "iq",
) -> dict:
    """Sinh 1 câu hỏi đơn lẻ phục vụ giáo viên soạn giáo án."""
    safe, msg = is_content_safe_for_kids(topic)
    if not safe:
        raise ValueError(msg)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return get_fallback_single_question(topic, template_code, grade)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        ts = int(time.time() * 1000)
        prompt = f"""Hãy tạo 1 câu hỏi/thử thách giáo dục duy nhất cho học sinh Lớp {grade}.
Chủ đề: "{topic}"
Loại mẫu (template_code): "{template_code}"
Thể loại: {category}

Trả về DUY NHẤT một JSON Object như sau:
{{
  "id": "ai_q_{ts}",
  "question_type": "{template_code}",
  "prompt": "Lời yêu cầu/câu hỏi rõ ràng cho bé bằng Tiếng Việt",
  "points": 25,
  "data": {{ ... đối tượng data chuẩn theo thể loại {template_code} ... }}
}}

{GEMINI_DATA_SCHEMA_RULES}
"""
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        output_text = clean_json_string(response.text or "{}")
        question_data = json.loads(output_text)
        return question_data
    except Exception as e:
        print(f"⚠️ [Gemini AI Warning] Lỗi khi sinh câu hỏi đơn lẻ: {e} -> Sử dụng Fallback.")
        return get_fallback_single_question(topic, template_code, grade)
