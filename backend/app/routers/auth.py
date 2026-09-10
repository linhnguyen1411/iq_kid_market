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
    create_refresh_token,
    decode_refresh_token,
    get_current_user_required,
    check_rate_limit,
    record_failed_login,
    clear_failed_login,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _build_auth_response(user: models.User, db: Session) -> dict:
    """Helper: Đóng gói Access Token + Refresh Token + Profile + Ví + Game đã mua."""
    token_payload = {"sub": user.id, "username": user.username, "role": user.role}
    access_token = create_access_token(token_payload)
    refresh_token = create_refresh_token(token_payload)

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
        "access_token": access_token,
        "refresh_token": refresh_token,
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
    # Phân bổ quà tặng khởi đầu theo vai trò (không còn role phụ huynh)
    if (body.role or "").strip().lower() == "parent":
        raise HTTPException(
            status_code=400,
            detail="Vai trò phụ huynh đã ngừng hỗ trợ. Vui lòng đăng ký tài khoản học sinh (có ví xu).",
        )
    role = body.role if body.role in ["student", "teacher", "creator", "admin"] else "student"
    initial_balance = 0
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

    # 4. Khởi tạo Ví tiền với số dư 0 Token
    new_wallet = models.Wallet(user_id=user_id, balance=initial_balance)
    db.add(new_wallet)
    db.flush()

    # 5. Mặc định mở khóa game nhập môn g1 cho học sinh
    if role == "student":
        db.add(models.Purchase(user_id=user_id, game_id="g1", purchased_price=0))

    db.commit()
    db.refresh(new_user)

    return _build_auth_response(new_user, db)


@router.post("/login")
def login(body: schemas.LoginIn, db: Session = Depends(get_db)):
    username_clean = body.username.strip().lower()

    # 1. Kiểm tra Rate Limit chống Brute-force
    check_rate_limit(username_clean)

    # 2. Tìm user theo username hoặc id
    user = (
        db.query(models.User)
        .filter((models.User.username == username_clean) | (models.User.id == username_clean))
        .first()
    )
    if not user:
        record_failed_login(username_clean)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác!",
        )

    # 3. Kiểm tra mật khẩu (bắt buộc JWT login, không cho bypass tài khoản demo)
    if not user.password_hash or not verify_password(body.password, user.password_hash):
        record_failed_login(username_clean)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác!",
        )

    # 4. Đăng nhập thành công -> Xóa lịch sử thất bại
    clear_failed_login(username_clean)

    return _build_auth_response(user, db)


@router.post("/refresh")
def refresh_token(body: schemas.TokenRefreshIn, db: Session = Depends(get_db)):
    """Cấp lại cặp Access Token & Refresh Token mới bằng Refresh Token hợp lệ."""
    payload = decode_refresh_token(body.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh Token đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại!",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token không hợp lệ!")

    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng tương ứng!")

    token_payload = {"sub": user.id, "username": user.username, "role": user.role}
    new_access_token = create_access_token(token_payload)
    new_refresh_token = create_refresh_token(token_payload)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.post("/reset-password")
def reset_password(body: schemas.ResetPasswordIn, db: Session = Depends(get_db)):
    """Đặt lại mật khẩu cho tài khoản thông qua Mã PIN bảo vệ phụ huynh (mặc định: 1234)."""
    username_clean = body.username.strip().lower()
    user = (
        db.query(models.User)
        .filter((models.User.username == username_clean) | (models.User.id == username_clean))
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng!")

    # Xác thực mã PIN bảo vệ (mặc định PIN demo 1234)
    if body.parent_pin != "1234":
        raise HTTPException(status_code=400, detail="Mã PIN phụ huynh không chính xác! (Mã mặc định: 1234)")

    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 4 ký tự!")

    user.password_hash = hash_password(body.new_password)
    db.commit()

    return {"success": True, "message": "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay."}


@router.get("/me")
def get_current_user_profile(
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    return _build_auth_response(current_user, db)


@router.post("/change-password")
def change_password(
    body: schemas.ChangePasswordIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    user = current_user

    if user.password_hash and not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu cũ không chính xác!")

    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 4 ký tự!")

    user.password_hash = hash_password(body.new_password)
    db.commit()

    return {"success": True, "message": "Đổi mật khẩu thành công!"}


@router.put("/profile")
@router.post("/profile")
def update_profile_auth(
    body: schemas.UpdateProfileIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    user = current_user

    if body.name:
        user.name = body.name
    if body.avatar:
        user.avatar = body.avatar
    if body.grade is not None:
        user.grade = int(body.grade)

    db.commit()
    db.refresh(user)
    return {"success": True, "user": schemas.UserOut.model_validate(user).model_dump()}
