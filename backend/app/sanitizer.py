import re
import json
from typing import Any
from fastapi import HTTPException

# Regex loại bỏ script, iframe, object, embed và các thẻ HTML
RE_SCRIPT = re.compile(r"<\s*script[^>]*>[\s\S]*?<\s*/\s*script\s*>", re.IGNORECASE)
RE_IFRAME = re.compile(r"<\s*iframe[^>]*>[\s\S]*?<\s*/\s*iframe\s*>", re.IGNORECASE)
RE_OBJECT = re.compile(r"<\s*object[^>]*>[\s\S]*?<\s*/\s*object\s*>", re.IGNORECASE)
RE_STYLE = re.compile(r"<\s*style[^>]*>[\s\S]*?<\s*/\s*style\s*>", re.IGNORECASE)
RE_HTML_TAGS = re.compile(r"<\s*/?\s*[a-zA-Z][a-zA-Z0-9_-]*(\s+[^>]*)?/?>", re.IGNORECASE)
RE_EVENT_HANDLERS = re.compile(r"\bon\w+\s*=", re.IGNORECASE)
RE_JAVASCRIPT_URI = re.compile(r"javascript\s*:", re.IGNORECASE)

MAX_IMPORT_PAYLOAD_BYTES = 2 * 1024 * 1024  # 2MB
MAX_JSON_DEPTH = 10
MAX_IMPORT_GAMES = 50
MAX_IMPORT_LEVELS = 100


def sanitize_text(text: str) -> str:
    """
    Làm sạch một chuỗi văn bản:
    - Loại bỏ thẻ script, iframe, object, style.
    - Loại bỏ các thẻ HTML thông thường để đối xử như plain-text an toàn.
    - Loại bỏ giao thức javascript: và các thuộc tính bắt sự kiện (onerror=, onload=...).
    - Không làm hỏng các biểu thức toán học như 3 < 5 hay 10 > 2.
    """
    if not isinstance(text, str):
        return text

    cleaned = RE_SCRIPT.sub("", text)
    cleaned = RE_IFRAME.sub("", cleaned)
    cleaned = RE_OBJECT.sub("", cleaned)
    cleaned = RE_STYLE.sub("", cleaned)
    cleaned = RE_HTML_TAGS.sub("", cleaned)
    cleaned = RE_EVENT_HANDLERS.sub("", cleaned)
    cleaned = RE_JAVASCRIPT_URI.sub("", cleaned)

    return cleaned.strip()


def sanitize_content_payload(obj: Any, depth: int = 0) -> Any:
    """
    Làm sạch đệ quy toàn bộ cấu trúc dữ liệu JSON (dict, list, string)
    và kiểm tra độ sâu lồng nhau để chống DoS Call Stack.
    """
    if depth > MAX_JSON_DEPTH:
        raise HTTPException(
            status_code=400,
            detail=f"Cấu trúc JSON quá phức tạp hoặc lồng sâu quá mức cho phép (tối đa {MAX_JSON_DEPTH} cấp).",
        )

    if isinstance(obj, str):
        return sanitize_text(obj)
    elif isinstance(obj, dict):
        return {
            sanitize_text(str(k)): sanitize_content_payload(v, depth + 1)
            for k, v in obj.items()
        }
    elif isinstance(obj, list):
        return [sanitize_content_payload(item, depth + 1) for item in obj]
    else:
        return obj


def validate_import_payload_limits(payload: Any) -> None:
    """
    Kiểm tra giới hạn kích thước, độ sâu và số lượng phần tử của payload import:
    - Kích thước serialized <= 2MB.
    - Độ sâu lồng nhau <= 10 cấp.
    - Số lượng games <= 50.
    """
    try:
        serialized = json.dumps(payload, ensure_ascii=False)
        payload_bytes = len(serialized.encode("utf-8"))
    except Exception as err:
        raise HTTPException(
            status_code=400,
            detail=f"Dữ liệu JSON không thể đóng gói hợp lệ: {err}",
        ) from err

    if payload_bytes > MAX_IMPORT_PAYLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Kích thước tệp import ({payload_bytes:,} bytes) vượt quá giới hạn cho phép (tối đa 2MB)!",
        )

    def _check_depth(obj: Any, current_depth: int = 0) -> None:
        if current_depth > MAX_JSON_DEPTH:
            raise HTTPException(
                status_code=400,
                detail=f"Cấu trúc JSON quá phức tạp hoặc lồng sâu quá mức cho phép (tối đa {MAX_JSON_DEPTH} cấp).",
            )
        if isinstance(obj, dict):
            for v in obj.values():
                _check_depth(v, current_depth + 1)
        elif isinstance(obj, list):
            for item in obj:
                _check_depth(item, current_depth + 1)

    _check_depth(payload)

    games_list = payload if isinstance(payload, list) else [payload]
    if len(games_list) > MAX_IMPORT_GAMES:
        raise HTTPException(
            status_code=400,
            detail=f"Số lượng trò chơi trong một gói ({len(games_list)}) vượt quá giới hạn cho phép (tối đa {MAX_IMPORT_GAMES} game)!",
        )
