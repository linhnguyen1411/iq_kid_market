import json
from typing import Any, Dict, List, Optional, Tuple


class EvaluationResult:
    def __init__(
        self,
        is_correct: bool,
        score: int = 0,
        stars: int = 0,
        feedback: str = "",
        hint: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.is_correct = is_correct
        self.score = score
        self.stars = stars
        self.feedback = feedback
        self.hint = hint
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_correct": self.is_correct,
            "score": self.score,
            "stars": self.stars,
            "feedback": self.feedback,
            "hint": self.hint,
            "metadata": self.metadata,
        }


def _clean_str(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip().lower()


def evaluate_game_answer(
    question_type: str,
    question_data: Any,
    submitted_answer: Any,
    max_points: int = 25,
) -> EvaluationResult:
    """
    Bo cham diem trung tam (Server-side Grading) cho toan bo Classic Game Engines:
    - quiz
    - matching
    - sequence
    - memory
    - flashcard
    - language (unscramble, fill_blank)
    - observation
    - sorting
    - math
    - logic_grid / logic
    - coding
    - scratch (classic maze sequence)
    """
    q_type = (question_type or "quiz").strip().lower()
    data = question_data if isinstance(question_data, dict) else {}

    if submitted_answer is None:
        return EvaluationResult(
            is_correct=False,
            score=0,
            stars=0,
            feedback="Chua co cau tra loi nao duoc gui len!",
            hint="Hay thuc hien thu thach truoc khi nop bai.",
        )

    # 1. QUIZ (Trac nghiem)
    if q_type == "quiz":
        target = _clean_str(data.get("answer"))
        if isinstance(submitted_answer, dict):
            user_choice = _clean_str(
                submitted_answer.get("selectedOption")
                or submitted_answer.get("choice")
                or submitted_answer.get("answer")
            )
        else:
            user_choice = _clean_str(submitted_answer)

        if not target:
            return EvaluationResult(
                is_correct=False,
                score=0,
                stars=0,
                feedback="Noi dung cau hoi chua cau hinh dap an hop le.",
            )

        is_match = (user_choice == target)
        if not is_match and len(user_choice) == 1 and (
            target.startswith(f"{user_choice}.")
            or target.startswith(f"{user_choice})")
            or target.startswith(f"{user_choice}:")
            or target.startswith(f"{user_choice} ")
        ):
            is_match = True
        elif not is_match and len(target) == 1 and (
            user_choice.startswith(f"{target}.")
            or user_choice.startswith(f"{target})")
            or user_choice.startswith(f"{target}:")
            or user_choice.startswith(f"{target} ")
        ):
            is_match = True

        if is_match:
            return EvaluationResult(
                is_correct=True,
                score=max_points,
                stars=3,
                feedback="Chinh xac! Ban da chon dap an hoan hao! 🎉",
            )
        return EvaluationResult(
            is_correct=False,
            score=0,
            stars=0,
            feedback="Dap an chua chinh xac. Hay suy nghi them nhe!",
            hint=data.get("explanation"),
        )

    # 2. MATCHING (Noi cap)
    elif q_type == "matching":
        expected_pairs = data.get("pairs") or data.get("matching_pairs") or []
        if not isinstance(expected_pairs, list) or len(expected_pairs) == 0:
            return EvaluationResult(is_correct=False, score=0, feedback="Du lieu cap ghep khong hop le.")

        canonical_pairs = set()
        for p in expected_pairs:
            if isinstance(p, dict):
                l = _clean_str(p.get("left") or p.get("term") or p.get("question"))
                r = _clean_str(p.get("right") or p.get("match") or p.get("answer"))
                if l and r:
                    canonical_pairs.add((l, r))

        sub_list = []
        if isinstance(submitted_answer, dict):
            sub_list = submitted_answer.get("pairs") or submitted_answer.get("matchedPairs") or []
        elif isinstance(submitted_answer, list):
            sub_list = submitted_answer

        matched_count = 0
        user_pairs_set = set()
        for sp in sub_list:
            if isinstance(sp, dict):
                l = _clean_str(sp.get("left"))
                r = _clean_str(sp.get("right"))
                if (l, r) in canonical_pairs and (l, r) not in user_pairs_set:
                    user_pairs_set.add((l, r))
                    matched_count += 1
            elif isinstance(sp, (list, tuple)) and len(sp) >= 2:
                l = _clean_str(sp[0])
                r = _clean_str(sp[1])
                if (l, r) in canonical_pairs and (l, r) not in user_pairs_set:
                    user_pairs_set.add((l, r))
                    matched_count += 1

        total_needed = len(canonical_pairs)
        if total_needed > 0 and matched_count == total_needed:
            return EvaluationResult(
                is_correct=True,
                score=max_points,
                stars=3,
                feedback=f"Xuat sac! Ban da ghep dung toan bo {total_needed}/{total_needed} cap! 🎯",
            )
        return EvaluationResult(
            is_correct=False,
            score=int(max_points * (matched_count / max(1, total_needed))),
            stars=1 if matched_count > 0 else 0,
            feedback=f"Ban da ghep dung {matched_count}/{total_needed} cap. Hay thu lai de hoan thien nhe!",
        )

    # 3. SEQUENCE (Quy luat day so)
    elif q_type == "sequence":
        target = _clean_str(data.get("answer"))
        if isinstance(submitted_answer, dict):
            user_val = _clean_str(submitted_answer.get("answer") or submitted_answer.get("value"))
        else:
            user_val = _clean_str(submitted_answer)

        if not target:
            return EvaluationResult(is_correct=False, score=0, feedback="Cau hoi thieu dap an chuan.")

        if user_val == target:
            return EvaluationResult(
                is_correct=True,
                score=max_points,
                stars=3,
                feedback="Chinh xac! Ban da tim ra quy luat chuan xac! 🧩",
            )
        return EvaluationResult(
            is_correct=False,
            score=0,
            stars=0,
            feedback="So dien vao chua dung voi quy luat day. Thu lai nhe!",
            hint=data.get("explanation"),
        )

    # 4. MEMORY (Lat the tri nho)
    elif q_type == "memory":
        items = data.get("items") or []
        total_unique = len(items)
        if isinstance(submitted_answer, dict):
            completed = bool(submitted_answer.get("completed"))
            flips = int(submitted_answer.get("flipsCount") or submitted_answer.get("flips") or 0)
            matches = int(submitted_answer.get("matchesCount") or total_unique)
        elif submitted_answer is True:
            completed = True
            flips = total_unique * 2
            matches = total_unique
        else:
            completed = False
            flips = 0
            matches = 0

        min_flips = total_unique * 2
        if completed and matches >= total_unique and (flips >= min_flips or total_unique == 0):
            return EvaluationResult(
                is_correct=True,
                score=max_points,
                stars=3,
                feedback=f"Sieu tri nho! Ban da tim ra tat ca cac cap the sau {flips} luot lat! 🧠✨",
            )
        return EvaluationResult(
            is_correct=False,
            score=0,
            stars=0,
            feedback="Ban chua hoan thanh tim du cac cap the giong nhau!",
        )

    # 5. FLASHCARD (The ghi nho)
    elif q_type == "flashcard":
        cards = data.get("cards") or []
        total_cards = len(cards)
        cards_viewed = total_cards
        if isinstance(submitted_answer, dict):
            cards_viewed = int(submitted_answer.get("cardsViewed") or total_cards)
            completed = bool(submitted_answer.get("completed", True))
        else:
            completed = bool(submitted_answer)

        if completed and cards_viewed >= total_cards:
            return EvaluationResult(
                is_correct=True,
                score=max_points,
                stars=3,
                feedback="Ban da doc va ghi nho toan bo noi dung bai hoc! 📚🎉",
            )
        return EvaluationResult(
            is_correct=False,
            score=0,
            stars=0,
            feedback="Hay lat xem day du cac the truoc khi hoan thanh nhe!",
        )

    # 6. LANGUAGE (Ghep tu unscramble & Dien o trong fill_blank)
    elif q_type == "language":
        subtype = data.get("type") or ("unscramble" if "correct_order" in data else "fill_blank")

        if subtype == "unscramble":
            correct_order = [_clean_str(w) for w in (data.get("correct_order") or []) if _clean_str(w)]
            if isinstance(submitted_answer, dict):
                user_tokens = submitted_answer.get("tokens") or submitted_answer.get("words") or []
            elif isinstance(submitted_answer, list):
                user_tokens = submitted_answer
            elif isinstance(submitted_answer, str):
                user_tokens = [w.strip() for w in submitted_answer.split() if w.strip()]
            else:
                user_tokens = []

            clean_user_words = []
            for t in user_tokens:
                if isinstance(t, dict):
                    clean_user_words.append(_clean_str(t.get("text") or t.get("word") or t.get("label")))
                else:
                    clean_user_words.append(_clean_str(t))

            if len(clean_user_words) == len(correct_order) and clean_user_words == correct_order:
                return EvaluationResult(
                    is_correct=True,
                    score=max_points,
                    stars=3,
                    feedback="Xuat sac! Ban da sap xep cau hoan chinh dung ngu phap! ✍️",
                )
            return EvaluationResult(
                is_correct=False,
                score=0,
                stars=0,
                feedback="Thu tu cac tu ghep lai chua dung. Hay kiem tra lai nhe!",
                hint=data.get("explanation"),
            )

        else:
            target = _clean_str(data.get("answer"))
            if isinstance(submitted_answer, dict):
                user_val = _clean_str(
                    submitted_answer.get("answer")
                    or submitted_answer.get("selectedOption")
                    or submitted_answer.get("value")
                )
            else:
                user_val = _clean_str(submitted_answer)

            if target and user_val == target:
                return EvaluationResult(
                    is_correct=True,
                    score=max_points,
                    stars=3,
                    feedback="Chinh xac! Ban da dien tu thich hop vao cho trong! 🔤",
                )
            return EvaluationResult(
                is_correct=False,
                score=0,
                stars=0,
                feedback="Tu ban chon chua phai phuong an chinh xac nhat.",
                hint=data.get("explanation"),
            )

    # 7. OBSERVATION (Quan sat tinh mat)
    elif q_type == "observation":
        target_val = _clean_str(data.get("answer"))
        target_r = data.get("target_row")
        target_c = data.get("target_col")

        if isinstance(submitted_answer, dict):
            user_val = _clean_str(submitted_answer.get("answer") or submitted_answer.get("cell"))
            user_r = submitted_answer.get("row")
            user_c = submitted_answer.get("col")
        else:
            user_val = _clean_str(submitted_answer)
            user_r = None
            user_c = None

        is_match = False
        if target_r is not None and target_c is not None and user_r is not None and user_c is not None:
            is_match = (int(user_r) == int(target_r) and int(user_c) == int(target_c))
        elif target_val:
            is_match = (user_val == target_val)

        if is_match:
            return EvaluationResult(
                is_correct=True,
                score=max_points,
                stars=3,
                feedback="Mat ban that tinh tuong! Da tim ra diem khac biet! 👀⭐",
            )
        return EvaluationResult(
            is_correct=False,
            score=0,
            stars=0,
            feedback="Vi tri ban chon chua dung. Hay quan sat ky tung o nhe!",
            hint=data.get("explanation"),
        )

    # 8. SORTING (Sap xep quy trinh)
    elif q_type == "sorting":
        correct_ids = [str(x).strip() for x in (data.get("correct_sequence_ids") or []) if str(x).strip()]
        if isinstance(submitted_answer, dict):
            user_ids = submitted_answer.get("orderedIds") or submitted_answer.get("sequence") or []
        elif isinstance(submitted_answer, list):
            user_ids = submitted_answer
        else:
            user_ids = [str(submitted_answer).strip()]

        clean_user_ids = []
        for item in user_ids:
            if isinstance(item, dict):
                clean_user_ids.append(str(item.get("id")).strip())
            else:
                clean_user_ids.append(str(item).strip())

        if len(clean_user_ids) == len(correct_ids) and clean_user_ids == correct_ids:
            return EvaluationResult(
                is_correct=True,
                score=max_points,
                stars=3,
                feedback="Hoan hao! Ban da sap xep quy trinh theo dung trinh tu khoa hoc! ⏳🏆",
            )
        return EvaluationResult(
            is_correct=False,
            score=0,
            stars=0,
            feedback="Thu tu cac buoc chua chuan xac. Hay thu xep lai nhe!",
            hint=data.get("explanation"),
        )

    # 9. MATH (Toan hoc logic)
    elif q_type == "math":
        target = _clean_str(data.get("answer"))
        if isinstance(submitted_answer, dict):
            user_val = _clean_str(submitted_answer.get("value") or submitted_answer.get("answer"))
        else:
            user_val = _clean_str(submitted_answer)

        if not target:
            return EvaluationResult(is_correct=False, score=0, feedback="Thieu dap an toan hoc.")

        if user_val == target:
            return EvaluationResult(
                is_correct=True,
                score=max_points,
                stars=3,
                feedback="Thien tai toan hoc! Ban da tinh ra ket qua chuan xac! 🧮✨",
            )
        return EvaluationResult(
            is_correct=False,
            score=0,
            stars=0,
            feedback="Ket qua phep tinh chua dung. Hay tinh nham can than lai nhe!",
            hint=data.get("hint") or data.get("explanation"),
        )

    # 10. LOGIC_GRID / LOGIC (Ma tran logic)
    elif q_type in ("logic_grid", "logic"):
        target = _clean_str(data.get("answer"))
        if isinstance(submitted_answer, dict):
            user_val = _clean_str(submitted_answer.get("selectedOption") or submitted_answer.get("answer"))
        else:
            user_val = _clean_str(submitted_answer)

        if not target:
            return EvaluationResult(is_correct=False, score=0, feedback="Thieu dap an ma tran logic.")

        if user_val == target:
            return EvaluationResult(
                is_correct=True,
                score=max_points,
                stars=3,
                feedback="Tuyet dinh tu duy! Ban da giai ma thanh cong quy luat ma tran! 💡🧩",
            )
        return EvaluationResult(
            is_correct=False,
            score=0,
            stars=0,
            feedback="Hinh ban chon chua khop voi quy luat hang va cot.",
            hint=data.get("hint") or data.get("explanation"),
        )

    # 11. CODING (Sua loi ma nguon)
    elif q_type == "coding":
        target = _clean_str(data.get("answer"))
        if isinstance(submitted_answer, dict):
            user_val = _clean_str(submitted_answer.get("selectedOption") or submitted_answer.get("answer"))
        else:
            user_val = _clean_str(submitted_answer)

        if not target:
            return EvaluationResult(is_correct=False, score=0, feedback="Thieu phuong an sua loi chuan.")

        if user_val == target:
            return EvaluationResult(
                is_correct=True,
                score=max_points,
                stars=3,
                feedback="Lap trinh vien xuat sac! Ban da tim ra giai phap sua bug chinh xac! 💻🐞",
            )
        return EvaluationResult(
            is_correct=False,
            score=0,
            stars=0,
            feedback="Phuong an sua loi nay chua giai quyet duoc van de.",
            hint=data.get("explanation"),
        )

    # 12. SCRATCH (Classic Algorithm Maze sequence)
    elif q_type == "scratch":
        raw_target = data.get("target_block_sequence") or ""
        if isinstance(raw_target, list):
            target_seq = [_clean_str(x) for x in raw_target if _clean_str(x)]
        else:
            target_seq = [_clean_str(x) for x in str(raw_target).split(",") if _clean_str(x)]

        if isinstance(submitted_answer, dict):
            user_seq_raw = submitted_answer.get("sequence") or submitted_answer.get("blocks") or []
        elif isinstance(submitted_answer, list):
            user_seq_raw = submitted_answer
        else:
            user_seq_raw = str(submitted_answer).split(",")

        clean_user_seq = [_clean_str(x) for x in user_seq_raw if _clean_str(x)]

        if target_seq and clean_user_seq == target_seq:
            return EvaluationResult(
                is_correct=True,
                score=max_points,
                stars=3,
                feedback="Tuyet voi! Ban da sap xep thuat toan dieu khien meo thanh cong! 🐱⭐",
            )
        return EvaluationResult(
            is_correct=False,
            score=0,
            stars=0,
            feedback="Chuoi lenh robot chua dua nhan vat den dich. Kiem tra lai nhe!",
            hint=data.get("explanation"),
        )

    return EvaluationResult(
        is_correct=False,
        score=0,
        stars=0,
        feedback=f"Khong ho tro cham diem cho question_type: '{q_type}'.",
    )
