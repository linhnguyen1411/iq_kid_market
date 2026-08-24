"""Cấu hình màn chơi mặc định cho mọi bài học / game."""

DEFAULT_LEVEL_COUNT = 20
FREE_LEVEL_COUNT = 5
# Giá mở khóa 15 màn còn lại khi AI tạo game (xu)
DEFAULT_UNLOCK_PRICE = 15000

# Thể loại chỉ dùng text/emoji/JSON — giáo viên import pack không cần upload media
TEXT_PACK_TEMPLATES = frozenset({
    "quiz",
    "matching",
    "sequence",
    "math",
    "memory",
    "language",
    "observation",
    "sorting",
    "flashcard",
    "coding",
})


def is_level_free(level_num: int) -> bool:
    return 1 <= int(level_num) <= FREE_LEVEL_COUNT


def can_access_level(level_num: int, is_purchased: bool) -> bool:
    """Màn 1–5 luôn mở; màn 6+ cần đã mua game bằng ví."""
    return is_level_free(level_num) or bool(is_purchased)


def is_text_pack_template(template_code: str) -> bool:
    return (template_code or "").strip().lower() in TEXT_PACK_TEMPLATES
