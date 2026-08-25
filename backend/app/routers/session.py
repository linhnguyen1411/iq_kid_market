from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth_utils import get_current_user_required

router = APIRouter(tags=["session"])


def build_session_payload(user: models.User) -> dict:
    wallet = user.wallet
    balance = wallet.balance if wallet else 0
    transactions = [
        {
            "id": t.id,
            "amount": t.amount,
            "type": t.type,
            "detail": t.detail,
            "date": t.created_at.isoformat(),
        }
        for t in (wallet.transactions if wallet else [])
    ]
    purchases = [p.game_id for p in user.purchases]
    return {
        "user": schemas.UserOut.model_validate(user).model_dump(),
        "wallet": {"balance": balance, "transactions": transactions},
        "purchases": purchases,
    }


@router.get("/api/session")
@router.get("/api/session/user/{userId}")
@router.get("/api/session/{userId}")
def get_session(
    userId: str | None = None,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """Phiên hiện tại luôn lấy từ JWT, không cho impersonate userId demo."""
    _ = userId
    _ = db
    return build_session_payload(current_user)


@router.post("/api/user/profile")
def update_profile(
    body: schemas.UpdateProfileIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    if body.name:
        current_user.name = body.name
    if body.avatar:
        current_user.avatar = body.avatar
    if body.grade:
        current_user.grade = int(body.grade)

    db.commit()
    db.refresh(current_user)
    return {"success": True, "user": schemas.UserOut.model_validate(current_user).model_dump()}
