from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Text, JSON
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)  # "u1", "u2"...
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Hash mật khẩu an toàn bằng bcrypt
    name = Column(String(150), nullable=False)
    role = Column(String(20), nullable=False, default="student")  # student|teacher|parent|creator|admin
    grade = Column(Integer, nullable=True)
    avatar = Column(String(50), default="smile_tiger")
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    streak = Column(Integer, default=0)
    last_active_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    wallet = relationship("Wallet", uselist=False, back_populates="user", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="user", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="user", cascade="all, delete-orphan")
    games_created = relationship("Game", back_populates="creator")


class Wallet(Base):
    __tablename__ = "wallets"

    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    balance = Column(Integer, default=0)
    currency = Column(String(10), default="VND")

    user = relationship("User", back_populates="wallet")
    transactions = relationship(
        "WalletTransaction", back_populates="wallet",
        cascade="all, delete-orphan", order_by="desc(WalletTransaction.created_at)"
    )


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(String(50), primary_key=True)  # "tx_<timestamp>"
    wallet_user_id = Column(String(50), ForeignKey("wallets.user_id", ondelete="CASCADE"), nullable=False)
    amount = Column(Integer, nullable=False)  # dương = nạp, âm = trừ
    type = Column(String(50))  # "nạp tiền" | "mua game"
    detail = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    wallet = relationship("Wallet", back_populates="transactions")


class Game(Base):
    __tablename__ = "games"

    id = Column(String(80), primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    detailed_description = Column(Text)
    thumbnail = Column(String(20))
    price = Column(Integer, default=0)
    grade_from = Column(Integer, default=1)
    grade_to = Column(Integer, default=9)
    template_code = Column(String(50), nullable=False)  # matching|sequence|memory|quiz|...
    category = Column(String(50), default="iq")
    creator_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    creator_name = Column(String(150), nullable=True)
    review_status = Column(String(30), default="approved")  # pending_review|approved|rejected
    review_feedback = Column(Text, nullable=True)
    is_published = Column(Boolean, default=True)
    is_seed = Column(Boolean, default=False)  # true = game gốc trong seedData, không cho xoá
    rating_avg = Column(Float, default=4.5)
    plays_count = Column(Integer, default=0)
    # Levels + questions lồng nhau, schema câu hỏi rất linh hoạt (10 loại game engine, mỗi loại field khác nhau)
    # -> lưu nguyên khối JSONB thay vì chuẩn hoá hết ra bảng con, tránh join phức tạp không cần thiết cho MVP.
    levels = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", back_populates="games_created")
    purchases = relationship("Purchase", back_populates="game", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="game", cascade="all, delete-orphan")


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_id = Column(String(80), ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    purchased_price = Column(Integer, default=0)
    purchased_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="purchases")
    game = relationship("Game", back_populates="purchases")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(String(50), primary_key=True)  # "att_<timestamp>"
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_id = Column(String(80), ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    level_num = Column(Integer, nullable=False)
    score = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    duration_secs = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="attempts")
    game = relationship("Game", back_populates="attempts")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(String(30), primary_key=True)
    title = Column(String(150), nullable=False)
    description = Column(String(255))
    badge_code = Column(String(50))
    xp_bonus = Column(Integer, default=100)
    icon = Column(String(20))


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(String(50), primary_key=True)  # "ua_<user_id>_<achievement_id>"
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    achievement_id = Column(String(30), ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="unlocked_achievements")
    achievement = relationship("Achievement")


class ScratchCourse(Base):
    __tablename__ = "scratch_courses"

    id = Column(String(30), primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    thumbnail = Column(String(20))
    difficulty = Column(String(50), default="Cơ bản")
    total_lessons = Column(Integer, default=0)

    lessons = relationship(
        "ScratchLesson", back_populates="course",
        cascade="all, delete-orphan", order_by="ScratchLesson.lesson_num"
    )


class ScratchLesson(Base):
    __tablename__ = "scratch_lessons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(String(30), ForeignKey("scratch_courses.id", ondelete="CASCADE"), nullable=False)
    lesson_num = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text)
    target_block_sequence = Column(Text)
    start_scene_json = Column(Text)
    xp_reward = Column(Integer, default=30)

    course = relationship("ScratchCourse", back_populates="lessons")
