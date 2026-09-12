"""Deterministic Verification Module for AI Generated Questions (Phase 8).

Đảm bảo AI không phải cơ quan thẩm định cuối cùng. Mọi câu hỏi do AI sinh ra
bắt buộc phải qua bộ thẩm định thuật toán xác định (deterministic validation):
1. Math: Đánh giá lại biểu thức bằng Safe AST parser, đối soát kết quả toán học.
2. Quiz: Đảm bảo đáp án đúng thực sự nằm trong danh sách options (tối thiểu 2 options).
3. Matching: Đảm bảo các cặp ghép nối có đủ 2 vế (left & right) và tối thiểu 2 cặp.
4. Sequence / Sorting: Kiểm tra chuỗi và thứ tự logic.
5. Child safety filter & XSS sanitization.
"""

import ast
import operator
from typing import Any, Optional, Union
from .ai_content import is_content_safe_for_kids
from .sanitizer import sanitize_text
from . import schemas

# Các toán tử số học an toàn được phép trong biểu thức AST
SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def safe_eval_math_expression(expr: str) -> Optional[Union[int, float]]:
    """
    Tính toán an toàn một biểu thức số học cơ bản bằng AST parser (Không dùng eval()).
    Hỗ trợ: +, -, *, /, //, %, số nguyên và số thực.
    Trả về None nếu biểu thức chứa mã độc, gọi hàm, biến số, hoặc lỗi chia cho 0.
    """
    cleaned = (expr or "").split("=")[0].replace("x", "*").replace("X", "*").replace(":", "/").strip()
    if not cleaned:
        return None

    try:
        node = ast.parse(cleaned, mode="eval")

        def _eval(node_inner):
            if isinstance(node_inner, ast.Expression):
                return _eval(node_inner.body)
            elif isinstance(node_inner, ast.Constant):
                if isinstance(node_inner.value, (int, float)):
                    return node_inner.value
                return None
            elif isinstance(node_inner, ast.UnaryOp):
                op_func = SAFE_OPERATORS.get(type(node_inner.op))
                if op_func is None:
                    return None
                operand = _eval(node_inner.operand)
                if operand is None:
                    return None
                return op_func(operand)
            elif isinstance(node_inner, ast.BinOp):
                op_func = SAFE_OPERATORS.get(type(node_inner.op))
                if op_func is None:
                    return None
                left = _eval(node_inner.left)
                right = _eval(node_inner.right)
                if left is None or right is None:
                    return None
                # Chống chia cho 0
                if isinstance(node_inner.op, (ast.Div, ast.FloorDiv, ast.Mod)) and right == 0:
                    return None
                return op_func(left, right)
            else:
                return None

        result = _eval(node)
        if result is not None:
            # Nếu kết quả là số nguyên (ví dụ 12.0), trả về int
            if isinstance(result, float) and result.is_integer():
                return int(result)
            return round(result, 4)
        return None
    except Exception:
        return None


