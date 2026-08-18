from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db

router = APIRouter(tags=["misc"])


@router.get("/api/scores/leaderboard")
def get_leaderboard(gameId: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Attempt, models.User).join(models.User, models.Attempt.user_id == models.User.id)
    if gameId and gameId != "all":
        q = q.filter(models.Attempt.game_id == gameId)
    rows = q.order_by(models.Attempt.score.desc()).limit(10).all()

    return [
        {
            "username": user.name,
            "gameId": attempt.game_id,
            "score": attempt.score,
            "levelNum": attempt.level_num,
            "date": attempt.created_at.isoformat(),
        }
        for attempt, user in rows
    ]


@router.get("/api/achievements")
def get_achievements(db: Session = Depends(get_db)):
    rows = db.query(models.Achievement).all()
    return [
        {"id": a.id, "title": a.title, "description": a.description,
         "badge_code": a.badge_code, "xp_bonus": a.xp_bonus, "icon": a.icon}
        for a in rows
    ]


@router.get("/api/scratch/courses")
def get_scratch_courses(db: Session = Depends(get_db)):
    courses = db.query(models.ScratchCourse).all()
    return [
        {
            "id": c.id, "title": c.title, "description": c.description,
            "thumbnail": c.thumbnail, "difficulty": c.difficulty, "total_lessons": c.total_lessons,
            "lessons": [
                {
                    "lesson_num": l.lesson_num, "title": l.title, "content": l.content,
                    "target_block_sequence": l.target_block_sequence,
                    "start_scene_json": l.start_scene_json, "xp_reward": l.xp_reward,
                }
                for l in c.lessons
            ],
        }
        for c in courses
    ]
