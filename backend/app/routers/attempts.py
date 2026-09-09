import time
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth_utils import get_current_user_required, get_current_user_optional
from ..game_evaluator import evaluate_game_answer
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
def submit_attempt(
    body: schemas.SubmitAttemptIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Nộp điểm và kết quả màn chơi:
    1. Xác thực bắt buộc qua JWT Token (current_user).
    2. Chấm điểm server-side trung tâm bằng evaluate_game_answer:
       Client tuyệt đối không quyết định score, completed, xpAwarded, hay coinReward.
    3. Chống gian lận: nếu đáp án sai hoặc rỗng -> completed=False, score=0.
    4. Quản lý Idempotency qua clientAttemptId và sinh ID an toàn qua UUID4.
    5. Cập nhật chuỗi học (Daily Streak), nhiệm vụ ngày (Daily Quests), và danh hiệu thành tích.
    """
    if body.userId and body.userId != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền nộp bài thay cho tài khoản khác!",
        )
    user = current_user

    # Admin chơi thử: mở mọi màn, không ghi attempt / XP / xu / quest / bảng xếp hạng
    if user.role == "admin" and not body.submittedAnswer:
        return {
            "success": True,
            "score": body.score or 25,
            "isCorrect": True,
            "starsEarned": 3,
            "feedback": "Chế độ chơi thử Admin.",
            "hint": None,
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
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy trò chơi yêu cầu!")

    owned = (
        db.query(models.Purchase)
        .filter_by(user_id=user.id, game_id=body.gameId)
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

    # 1. Định vị màn chơi trong Roadmap game
    level_data = None
    for lv in (game.levels or []):
        if isinstance(lv, dict) and lv.get("level_num") == body.levelNum:
            level_data = lv
            break
    if not level_data and isinstance(game.levels, list) and 0 <= body.levelNum - 1 < len(game.levels):
        candidate = game.levels[body.levelNum - 1]
        if isinstance(candidate, dict):
            level_data = candidate

    if not level_data:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy màn {body.levelNum} trong cấu trúc trò chơi!")

    questions = level_data.get("questions") or []
    first_q = questions[0] if questions and isinstance(questions[0], dict) else {}
    q_type = first_q.get("question_type") or level_data.get("template_code") or game.template_code or "quiz"
    q_data = first_q.get("data") or level_data.get("data") or {}
    max_pts = int(first_q.get("points") or level_data.get("points") or 25)

    # 2. Server-side Grading trung tâm
    eval_result = evaluate_game_answer(
        question_type=q_type,
        question_data=q_data,
        submitted_answer=body.submittedAnswer,
        max_points=max_pts,
    )

    is_correct = eval_result.is_correct
    score = eval_result.score
    stars = eval_result.stars
    feedback = eval_result.feedback
    hint = eval_result.hint

    now_dt = datetime.utcnow()
    attempt_id = f"att_{uuid.uuid4().hex}"

    # Ensure fresh user object attached to current db session
    user = db.get(models.User, current_user.id) or current_user
    try:
        db.refresh(user)
    except Exception:
        pass

    # Kiểm tra tính lũy đẳng (Idempotency) nếu client gửi clientAttemptId
    if body.clientAttemptId:
        existing_attempt = (
            db.query(models.Attempt)
            .filter_by(
                user_id=user.id,
                game_id=body.gameId,
                level_num=body.levelNum,
                id=f"att_client_{body.clientAttemptId}",
            )
            .first()
        )
        if existing_attempt:
            return {
                "success": existing_attempt.completed,
                "score": existing_attempt.score,
                "isCorrect": existing_attempt.completed,
                "starsEarned": 3 if existing_attempt.completed else 0,
                "feedback": "Kết quả đã được ghi nhận trước đó.",
                "hint": None,
                "xpAwarded": 0,
                "newXp": user.xp or 0,
                "levelUp": False,
                "newLevel": user.level or 1,
                "newStreak": user.streak or 0,
                "coinReward": 0,
                "newBalance": user.wallet.balance if user.wallet else 0,
                "unlockedAchievements": [],
                "message": "Kết quả đã được ghi nhận trước đó (Idempotent).",
                "gameCleared": False,
                "alreadyRewarded": True,
            }
        attempt_id = f"att_client_{body.clientAttemptId}"

    # 3. Tính toán trạng thái hoàn thành game trước lượt này
    required_levels = _game_level_nums(game)
    prior_completed = _completed_level_nums(db, user.id, body.gameId)
    had_full_clear = bool(required_levels) and required_levels.issubset(prior_completed)

    # 4. Ghi nhận lượt làm bài vào Database
    attempt = models.Attempt(
        id=attempt_id,
        user_id=user.id,
        game_id=body.gameId,
        level_num=body.levelNum,
        score=score,
        completed=is_correct,
        duration_secs=body.duration or 15,
        created_at=now_dt,
    )
    db.add(attempt)
    db.flush()

    # Nếu câu trả lời không đúng -> không cộng tiến trình, không thưởng
    if not is_correct:
        db.commit()
        return {
            "success": False,
            "score": score,
            "isCorrect": False,
            "starsEarned": stars,
            "feedback": feedback,
            "hint": hint,
            "xpAwarded": 0,
            "newXp": user.xp or 0,
            "levelUp": False,
            "newLevel": user.level or 1,
            "newStreak": user.streak or 0,
            "coinReward": 0,
            "newBalance": user.wallet.balance if user.wallet else 0,
            "unlockedAchievements": [],
            "message": feedback or "Đáp án chưa chính xác. Thử lại nhé!",
            "gameCleared": False,
            "alreadyRewarded": False,
        }

    # 5. Khi hoàn thành đúng màn: cập nhật tiến trình quest và vòng quay may mắn
    update_quest_progress(db, user.id, "play_count")
    if score >= 100 or is_correct:
        if game and (game.category or "iq").lower() in {"iq", "math", "toán", "toan"}:
            update_quest_progress(db, user.id, "score_reach")
    unlock_daily_spin(db, user.id)

    # 6. Thưởng hoàn thành toàn bộ game (chỉ cộng 1 lần duy nhất)
    now_completed = prior_completed | {body.levelNum}
    first_full_clear = (
        bool(required_levels)
        and required_levels.issubset(now_completed)
        and not had_full_clear
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
            id=f"tx_rew_{uuid.uuid4().hex[:12]}",
            wallet_user_id=wallet.user_id,
            amount=coin_reward,
            type="thưởng chơi game",
            detail=f"Thưởng hoàn thành toàn bộ game {body.gameId} (+{coin_reward} xu)",
            created_at=now_dt,
        )
        db.add(tx)

    # 6. Cập nhật chuỗi ngày học liên tục (Daily Streak)
    new_streak = update_daily_streak(user, now_dt)

    # 7. Tự động kiểm tra và mở khóa Danh hiệu thành tích
    unlocked_achievements = check_and_unlock_achievements(user, db)

    db.commit()
    db.refresh(user)

    if first_full_clear:
        message = f"Hoàn thành toàn bộ game! Nhận +{xp_reward} XP và +{coin_reward} xu 🎉"
    elif had_full_clear:
        message = "Bạn đã nhận thưởng game này rồi. Chơi lại không tính thêm điểm."
    else:
        remaining = len(required_levels - now_completed) if required_levels else 0
        message = (
            f"Hoàn thành màn {body.levelNum}! "
            f"Còn {remaining} màn nữa để nhận XP (chỉ tính 1 lần / game)."
            if remaining
            else f"Hoàn thành màn {body.levelNum}!"
        )

    if level_up:
        message += f" Chúc mừng bé đã thăng lên Cấp {user.level}! 🌟"

    return {
        "success": True,
        "score": score,
        "isCorrect": True,
        "starsEarned": stars,
        "feedback": feedback,
        "hint": hint,
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
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Lấy lịch sử làm bài của học sinh theo từng trò chơi.
    Bảo vệ IDOR: chỉ cho phép xem lịch sử của chính mình hoặc admin.
    """
    if current_user.id != userId and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền xem lịch sử chơi của tài khoản khác!",
        )

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
