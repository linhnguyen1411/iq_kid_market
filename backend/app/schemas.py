import copy
import hashlib
import random
import uuid
from datetime import datetime
from typing import Any, Optional, List
from pydantic import BaseModel, Field


# ---------- User / Session ----------
class UserOut(BaseModel):
    id: str
    username: str
    name: str
    role: str
    grade: Optional[int] = None
    avatar: str
    xp: int
    level: int
    streak: int

    class Config:
        from_attributes = True


class WalletTransactionOut(BaseModel):
    id: str
    amount: int
    type: Optional[str] = None
    detail: Optional[str] = None
    date: str

    class Config:
        from_attributes = True


class WalletOut(BaseModel):
    balance: int
    transactions: list[WalletTransactionOut]


class SessionOut(BaseModel):
    user: UserOut
    wallet: WalletOut
    purchases: list[str]


# ---------- Authentication Schemas ----------
class RegisterIn(BaseModel):
    username: str
    password: str
    name: str
    role: Optional[str] = "student"  # student | teacher | creator | admin
    grade: Optional[int] = 1
    avatar: Optional[str] = "smile_tiger"


class AdminCreateUserIn(BaseModel):
    username: str
    password: str
    name: str
    role: Optional[str] = "student"
    grade: Optional[int] = 1
    avatar: Optional[str] = "smile_tiger"
    initial_balance: Optional[int] = 0


