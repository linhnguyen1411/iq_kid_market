import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..daily_quests import unlock_daily_spin, update_quest_progress, update_daily_streak, XP_PER_LEVEL
from ..game_config import can_access_level, FREE_LEVEL_COUNT

router = APIRouter(tags=["attempts"])


def _game_level_nums(game: models.Game | None) -> set[int]:
    """Tập số màn trong game (level_num)."""
    if not game or not isinstance(game.levels, list) or not game.levels:
        return set()
    nums: set[int] = set()
    for i, lv in enumerate(game.levels):
        if not isinstance(lv, dict):
            continue
        raw = lv.get("level_num")
        nums.add(int(raw) if raw is not None else i + 1)
    return nums


def _game_completion_rewards(game: models.Game) -> tuple[int, int]:
    """Tổng XP / xu thưởng khi hoàn thành toàn bộ game (chỉ cộng 1 lần)."""
    xp_total = 0
    coin_total = 0
    for lv in game.levels or []:
        if not isinstance(lv, dict):
            continue
        xp_total += int(lv.get("xp_reward") or 80)
        coin_total += int(lv.get("coin_reward") or 20)
    return xp_total, coin_total


def _completed_level_nums(db: Session, user_id: str, game_id: str) -> set[int]:
    rows = (
        db.query(models.Attempt.level_num)
        .filter(
            models.Attempt.user_id == user_id,
            models.Attempt.game_id == game_id,
            models.Attempt.completed == True,  # noqa: E712
        )
        .distinct()
        .all()
    )
    return {int(r[0]) for r in rows}


