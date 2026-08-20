import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["attempts"])

XP_PER_LEVEL = 250


def update_daily_streak(user: models.User, now_dt: datetime) -> int:
    """
    Tính toán chuỗi ngày học liên tục (Daily Streak):
    - Học tiếp ngày hôm sau: streak + 1
    - Cùng ngày: giữ nguyên streak
    - Bỏ lỡ từ 2 ngày trở lên: reset về 1
    """
    today = now_dt.date()

    if not user.last_active_date:
        user.streak = 1
    else:
        last_date = user.last_active_date.date()
        diff_days = (today - last_date).days

        if diff_days == 1:
            user.streak = (user.streak or 0) + 1
        elif diff_days > 1:
            user.streak = 1
        # diff_days == 0: cùng ngày -> giữ nguyên streak

    user.last_active_date = now_dt
    return user.streak


def check_and_unlock_achievements(user: models.User, db: Session) -> list[dict]:
    """
    Kiểm tra và tự động mở khóa các danh hiệu thành tích (Achievements) khi thỏa điều kiện.
    """
    existing_unlocked = {ua.achievement_id for ua in db.query(models.UserAchievement).filter_by(user_id=user.id).all()}
    all_achievements = db.query(models.Achievement).all()

    # Đếm số màn chơi hoàn thành
    completed_attempts_count = db.query(models.Attempt).filter_by(user_id=user.id, completed=True).count()

    # Đếm số màn chơi khác nhau
    distinct_levels_count = (
        db.query(models.Attempt.game_id, models.Attempt.level_num)
        .filter(models.Attempt.user_id == user.id, models.Attempt.completed == True)  # noqa: E712
        .distinct()
        .count()
    )

    new_unlocked = []

    for ach in all_achievements:
        if ach.id in existing_unlocked:
            continue

        should_unlock = False

        # 1. Trò chơi đầu tiên
        if (ach.badge_code == "first_game" or ach.id == "a1") and completed_attempts_count >= 1:
            should_unlock = True
        # 2. Chuỗi ngày học
        elif (ach.badge_code == "streak_3" or ach.id == "a2") and (user.streak or 0) >= 3:
            should_unlock = True
        elif (ach.badge_code == "streak_7" or ach.id == "a3") and (user.streak or 0) >= 7:
            should_unlock = True
        # 3. Mốc Kinh nghiệm XP
        elif (ach.badge_code == "xp_500" or ach.id == "a4") and user.xp >= 500:
            should_unlock = True
        elif (ach.badge_code == "xp_1000" or ach.id == "a5") and user.xp >= 1000:
            should_unlock = True
        # 4. Master 5 màn chơi
        elif (ach.badge_code == "master_5" or ach.id == "a6") and distinct_levels_count >= 5:
            should_unlock = True

        if should_unlock:
            ts = int(time.time() * 1000)
            ua = models.UserAchievement(
                id=f"ua_{user.id}_{ach.id}_{ts}",
                user_id=user.id,
                achievement_id=ach.id,
                unlocked_at=datetime.utcnow(),
            )
            db.add(ua)
            user.xp += ach.xp_bonus or 100  # Thưởng thêm XP khi mở khóa danh hiệu
            new_unlocked.append({
                "id": ach.id,
                "title": ach.title,
                "badge_code": ach.badge_code,
                "icon": ach.icon or "🏆",
                "xp_bonus": ach.xp_bonus or 100,
                "description": ach.description,
            })

    return new_unlocked


@router.post("/api/attempts/submit", response_model=schemas.SubmitAttemptOut)
def submit_attempt(body: schemas.SubmitAttemptIn, db: Session = Depends(get_db)):
    """
    Nộp điểm màn chơi:
    1. Ghi nhận bản ghi Attempt.
    2. Cộng điểm kinh nghiệm XP & tính cấp độ Level.
    3. Thưởng xu vào ví học sinh.
    4. Cập nhật chuỗi ngày học liên tục (Daily Streak).
    5. Tự động kiểm tra và mở khóa danh hiệu thành tích.
    """
    user = db.get(models.User, body.userId)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")

    now_dt = datetime.utcnow()
    now_ts = int(time.time() * 1000)

    # 1. Ghi nhận lượt chơi
    attempt = models.Attempt(
        id=f"att_{now_ts}",
        user_id=body.userId,
        game_id=body.gameId,
        level_num=body.levelNum,
        score=body.score,
        completed=bool(body.completed),
        duration_secs=body.duration or 15,
        created_at=now_dt,
    )
    db.add(attempt)
    db.flush()

    # 2. Tính toán điểm kinh nghiệm XP & Level
    if body.completed:
        xp_reward = max(body.score, 50) + (body.levelNum * 10)
    else:
        xp_reward = 10

    user.xp = (user.xp or 0) + xp_reward
    old_level = user.level or 1
    user.level = (user.xp // XP_PER_LEVEL) + 1
    level_up = user.level > old_level

    # 3. Thưởng xu vào ví học sinh
    coin_reward = 20 if body.completed else 5
    wallet = user.wallet
    if wallet:
        wallet.balance += coin_reward
        tx = models.WalletTransaction(
            id=f"tx_rew_{now_ts}",
            wallet_user_id=wallet.user_id,
            amount=coin_reward,
            type="thưởng chơi game",
            detail=f"Thưởng hoàn thành Màn {body.levelNum} (+{coin_reward} xu)",
            created_at=now_dt,
        )
        db.add(tx)

    # 4. Cập nhật Daily Streak
    new_streak = update_daily_streak(user, now_dt)

    # 5. Kiểm tra và mở khóa Danh hiệu thành tích
    unlocked_achievements = check_and_unlock_achievements(user, db)

    db.commit()
    db.refresh(user)

    message = f"Hoàn thành màn chơi! Nhận +{xp_reward} XP và +{coin_reward} xu 🎉"
    if level_up:
        message += f" Chúc mừng bé đã thăng lên Cấp {user.level}! 🌟"

    return {
        "success": True,
        "score": body.score,
        "xpAwarded": xp_reward,
        "newXp": user.xp,
        "levelUp": level_up,
        "newLevel": user.level,
        "newStreak": new_streak,
        "coinReward": coin_reward,
        "unlockedAchievements": unlocked_achievements,
        "message": message,
    }


@router.get("/api/attempts/history")
def get_attempt_history(
    userId: str,
    gameId: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Lấy lịch sử làm bài của học sinh theo từng trò chơi.
    """
    q = db.query(models.Attempt).filter(models.Attempt.user_id == userId)
    if gameId:
        q = q.filter(models.Attempt.game_id == gameId)

    history = q.order_by(models.Attempt.created_at.desc()).limit(limit).all()

    return [
        {
            "id": att.id,
            "gameId": att.game_id,
            "levelNum": att.level_num,
            "score": att.score,
            "completed": att.completed,
            "durationSecs": att.duration_secs,
            "createdAt": att.created_at.isoformat() if att.created_at else None,
        }
        for att in history
    ]
