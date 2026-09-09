import time
import math
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth_utils import get_current_user_optional, get_current_user_required

router = APIRouter(tags=["games"])

CATEGORY_CODE_RE = re.compile(r"^[a-z][a-z0-9_]{0,48}$")


@router.get("/api/categories")
def list_game_categories(db: Session = Depends(get_db)):
    """Danh mục thể loại game (active) — dùng cho Chợ Game & form tạo game."""
    cats = (
        db.query(models.GameCategory)
        .filter(models.GameCategory.is_active == True)  # noqa: E712
        .order_by(models.GameCategory.sort_order.asc(), models.GameCategory.code.asc())
        .all()
    )
    return [schemas.GameCategoryOut.model_validate(c).model_dump() for c in cats]


@router.get("/api/games")
def list_games(
    grade: int | None = None,
    category: str | None = None,
    search: str | None = None,
    type: str | None = None,
    creatorId: str | None = None,
    includePending: str | None = None,
    sortBy: str | None = "popular",  # popular | newest | rating | price_asc | price_desc
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    paginated: bool = False,
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách trò chơi Marketplace có hỗ trợ:
    - Bộ lọc đa chiều: Khối lớp (grade), Thể loại (category), Miễn phí/Trả phí (type), Tác giả (creatorId).
    - Tìm kiếm từ khóa theo tiêu đề hoặc mô tả (search).
    - Sắp xếp (sortBy): Phổ biến nhất, Mới nhất, Đánh giá cao nhất, Giá tăng/giảm dần.
    - Phân trang (page, pageSize).
    """
    q = db.query(models.Game)

    # 1. Bộ lọc Khối lớp
    if grade is not None:
        q = q.filter(models.Game.grade_from <= grade, models.Game.grade_to >= grade)

    # 2. Bộ lọc Thể loại
    if category and category != "all":
        q = q.filter(models.Game.category == category)

    # 3. Bộ lọc Miễn phí / Có phí
    if type == "free":
        q = q.filter(models.Game.price == 0)
    elif type == "premium":
        q = q.filter(models.Game.price > 0)

    # 4. Tìm kiếm từ khóa
    if search:
        term = f"%{search.lower().strip()}%"
        q = q.filter(or_(
            models.Game.title.ilike(term),
            models.Game.description.ilike(term),
            models.Game.detailed_description.ilike(term),
        ))

    # 5. Phân quyền hiển thị (Công khai vs Creator draft)
    if creatorId:
        q = q.filter(models.Game.creator_id == creatorId)
    elif includePending != "true":
        q = q.filter(models.Game.is_published == True)  # noqa: E712

    # 6. Sắp xếp
    if sortBy == "newest":
        q = q.order_by(models.Game.created_at.desc())
    elif sortBy == "rating":
        q = q.order_by(models.Game.rating_avg.desc(), models.Game.plays_count.desc())
    elif sortBy == "price_asc":
        q = q.order_by(models.Game.price.asc())
    elif sortBy == "price_desc":
        q = q.order_by(models.Game.price.desc())
    else:  # "popular" mặc định
        q = q.order_by(models.Game.plays_count.desc(), models.Game.rating_avg.desc())

    total_count = q.count()

    # 7. Phân trang
    if paginated:
        offset = (page - 1) * pageSize
        games = q.offset(offset).limit(pageSize).all()
        items = [schemas.GameOut.model_validate(g).model_dump() for g in games]
        return {
            "items": items,
            "total": total_count,
            "page": page,
            "page_size": pageSize,
            "total_pages": math.ceil(total_count / pageSize) if pageSize > 0 else 1,
        }

    # Nếu không yêu cầu format paginated -> Trả về danh sách list chuẩn tương thích ngược
    games = q.all()
    return [schemas.GameOut.model_validate(g).model_dump() for g in games]


@router.get("/api/games/{game_id}")
def get_game_detail(
    game_id: str,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Lấy thông tin chi tiết một trò chơi bao gồm danh sách màn chơi (Levels Roadmap).
    Tự động làm sạch toàn bộ đáp án (Sanitization) nếu người dùng là học sinh hoặc khách vãng lai.
    Chỉ tác giả sở hữu game hoặc Quản trị viên mới xem được toàn bộ đáp án phục vụ biên tập.
    """
    game = db.get(models.Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Không tìm thấy trò chơi yêu cầu!")

    data = schemas.GameOut.model_validate(game).model_dump()
    is_editor_or_admin = current_user and (
        current_user.role == "admin"
        or (game.creator_id and current_user.id == game.creator_id)
    )

    if not is_editor_or_admin:
        data["levels"] = schemas.sanitize_game_levels_for_learner(data.get("levels"))

    return data


@router.post("/api/games/purchase")
def purchase_game(
    body: schemas.PurchaseIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Quy trình Mua Game An Toàn (ACID Transaction):
    1. Xác thực danh tính qua JWT Token (current_user). Chống IDOR trừ tiền ví người khác.
    2. Khóa hàng ví người mua (with_for_update) chống race condition.
    3. Kiểm tra quyền sở hữu & số dư ví.
    4. Trừ tiền người mua + Ghi log giao dịch ví.
    5. Tự động chia sẻ 80% doanh thu cho Ví của Creator (nếu có).
    6. Cấp bản quyền game (Purchase record) & Tăng lượt chơi.
    """
    buyer_id = current_user.id
    if body.userId and body.userId != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không thể dùng ví của người khác để mua game!")

    # 1. Khóa hàng ví người mua để đảm bảo số dư nhất quán
    wallet = (
        db.query(models.Wallet)
        .filter(models.Wallet.user_id == buyer_id)
        .with_for_update()
        .first()
    )
    if not wallet:
        raise HTTPException(status_code=404, detail="Không tìm thấy ví người dùng!")

    game = db.get(models.Game, body.gameId)
    if not game:
        raise HTTPException(status_code=404, detail="Trò chơi không tồn tại!")

    # 2. Kiểm tra xem người dùng đã sở hữu game chưa
    already = db.query(models.Purchase).filter_by(user_id=buyer_id, game_id=body.gameId).first()
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
    db.add(models.Purchase(user_id=buyer_id, game_id=body.gameId, purchased_price=game.price))

    # 5. Chia sẻ 80% doanh thu cho Creator nếu game do creator/teacher tạo
    if game.creator_id and game.creator_id != "system" and game.creator_id != buyer_id:
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
                detail=f'Doanh thu tác giả (80%) từ game "{game.title}" (Người mua: {buyer_id})',
            )
            db.add(tx_creator)

    # Tăng số lượt chơi/lượt tải của game
    game.plays_count = (game.plays_count or 0) + 1
    db.commit()

    # Lấy danh sách toàn bộ game user đã sở hữu
    purchases = [p.game_id for p in db.query(models.Purchase).filter_by(user_id=buyer_id).all()]
    return {
        "success": True,
        "balance": wallet.balance,
        "newBalance": wallet.balance,  # alias tương thích client cũ
        "purchases": purchases,
        "message": f'Chúc mừng bạn đã sở hữu thành công game "{game.title}"! 🎉',
    }
