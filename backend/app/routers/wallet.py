import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["wallet"])


@router.post("/api/wallet/topup")
def topup_wallet(body: schemas.TopupIn, db: Session = Depends(get_db)):
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Số tiền nạp phải lớn hơn 0")

    wallet = db.get(models.Wallet, body.userId)
    if not wallet:
        raise HTTPException(status_code=404, detail="Không tìm thấy ví người dùng")

    wallet.balance += body.amount
    tx = models.WalletTransaction(
        id=f"tx_{int(time.time() * 1000)}",
        wallet_user_id=wallet.user_id,
        amount=body.amount,
        type="nạp tiền",
        detail=f'Nạp tiền qua hình thức {body.method or "QR Code"}',
    )
    db.add(tx)
    db.commit()
    db.refresh(wallet)

    transactions = [
        {"id": t.id, "amount": t.amount, "type": t.type, "detail": t.detail,
         "date": t.created_at.isoformat()}
        for t in wallet.transactions
    ]
    return {"success": True, "balance": wallet.balance, "transactions": transactions}
