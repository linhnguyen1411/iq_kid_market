import time
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth_utils import get_current_user_optional
from .attempts import check_and_unlock_achievements
from ..daily_quests import (
    day_start,
    ensure_daily_quests,
    choose_spin_reward,
    unlock_daily_spin,
    update_daily_streak,
    vietnam_date,
    vietnam_now,
    XP_PER_LEVEL,
)

router = APIRouter(tags=["quests"])


def _require_user(
    user_id: str,
    db: Session,
    current_user: models.User | None = None,
) -> models.User:
    """
    Kiểm tra tồn tại của người dùng và đối chiếu token JWT:
    Nếu có JWT token nhưng không khớp với user_id được yêu cầu (và không phải admin)
    thì trả về 403 Forbidden.
    """
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")
    if current_user and current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền thực hiện thao tác này cho tài khoản khác!",
        )
    return user


@router.get("/api/quests/daily", response_model=list[schemas.DailyQuestOut])
def get_daily_quests(
    userId: str,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    _require_user(userId, db, current_user)
    assignments = ensure_daily_quests(db, userId)
    db.commit()
    return [{
        "id": item.quest.id,
        "title": item.quest.title,
        "description": item.quest.description,
        "type": item.quest.type,
        "target_count": item.quest.target_count,
        "current_progress": item.current_progress,
        "status": item.status,
        "xp_reward": item.quest.xp_reward or 0,
        "coin_reward": item.quest.coin_reward or 0,
        "quest_date": item.quest_date.isoformat(),
    } for item in assignments]


@router.post("/api/quests/{quest_id}/claim")
def claim_daily_quest(
    quest_id: str,
    body: schemas.ClaimQuestIn,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user = _require_user(body.userId, db, current_user)
    today = vietnam_date()
    assignment = (
        db.query(models.UserDailyQuest)
        .filter_by(user_id=user.id, quest_id=quest_id, quest_date=day_start(today))
        .with_for_update()
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ hôm nay!")
    if assignment.status == "CLAIMED":
        raise HTTPException(status_code=409, detail="Nhiệm vụ này đã nhận thưởng rồi!")
    if assignment.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Bạn chưa hoàn thành nhiệm vụ này!")

    xp_reward = assignment.quest.xp_reward or 0
    coin_reward = assignment.quest.coin_reward or 0
    user.xp = (user.xp or 0) + xp_reward
    user.level = (user.xp // XP_PER_LEVEL) + 1

    if user.wallet and coin_reward > 0:
        user.wallet.balance += coin_reward
        tx_id = f"tx_quest_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        db.add(models.WalletTransaction(
            id=tx_id,
            wallet_user_id=user.id,
            amount=coin_reward,
            type="thưởng nhiệm vụ ngày",
            detail=f"Nhận thưởng: {assignment.quest.title}",
            created_at=datetime.utcnow(),
        ))

    assignment.status = "CLAIMED"
    # Tự động kiểm tra và mở khóa Danh hiệu thành tích khi thăng cấp/tăng XP
    check_and_unlock_achievements(user, db)
    db.commit()
    return {"success": True, "questId": quest_id, "xpAwarded": xp_reward, "coinAwarded": coin_reward}


@router.post("/api/gamification/login-reward")
def claim_login_reward(
    body: schemas.LoginRewardIn,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user = _require_user(body.userId, db, current_user)
    today = vietnam_date()
    claim_date = day_start(today)

    existing = (
        db.query(models.LoginRewardClaim)
        .filter_by(user_id=user.id, claim_date=claim_date)
        .with_for_update()
        .first()
    )
    if existing:
        return {
            "success": True,
            "claimed": False,
            "day": existing.day_number,
            "coinAwarded": 0,
            "streak": user.streak or 0,
        }

    now_utc = datetime.utcnow()
    update_daily_streak(user, now_utc)
    # Chu kỳ điểm danh 7 ngày xoay vòng theo streak
    day_number = ((max(user.streak or 1, 1) - 1) % 7) + 1
    coin_rewards = (10, 15, 20, 30, 40, 60, 100)
    coin_reward = coin_rewards[day_number - 1]

    if user.wallet and coin_reward > 0:
        user.wallet.balance += coin_reward
        tx_id = f"tx_login_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        db.add(models.WalletTransaction(
            id=tx_id,
            wallet_user_id=user.id,
            amount=coin_reward,
            type="thưởng điểm danh",
            detail=f"Thưởng điểm danh ngày {day_number}/7",
            created_at=now_utc,
        ))

    db.add(models.LoginRewardClaim(
        id=f"login_reward_{user.id}_{today.isoformat()}",
        user_id=user.id,
        claim_date=claim_date,
        day_number=day_number,
        coin_reward=coin_reward,
    ))

    try:
        db.commit()
    except Exception:
        db.rollback()
        existing = (
            db.query(models.LoginRewardClaim)
            .filter_by(user_id=user.id, claim_date=claim_date)
            .first()
        )
        if existing:
            return {
                "success": True,
                "claimed": False,
                "day": existing.day_number,
                "coinAwarded": 0,
                "streak": user.streak or 0,
            }
        raise

    return {
        "success": True,
        "claimed": True,
        "day": day_number,
        "coinAwarded": coin_reward,
        "streak": user.streak,
    }


@router.post("/api/gamification/lucky-spin")
def lucky_spin(
    body: schemas.LuckySpinIn,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    user = _require_user(body.userId, db, current_user)
    today = vietnam_date()
    spin = (
        db.query(models.UserDailySpin)
        .filter_by(user_id=user.id, spin_date=day_start(today))
        .with_for_update()
        .first()
    )
    if not spin or not spin.eligible:
        raise HTTPException(status_code=400, detail="Bạn cần hoàn thành một màn chơi hôm nay trước khi quay!")
    if spin.spun:
        raise HTTPException(status_code=409, detail="Bạn đã dùng lượt quay hôm nay rồi!")

    code, amount = choose_spin_reward()
    spin.spun = True
    spin.reward_code = code
    spin.reward_amount = amount

    if amount > 0 and user.wallet:
        user.wallet.balance += amount
        tx_id = f"tx_spin_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        db.add(models.WalletTransaction(
            id=tx_id,
            wallet_user_id=user.id,
            amount=amount,
            type="thưởng vòng quay",
            detail=f"Phần thưởng Lucky Spin: {code}",
            created_at=datetime.utcnow(),
        ))
    db.commit()
    return {"success": True, "rewardCode": code, "rewardAmount": amount, "spun": True}