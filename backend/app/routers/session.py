from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["session"])


@router.get("/api/session")
def get_session(userId: str = "u1", db: Session = Depends(get_db)):
    user = db.get(models.User, userId)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

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
