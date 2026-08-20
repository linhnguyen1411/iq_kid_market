import os
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Callable
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from . import models
from .database import get_db

# Password hashing context (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configurations
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "iqkids_super_secret_jwt_key_for_edtech_platform_2026")
REFRESH_SECRET_KEY = os.getenv("JWT_REFRESH_SECRET_KEY", "iqkids_refresh_token_secret_key_2026")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 1 day (24h)
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # 7 days

security = HTTPBearer(auto_error=False)


# ---------- RATE LIMITING CHO ĐĂNG NHẬP ----------
# Lưu lịch sử đăng nhập sai: { username_or_ip: [timestamp1, timestamp2, ...] }
_FAILED_LOGIN_ATTEMPTS: dict[str, list[float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 60


def check_rate_limit(identifier: str) -> None:
    """Kiểm tra nếu identifier (username hoặc IP) bị khóa do đăng nhập sai quá 5 lần trong 1 phút."""
    now = time.time()
    attempts = _FAILED_LOGIN_ATTEMPTS.get(identifier, [])
    # Lọc chỉ giữ lại các lần thử trong khoảng thời gian cửa sổ (60s)
    recent_attempts = [t for t in attempts if now - t < LOCKOUT_WINDOW_SECONDS]
    _FAILED_LOGIN_ATTEMPTS[identifier] = recent_attempts

    if len(recent_attempts) >= MAX_FAILED_ATTEMPTS:
        remaining_seconds = int(LOCKOUT_WINDOW_SECONDS - (now - recent_attempts[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Bạn đã đăng nhập sai quá nhiều lần! "
                f"Vui lòng đợi {max(1, remaining_seconds)} giây nữa trước khi thử lại."
            ),
        )


def record_failed_login(identifier: str) -> None:
    """Ghi nhận 1 lần đăng nhập thất bại."""
    now = time.time()
    if identifier not in _FAILED_LOGIN_ATTEMPTS:
        _FAILED_LOGIN_ATTEMPTS[identifier] = []
    _FAILED_LOGIN_ATTEMPTS[identifier].append(now)


def clear_failed_login(identifier: str) -> None:
    """Xóa bỏ lịch sử đăng nhập thất bại khi đã đăng nhập thành công."""
    if identifier in _FAILED_LOGIN_ATTEMPTS:
        del _FAILED_LOGIN_ATTEMPTS[identifier]


# ---------- MÃ HÓA VÀ XÁC THỰC MẬT KHẨU ----------
def hash_password(password: str) -> str:
    """Băm mật khẩu bằng thuật toán bcrypt an toàn."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    """Xác thực mật khẩu người dùng nhập với hash trong CSDL."""
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


# ---------- TẠO VÀ GIẢI MÃ JWT TOKEN ----------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Tạo JWT Access Token có hạn sử dụng (ngắn hạn)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "token_type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Tạo JWT Refresh Token có hạn sử dụng dài (dùng để cấp lại Access Token)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "token_type": "refresh"})
    return jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Giải mã và kiểm tra tính hợp lệ của JWT Access Token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("token_type") != "access" and "token_type" in payload:
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[dict]:
    """Giải mã và kiểm tra tính hợp lệ của JWT Refresh Token."""
    try:
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("token_type") != "refresh":
            return None
        return payload
    except JWTError:
        return None


# ---------- DEPENDENCIES LẤY THÔNG TIN VÀ PHÂN QUYỀN RBAC ----------
def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    """Dependency: Lấy thông tin user hiện tại nếu có Token hợp lệ (không bắt buộc)."""
    if not auth or not auth.credentials:
        return None
    payload = decode_access_token(auth.credentials)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.get(models.User, user_id)


def get_current_user_required(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    """Dependency: Bắt buộc phải có Token hợp lệ, nếu không trả về 401 Unauthorized."""
    user = get_current_user_optional(auth, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại!",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(allowed_roles: list[str]) -> Callable:
    """
    Dependency Factory kiểm tra phân quyền RBAC:
    Chỉ cho phép người dùng có vai trò thuộc allowed_roles thực thi API.
    Ví dụ: require_roles(["admin", "teacher"])
    """
    def role_checker(
        current_user: models.User = Depends(get_current_user_required),
    ) -> models.User:
        if current_user.role not in allowed_roles:
            role_names_vn = {
                "admin": "Quản Trị Viên",
                "teacher": "Giáo Viên",
                "creator": "Tác Giả Sáng Tạo",
                "parent": "Phụ Huynh",
                "student": "Học Sinh",
            }
            allowed_names = [role_names_vn.get(r, r) for r in allowed_roles]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quyền truy cập bị từ chối! Tính năng này chỉ dành cho vai trò: {', '.join(allowed_names)}.",
            )
        return current_user

    return role_checker