def verify_and_normalize_ai_question(
    template_code: str,
    prompt: str,
    data: dict[str, Any],
) -> tuple[bool, Optional[str], dict[str, Any]]:
    """
    Thẩm định tính xác định của câu hỏi AI theo từng Engine.
    Trả về (is_valid, error_message, normalized_data).
    """
    t_code = (template_code or "quiz").strip().lower()
    p = sanitize_text(prompt or "").strip()

    if len(p) < 3:
        return False, f"Đề bài quá ngắn ({len(p)} ký tự, tối thiểu 3 ký tự)", data

    # 1. Quét an toàn trẻ em cho đề bài
    safe_p, msg_p = is_content_safe_for_kids(p)
    if not safe_p:
        return False, f"Đề bài vi phạm an toàn trẻ em: {msg_p}", data

    if not isinstance(data, dict):
        return False, "Dữ liệu câu hỏi 'data' phải là JSON Object", {}

    # 2. Quét an toàn trẻ em cho nội dung data
    safe_d, msg_d = is_content_safe_for_kids(str(data))
    if not safe_d:
        return False, f"Dữ liệu câu hỏi chứa từ khóa nhạy cảm: {msg_d}", data

    normalized_data = dict(data)

    # 3. Thẩm định thuật toán theo từng Base Engine
    if t_code == "math":
        expr = str(normalized_data.get("expression") or "").strip()
        if not expr:
            return False, "Engine 'math' bắt buộc phải có trường 'expression'", normalized_data
        calculated = safe_eval_math_expression(expr)
        if calculated is None:
            return False, f"Biểu thức toán học không an toàn hoặc không thể giải: '{expr}'", normalized_data

        ans_str = str(normalized_data.get("answer") or "").strip()
        try:
            ans_val = float(ans_str)
            if abs(ans_val - float(calculated)) > 1e-4:
                return (
                    False,
                    f"Đáp án AI sinh ({ans_str}) sai lệch với kết quả tính toán xác định ({calculated})",
                    normalized_data,
                )
            # Chuẩn hóa lại đáp án chính xác
            normalized_data["answer"] = str(calculated)
        except ValueError:
            return False, f"Đáp án toán học '{ans_str}' không phải là số hợp lệ", normalized_data

    elif t_code == "quiz":
        options = normalized_data.get("options")
        if not isinstance(options, list) or len(options) < 2:
            return False, "Engine 'quiz' yêu cầu trường 'options' có tối thiểu 2 lựa chọn", normalized_data

        sanitized_opts = [sanitize_text(str(o)).strip() for o in options]
        normalized_data["options"] = sanitized_opts

        ans = sanitize_text(str(normalized_data.get("answer") or "")).strip()
        # Nếu đáp án là ký tự chữ A, B, C, D -> map sang text tương ứng
        if len(ans) == 1 and ans.upper() in "ABCD":
            idx = ord(ans.upper()) - ord("A")
            if 0 <= idx < len(sanitized_opts):
                ans = sanitized_opts[idx]

        if ans not in sanitized_opts:
            return (
                False,
                f"Đáp án đúng '{ans}' không tồn tại trong danh sách lựa chọn {sanitized_opts}",
                normalized_data,
            )
        normalized_data["answer"] = ans

    elif t_code == "matching":
        pairs = normalized_data.get("pairs") or normalized_data.get("matching_pairs")
        if not isinstance(pairs, list) or len(pairs) < 2:
            return False, "Engine 'matching' yêu cầu tối thiểu 2 cặp ghép nối", normalized_data

        valid_pairs = []
        for i, pair in enumerate(pairs):
            if isinstance(pair, dict):
                left = sanitize_text(str(pair.get("left") or "")).strip()
                right = sanitize_text(str(pair.get("right") or "")).strip()
                if not left or not right:
                    return False, f"Cặp ghép #{i+1} thiếu vế trái hoặc vế phải", normalized_data
                valid_pairs.append({"left": left, "right": right})
            elif isinstance(pair, (list, tuple)) and len(pair) == 2:
                left = sanitize_text(str(pair[0])).strip()
                right = sanitize_text(str(pair[1])).strip()
                if not left or not right:
                    return False, f"Cặp ghép #{i+1} thiếu vế trái hoặc vế phải", normalized_data
                valid_pairs.append({"left": left, "right": right})
            else:
                return False, f"Cặp ghép #{i+1} không đúng cấu trúc", normalized_data

        normalized_data["pairs"] = valid_pairs

    elif t_code == "sequence":
        seq = normalized_data.get("sequence")
        if not isinstance(seq, list) or len(seq) < 2:
            return False, "Engine 'sequence' yêu cầu mảng 'sequence' có tối thiểu 2 phần tử", normalized_data
        if not str(normalized_data.get("answer") or "").strip():
            return False, "Engine 'sequence' yêu cầu trường 'answer'", normalized_data

    # 4. Kiểm tra hợp đồng dữ liệu qua schema chung
    try:
        schemas.AddLevelQuestionIn.validate_game_data(t_code, normalized_data)
    except ValueError as err:
        return False, f"Lỗi hợp đồng schema engine {t_code}: {err}", normalized_data

    return True, None, normalized_data
