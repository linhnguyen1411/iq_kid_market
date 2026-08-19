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
    role: Optional[str] = "student"  # student | teacher | parent | creator
    grade: Optional[int] = 1
    avatar: Optional[str] = "smile_tiger"


class LoginIn(BaseModel):
    username: str
    password: str


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    wallet: WalletOut
    purchases: list[str]


class ChangePasswordIn(BaseModel):
    userId: str
    old_password: str
    new_password: str


class UpdateProfileIn(BaseModel):
    userId: str
    name: Optional[str] = None
    avatar: Optional[str] = None
    grade: Optional[int] = None


# ---------- Wallet ----------
class TopupIn(BaseModel):
    userId: str
    amount: int
    method: Optional[str] = None


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
    category: str
    creatorId: Optional[str] = None
    customFirstLevel: Optional[dict] = None


class AddLevelQuestionIn(BaseModel):
    question_type: Optional[str] = None
    prompt: str
    points: Optional[int] = 25
    data: Any


class AddLevelIn(BaseModel):
    gameId: str
    level_num: Optional[int] = None
    title: str
    xp_reward: Optional[int] = 80
    coin_reward: Optional[int] = 20
    question: AddLevelQuestionIn
    creatorId: Optional[str] = None


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


class ReviewDecideIn(BaseModel):
    gameId: str
    action: str  # "approve" | "reject"
    feedback: Optional[str] = None


# ---------- Attempts ----------
class SubmitAttemptIn(BaseModel):
    userId: str
    gameId: str
    levelNum: int
    score: int
    completed: Optional[bool] = True
    duration: Optional[int] = 15