class AdminUpdateUserIn(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    grade: Optional[int] = None
    avatar: Optional[str] = None
    password: Optional[str] = None
    wallet_balance: Optional[int] = None


class LoginIn(BaseModel):
    username: str
    password: str


class AuthOut(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserOut
    wallet: WalletOut
    purchases: list[str]


class TokenRefreshIn(BaseModel):
    refresh_token: str


class RefreshTokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ResetPasswordIn(BaseModel):
    username: str
    parent_pin: Optional[str] = "1234"  # Mã PIN bảo vệ của phụ huynh (mặc định 1234)
    new_password: str


class ChangePasswordIn(BaseModel):
    userId: str
    old_password: str
    new_password: str


class UpdateProfileIn(BaseModel):
    userId: str
    name: Optional[str] = None
    avatar: Optional[str] = None
    grade: Optional[int] = None


# ---------- Wallet & Payment ----------
class TopupIn(BaseModel):
    userId: str
    amount: int
    method: Optional[str] = "QR Code"


class CreateTopupIntentIn(BaseModel):
    userId: str
    amount: int
    method: Optional[str] = "VietQR"


class TopupIntentOut(BaseModel):
    tx_id: str
    amount: int
    qr_url: str
    bank_name: str
    bank_account: str
    account_holder: str
    transfer_content: str


class ConfirmTopupIn(BaseModel):
    userId: str
    tx_id: str
    amount: Optional[int] = None


class CreatorEarningsOut(BaseModel):
    creatorId: str
    creatorName: str
    availableBalance: int
    totalRevenue: int
    totalSalesCount: int
    recentEarnings: list[dict]
    gameBreakdown: list[dict]


# ---------- Games / Marketplace ----------
class GameVersionOut(BaseModel):
    id: str
    game_id: str
    version_num: int
    status: str
    levels: Any
    title: str
    description: Optional[str] = None
    detailed_description: Optional[str] = None
    price: int
    template_code: str
    category: str
    changelog: Optional[str] = None
    quality_score: Optional[int] = None
    created_at: Optional[Any] = None
    published_at: Optional[Any] = None

    class Config:
        from_attributes = True


class GameOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    detailed_description: Optional[str] = None
    thumbnail: Optional[str] = None
    price: int
    grade_from: int
    grade_to: int
    template_code: str
    category: str
    creator_id: Optional[str] = None
    creator_name: Optional[str] = None
    review_status: str
    review_feedback: Optional[str] = None
    is_published: bool
    rating_avg: float
    plays_count: int
    current_version_num: Optional[int] = 1
    quality_score: Optional[int] = None
    quality_grade: Optional[str] = None
    levels: Any
    versions: Optional[list[GameVersionOut]] = None

    class Config:
        from_attributes = True


class PaginatedGamesOut(BaseModel):
    items: list[GameOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class GameCategoryOut(BaseModel):
    code: str
    label: str
    icon: Optional[str] = "🎮"
    description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    game_count: Optional[int] = None

    class Config:
        from_attributes = True


class CreateGameCategoryIn(BaseModel):
    code: str
    label: str
    icon: Optional[str] = "🎮"
    description: Optional[str] = None
    sort_order: Optional[int] = 0
    is_active: Optional[bool] = True


class UpdateGameCategoryIn(BaseModel):
    label: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class PurchaseIn(BaseModel):
    userId: str
    gameId: str


class CreateGameIn(BaseModel):
    title: str
    description: str
    detailed_description: Optional[str] = None
    price: Optional[int] = 0
    grade_from: Optional[int] = 1
    grade_to: Optional[int] = 9
    template_code: str
    category: Optional[str] = "iq"
    creatorId: Optional[str] = None
    customFirstLevel: Optional[dict] = None


class UpdateGameIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    detailed_description: Optional[str] = None
    price: Optional[int] = None
    grade_from: Optional[int] = None
    grade_to: Optional[int] = None
    category: Optional[str] = None
    thumbnail: Optional[str] = None
    levels: Optional[Any] = None


class AddLevelQuestionIn(BaseModel):
    question_type: Optional[str] = None
    prompt: str
    points: Optional[int] = 25
    data: Any

    @classmethod
    def validate_game_data(cls, q_type: str, v: Any) -> Any:
        """Kiểm tra tính toàn vẹn của dữ liệu data theo GAME_ENGINE_RULES.md cho toàn bộ 12 game engine."""
        if not isinstance(v, dict):
            raise ValueError("Thuộc tính 'data' của câu hỏi phải là một JSON Object (Dictionary)!")

        qt = (q_type or "").strip().lower()

        if qt == "matching":
            pairs = v.get("pairs") or v.get("matching_pairs")
            if not pairs or not isinstance(pairs, list) or len(pairs) < 1:
                raise ValueError("Game Nối Cột (matching) bắt buộc phải có mảng 'pairs' với ít nhất 1 cặp {left, right}!")
            for p in pairs:
                if not isinstance(p, dict) or ("left" not in p and "term" not in p) or ("right" not in p and "match" not in p):
                    raise ValueError("Mỗi phần tử trong 'pairs' phải chứa cả 'left' và 'right'!")

        elif qt == "quiz":
            options = v.get("options")
            answer = v.get("answer")
            if not options or not isinstance(options, list) or len(options) < 2:
                raise ValueError("Game Trắc Nghiệm (quiz) bắt buộc phải có mảng 'options' với ít nhất 2 đáp án lựa chọn!")
            if not answer:
                raise ValueError("Game Trắc Nghiệm (quiz) bắt buộc phải có trường 'answer' xác định đáp án đúng!")
            clean_opts = [str(o).strip().lower() for o in options]
            clean_ans = str(answer).strip().lower()
            matched = (clean_ans in clean_opts)
            if not matched:
                # Hỗ trợ dạng ký tự tiền tố như 'B' khớp với 'B. 2'
                for o in clean_opts:
                    if o.startswith(f"{clean_ans}.") or o.startswith(f"{clean_ans})") or o.startswith(f"{clean_ans}:") or o.startswith(f"{clean_ans} "):
                        matched = True
                        break
            if not matched:
                raise ValueError(f"Đáp án '{answer}' phải thuộc danh sách các lựa chọn trong 'options'!")

        elif qt == "sequence":
            seq = v.get("sequence")
            answer = v.get("answer")
            if not seq or not isinstance(seq, list) or len(seq) < 2:
                raise ValueError("Game Điền Dãy Số (sequence) bắt buộc phải có mảng 'sequence' chứa các số/phần tử!")
            if answer is None or str(answer).strip() == "":
                raise ValueError("Game Điền Dãy Số (sequence) bắt buộc phải có trường 'answer'!")

        elif qt == "memory":
            items = v.get("items")
            if not items or not isinstance(items, list) or len(items) < 2:
                raise ValueError("Game Lật Thẻ Trí Nhớ (memory) bắt buộc phải có mảng 'items' với ít nhất 2 hình/icon!")

        elif qt == "sorting":
            items = v.get("items")
            correct_seq = v.get("correct_sequence_ids")
            if not items or not isinstance(items, list) or len(items) < 2:
                raise ValueError("Game Sắp Xếp (sorting) bắt buộc phải có mảng 'items' với ít nhất 2 bước/phần tử!")
            if not correct_seq or not isinstance(correct_seq, list) or len(correct_seq) < 2:
                raise ValueError("Game Sắp Xếp (sorting) bắt buộc phải có mảng 'correct_sequence_ids' chỉ thứ tự đúng!")
            item_ids = {str(item.get("id")).strip() for item in items if isinstance(item, dict)}
            for cid in correct_seq:
                if str(cid).strip() not in item_ids:
                    raise ValueError(f"ID '{cid}' trong 'correct_sequence_ids' không tồn tại trong danh sách 'items'!")

        elif qt == "flashcard":
            cards = v.get("cards")
            if not cards or not isinstance(cards, list) or len(cards) < 1:
                raise ValueError("Game Thẻ Ghi Nhớ (flashcard) bắt buộc phải có mảng 'cards' chứa ít nhất 1 thẻ {front, back}!")

        elif qt == "scratch":
            if "cat_pos" not in v or "star_pos" not in v:
                raise ValueError("Game Lập Trình Scratch bắt buộc phải có tọa độ 'cat_pos' và 'star_pos'!")

        elif qt == "math":
            if "answer" not in v or str(v.get("answer")).strip() == "":
                raise ValueError("Game Toán Học (math) bắt buộc phải có đáp án 'answer'!")

        elif qt == "language":
            subtype = v.get("type") or ("unscramble" if "correct_order" in v else "fill_blank")
            if subtype == "unscramble":
                words = v.get("scrambled_words") or v.get("words")
                order = v.get("correct_order")
                if not words or not isinstance(words, list) or len(words) < 2:
                    raise ValueError("Game Ghép Câu (language unscramble) bắt buộc có mảng 'scrambled_words' với ít nhất 2 từ!")
                if not order or not isinstance(order, list) or len(order) < 2:
                    raise ValueError("Game Ghép Câu (language unscramble) bắt buộc có mảng 'correct_order'!")
            else:
                options = v.get("options")
                answer = v.get("answer")
                if not options or not isinstance(options, list) or len(options) < 2:
                    raise ValueError("Game Điền Chỗ Trống (language fill_blank) bắt buộc có mảng 'options'!")
                if not answer or str(answer).strip() == "":
                    raise ValueError("Game Điền Chỗ Trống (language fill_blank) bắt buộc có trường 'answer'!")
                clean_opts = [str(o).strip().lower() for o in options]
                clean_ans = str(answer).strip().lower()
                if clean_ans not in clean_opts:
                    raise ValueError(f"Đáp án '{answer}' phải thuộc danh sách 'options'!")

        elif qt == "observation":
            grid = v.get("grid")
            if not grid or not isinstance(grid, list) or len(grid) < 1 or not isinstance(grid[0], list):
                raise ValueError("Game Quan Sát (observation) bắt buộc có ma trận mảng 2 chiều 'grid'!")
            target_r = v.get("target_row")
            target_c = v.get("target_col")
            answer = v.get("answer")
            if (target_r is None or target_c is None) and not answer:
                raise ValueError("Game Quan Sát bắt buộc có tọa độ ('target_row', 'target_col') hoặc giá trị 'answer'!")
            if target_r is not None and (int(target_r) < 0 or int(target_r) >= len(grid)):
                raise ValueError(f"Tọa độ hàng target_row={target_r} nằm ngoài kích thước ma trận {len(grid)}!")
            if target_c is not None and (int(target_c) < 0 or int(target_c) >= len(grid[0])):
                raise ValueError(f"Tọa độ cột target_col={target_c} nằm ngoài kích thước ma trận {len(grid[0])}!")

        elif qt in ("logic_grid", "logic"):
            options = v.get("options")
            answer = v.get("answer")
            if not options or not isinstance(options, list) or len(options) < 2:
                raise ValueError("Game Ma Trận Logic (logic_grid) bắt buộc có mảng 'options'!")
            if not answer or str(answer).strip() == "":
                raise ValueError("Game Ma Trận Logic (logic_grid) bắt buộc có trường 'answer'!")
            clean_opts = [str(o).strip().lower() for o in options]
            clean_ans = str(answer).strip().lower()
            if clean_ans not in clean_opts:
                raise ValueError(f"Đáp án '{answer}' phải thuộc danh sách 'options'!")

        elif qt == "coding":
            options = v.get("options")
            answer = v.get("answer")
            if not options or not isinstance(options, list) or len(options) < 2:
                raise ValueError("Game Sửa Code (coding) bắt buộc có mảng 'options'!")
            if not answer or str(answer).strip() == "":
                raise ValueError("Game Sửa Code (coding) bắt buộc có trường 'answer'!")
            clean_opts = [str(o).strip().lower() for o in options]
            clean_ans = str(answer).strip().lower()
            if clean_ans not in clean_opts:
                raise ValueError(f"Đáp án '{answer}' phải thuộc danh sách 'options'!")

        return v


class AddLevelIn(BaseModel):
    gameId: str
    level_num: Optional[int] = None
    title: str
    xp_reward: Optional[int] = 80
    coin_reward: Optional[int] = 20
    question: AddLevelQuestionIn
    creatorId: Optional[str] = None


class UpdateLevelIn(BaseModel):
    title: Optional[str] = None
    xp_reward: Optional[int] = None
    coin_reward: Optional[int] = None
    question: Optional[AddLevelQuestionIn] = None


class UploadGamesIn(BaseModel):
    gameObject: Any  # 1 game dict, hoặc list game dict


class AiGenerateIn(BaseModel):
    topic: str
    template_code: str
    grade_from: Optional[int] = 1
    grade_to: Optional[int] = 5
    category: Optional[str] = "iq"
    price: Optional[int] = 0
    creatorId: Optional[str] = None


class AiGenerateQuestionIn(BaseModel):
    topic: str
    template_code: str
    grade: Optional[int] = 2
    category: Optional[str] = "iq"


class ReviewDecideIn(BaseModel):
    gameId: str
    action: str  # "approve" | "reject"
    feedback: Optional[str] = None


# ---------- Attempts & Gamification ----------
class SubmitAttemptIn(BaseModel):
    userId: Optional[str] = None
    gameId: str
    levelNum: int
    score: Optional[int] = 0
    completed: Optional[bool] = None
    duration: Optional[int] = 15
    submittedAnswer: Optional[Any] = None
    clientAttemptId: Optional[str] = None


class SubmitAttemptOut(BaseModel):
    success: bool
    score: int
    isCorrect: Optional[bool] = None
    starsEarned: Optional[int] = 0
    feedback: Optional[str] = None
    hint: Optional[str] = None
    xpAwarded: int
    newXp: int
    levelUp: bool
    newLevel: int
    newStreak: int
    coinReward: int
    newBalance: Optional[int] = None
    unlockedAchievements: list[dict]
    message: str
    # True chỉ khi lần đầu clear hết màn của game (đúng lúc cộng XP/xu)
    gameCleared: bool = False
    # True nếu user đã từng nhận thưởng clear game này trước đó
    alreadyRewarded: bool = False


def sanitize_question_data_for_learner(question_type: str, data: Any) -> Any:
    """
    Loại bỏ các trường đáp án/lời giải trước khi gửi cho học sinh để chống gian lận qua DevTools/Network tab.
    """
    if not isinstance(data, dict):
        return data

    clean = copy.deepcopy(data)
    q_type = (question_type or "").strip().lower()

    # Các trường nhạy cảm chung
    for sensitive_field in ("solution", "correct_answer", "target_solution"):
        clean.pop(sensitive_field, None)

    if q_type in ("quiz", "true_false", "fill_blank"):
        clean.pop("answer", None)
        clean.pop("explanation", None)
    elif q_type == "math":
        clean.pop("answer", None)
        clean.pop("result", None)
        clean.pop("explanation", None)
    elif q_type == "sequence":
        # Đảm bảo options tồn tại trước khi xóa answer để tránh màn chơi bị trống lựa chọn
        if "options" not in clean or not isinstance(clean.get("options"), list) or not clean.get("options"):
            ans = str(clean.get("answer") or "").strip()
            if ans:
                opts = [ans]
                try:
                    num = int(ans)
                    opts.extend([str(num + 2), str(num - 2), str(num * 2)])
                except ValueError:
                    opts.extend(["99", "0", "15"])
                random.shuffle(opts)
                clean["options"] = list(dict.fromkeys(opts))
        clean.pop("answer", None)
        clean.pop("explanation", None)
    elif q_type == "sorting":
        # Xáo trộn thứ tự các thẻ để tránh rò rỉ thứ tự ban đầu
        if isinstance(clean.get("items"), list):
            items_shuffled = copy.deepcopy(clean.get("items"))
            random.shuffle(items_shuffled)
            clean["items"] = items_shuffled
        clean.pop("correct_order", None)
        clean.pop("target_order", None)
        clean.pop("correct_sequence_ids", None)
        clean.pop("explanation", None)
    elif q_type in ("language", "unscramble"):
        # Nếu là dạng unscramble: chuẩn bị scrambled_words / tokens nếu chỉ có correct_order / answer
        if "correct_order" in clean and ("scrambled_words" not in clean or not clean.get("scrambled_words")):
            words = list(clean.get("correct_order") or [])
            random.shuffle(words)
            clean["scrambled_words"] = words
        if "tokens" not in clean and "scrambled" in clean:
            clean["tokens"] = clean.get("scrambled", "").split()
        clean.pop("answer", None)
        clean.pop("word", None)
        clean.pop("target_word", None)
        clean.pop("target_sentence", None)
        clean.pop("correct_order", None)
        clean.pop("explanation", None)
    elif q_type in ("logic", "logic_grid"):
        clean.pop("answer", None)
        clean.pop("explanation", None)
        clean.pop("hint", None)
    elif q_type == "memory":
        clean.pop("solution", None)
        clean.pop("explanation", None)
    elif q_type == "flashcard":
        clean.pop("solution", None)
        clean.pop("explanation", None)
    elif q_type == "coding":
        clean.pop("answer", None)
        clean.pop("expected_output", None)
        clean.pop("target_block_sequence", None)
        clean.pop("explanation", None)
    elif q_type == "scratch":
        clean.pop("target_block_sequence", None)
        clean.pop("expected_path", None)
        clean.pop("explanation", None)
    elif q_type == "observation":
        clean.pop("answer", None)
        clean.pop("hint", None)
        clean.pop("solution", None)
        clean.pop("target_row", None)
        clean.pop("target_col", None)
        clean.pop("target_coordinates", None)
        clean.pop("explanation", None)
    elif q_type == "matching":
        clean.pop("explanation", None)
        raw_pairs = clean.pop("pairs", None) or clean.pop("matching_pairs", None) or []
        if isinstance(raw_pairs, list) and raw_pairs:
            salt = uuid.uuid4().hex[:12]
            left_items = []
            right_items = []
            match_hashes = []
            for p in raw_pairs:
                if isinstance(p, dict):
                    l = str(p.get("left") or p.get("term") or p.get("question") or "").strip()
                    r = str(p.get("right") or p.get("match") or p.get("answer") or "").strip()
                    if l and r:
                        left_items.append(l)
                        right_items.append(r)
                        token = f"{l.lower()}::{r.lower()}::{salt}"
                        h = hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]
                        match_hashes.append(h)
            random.shuffle(left_items)
            random.shuffle(right_items)
            random.shuffle(match_hashes)
            clean["left_items"] = left_items
            clean["right_items"] = right_items
            clean["match_hashes"] = match_hashes
            clean["match_salt"] = salt

    return clean


def sanitize_game_levels_for_learner(levels: Any) -> Any:
    """
    Làm sạch toàn bộ danh sách màn chơi (Roadmap Levels) cho tài khoản học sinh.
    Giữ nguyên bố cục cấu trúc dữ liệu nhưng loại bỏ toàn bộ đáp án bị rò rỉ.
    """
    if not isinstance(levels, list):
        return levels

    sanitized_levels = []
    for lv in levels:
        if not isinstance(lv, dict):
            sanitized_levels.append(lv)
            continue

        clean_lv = copy.deepcopy(lv)
        raw_qs = clean_lv.get("questions")
        if isinstance(raw_qs, list):
            clean_qs = []
            for q in raw_qs:
                if not isinstance(q, dict):
                    clean_qs.append(q)
                    continue
                clean_q = copy.deepcopy(q)
                q_type = clean_q.get("question_type") or clean_lv.get("template_code") or ""
                if "data" in clean_q and isinstance(clean_q["data"], dict):
                    clean_q["data"] = sanitize_question_data_for_learner(q_type, clean_q["data"])
                clean_qs.append(clean_q)
            clean_lv["questions"] = clean_qs

        # Nếu level có trực tiếp thuộc tính 'data'
        if "data" in clean_lv and isinstance(clean_lv["data"], dict):
            q_type = clean_lv.get("template_code") or clean_lv.get("question_type") or ""
            clean_lv["data"] = sanitize_question_data_for_learner(q_type, clean_lv["data"])

        sanitized_levels.append(clean_lv)

    return sanitized_levels


def resolve_game_version_content(
    game: Any,
    db: Any,
    version_num: Optional[int] = None,
    is_creator_or_admin: bool = False,
) -> tuple[list, Optional[Any]]:
    """
    Xác định phiên bản nội dung chuẩn xác (levels) và bản ghi GameVersion tương ứng:
    - Nếu có chỉ định version_num: Tải đúng version_num đó.
    - Nếu là Tác giả hoặc Admin: Tải phiên bản nháp/chờ duyệt mới nhất nếu có, ngược lại lấy bản xuất bản.
    - Nếu là Học sinh/khách vãng lai: Luôn tải phiên bản PUBLISHED mới nhất.
    - Tương thích ngược: Nếu game chưa có bản ghi GameVersion nào (game legacy), fallback về game.levels.
    """
    from . import models

    q = db.query(models.GameVersion).filter(models.GameVersion.game_id == game.id)

    if version_num is not None:
        target_gv = q.filter(models.GameVersion.version_num == version_num).first()
        if target_gv:
            return (target_gv.levels or [], target_gv)

    if is_creator_or_admin:
        draft_gv = (
            q.filter(models.GameVersion.status.in_(["draft", "pending_review"]))
            .order_by(models.GameVersion.version_num.desc())
            .first()
        )
        if draft_gv:
            return (draft_gv.levels or [], draft_gv)

    published_gv = (
        q.filter(models.GameVersion.status == "published")
        .order_by(models.GameVersion.version_num.desc())
        .first()
    )
    if published_gv:
        return (published_gv.levels or [], published_gv)

    # Fallback cho game legacy chưa có bản ghi GameVersion
    return (game.levels or [], None)


class LeaderboardItemOut(BaseModel):
    userId: str
    name: str
    avatar: str
    grade: Optional[int] = None
    score: int
    xp: int
    streak: int
    level: int


class UserAchievementItemOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    badge_code: Optional[str] = None
    icon: Optional[str] = None
    xp_bonus: int
    unlocked: bool
    unlocked_at: Optional[str] = None
    progress_percent: int


# ---------- Daily Quests & Gamification ----------
class DailyQuestOut(BaseModel):
    id: str
    title: str
    description: str
    type: str
    target_count: int
    current_progress: int
    status: str
    xp_reward: int
    coin_reward: int
    quest_date: str


class ClaimQuestIn(BaseModel):
    userId: str


class LuckySpinIn(BaseModel):
    userId: str


class LoginRewardIn(BaseModel):
    userId: str


# ---------- Scratch Courses & Lessons ----------
class ScratchSubmitIn(BaseModel):
    userId: Optional[str] = None
    courseId: str
    lessonNum: int
    submittedSequence: Any  # list[str] hoặc chuỗi "move_forward,turn_left"


class ScratchSubmitOut(BaseModel):
    success: bool
    message: str
    hint: Optional[str] = None
    xpAwarded: int
    coinAwarded: int
    nextLessonNum: Optional[int] = None
    starsEarned: int
    alreadyRewarded: bool = False
    newXP: Optional[int] = None
    newLevel: Optional[int] = None


class CreateScratchCourseIn(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = "🐒"
    difficulty: Optional[str] = "Cơ bản"
    course_type: Optional[str] = "algorithm_maze"
    price: Optional[int] = 0


class CreateScratchLessonIn(BaseModel):
    course_id: str
    lesson_num: Optional[int] = None
    title: str
    content: Optional[str] = None
    target_block_sequence: str
    start_scene_json: Optional[str] = None
    xp_reward: Optional[int] = 30
    engine_type: Optional[str] = "algorithm_maze"


class UpdateScratchLessonIn(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    target_block_sequence: Optional[str] = None
    start_scene_json: Optional[str] = None
    xp_reward: Optional[int] = None
    engine_type: Optional[str] = None


# ---------- Scratch Projects (Phase 6) ----------
class ScratchProjectIn(BaseModel):
    title: str = "Dự Án Scratch Của Bé"
    description: Optional[str] = None
    thumbnail: Optional[str] = "🐒"
    project_data: Any
    is_public: Optional[bool] = False


class ScratchProjectUpdateIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    project_data: Optional[Any] = None
    is_public: Optional[bool] = None


class ScratchProjectOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    thumbnail: str
    project_data: Any
    is_public: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class ScratchProjectListOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    thumbnail: str
    is_public: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class ScratchProjectExportIn(BaseModel):
    title: Optional[str] = "Du_An_Scratch"
    project_data: Any


# ---------- Scratch Analytics (Phase 8) ----------
class ScratchSkillMasteryItem(BaseModel):
    skill: str
    title: str
    mastery_percent: int
    level_required: int


class ScratchBadgeItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    icon: str
    badge_code: str
    xp_bonus: int = 100
    unlocked: bool = False
    unlocked_at: Optional[str] = None


class ScratchAnalyticsOut(BaseModel):
    total_completed_lessons: int
    total_curriculum_lessons: int
    completion_rate: int
    total_stars: int
    total_projects: int
    streak_days: int
    xp_earned: int
    skills_mastery: List[ScratchSkillMasteryItem]
    badges: List[ScratchBadgeItem]


# ---------- Question Bank (Phase 2) ----------
class QuestionCreateIn(BaseModel):
    engine_code: str
    grade: Optional[int] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    skill: Optional[str] = None
    difficulty: Optional[int] = 1
    prompt: str
    data: dict[str, Any]
    visibility: Optional[str] = "private"  # private | system
    status: Optional[str] = "draft"  # draft | ready | archived
    source_game_id: Optional[str] = None
    source_game_version: Optional[int] = None


class QuestionUpdateIn(BaseModel):
    engine_code: Optional[str] = None
    grade: Optional[int] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    skill: Optional[str] = None
    difficulty: Optional[int] = None
    prompt: Optional[str] = None
    data: Optional[dict[str, Any]] = None
    visibility: Optional[str] = None
    status: Optional[str] = None


class QuestionOut(BaseModel):
    id: str
    engine_code: str
    grade: Optional[int] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    skill: Optional[str] = None
    difficulty: int = 1
    prompt: str
    data: dict[str, Any]
    content_hash: str
    normalized_hash: str
    creator_id: Optional[str] = None
    source_game_id: Optional[str] = None
    source_game_version: Optional[int] = None
    visibility: str = "private"
    status: str = "draft"
    usage_count: int = 0
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None

    class Config:
        from_attributes = True


class PaginatedQuestionsOut(BaseModel):
    items: list[QuestionOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------- JSON Import Staging & Preview (Phase 3) ----------
class ImportPreviewIn(BaseModel):
    gameObject: Any


class ImportPreviewStats(BaseModel):
    total_levels: int
    total_questions: int
    unique_questions: int
    safe_for_kids: bool


class ImportPreviewOut(BaseModel):
    valid: bool
    errors: list[str]
    warnings: list[str]
    game: Optional[dict[str, Any]] = None
    stats: Optional[ImportPreviewStats] = None


# ---------- Game Builder & Question Reuse (Phase 4) ----------
class BuildGameFromBankIn(BaseModel):
    title: str
    description: Optional[str] = None
    detailed_description: Optional[str] = None
    template_code: str
    category: Optional[str] = "iq"
    grade_from: Optional[int] = 1
    grade_to: Optional[int] = 9
    price: Optional[int] = 0
    question_ids: list[str]


class AddQuestionsFromBankIn(BaseModel):
    question_ids: list[str]


class ExtractQuestionsToBankOut(BaseModel):
    extracted_count: int
    skipped_duplicate_count: int
    question_ids: list[str]


# ---------- Game Blueprint Layer (Phase 5) ----------
class GameBlueprintCreateIn(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    grade: int
    subject: str
    topic: str
    target_engine: str
    total_questions: Optional[int] = 10
    rule_config: Optional[dict[str, Any]] = Field(default_factory=dict)
    is_active: Optional[bool] = True


class GameBlueprintUpdateIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    grade: Optional[int] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    target_engine: Optional[str] = None
    total_questions: Optional[int] = None
    rule_config: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None


class GameBlueprintOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    grade: int
    subject: str
    topic: str
    target_engine: str
    total_questions: int
    rule_config: dict[str, Any]
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaginatedBlueprintsOut(BaseModel):
    items: list[GameBlueprintOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class BuildGameFromBlueprintIn(BaseModel):
    custom_title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = None
    grade_from: Optional[int] = None
    grade_to: Optional[int] = None


# ---------- Content Quality Gate (Phase 6) ----------
class QualityDimension(BaseModel):
    name: str
    dimension_key: str
    score: int
    max_score: int
    status: str  # pass | warning | fail
    issues: list[str] = []


class QualityReportOut(BaseModel):
    game_id: Optional[str] = None
    title: Optional[str] = None
    total_score: int
    max_score: int = 100
    grade: str  # EXCELLENT | GOOD | FAIR | POOR
    is_publishable: bool
    summary: str
    dimensions: list[QualityDimension]
    recommendations: list[str] = []
    stats: Optional[dict[str, Any]] = None


# ---------- Duplicate Detection Engine (Phase 7) ----------
class DuplicateCandidateOut(BaseModel):
    game_id: str
    title: str
    creator_id: Optional[str] = None
    creator_name: Optional[str] = None
    similarity: float
    similarity_percent: int
    common_count: int
    total_target_questions: int
    total_candidate_questions: int
    risk_level: str  # LOW | MEDIUM | HIGH


class DuplicateCheckOut(BaseModel):
    game_id: Optional[str] = None
    title: Optional[str] = None
    has_duplicate_risk: bool
    max_similarity: float
    max_similarity_percent: int
    overall_risk_level: str  # LOW | MEDIUM | HIGH
    candidates: list[DuplicateCandidateOut] = []


# ---------- Admin AI Content Factory (Phase 8) ----------
class AiBatchGenerateQuestionsIn(BaseModel):
    topic: str
    template_code: str
    count: int = 5
    grade: Optional[int] = 2
    category: Optional[str] = "iq"
    save_to_bank: Optional[bool] = False


class VerifiedQuestionItem(BaseModel):
    index: int
    question_type: str
    prompt: str
    data: dict[str, Any]
    is_verified: bool
    error_message: Optional[str] = None
    content_hash: Optional[str] = None
    normalized_hash: Optional[str] = None
    saved_question_id: Optional[str] = None


class AiBatchGenerateQuestionsOut(BaseModel):
    success: bool
    topic: str
    template_code: str
    total_requested: int
    total_generated: int
    total_verified: int
    saved_to_bank_count: int
    items: list[VerifiedQuestionItem]
