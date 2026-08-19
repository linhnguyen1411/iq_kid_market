import time
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_optional,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _build_auth_response(user: models.User, db: Session) -> dict:
    """Helper: Đóng gói Token + Profile + Ví + Game đã mua."""
    token = create_access_token({"sub": user.id, "username": user.username, "role": user.role})

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
        "access_token": token,
        "token_type": "bearer",
        "user": schemas.UserOut.model_validate(user).model_dump(),
        "wallet": {"balance": balance, "transactions": transactions},
        "purchases": purchases,
    }


@router.post("/register")
def register(body: schemas.RegisterIn, db: Session = Depends(get_db)):
    # 1. Kiểm tra username hợp lệ
    username_clean = body.username.strip().lower()
    if len(username_clean) < 3:
        raise HTTPException(status_code=400, detail="Tên đăng nhập phải có ít nhất 3 ký tự!")

    if len(body.password) < 4:
        raise HTTPException(status_code=400, detail="Mật khẩu phải có ít nhất 4 ký tự!")

    # 2. Kiểm tra trùng username
    existing_user = db.query(models.User).filter(models.User.username == username_clean).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác!")

    # 3. Tạo User ID mới
    user_id = f"u_{int(time.time() * 1000)}_{uuid.uuid4().hex[:4]}"

    # Phân bổ quà tặng khởi đầu theo vai trò
    role = body.role if body.role in ["student", "teacher", "parent", "creator", "admin"] else "student"
    initial_balance = 90000 if role == "student" else (500000 if role in ["teacher", "creator"] else 1000000)
    initial_xp = 100 if role == "student" else 0

    new_user = models.User(
        id=user_id,
        username=username_clean,
        password_hash=hash_password(body.password),
        name=body.name.strip() or f"Thành viên {username_clean}",
        role=role,
        grade=body.grade if role == "student" else None,
        avatar=body.avatar or "smile_tiger",
        xp=initial_xp,
        level=1,
        streak=1 if role == "student" else 0,
    )
    db.add(new_user)
    db.flush()

    # 4. Khởi tạo Ví tiền + Giao dịch quà tặng
    new_wallet = models.Wallet(user_id=user_id, balance=initial_balance)
    db.add(new_wallet)
    db.flush()

    initial_tx = models.WalletTransaction(
        id=f"tx_{int(time.time() * 1000)}",
        wallet_user_id=user_id,
        amount=initial_balance,
        type="nạp tiền",
        detail="Quà tặng khởi tạo tài khoản IQ Kid Market ✨",
    )
    db.add(initial_tx)

    # 5. Mặc định mở khóa game nhập môn g1 cho học sinh
    if role == "student":
        db.add(models.Purchase(user_id=user_id, game_id="g1", purchased_price=0))

    db.commit()
    db.refresh(new_user)

    return _build_auth_response(new_user, db)


@router.post("/login")
def login(body: schemas.LoginIn, db: Session = Depends(get_db)):
    username_clean = body.username.strip().lower()

    # Tìm user theo username hoặc id
    user = (
        db.query(models.User)
        .filter((models.User.username == username_clean) | (models.User.id == username_clean))
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác!",
        )

    # Nếu tài khoản đã có password_hash thì kiểm tra mật khẩu
    if user.password_hash:
        if not verify_password(body.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tên đăng nhập hoặc mật khẩu không chính xác!",
            )
    else:
        # Nếu tài khoản cũ chưa có password_hash (seed user ban đầu), chấp nhận pass 123456 hoặc bất kỳ pass nào và tự băm lại
        user.password_hash = hash_password(body.password or "123456")
        db.commit()

    return _build_auth_response(user, db)


@router.get("/me")
def get_current_user_profile(
    userId: str | None = None,
    user_from_token: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    # Ưu tiên lấy từ Token, nếu không có Token thì fallback qua userId query param (để tương thích ngược)
    user = user_from_token
    if not user and userId:
        user = db.get(models.User, userId)

    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên đăng nhập người dùng")

    return _build_auth_response(user, db)


@router.post("/change-password")
def change_password(body: schemas.ChangePasswordIn, db: Session = Depends(get_db)):
    user = db.get(models.User, body.userId)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if user.password_hash and not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác!")

    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 4 ký tự!")

    user.password_hash = hash_password(body.new_password)
    db.commit()

    return {"success": True, "message": "Đổi mật khẩu thành công!"}
