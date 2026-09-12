"""Content Hasher and Engine-Aware Normalization for Question Bank & Deduplication.

Computes:
1. content_hash: SHA-256 of exact canonical JSON payload.
2. normalized_hash: SHA-256 of engine-aware normalized semantic representation
   (insensitive to casing, whitespace, punctuation, option order for quiz,
    but STRICTLY ORDER-PRESERVING for sequence, sorting, unscramble).
"""

import hashlib
import json
import re
import unicodedata
from typing import Any


def normalize_text(text: Any) -> str:
    """Chuẩn hóa chuỗi text: Unicode NFC -> lowercase -> bỏ dấu câu -> gom khoảng trắng."""
    if text is None:
        return ""
    s = str(text)
    # Unicode Normalization Form C
    s = unicodedata.normalize("NFC", s)
    s = s.lower()
    # Bỏ dấu câu thông dụng
    s = re.sub(r"""[.,?!:;'"()`\[\]{}\-_/\\#*~^=+]""", " ", s)
    # Gom khoảng trắng liên tiếp
    s = re.sub(r"\s+", " ", s).strip()
    return s


def normalize_for_duplicate(engine_code: str, prompt: str, data: dict[str, Any]) -> str:
    """
    Chuẩn hóa dữ liệu đặc thù theo từng Engine theo mục 9.1:
    - quiz: sort options, normalize prompt & answer
    - matching: ghép cặp {left}_{right} rồi sort các cặp
    - sequence: BẢO LƯU THỨ TỰ xuất hiện
    - sorting: BẢO LƯU THỨ TỰ đích (correct_sequence_ids / correct_order)
    - language / unscramble: BẢO LƯU THỨ TỰ từ/token
    - math: bỏ toàn bộ khoảng trắng biểu thức, chuẩn hóa đáp số
    - memory / flashcard: sort các thẻ
    - observation: bảo lưu tọa độ đích / target
    - logic_grid: bảo lưu luật và sort clues
    """
    norm_prompt = normalize_text(prompt)
    d = data or {}
    qt = (engine_code or "").strip().lower()

    if qt in ("quiz", "true_false", "fill_blank"):
        raw_opts = d.get("options")
        if isinstance(raw_opts, list):
            opts = sorted([normalize_text(o) for o in raw_opts if o is not None])
            opts_str = ",".join(opts)
        else:
            opts_str = ""
        ans = normalize_text(d.get("answer", ""))
        statement = normalize_text(d.get("statement", "") or d.get("sentence", "") or "")
        return f"{qt}::{norm_prompt}::{statement}::opts=[{opts_str}]::ans={ans}"

    elif qt == "matching":
        raw_pairs = d.get("pairs") or d.get("matching_pairs") or []
        pair_tokens = []
        if isinstance(raw_pairs, list):
            for p in raw_pairs:
                if isinstance(p, dict):
                    l = normalize_text(p.get("left") or p.get("term") or p.get("question") or "")
                    r = normalize_text(p.get("right") or p.get("match") or p.get("answer") or "")
                    if l or r:
                        pair_tokens.append(f"{l}_{r}")
        pair_tokens.sort()
        return f"matching::{norm_prompt}::pairs=[{','.join(pair_tokens)}]"

    elif qt == "sequence":
        # BẮT BUỘC BẢO LƯU THỨ TỰ
        raw_seq = d.get("sequence") or []
        seq_tokens = [normalize_text(x) for x in raw_seq] if isinstance(raw_seq, list) else []
        ans = normalize_text(d.get("answer", ""))
        return f"sequence::{norm_prompt}::seq=[{'->'.join(seq_tokens)}]::ans={ans}"

    elif qt == "sorting":
        # BẮT BUỘC BẢO LƯU THỨ TỰ ĐÍCH
        target = (
            d.get("correct_order")
            or d.get("correct_sequence_ids")
            or d.get("target_order")
            or d.get("items")
            or []
        )
        target_tokens = [normalize_text(x) for x in target] if isinstance(target, list) else []
        return f"sorting::{norm_prompt}::target=[{'->'.join(target_tokens)}]"

    elif qt in ("language", "unscramble"):
        target = normalize_text(
            d.get("answer") or d.get("target_word") or d.get("target_sentence") or d.get("word") or ""
        )
        tokens = (
            d.get("tokens")
            or d.get("correct_order")
            or (d.get("scrambled", "").split() if isinstance(d.get("scrambled"), str) else [])
        )
        token_strs = [normalize_text(t) for t in tokens] if isinstance(tokens, list) else []
        return f"unscramble::{norm_prompt}::target={target}::tokens=[{'->'.join(token_strs)}]"

    elif qt == "math":
        expr_raw = str(d.get("expression") or norm_prompt)
        expr = re.sub(r"\s+", "", expr_raw.lower())
        ans = normalize_text(d.get("answer", "") or d.get("result", ""))
        return f"math::{expr}::ans={ans}"

    elif qt == "memory":
        raw_items = d.get("items") or []
        items = sorted([normalize_text(i) for i in raw_items]) if isinstance(raw_items, list) else []
        return f"memory::{norm_prompt}::items=[{','.join(items)}]"

    elif qt == "flashcard":
        raw_cards = d.get("cards") or []
        cards = []
        if isinstance(raw_cards, list):
            for c in raw_cards:
                if isinstance(c, dict):
                    f = normalize_text(c.get("front", ""))
                    b = normalize_text(c.get("back", ""))
                    cards.append(f"{f}_{b}")
        cards.sort()
        return f"flashcard::{norm_prompt}::cards=[{','.join(cards)}]"

    elif qt == "observation":
        target = normalize_text(d.get("target_object") or d.get("answer") or "")
        coords = f"{d.get('target_row', '')}_{d.get('target_col', '')}"
        return f"observation::{norm_prompt}::target={target}::coords={coords}"

    elif qt in ("logic", "logic_grid"):
        raw_clues = d.get("clues") or []
        clues = sorted([normalize_text(c) for c in raw_clues]) if isinstance(raw_clues, list) else []
        ans = normalize_text(d.get("answer", ""))
        return f"logic_grid::{norm_prompt}::clues=[{','.join(clues)}]::ans={ans}"

    elif qt in ("coding", "scratch"):
        ans = normalize_text(d.get("answer", "") or d.get("target_block_sequence", "") or "")
        return f"coding::{norm_prompt}::ans={ans}"

    # Fallback cho engine mở rộng khác
    canonical_d = json.dumps(d, sort_keys=True, ensure_ascii=False)
    return f"{qt}::{norm_prompt}::{canonical_d}"


def compute_dual_hashes(engine_code: str, prompt: str, data: dict[str, Any]) -> tuple[str, str]:
    """
    Tính toán Dual Hashes:
    - content_hash: SHA-256 chuỗi JSON canonical chính xác.
    - normalized_hash: SHA-256 chuỗi chuẩn hóa ngữ nghĩa engine-aware.
    """
    canonical_payload = {
        "prompt": (prompt or "").strip(),
        "data": data or {},
    }
    content_json = json.dumps(canonical_payload, sort_keys=True, ensure_ascii=False)
    content_hash = hashlib.sha256(content_json.encode("utf-8")).hexdigest()

    normalized_repr = normalize_for_duplicate(engine_code, prompt, data or {})
    normalized_hash = hashlib.sha256(normalized_repr.encode("utf-8")).hexdigest()

    return content_hash, normalized_hash
