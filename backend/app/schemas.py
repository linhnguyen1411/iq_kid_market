import copy
from typing import Any, Optional, List
from pydantic import BaseModel


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
    levels: Any

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

    if q_type == "quiz":
        clean.pop("answer", None)
        clean.pop("explanation", None)
    elif q_type == "math":
        clean.pop("answer", None)
        clean.pop("result", None)
        clean.pop("explanation", None)
    elif q_type == "sequence":
        clean.pop("answer", None)
        clean.pop("explanation", None)
    elif q_type == "sorting":
        clean.pop("correct_order", None)
        clean.pop("correct_sequence_ids", None)
        clean.pop("explanation", None)
    elif q_type == "language":
        clean.pop("answer", None)
        clean.pop("target_word", None)
        clean.pop("target_sentence", None)
        clean.pop("correct_order", None)
        clean.pop("explanation", None)
    elif q_type in ("logic", "logic_grid"):
        clean.pop("answer", None)
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
        clean.pop("target_row", None)
        clean.pop("target_col", None)
        clean.pop("target_coordinates", None)
        clean.pop("explanation", None)

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


