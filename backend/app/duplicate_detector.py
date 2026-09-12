"""Duplicate Detection Engine based on Engine-Aware Dual Hashing & Jaccard Similarity (Phase 7).

Thuật toán đo độ tương đồng ngữ nghĩa liên trò chơi (Cross-Game Duplicate Matching):
1. Chuẩn hóa đặc thù theo từng Engine (quiz, matching, sequence, math, language, sorting, logic, memory, flashcard, observation).
2. Tính tập băm ngữ nghĩa S_A và S_B từ các câu hỏi.
3. Đo chỉ số Jaccard: J(A, B) = |S_A ∩ S_B| / |S_A ∪ S_B|.
4. Phân cấp 3 tầng ngưỡng:
   - J < 0.60: LOW (An toàn)
   - 0.60 <= J < 0.80: MEDIUM (Cảnh báo trùng lặp một phần / cần review)
   - J >= 0.80: HIGH (Nguy cơ sao chép / clone game cao)
5. Nguyên tắc an toàn: Tuyệt đối không xóa bỏ nội dung của người dùng (Zero Auto-Deletion).
"""

from typing import Any, Optional
from sqlalchemy.orm import Session
from .content_hasher import compute_dual_hashes
from . import models


def extract_normalized_hashes(
    levels: list[dict[str, Any]],
    template_code: str = "quiz",
) -> set[str]:
    """Trích xuất tập hợp các normalized_hash từ danh sách màn chơi của game."""
    hashes: set[str] = set()
    if not isinstance(levels, list):
        return hashes

    for lv in levels:
        if not isinstance(lv, dict):
            continue
        questions = lv.get("questions") or []
        for q in questions:
            if not isinstance(q, dict):
                continue
            prompt = (q.get("prompt") or "").strip()
            q_type = (q.get("question_type") or template_code).strip().lower()
            q_data = q.get("data") if isinstance(q.get("data"), dict) else {}

            _, n_hash = compute_dual_hashes(q_type, prompt, q_data)
            if n_hash:
                hashes.add(n_hash)

    return hashes


def calculate_jaccard_similarity(set_a: set[str], set_b: set[str]) -> float:
    """Tính toán hệ số tương đồng Jaccard giữa hai tập băm: |A ∩ B| / |A ∪ B|."""
    if not set_a and not set_b:
        return 0.0
    union = set_a | set_b
    if not union:
        return 0.0
    intersection = set_a & set_b
    return round(len(intersection) / len(union), 4)


def classify_risk_level(similarity: float) -> str:
    """Phân cấp ngưỡng cảnh báo rủi ro trùng lặp: LOW | MEDIUM | HIGH."""
    if similarity >= 0.80:
        return "HIGH"
    elif similarity >= 0.60:
        return "MEDIUM"
    return "LOW"


def find_cross_game_duplicates(
    db: Session,
    target_levels: list[dict[str, Any]],
    template_code: str = "quiz",
    exclude_game_id: Optional[str] = None,
    threshold: float = 0.60,
) -> list[dict[str, Any]]:
    """
    So khớp tập băm ngữ nghĩa của Game mục tiêu với tất cả các Game khác trong CSDL.
    Trả về danh sách các game trùng lặp vượt ngưỡng chỉ định (mặc định J >= 0.60).
    """
    target_hashes = extract_normalized_hashes(target_levels, template_code)
    if not target_hashes:
        return []

    q = db.query(models.Game)
    if exclude_game_id:
        q = q.filter(models.Game.id != exclude_game_id)
    all_games = q.all()

    candidates: list[dict[str, Any]] = []

    for other_game in all_games:
        # Lấy levels từ active draft version nếu có, hoặc từ other_game.levels
        other_levels = other_game.levels or []
        other_template = other_game.template_code or template_code
        other_hashes = extract_normalized_hashes(other_levels, other_template)
        if not other_hashes:
            continue

        sim = calculate_jaccard_similarity(target_hashes, other_hashes)
        if sim >= threshold:
            common_count = len(target_hashes & other_hashes)
            risk = classify_risk_level(sim)
            candidates.append({
                "game_id": other_game.id,
                "title": other_game.title,
                "creator_id": other_game.creator_id,
                "creator_name": other_game.creator_name,
                "similarity": sim,
                "similarity_percent": int(round(sim * 100)),
                "common_count": common_count,
                "total_target_questions": len(target_hashes),
                "total_candidate_questions": len(other_hashes),
                "risk_level": risk,
            })

    # Sắp xếp theo độ tương đồng giảm dần
    candidates.sort(key=lambda x: x["similarity"], reverse=True)
    return candidates
