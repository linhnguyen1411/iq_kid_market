from typing import Any, Optional
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
    role: Optional[str] = "student"  # student | teacher | parent | creator | admin
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


class AddLevelQuestionIn(BaseModel):
    question_type: Optional[str] = None
    prompt: str
    points: Optional[int] = 25
    data: Any

    @classmethod
    def validate_game_data(cls, q_type: str, v: Any) -> Any:
        """Kiểm tra tính toàn vẹn của dữ liệu data theo GAME_ENGINE_RULES.md."""
        if not isinstance(v, dict):
            raise ValueError("Thuộc tính 'data' của câu hỏi phải là một JSON Object (Dictionary)!")

        if q_type == "matching":
            pairs = v.get("pairs")
            if not pairs or not isinstance(pairs, list) or len(pairs) < 1:
                raise ValueError("Game Nối Cột (matching) bắt buộc phải có mảng 'pairs' với ít nhất 1 cặp {left, right}!")
            for p in pairs:
                if not isinstance(p, dict) or "left" not in p or "right" not in p:
                    raise ValueError("Mỗi phần tử trong 'pairs' phải chứa cả 'left' và 'right'!")

        elif q_type == "quiz":
            options = v.get("options")
            answer = v.get("answer")
            if not options or not isinstance(options, list) or len(options) < 2:
                raise ValueError("Game Trắc Nghiệm (quiz) bắt buộc phải có mảng 'options' với ít nhất 2 đáp án lựa chọn!")
            if not answer:
                raise ValueError("Game Trắc Nghiệm (quiz) bắt buộc phải có trường 'answer' xác định đáp án đúng!")

        elif q_type == "sequence":
            seq = v.get("sequence")
            answer = v.get("answer")
            if not seq or not isinstance(seq, list) or len(seq) < 2:
                raise ValueError("Game Điền Dãy Số (sequence) bắt buộc phải có mảng 'sequence' chứa các số/phần tử!")
            if answer is None or answer == "":
                raise ValueError("Game Điền Dãy Số (sequence) bắt buộc phải có trường 'answer'!")

        elif q_type == "memory":
            items = v.get("items")
            if not items or not isinstance(items, list) or len(items) < 2:
                raise ValueError("Game Lật Thẻ Trí Nhớ (memory) bắt buộc phải có mảng 'items' với ít nhất 2 hình/icon!")

        elif q_type == "sorting":
            items = v.get("items")
            correct_seq = v.get("correct_sequence_ids")
            if not items or not isinstance(items, list) or len(items) < 2:
                raise ValueError("Game Sắp Xếp (sorting) bắt buộc phải có mảng 'items' với ít nhất 2 bước/phần tử!")
            if not correct_seq or not isinstance(correct_seq, list):
                raise ValueError("Game Sắp Xếp (sorting) bắt buộc phải có mảng 'correct_sequence_ids' chỉ thứ tự đúng!")

        elif q_type == "flashcard":
            cards = v.get("cards")
            if not cards or not isinstance(cards, list) or len(cards) < 1:
                raise ValueError("Game Thẻ Ghi Nhớ (flashcard) bắt buộc phải có mảng 'cards' chứa ít nhất 1 thẻ {front, back}!")

        elif q_type == "scratch":
            if "cat_pos" not in v or "star_pos" not in v:
                raise ValueError("Game Lập Trình Scratch bắt buộc phải có tọa độ 'cat_pos' và 'star_pos'!")

        elif q_type == "math":
            if "expression" not in v or "answer" not in v:
                raise ValueError("Game Toán Học (math) bắt buộc phải có biểu thức 'expression' và đáp án 'answer'!")

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
    userId: str
    gameId: str
    levelNum: int
    score: int
    completed: Optional[bool] = True
    duration: Optional[int] = 15


class SubmitAttemptOut(BaseModel):
    success: bool
    score: int
    xpAwarded: int
    newXp: int
    levelUp: bool
    newLevel: int
    newStreak: int
    coinReward: int
    unlockedAchievements: list[dict]
    message: str


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
    userId: str
    courseId: str
    lessonNum: int
    submittedSequence: Any  # list[str] hoặc chuỗi "move_forward,turn_left"


class ScratchSubmitOut(BaseModel):
    success: bool
    message: str
    xpAwarded: int
    coinAwarded: int
    nextLessonNum: Optional[int] = None
    starsEarned: int


class CreateScratchCourseIn(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = "🐱"
    difficulty: Optional[str] = "Cơ bản"


class CreateScratchLessonIn(BaseModel):
    course_id: str
    lesson_num: Optional[int] = None
    title: str
    content: Optional[str] = None
    target_block_sequence: str
    start_scene_json: Optional[str] = None
    xp_reward: Optional[int] = 30


class UpdateScratchLessonIn(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    target_block_sequence: Optional[str] = None
    start_scene_json: Optional[str] = None
    xp_reward: Optional[int] = None

