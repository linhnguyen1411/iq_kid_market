from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Text, JSON,
    UniqueConstraint,
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
    role = Column(String(20), nullable=False, default="student", index=True)  # student|teacher|creator|admin
    grade = Column(Integer, nullable=True, index=True)
    avatar = Column(String(50), default="smile_tiger")
    xp = Column(Integer, default=0, index=True)
    level = Column(Integer, default=1)
    streak = Column(Integer, default=0, index=True)
    last_active_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    wallet = relationship("Wallet", uselist=False, back_populates="user", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="user", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="user", cascade="all, delete-orphan")
    games_created = relationship("Game", back_populates="creator")
    questions = relationship("Question", back_populates="creator")


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
    wallet_user_id = Column(String(50), ForeignKey("wallets.user_id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # dương = nạp, âm = trừ
    type = Column(String(50))  # "nạp tiền" | "mua game"
    detail = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    wallet = relationship("Wallet", back_populates="transactions")


class Game(Base):
    __tablename__ = "games"

    id = Column(String(80), primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    detailed_description = Column(Text)
    thumbnail = Column(String(20))
    price = Column(Integer, default=0, index=True)
    grade_from = Column(Integer, default=1, index=True)
    grade_to = Column(Integer, default=9, index=True)
    template_code = Column(String(50), nullable=False, index=True)  # matching|sequence|memory|quiz|...
    category = Column(String(50), default="iq", index=True)
    creator_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    creator_name = Column(String(150), nullable=True)
    review_status = Column(String(30), default="approved", index=True)  # pending_review|approved|rejected
    review_feedback = Column(Text, nullable=True)
    is_published = Column(Boolean, default=True, index=True)
    is_seed = Column(Boolean, default=False)  # true = game gốc trong seedData, không cho xoá
    rating_avg = Column(Float, default=4.5, index=True)
    plays_count = Column(Integer, default=0)
    # Levels + questions lồng nhau, schema câu hỏi rất linh hoạt (10 loại game engine, mỗi loại field khác nhau)
    # -> lưu nguyên khối JSONB thay vì chuẩn hoá hết ra bảng con, tránh join phức tạp không cần thiết cho MVP.
    current_version_num = Column(Integer, default=1)
    levels = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    creator = relationship("User", back_populates="games_created")
    purchases = relationship("Purchase", back_populates="game", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="game", cascade="all, delete-orphan")
    versions = relationship(
        "GameVersion",
        back_populates="game",
        cascade="all, delete-orphan",
        order_by="desc(GameVersion.version_num)",
    )


class GameVersion(Base):
    """
    Bản chụp snapshot phiên bản game bất biến (Immutable Published Snapshot)
    hoặc bản thảo đang soạn thảo (Draft Version).
    """
    __tablename__ = "game_versions"

    id = Column(String(80), primary_key=True)  # "gv_<game_id>_v<version_num>"
    game_id = Column(String(80), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    version_num = Column(Integer, nullable=False)
    status = Column(String(30), nullable=False, default="draft", index=True)  # draft|pending_review|published|rejected|archived
    levels = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    detailed_description = Column(Text, nullable=True)
    price = Column(Integer, default=0)
    template_code = Column(String(50), nullable=False)
    category = Column(String(50), default="iq")
    quality_score = Column(Integer, nullable=True)
    changelog = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)

    game = relationship("Game", back_populates="versions")
    attempts = relationship("Attempt", back_populates="game_version")
    purchases = relationship("Purchase", back_populates="game_version")

    __table_args__ = (
        UniqueConstraint("game_id", "version_num", name="uq_game_version_num"),
    )


class GameCategory(Base):
    """Thể loại game — admin quản lý tại CMS (Chợ Game lọc theo code)."""
    __tablename__ = "game_categories"

    code = Column(String(50), primary_key=True)  # slug: iq, math, scratch...
    label = Column(String(150), nullable=False)
    icon = Column(String(20), default="🎮")
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_id = Column(String(80), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    game_version_id = Column(String(80), ForeignKey("game_versions.id", ondelete="SET NULL"), nullable=True)
    purchased_price = Column(Integer, default=0)
    purchased_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="purchases")
    game = relationship("Game", back_populates="purchases")
    game_version = relationship("GameVersion", back_populates="purchases")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(String(50), primary_key=True)  # "att_<timestamp>"
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_id = Column(String(80), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    game_version_id = Column(String(80), ForeignKey("game_versions.id", ondelete="SET NULL"), nullable=True)
    level_num = Column(Integer, nullable=False)
    score = Column(Integer, default=0, index=True)
    completed = Column(Boolean, default=False)
    duration_secs = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="attempts")
    game = relationship("Game", back_populates="attempts")
    game_version = relationship("GameVersion", back_populates="attempts")


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
    course_type = Column(String(50), default="algorithm_maze", nullable=True)
    price = Column(Integer, default=0)

    lessons = relationship(
        "ScratchLesson", back_populates="course",
        cascade="all, delete-orphan", order_by="ScratchLesson.lesson_num"
    )


class CoursePurchase(Base):
    __tablename__ = "course_purchases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(30), ForeignKey("scratch_courses.id", ondelete="CASCADE"), nullable=False, index=True)
    purchased_price = Column(Integer, default=0)
    purchased_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="course_purchases")
    course = relationship("ScratchCourse")

    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_user_course_purchase"),
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
    engine_type = Column(String(50), default="algorithm_maze", nullable=True)

    course = relationship("ScratchCourse", back_populates="lessons")


class UserScratchProgress(Base):
    __tablename__ = "user_scratch_progress"

    id = Column(String(60), primary_key=True)  # "usp_<user_id>_<course_id>_<lesson_num>"
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(30), ForeignKey("scratch_courses.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("scratch_lessons.id", ondelete="CASCADE"), nullable=False)
    lesson_num = Column(Integer, nullable=False)
    completed = Column(Boolean, default=True)
    stars_earned = Column(Integer, default=3)
    submitted_sequence = Column(Text, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="scratch_progress")
    course = relationship("ScratchCourse")
    lesson = relationship("ScratchLesson")

    __table_args__ = (
        UniqueConstraint("user_id", "course_id", "lesson_num", name="uq_user_course_lesson"),
    )


class ScratchProject(Base):
    __tablename__ = "scratch_projects"

    id = Column(String(60), primary_key=True)  # "sp_<user_id>_<timestamp>"
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False, default="Dự Án Scratch Của Bé")
    description = Column(Text, nullable=True)
    thumbnail = Column(String(20), default="🐒")
    project_data = Column(Text, nullable=False)  # JSON string lưu workspace XML, sprite state, telemetry
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="scratch_projects")


class DailyQuest(Base):
    __tablename__ = "daily_quests"

    id = Column(String(50), primary_key=True)
    title = Column(String(150), nullable=False)
    description = Column(String(255), nullable=False)
    type = Column(String(40), nullable=False, unique=True, index=True)
    target_count = Column(Integer, nullable=False)
    xp_reward = Column(Integer, default=0)
    coin_reward = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)


