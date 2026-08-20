from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["misc"])


@router.get("/api/scores/leaderboard")
def get_leaderboard(
    gameId: str | None = None,
    timeframe: str | None = "all_time",  # all_time | weekly | daily
    grade: int | None = None,
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Bảng Xếp Hạng Đa Chiều:
    - Lọc theo trò chơi (gameId) hoặc bảng vinh danh toàn trường (XP & Streak).
    - Lọc theo khung thời gian (timeframe): Toàn thời gian (all_time), Tuần này (weekly), Hôm nay (daily).
    - Lọc theo Khối lớp (grade).
    """
    now = datetime.utcnow()

    # 1. Nếu yêu cầu xếp hạng theo game cụ thể
    if gameId and gameId != "all":
        q = (
            db.query(models.Attempt, models.User)
            .join(models.User, models.Attempt.user_id == models.User.id)
            .filter(models.Attempt.game_id == gameId)
        )

        if grade is not None:
            q = q.filter(models.User.grade == grade)

        if timeframe == "daily":
            start_date = now - timedelta(days=1)
            q = q.filter(models.Attempt.created_at >= start_date)
        elif timeframe == "weekly":
            start_date = now - timedelta(days=7)
            q = q.filter(models.Attempt.created_at >= start_date)

        rows = q.order_by(models.Attempt.score.desc(), models.Attempt.duration_secs.asc()).limit(limit).all()

        return [
            {
                "userId": user.id,
                "username": user.username,
                "name": user.name,
                "avatar": user.avatar or "smile_tiger",
                "grade": user.grade,
                "gameId": attempt.game_id,
                "score": attempt.score,
                "levelNum": attempt.level_num,
                "xp": user.xp or 0,
                "streak": user.streak or 0,
                "level": user.level or 1,
                "date": attempt.created_at.isoformat() if attempt.created_at else None,
            }
            for attempt, user in rows
        ]

    # 2. Xếp hạng toàn diện theo tổng điểm XP & Cấp độ học sinh
    user_q = db.query(models.User).filter(models.User.role == "student")
    if grade is not None:
        user_q = user_q.filter(models.User.grade == grade)

    top_users = user_q.order_by(models.User.xp.desc(), models.User.streak.desc()).limit(limit).all()

    return [
        {
            "userId": u.id,
            "username": u.username,
            "name": u.name,
            "avatar": u.avatar or "smile_tiger",
            "grade": u.grade,
            "gameId": "all",
            "score": u.xp or 0,
            "xp": u.xp or 0,
            "streak": u.streak or 0,
            "level": u.level or 1,
            "date": u.created_at.isoformat() if u.created_at else None,
        }
        for u in top_users
    ]


@router.get("/api/achievements")
def get_achievements(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các danh hiệu huy hiệu có trong hệ thống."""
    rows = db.query(models.Achievement).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "badge_code": a.badge_code,
            "xp_bonus": a.xp_bonus,
            "icon": a.icon,
        }
        for a in rows
    ]


@router.get("/api/achievements/user/{user_id}")
def get_user_achievements(user_id: str, db: Session = Depends(get_db)):
    """
    Lấy danh sách toàn bộ huy hiệu kèm trạng thái đã mở khóa và % tiến độ của học sinh.
    """
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy học sinh!")

    all_achievements = db.query(models.Achievement).all()
    user_achievements = {
        ua.achievement_id: ua.unlocked_at
        for ua in db.query(models.UserAchievement).filter_by(user_id=user_id).all()
    }

    # Thống kê số màn chơi hoàn thành
    completed_count = db.query(models.Attempt).filter_by(user_id=user_id, completed=True).count()

    result = []
    for ach in all_achievements:
        is_unlocked = ach.id in user_achievements
        unlocked_at = user_achievements[ach.id].isoformat() if is_unlocked and user_achievements[ach.id] else None

        # Tính toán tiến độ %
        progress = 0
        if is_unlocked:
            progress = 100
        else:
            if ach.badge_code in ("first_game", "a1"):
                progress = min(100, int((completed_count / 1) * 100))
            elif ach.badge_code in ("streak_3", "a2"):
                progress = min(100, int(((user.streak or 0) / 3) * 100))
            elif ach.badge_code in ("streak_7", "a3"):
                progress = min(100, int(((user.streak or 0) / 7) * 100))
            elif ach.badge_code in ("xp_500", "a4"):
                progress = min(100, int(((user.xp or 0) / 500) * 100))
            elif ach.badge_code in ("xp_1000", "a5"):
                progress = min(100, int(((user.xp or 0) / 1000) * 100))
            elif ach.badge_code in ("master_5", "a6"):
                progress = min(100, int((completed_count / 5) * 100))

        result.append({
            "id": ach.id,
            "title": ach.title,
            "description": ach.description,
            "badge_code": ach.badge_code,
            "icon": ach.icon or "🏆",
            "xp_bonus": ach.xp_bonus or 100,
            "unlocked": is_unlocked,
            "unlocked_at": unlocked_at,
            "progress_percent": progress,
        })

    return result

