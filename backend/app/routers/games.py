import time
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
    """
    Quy trình Mua Game An Toàn (ACID Transaction):
    1. Khóa hàng ví người mua (with_for_update) chống race condition.
    2. Kiểm tra quyền sở hữu & số dư ví.
    3. Trừ tiền người mua + Ghi log giao dịch ví.
    4. Tự động chia sẻ 80% doanh thu cho Ví của Creator (nếu có).
    5. Cấp bản quyền game (Purchase record) & Tăng lượt chơi.
    """
    # 1. Khóa hàng ví người mua để đảm bảo số dư nhất quán
    wallet = (
        db.query(models.Wallet)
        .filter(models.Wallet.user_id == body.userId)
        .with_for_update()
        .first()
    )
    if not wallet:
        raise HTTPException(status_code=404, detail="Không tìm thấy ví người dùng!")

    game = db.get(models.Game, body.gameId)
    if not game:
        raise HTTPException(status_code=404, detail="Trò chơi không tồn tại!")

    # 2. Kiểm tra xem người dùng đã sở hữu game chưa
    already = db.query(models.Purchase).filter_by(user_id=body.userId, game_id=body.gameId).first()
    if already:
        raise HTTPException(status_code=400, detail="Bạn đã mua và sở hữu trò chơi này trước đó!")

    # 3. Kiểm tra số dư ví
    if wallet.balance < game.price:
        raise HTTPException(
            status_code=400,
            detail=f"Số dư xu trong ví ({wallet.balance:,} xu) không đủ để mua game này ({game.price:,} xu). Vui lòng nạp thêm!",
        )

    # 4. Trừ tiền người mua & Lưu transaction log
    wallet.balance -= game.price
    now_ts = int(time.time() * 1000)
    tx_buyer = models.WalletTransaction(
        id=f"tx_buy_{now_ts}",
        wallet_user_id=wallet.user_id,
        amount=-game.price,
        type="mua game",
        detail=f'Mua bản quyền game "{game.title}"',
    )
    db.add(tx_buyer)
    db.add(models.Purchase(user_id=body.userId, game_id=body.gameId, purchased_price=game.price))

    # 5. Chia sẻ 80% doanh thu cho Creator nếu game do giáo viên/creator tự sáng tạo
    if game.creator_id and game.creator_id != "system" and game.creator_id != body.userId:
        creator_wallet = (
            db.query(models.Wallet)
            .filter(models.Wallet.user_id == game.creator_id)
            .with_for_update()
            .first()
        )
        if creator_wallet:
            revenue_share = int(game.price * 0.8)
            creator_wallet.balance += revenue_share
            tx_creator = models.WalletTransaction(
                id=f"tx_rev_{now_ts}_{game.creator_id}",
                wallet_user_id=creator_wallet.user_id,
                amount=revenue_share,
                type="nhận doanh thu",
                detail=f'Doanh thu tác giả (80%) từ game "{game.title}" (Người mua: {body.userId})',
            )
            db.add(tx_creator)

    # Tăng số lượt chơi/lượt tải của game
    game.plays_count = (game.plays_count or 0) + 1

    db.commit()

    # Lấy danh sách toàn bộ game user đã sở hữu
    purchases = [p.game_id for p in db.query(models.Purchase).filter_by(user_id=body.userId).all()]
    return {
        "success": True,
        "balance": wallet.balance,
        "purchases": purchases,
        "message": f'Chúc mừng bạn đã sở hữu thành công game "{game.title}"! 🎉',
    }
