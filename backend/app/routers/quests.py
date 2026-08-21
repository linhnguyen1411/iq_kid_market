import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..daily_quests import day_start, ensure_daily_quests, choose_spin_reward, unlock_daily_spin, update_login_streak, vietnam_date, vietnam_now

router = APIRouter(tags=["quests"])


def _require_user(user_id: str, db: Session) -> models.User:
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")
    return user


@router.get("/api/quests/daily", response_model=list[schemas.DailyQuestOut])
def get_daily_quests(userId: str, db: Session = Depends(get_db)):
    _require_user(userId, db)
    assignments = ensure_daily_quests(db, userId)
    db.commit()
    return [{
        "id": item.quest.id, "title": item.quest.title, "description": item.quest.description,
        "type": item.quest.type, "target_count": item.quest.target_count,
        "current_progress": item.current_progress, "status": item.status,
        "xp_reward": item.quest.xp_reward or 0, "coin_reward": item.quest.coin_reward or 0,
        "quest_date": item.quest_date.isoformat(),
    } for item in assignments]


@router.post("/api/quests/{quest_id}/claim")
def claim_daily_quest(quest_id: str, body: schemas.ClaimQuestIn, db: Session = Depends(get_db)):
    user = _require_user(body.userId, db)
    assignment = db.query(models.UserDailyQuest).filter_by(
        user_id=user.id, quest_id=quest_id, quest_date=day_start(vietnam_date())
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ hôm nay!")
    if assignment.status == "CLAIMED":
        raise HTTPException(status_code=409, detail="Nhiệm vụ này đã nhận thưởng rồi!")
    if assignment.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Bạn chưa hoàn thành nhiệm vụ này!")

    xp_reward = assignment.quest.xp_reward or 0
    coin_reward = assignment.quest.coin_reward or 0
    user.xp = (user.xp or 0) + xp_reward
    user.level = (user.xp // 250) + 1
    if user.wallet:
        user.wallet.balance += coin_reward
        db.add(models.WalletTransaction(
            id=f"tx_quest_{int(time.time() * 1000)}", wallet_user_id=user.id,
            amount=coin_reward, type="thưởng nhiệm vụ ngày",
            detail=f"Nhận thưởng: {assignment.quest.title}",
            created_at=vietnam_now().replace(tzinfo=None),
        ))
    assignment.status = "CLAIMED"
    db.commit()
    return {"success": True, "questId": quest_id, "xpAwarded": xp_reward, "coinAwarded": coin_reward}


@router.post("/api/gamification/login-reward")
def claim_login_reward(body: schemas.LoginRewardIn, db: Session = Depends(get_db)):
    user = _require_user(body.userId, db)
    today = vietnam_date()
    claim_date = day_start(today)
    existing = db.query(models.LoginRewardClaim).filter_by(user_id=user.id, claim_date=claim_date).first()
    if existing:
        return {"success": True, "claimed": False, "day": existing.day_number, "coinAwarded": 0, "streak": user.streak or 0}

    update_login_streak(user, today)
    day_number = min(max(user.streak or 1, 1), 7)
    coin_reward = (10, 15, 20, 30, 40, 60, 100)[day_number - 1]
    now = vietnam_now().replace(tzinfo=None)
    user.last_active_date = now
    if user.wallet:
        user.wallet.balance += coin_reward
        db.add(models.WalletTransaction(
            id=f"tx_login_{int(time.time() * 1000)}", wallet_user_id=user.id,
            amount=coin_reward, type="thưởng điểm danh", detail=f"Thưởng điểm danh ngày {day_number}/7", created_at=now,
        ))
    db.add(models.LoginRewardClaim(
        id=f"login_reward_{user.id}_{today.isoformat()}", user_id=user.id,
        claim_date=claim_date, day_number=day_number, coin_reward=coin_reward,
    ))
    db.commit()
    return {"success": True, "claimed": True, "day": day_number, "coinAwarded": coin_reward, "streak": user.streak}


@router.post("/api/gamification/lucky-spin")
def lucky_spin(body: schemas.LuckySpinIn, db: Session = Depends(get_db)):
    user = _require_user(body.userId, db)
    spin = db.query(models.UserDailySpin).filter_by(
        user_id=user.id, spin_date=day_start(vietnam_date())
    ).first()
    if not spin or not spin.eligible:
        raise HTTPException(status_code=400, detail="Bạn cần hoàn thành một màn chơi hôm nay trước khi quay!")
    if spin.spun:
        raise HTTPException(status_code=409, detail="Bạn đã dùng lượt quay hôm nay rồi!")

    code, amount = choose_spin_reward()
    spin.spun = True
    spin.reward_code = code
    spin.reward_amount = amount
    if amount and user.wallet:
        user.wallet.balance += amount
        db.add(models.WalletTransaction(
            id=f"tx_spin_{int(time.time() * 1000)}", wallet_user_id=user.id,
            amount=amount, type="thưởng vòng quay", detail=f"Phần thưởng Lucky Spin: {code}",
            created_at=vietnam_now().replace(tzinfo=None),
        ))
    db.commit()
    return {"success": True, "rewardCode": code, "rewardAmount": amount, "spun": True}