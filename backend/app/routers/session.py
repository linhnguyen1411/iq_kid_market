from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["session"])


@router.get("/api/session")
@router.get("/api/session/user/{userId}")
@router.get("/api/session/{userId}")
def get_session(userId: str = "u1", db: Session = Depends(get_db)):
    user = db.get(models.User, userId)
    if not user:
        user = models.User(
            id=userId,
            username=userId,
            name="Học Sinh Khách",
            role="student",
            grade=2,
            avatar="smile_tiger",
            xp=0,
            level=1,
            streak=1,
        )
        db.add(user)
        db.flush()
        wallet = models.Wallet(user_id=user.id, balance=90000)
        db.add(wallet)
        db.commit()
        db.refresh(user)

    wallet = user.wallet
    balance = wallet.balance if wallet else 0
    transactions = [
        {"id": t.id, "amount": t.amount, "type": t.type, "detail": t.detail,
         "date": t.created_at.isoformat()}
        for t in (wallet.transactions if wallet else [])
    ]
    purchases = [p.game_id for p in user.purchases]

    return {
        "user": schemas.UserOut.model_validate(user).model_dump(),
        "wallet": {"balance": balance, "transactions": transactions},
        "purchases": purchases,
    }


@router.post("/api/user/profile")
def update_profile(body: schemas.UpdateProfileIn, db: Session = Depends(get_db)):
    user = db.get(models.User, body.userId)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name:
        user.name = body.name
    if body.avatar:
        user.avatar = body.avatar
    if body.grade:
        user.grade = int(body.grade)

    db.commit()
    db.refresh(user)
    return {"success": True, "user": schemas.UserOut.model_validate(user).model_dump()}
