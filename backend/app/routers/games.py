from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(tags=["games"])


@router.get("/api/games")
def list_games(
    grade: int | None = None,
    category: str | None = None,
    search: str | None = None,
    type: str | None = None,
    creatorId: str | None = None,
    includePending: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Game)

    if grade is not None:
        q = q.filter(models.Game.grade_from <= grade, models.Game.grade_to >= grade)
    if category and category != "all":
        q = q.filter(models.Game.category == category)
    if type == "free":
        q = q.filter(models.Game.price == 0)
    elif type == "premium":
        q = q.filter(models.Game.price > 0)
    if search:
        term = f"%{search.lower()}%"
        q = q.filter(or_(
            models.Game.title.ilike(term),
            models.Game.description.ilike(term),
        ))

    if creatorId:
        q = q.filter(models.Game.creator_id == creatorId)
    elif includePending != "true":
        # Marketplace công khai chỉ hiện game đã publish (bao gồm game hệ thống seed)
        q = q.filter(models.Game.is_published == True)  # noqa: E712

    games = q.all()
    return [schemas.GameOut.model_validate(g).model_dump() for g in games]


@router.post("/api/games/purchase")
def purchase_game(body: schemas.PurchaseIn, db: Session = Depends(get_db)):
    user = db.get(models.User, body.userId)
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không xác định")

    game = db.get(models.Game, body.gameId)
    if not game:
        raise HTTPException(status_code=404, detail="Trò chơi không tồn tại")

    already = db.query(models.Purchase).filter_by(user_id=body.userId, game_id=body.gameId).first()
    if already:
        raise HTTPException(status_code=400, detail="Bạn đã mua trò chơi này trước đó!")

    wallet = user.wallet
    if not wallet:
        raise HTTPException(status_code=500, detail="Ví của bạn chưa được khởi tạo")

    if wallet.balance < game.price:
        raise HTTPException(status_code=400, detail="Số dư ví không đủ. Vui lòng nạp thêm tiền!")

    wallet.balance -= game.price
    # ID tự động sinh qua default generator của model
    tx = models.WalletTransaction(
        wallet_user_id=wallet.user_id,
        amount=-game.price,
        type="mua game",
        detail=f'Mua bản quyền game "{game.title}"',
    )
    db.add(tx)
    db.add(models.Purchase(user_id=body.userId, game_id=body.gameId, purchased_price=game.price))
    db.commit()

    purchases = [p.game_id for p in user.purchases]
    return {"success": True, "balance": wallet.balance, "purchases": purchases}
