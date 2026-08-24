from datetime import date, datetime, time, timedelta, timezone
import secrets

from sqlalchemy.orm import Session

from . import models

VIETNAM_TZ = timezone(timedelta(hours=7))
XP_PER_LEVEL = 250

QUEST_DEFINITIONS = (
    {"id": "quest_play_count", "title": "Chinh phục màn chơi", "description": "Hoàn thành 2 màn chơi bất kỳ trong ngày.", "type": "play_count", "target_count": 2, "xp_reward": 50, "coin_reward": 20},
    {"id": "quest_score_reach", "title": "Điểm số tuyệt đối", "description": "Đạt 100 điểm trong một game Toán hoặc IQ.", "type": "score_reach", "target_count": 1, "xp_reward": 75, "coin_reward": 30},
    {"id": "quest_scratch_complete", "title": "Nhà lập trình nhí", "description": "Hoàn thành một bài học Scratch trong ngày.", "type": "scratch_complete", "target_count": 1, "xp_reward": 60, "coin_reward": 25},
)

SPIN_REWARDS = (
    ("coins_10", 10, 40),
    ("coins_20", 20, 30),
    ("coins_50", 50, 15),
    ("coins_100", 100, 10),
    ("xp_double_ticket", 0, 5),
)


def vietnam_now() -> datetime:
    """Trả về thời gian hiện tại có gắn múi giờ Việt Nam (UTC+7)."""
    return datetime.now(VIETNAM_TZ)


def vietnam_date(dt: datetime | None = None) -> date:
    """
    Chuyển đổi datetime sang ngày (date) theo giờ Việt Nam (UTC+7).
    Nếu dt là naive datetime, mặc định coi là UTC (chuẩn lưu trữ DB).
    """
    if dt is None:
        return vietnam_now().date()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(VIETNAM_TZ).date()


def day_start(day: date | None = None) -> datetime:
    """Trả về mốc 00:00:00 của ngày được chỉ định (hoặc hôm nay theo giờ VN)."""
    d = day or vietnam_date()
    return datetime.combine(d, time.min)


def update_daily_streak(user: models.User, now_utc: datetime | None = None) -> int:
    """
    Tính toán chuỗi ngày học liên tục (Daily Streak) theo chuẩn múi giờ Việt Nam (UTC+7):
    - Đăng nhập/học tiếp ngày hôm sau (theo giờ VN): streak + 1
    - Cùng ngày hôm nay (giờ VN): giữ nguyên streak
    - Bỏ lỡ từ 2 ngày trở lên (giờ VN): reset về 1
    """
    now = now_utc or datetime.utcnow()
    today_vn = vietnam_date(now)

    if not user.last_active_date:
        user.streak = max(user.streak or 0, 1)
    else:
        last_vn = vietnam_date(user.last_active_date)
        diff_days = (today_vn - last_vn).days
        if diff_days == 1:
            user.streak = (user.streak or 0) + 1
        elif diff_days > 1:
            user.streak = 1
        # diff_days <= 0: cùng ngày -> giữ nguyên streak

    user.last_active_date = now.replace(tzinfo=None) if hasattr(now, "replace") else now
    return user.streak or 1


def ensure_daily_quests(db: Session, user_id: str, day: date | None = None) -> list[models.UserDailyQuest]:
    quest_day = day or vietnam_date()
    target_date = day_start(quest_day)
    for definition in QUEST_DEFINITIONS:
        quest = db.get(models.DailyQuest, definition["id"])
        if not quest:
            quest = models.DailyQuest(**definition)
            db.add(quest)
            db.flush()
        assigned = db.query(models.UserDailyQuest).filter_by(
            user_id=user_id, quest_id=quest.id, quest_date=target_date
        ).first()
        if not assigned:
            db.add(models.UserDailyQuest(
                id=f"udq_{user_id}_{quest.id}_{quest_day.isoformat()}",
                user_id=user_id, quest_id=quest.id, quest_date=target_date,
            ))
    db.flush()
    return db.query(models.UserDailyQuest).filter_by(
        user_id=user_id, quest_date=target_date
    ).order_by(models.UserDailyQuest.id).all()


def update_quest_progress(db: Session, user_id: str, event_type: str, amount: int = 1) -> None:
    assignments = ensure_daily_quests(db, user_id)
    for assignment in assignments:
        if assignment.status == "CLAIMED" or assignment.quest.type != event_type:
            continue
        assignment.current_progress = min(assignment.quest.target_count, assignment.current_progress + amount)
        if assignment.current_progress >= assignment.quest.target_count:
            assignment.status = "COMPLETED"


def unlock_daily_spin(db: Session, user_id: str) -> None:
    today = vietnam_date()
    spin = db.query(models.UserDailySpin).filter_by(
        user_id=user_id, spin_date=day_start(today)
    ).first()
    if not spin:
        db.add(models.UserDailySpin(
            id=f"spin_{user_id}_{today.isoformat()}",
            user_id=user_id, spin_date=day_start(today), eligible=True,
        ))
    elif not spin.spun:
        spin.eligible = True


def choose_spin_reward() -> tuple[str, int]:
    pick = secrets.randbelow(100)
    total = 0
    for code, amount, weight in SPIN_REWARDS:
        total += weight
        if pick < total:
            return code, amount
    return SPIN_REWARDS[-1][0], SPIN_REWARDS[-1][1]