import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["attempts"])

XP_PER_LEVEL = 250


@router.post("/api/attempts/submit")
def submit_attempt(body: schemas.SubmitAttemptIn, db: Session = Depends(get_db)):
    user = db.get(models.User, body.userId)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    xp_reward = 50 + (body.levelNum * 5)
    user.xp += xp_reward

    old_level = user.level
    user.level = (user.xp // XP_PER_LEVEL) + 1

    attempt = models.Attempt(
        id=f"att_{int(time.time() * 1000)}",
        user_id=body.userId,
        game_id=body.gameId,
        level_num=body.levelNum,
        score=body.score,
        completed=bool(body.completed),
        duration_secs=body.duration or 15,
    )
    db.add(attempt)
    db.commit()

    return {
        "success": True,
        "xpAwarded": xp_reward,
        "newXp": user.xp,
        "levelUp": user.level > old_level,
        "newLevel": user.level,
    }