class UserDailyQuest(Base):
    __tablename__ = "user_daily_quests"
    __table_args__ = (
        UniqueConstraint("user_id", "quest_id", "quest_date", name="uq_user_daily_quest_day"),
    )

    id = Column(String(80), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    quest_id = Column(String(50), ForeignKey("daily_quests.id", ondelete="CASCADE"), nullable=False, index=True)
    current_progress = Column(Integer, default=0, nullable=False)
    status = Column(String(20), default="IN_PROGRESS", nullable=False, index=True)
    quest_date = Column(DateTime, nullable=False, index=True)

    quest = relationship("DailyQuest")
    user = relationship("User")


class UserDailySpin(Base):
    __tablename__ = "user_daily_spins"
    __table_args__ = (
        UniqueConstraint("user_id", "spin_date", name="uq_user_daily_spin_day"),
    )

    id = Column(String(80), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    spin_date = Column(DateTime, nullable=False, index=True)
    eligible = Column(Boolean, default=False, nullable=False)
    spun = Column(Boolean, default=False, nullable=False)
    reward_code = Column(String(40), nullable=True)
    reward_amount = Column(Integer, default=0, nullable=False)

    user = relationship("User")


class LoginRewardClaim(Base):
    __tablename__ = "login_reward_claims"
    __table_args__ = (
        UniqueConstraint("user_id", "claim_date", name="uq_login_reward_user_day"),
    )

    id = Column(String(80), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    claim_date = Column(DateTime, nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    coin_reward = Column(Integer, nullable=False)

    user = relationship("User")


class Question(Base):
    """
    Ngân hàng câu hỏi dùng chung (Canonical Reusable Content Layer).
    Lưu trữ câu hỏi độc lập với Game, có dual hash để chống trùng lặp,
    phân quyền sở hữu (creator_id), trạng thái phê duyệt (status),
    và phạm vi hiển thị (visibility: private / system).
    """
    __tablename__ = "questions"

    id = Column(String(80), primary_key=True)
    engine_code = Column(String(50), nullable=False, index=True)
    grade = Column(Integer, nullable=True, index=True)
    subject = Column(String(50), nullable=True, index=True)
    topic = Column(String(100), nullable=True, index=True)
    skill = Column(String(100), nullable=True)
    difficulty = Column(Integer, nullable=False, default=1, index=True)
    prompt = Column(Text, nullable=False)
    data = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    content_hash = Column(String(64), nullable=False, index=True)
    normalized_hash = Column(String(64), nullable=False, index=True)
    creator_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    source_game_id = Column(String(80), ForeignKey("games.id", ondelete="SET NULL"), nullable=True, index=True)
    source_game_version = Column(Integer, nullable=True)
    visibility = Column(String(20), nullable=False, default="private", index=True)
    status = Column(String(20), nullable=False, default="draft", index=True)
    usage_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = relationship("User", back_populates="questions")
    source_game = relationship("Game")


class GameBlueprint(Base):
    """
    Game Blueprint (Công thức tạo game - Phase 5).
    Định nghĩa công thức sư phạm chuẩn (khối lớp, môn học, chủ đề, engine đích,
    số lượng câu hỏi mục tiêu, phân bổ độ khó) để tự động ghép Game từ Ngân hàng câu hỏi.
    """
    __tablename__ = "game_blueprints"

    id = Column(String(50), primary_key=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    grade = Column(Integer, nullable=False, index=True)
    subject = Column(String(50), nullable=False, index=True)
    topic = Column(String(100), nullable=False, index=True)
    target_engine = Column(String(30), nullable=False, index=True)
    total_questions = Column(Integer, default=10, nullable=False)
    rule_config = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=dict)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

