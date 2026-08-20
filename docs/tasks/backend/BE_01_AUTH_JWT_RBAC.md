# [BE-01] Hệ Thống Xác Thực & Phân Quyền Nâng Cao (Auth, JWT & RBAC)

> **Mô tả nghiệp vụ**: Nâng cấp hệ thống xác thực người dùng bằng JWT Token, băm mật khẩu Bcrypt, tích hợp cơ chế làm mới Token (Refresh Token) và phân quyền chặt chẽ theo vai trò (Role-Based Access Control - RBAC) cho 5 nhóm đối tượng: `student`, `teacher`, `parent`, `creator`, `admin`.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-01`
- **Mảng phụ trách**: Backend (FastAPI + SQLAlchemy + PostgreSQL)
- **Độ ưu tiên**: 🔴 P0 (Bắt buộc / Nền tảng)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/be-01-auth-rbac`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **JWT (JSON Web Token)**:
   - Chuỗi mã hóa gồm 3 phần: `Header.Payload.Signature`.
   - `Payload` chứa các claims: `sub` (User ID), `role` (vai trò), `exp` (thời điểm hết hạn).
   - Truyền qua HTTP Header: `Authorization: Bearer <access_token>`.
2. **RBAC (Role-Based Access Control)**:
   - Cơ chế kiểm soát quyền truy cập dựa trên vai trò của người dùng.
   - Ví dụ: Chỉ `admin` và `teacher` mới được duyệt game trong hàng đợi (`/api/admin/review/decide`), chỉ `student` mới được nộp điểm màn chơi.
3. **Bcrypt Password Hashing**:
   - Thuật toán băm mật khẩu 1 chiều có kèm chuỗi muối (Salt) chống tấn công Rainbow Table.
   - Thư viện: `passlib[bcrypt]`.
4. **Access Token vs Refresh Token**:
   - `Access Token`: Hạn dùng ngắn (ví dụ: 2 giờ) dùng để gọi các API.
   - `Refresh Token`: Hạn dùng dài (ví dụ: 7 ngày) dùng để xin cấp Access Token mới mà không bắt người dùng nhập lại mật khẩu.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Dependency kiểm tra quyền theo Role (`require_roles`)**:
   - Viết FastAPI Dependency có thể tái sử dụng dễ dàng trong các Router.
   - Nếu user không có role phù hợp ➔ Trả về HTTP 403 Forbidden: `"Bạn không có quyền thực hiện thao tác này!"`.
2. **Endpoint Refresh Token (`POST /api/auth/refresh`)**:
   - Nhận Refresh Token hợp lệ ➔ Trả về cặp Token mới.
3. **Endpoint Quên / Đặt lại mật khẩu (`POST /api/auth/reset-password`)**:
   - Đối với tài khoản học sinh, cho phép xác thực qua Mã PIN phụ huynh hoặc mã bảo mật đã thiết lập.
4. **Rate Limiting chống brute-force đăng nhập**:
   - Giới hạn tối đa 5 lần đăng nhập sai liên tiếp trong vòng 1 phút cho 1 username hoặc IP.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Nâng cấp `backend/app/auth_utils.py`**:
  - [x] Thêm hàm `create_refresh_token(data: dict) -> str`.
  - [x] Thêm dependency `require_roles(allowed_roles: list[str])`.
  - [x] Xử lý giải mã và validate token chuẩn mực, bắt ngoại lệ `JWTError`, `ExpiredSignatureError`.
  - [x] Thêm bộ đếm Rate Limiting `check_rate_limit()` chống brute-force đăng nhập.
- [x] **2. Bổ sung các Endpoint vào `backend/app/routers/auth.py`**:
  - [x] `POST /api/auth/refresh`: Cấp mới token bằng Refresh Token.
  - [x] `POST /api/auth/reset-password`: Đặt lại mật khẩu qua PIN phụ huynh.
  - [x] Tích hợp trả về cả `access_token` và `refresh_token` trong `_build_auth_response`.
- [x] **3. Gắn phân quyền RBAC vào các Router hiện có**:
  - [x] Router `/api/admin/*`: Chỉ cho phép role `admin`, `teacher`, `creator`.
  - [x] Router `/api/admin/review/*`: Chỉ cho phép role `admin`, `teacher`.
  - [x] Router `/api/admin/games/reset`: Chỉ cho phép role `admin`.
- [x] **4. Cập nhật Model & Schemas**:
  - [x] `schemas.py`: Bổ sung `TokenRefreshIn`, `ResetPasswordIn`, `RefreshTokenOut`, `AuthOut`.
  - [x] `models.py`: Tương thích `JSON().with_variant(JSONB, "postgresql")` cho cả PostgreSQL và SQLite test.
- [x] **5. Viết Test & Kiểm thử thực tế**:
  - [x] Viết `backend/test_be01_auth.py` bao phủ 100% kịch bản thành công và ngoại lệ.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Ví dụ về Dependency `require_roles` trong `backend/app/auth_utils.py`:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from . import models
from .database import get_db

security = HTTPBearer(auto_error=False)
SECRET_KEY = "your-secret-key-iqkids"
ALGORITHM = "HS256"

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu đăng nhập để truy cập tính năng này!"
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token không hợp lệ")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token đã hết hạn hoặc không hợp lệ")
    
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return user

def require_roles(allowed_roles: list[str]):
    """Decorator Dependency kiểm tra phân quyền RBAC."""
    def role_checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quyền truy cập bị từ chối! Yêu cầu vai trò: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker
```

### Sử dụng trong Router `backend/app/routers/admin.py`:

```python
@router.post("/review/decide")
def decide_review(
    body: schemas.ReviewDecideIn,
    current_user: models.User = Depends(require_roles(["admin", "teacher"])),
    db: Session = Depends(get_db)
):
    # Chỉ admin hoặc teacher mới thực hiện được logic này!
    ...
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch từ `main`**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/be-01-auth-rbac
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "backend: hoàn thiện RBAC dependency và refresh token endpoint"
   ```
4. **Quy trình gửi PR**:
   - Push branch lên GitHub: `git push -u origin feature/be-01-auth-rbac`.
   - Tạo Pull Request trỏ vào branch `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Đăng ký & Đăng nhập**:
  - Gọi `POST /api/auth/register` tạo tài khoản học sinh `test_student` ➔ Nhận được JWT Token.
  - Gọi `POST /api/auth/login` với tài khoản demo `kid_binh` (pass `123456`) ➔ Đăng nhập thành công.
  - Gọi `POST /api/auth/login` với pass sai ➔ Trả về mã lỗi 401.
- [ ] **2. Test Phân quyền RBAC**:
  - Dùng Token của `student` gọi `POST /api/admin/review/decide` ➔ Bắt buộc nhận mã lỗi **403 Forbidden**.
  - Dùng Token của `teacher` hoặc `admin` gọi `POST /api/admin/review/decide` ➔ Trả về mã 200 OK.
- [ ] **3. Test Đổi mật khẩu**:
  - Gọi `POST /api/auth/change-password` ➔ Thử đăng nhập lại bằng pass mới.
- [ ] **4. Tương thích ngược**:
  - Các tài khoản seed cũ không có password trong DB vẫn tự động kích hoạt pass `123456`.
