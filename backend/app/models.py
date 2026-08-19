import uuid
import time
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Text, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .database import Base


# =====================================================================
# ID GENERATORS (Chuẩn Prefix ID / Stripe-style cho Production)
# =====================================================================
def generate_user_id() -> str:
    """Tự động sinh User ID: usr_<random_hex> (ví dụ: usr_3f8a9c12b4e5)"""
    return f"usr_{uuid.uuid4().hex[:12]}"


def generate_tx_id() -> str:
    """Tự động sinh Transaction ID: tx_<timestamp_ms>_<entropy> (Time-sortable + Unique)"""
    return f"tx_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"


def generate_game_id() -> str:
    """Tự động sinh Game ID: game_<timestamp_ms>_<entropy>"""
    return f"game_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"


def generate_attempt_id() -> str:
    """Tự động sinh Attempt ID: att_<timestamp_ms>_<entropy>"""
    return f"att_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"


def generate_achievement_id() -> str:
    """Tự động sinh Achievement ID: ach_<entropy>"""
    return f"ach_{uuid.uuid4().hex[:8]}"


def generate_scratch_course_id() -> str:
    """Tự động sinh Scratch Course ID: sc_<entropy>"""
    return f"sc_{uuid.uuid4().hex[:8]}"


# =====================================================================
# ORM MODELS
# =====================================================================
class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=generate_user_id)
    username = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    role = Column(String(20), nullable=False, default="student")  # student|teacher|parent|creator|admin
    grade = Column(Integer, nullable=True)
    avatar = Column(String(50), default="smile_tiger")
    xp = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    streak = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    wallet = relationship("Wallet", uselist=False, back_populates="user", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="user", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="user", cascade="all, delete-orphan")
    games_created = relationship("Game", back_populates="creator")


class Wallet(Base):
    __tablename__ = "wallets"

    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    balance = Column(Integer, default=0, nullable=False)
    currency = Column(String(10), default="VND", nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="wallet")
    transactions = relationship(
        "WalletTransaction", back_populates="wallet",
        cascade="all, delete-orphan", order_by="desc(WalletTransaction.created_at)"
    )


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(String(64), primary_key=True, default=generate_tx_id)
    wallet_user_id = Column(String(64), ForeignKey("wallets.user_id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # dương = nạp, âm = trừ
    type = Column(String(50))  # "nạp tiền" | "mua game"
    detail = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    wallet = relationship("Wallet", back_populates="transactions")


class Game(Base):
    __tablename__ = "games"

    id = Column(String(80), primary_key=True, default=generate_game_id)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    detailed_description = Column(Text)
    thumbnail = Column(String(20))
    price = Column(Integer, default=0, nullable=False)
    grade_from = Column(Integer, default=1, nullable=False)
    grade_to = Column(Integer, default=9, nullable=False)
    template_code = Column(String(50), nullable=False, index=True)  # matching|sequence|memory|quiz|...
    category = Column(String(50), default="iq", index=True)
    creator_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    creator_name = Column(String(150), nullable=True)
    review_status = Column(String(30), default="approved", index=True)  # pending_review|approved|rejected
    review_feedback = Column(Text, nullable=True)
    is_published = Column(Boolean, default=True, index=True)
    is_seed = Column(Boolean, default=False, index=True)  # true = game gốc trong seedData, không cho xoá
    rating_avg = Column(Float, default=4.5)
    plays_count = Column(Integer, default=0, nullable=False)
    # Levels + questions lồng nhau dạng JSONB
    levels = Column(JSONB, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    creator = relationship("User", back_populates="games_created")
    purchases = relationship("Purchase", back_populates="game", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="game", cascade="all, delete-orphan")


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_id = Column(String(80), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    purchased_price = Column(Integer, default=0, nullable=False)
    purchased_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="purchases")
    game = relationship("Game", back_populates="purchases")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(String(64), primary_key=True, default=generate_attempt_id)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_id = Column(String(80), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    level_num = Column(Integer, nullable=False)
    score = Column(Integer, default=0, nullable=False)
    completed = Column(Boolean, default=False, nullable=False)
    duration_secs = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="attempts")
    game = relationship("Game", back_populates="attempts")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(String(64), primary_key=True, default=generate_achievement_id)
    title = Column(String(150), nullable=False)
    description = Column(String(255))
    badge_code = Column(String(50), index=True)
    xp_bonus = Column(Integer, default=100, nullable=False)
    icon = Column(String(20))


class ScratchCourse(Base):
    __tablename__ = "scratch_courses"

    id = Column(String(64), primary_key=True, default=generate_scratch_course_id)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    thumbnail = Column(String(20))
    difficulty = Column(String(50), default="Cơ bản")
    total_lessons = Column(Integer, default=0, nullable=False)

    lessons = relationship(
        "ScratchLesson", back_populates="course",
        cascade="all, delete-orphan", order_by="ScratchLesson.lesson_num"
    )


class ScratchLesson(Base):
    __tablename__ = "scratch_lessons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(String(64), ForeignKey("scratch_courses.id", ondelete="CASCADE"), nullable=False, index=True)
    lesson_num = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text)
    target_block_sequence = Column(Text)
    start_scene_json = Column(Text)
    xp_reward = Column(Integer, default=30, nullable=False)

    course = relationship("ScratchCourse", back_populates="lessons")
