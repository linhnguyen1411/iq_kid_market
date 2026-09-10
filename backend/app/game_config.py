"""Cấu hình màn chơi mặc định cho mọi bài học / game."""

DEFAULT_LEVEL_COUNT = 20
FREE_LEVEL_COUNT = 5
# Giá mở khóa 15 màn còn lại khi AI tạo game (Sao IQ)
DEFAULT_UNLOCK_PRICE = 15

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


def can_access_level(level_num: int, is_purchased: bool, *, is_admin_preview: bool = False) -> bool:
    """Màn 1–5 luôn mở; màn 6+ cần đã mua. Admin chơi thử mở toàn bộ."""
    if is_admin_preview:
        return int(level_num) >= 1
    return is_level_free(level_num) or bool(is_purchased)


def is_text_pack_template(template_code: str) -> bool:
    return (template_code or "").strip().lower() in TEXT_PACK_TEMPLATES