def check_and_unlock_achievements(user: models.User, db: Session) -> list[dict]:
    """
    Mở khóa danh hiệu theo badge_code thật trong seed (không map nhầm theo id a1/a2…).

    - math_pro / memory_master / logic_king / real_iq_expert: clear hết màn game tương ứng
    - scratch_wizard: hoàn thành đủ bài trong khóa Scratch
    - daily_hunter: streak >= 3
    """
    existing_unlocked = {
        ua.achievement_id
        for ua in db.query(models.UserAchievement).filter_by(user_id=user.id).all()
    }
    all_achievements = db.query(models.Achievement).all()

    # badge_code -> game_id cần clear toàn bộ
    game_clear_badges = {
        "math_pro": "g2",          # Truy Tìm Quy Luật
        "memory_master": "g3",     # Vua Ghi Nhớ
        "logic_king": "g1",        # Ghép Cặp Thần Tốc
        "real_iq_expert": "g_iq_thuc_te",
    }

    cleared_cache: dict[str, bool] = {}

    def has_cleared_game(game_id: str) -> bool:
        if game_id not in cleared_cache:
            game = db.get(models.Game, game_id)
            required = _game_level_nums(game)
            if not required:
                cleared_cache[game_id] = False
            else:
                done = _completed_level_nums(db, user.id, game_id)
                cleared_cache[game_id] = required.issubset(done)
        return cleared_cache[game_id]

    def has_finished_scratch() -> bool:
        courses = db.query(models.ScratchCourse).all()
        if not courses:
            return False
        for course in courses:
            lessons = (
                db.query(models.ScratchLesson)
                .filter_by(course_id=course.id)
                .all()
            )
            if not lessons:
                continue
            done = {
                p.lesson_id
                for p in db.query(models.UserScratchProgress)
                .filter_by(user_id=user.id, completed=True)
                .all()
            }
            if all(l.id in done for l in lessons):
                return True
        return False

    new_unlocked = []

    for ach in all_achievements:
        if ach.id in existing_unlocked:
            continue

        code = (ach.badge_code or "").strip().lower()
        should_unlock = False

        if code in game_clear_badges:
            should_unlock = has_cleared_game(game_clear_badges[code])
        elif code == "scratch_wizard":
            should_unlock = has_finished_scratch()
        elif code == "daily_hunter":
            should_unlock = (user.streak or 0) >= 3
        # Không unlock theo id a1/a2… — seed badge khác với milestone first_game/xp_500 cũ

        if should_unlock:
            ts = int(time.time() * 1000)
            ua = models.UserAchievement(
                id=f"ua_{user.id}_{ach.id}_{ts}",
                user_id=user.id,
                achievement_id=ach.id,
                unlocked_at=datetime.utcnow(),
            )
            db.add(ua)
            bonus = int(ach.xp_bonus or 100)
            user.xp = (user.xp or 0) + bonus
            user.level = ((user.xp or 0) // XP_PER_LEVEL) + 1
            new_unlocked.append({
                "id": ach.id,
                "title": ach.title,
                "badge_code": ach.badge_code,
                "icon": ach.icon or "🏆",
                "xp_bonus": bonus,
                "description": ach.description,
            })

    return new_unlocked


@router.post("/api/attempts/submit", response_model=schemas.SubmitAttemptOut)
def submit_attempt(body: schemas.SubmitAttemptIn, db: Session = Depends(get_db)):
    """
    Nộp điểm màn chơi:
    1. Ghi nhận bản ghi Attempt (mọi lượt chơi / chơi lại).
    2. XP & xu chỉ cộng **1 lần / game**, khi hoàn thành **toàn bộ** màn lần đầu.
       Chơi lại không được tính thêm điểm.
    3. Cập nhật chuỗi ngày học (Daily Streak) và nhiệm vụ ngày.
    4. Tự động kiểm tra và mở khóa danh hiệu thành tích.
    """
    user = db.get(models.User, body.userId)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")

    # Admin chơi thử: mở mọi màn, không ghi attempt / XP / xu / quest / bảng xếp hạng
    if user.role == "admin":
        return {
            "success": True,
            "score": body.score,
            "xpAwarded": 0,
            "newXp": user.xp or 0,
            "levelUp": False,
            "newLevel": user.level or 1,
            "newStreak": user.streak or 0,
            "coinReward": 0,
            "newBalance": user.wallet.balance if user.wallet else 0,
            "unlockedAchievements": [],
            "message": "Chế độ chơi thử Admin — không tính XP, xu hay bảng xếp hạng.",
            "gameCleared": False,
            "alreadyRewarded": False,
        }

    game = db.get(models.Game, body.gameId)
    if game:
        owned = (
            db.query(models.Purchase)
            .filter_by(user_id=body.userId, game_id=body.gameId)
            .first()
            is not None
        )
        if not can_access_level(body.levelNum, owned):
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Màn {body.levelNum} cần mở khóa bằng ví xu. "
                    f"Chỉ {FREE_LEVEL_COUNT} màn đầu miễn phí."
                ),
            )

    required_levels = _game_level_nums(game)
    prior_completed = _completed_level_nums(db, body.userId, body.gameId)
    had_full_clear = bool(required_levels) and required_levels.issubset(prior_completed)

    now_dt = datetime.utcnow()
    now_ts = int(time.time() * 1000)

    # 1. Ghi nhận lượt chơi (kể cả chơi lại)
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

    if body.completed:
        update_quest_progress(db, body.userId, "play_count")
        if body.score >= 100:
            if game and (game.category or "iq").lower() in {"iq", "math", "toán", "toan"}:
                update_quest_progress(db, body.userId, "score_reach")
        unlock_daily_spin(db, body.userId)

    # 2. XP / xu: chỉ khi clear toàn bộ màn lần đầu
    now_completed = prior_completed | ({body.levelNum} if body.completed else set())
    first_full_clear = (
        bool(body.completed)
        and bool(required_levels)
        and required_levels.issubset(now_completed)
        and not had_full_clear
        and game is not None
    )

    xp_reward = 0
    coin_reward = 0
    if first_full_clear:
        xp_reward, coin_reward = _game_completion_rewards(game)

    old_level = user.level or 1
    if xp_reward:
        user.xp = (user.xp or 0) + xp_reward
        user.level = (user.xp // XP_PER_LEVEL) + 1
    level_up = (user.level or 1) > old_level

    wallet = user.wallet
    if coin_reward and wallet:
        wallet.balance += coin_reward
        tx = models.WalletTransaction(
            id=f"tx_rew_{now_ts}",
            wallet_user_id=wallet.user_id,
            amount=coin_reward,
            type="thưởng chơi game",
            detail=f"Thưởng hoàn thành toàn bộ game {body.gameId} (+{coin_reward} xu)",
            created_at=now_dt,
        )
        db.add(tx)

    # 3. Cập nhật Daily Streak (hoạt động học trong ngày)
    new_streak = update_daily_streak(user, now_dt)

    # 4. Kiểm tra và mở khóa Danh hiệu thành tích
    unlocked_achievements = check_and_unlock_achievements(user, db)

    db.commit()
    db.refresh(user)

    if first_full_clear:
        message = (
            f"Hoàn thành toàn bộ game! Nhận +{xp_reward} XP và +{coin_reward} xu 🎉"
        )
    elif had_full_clear:
        message = "Bạn đã nhận thưởng game này rồi. Chơi lại không tính thêm điểm."
    elif body.completed:
        remaining = len(required_levels - now_completed) if required_levels else 0
        message = (
            f"Hoàn thành màn {body.levelNum}! "
            f"Còn {remaining} màn nữa để nhận XP (chỉ tính 1 lần / game)."
            if remaining
            else f"Hoàn thành màn {body.levelNum}!"
        )
    else:
        message = "Đã ghi nhận lượt chơi."

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
        "newBalance": wallet.balance if wallet else 0,
        "unlockedAchievements": unlocked_achievements,
        "message": message,
        "gameCleared": bool(first_full_clear),
        "alreadyRewarded": bool(had_full_clear),
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
