import os
import time
import uuid
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..auth_utils import get_current_user_required, get_current_user_optional

router = APIRouter(tags=["wallet"])

# Cấu hình tài khoản ngân hàng thụ hưởng nhận nạp tiền qua VietQR
DEFAULT_BANK_ID = os.getenv("BANK_ID", "TCB")  # Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)
DEFAULT_BANK_NAME = os.getenv("BANK_NAME", "Techcombank")
DEFAULT_ACCOUNT_NO = os.getenv("BANK_ACCOUNT_NO", "2628121220")
DEFAULT_ACCOUNT_NAME = os.getenv("BANK_ACCOUNT_NAME", "NGUYEN PHAN HOANG LINH")


# ---------- 1. Nạp tiền trực tiếp (Demo / Fast Topup) ----------
@router.post("/api/wallet/topup")
def topup_wallet(
    body: schemas.TopupIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Nạp tiền trực tiếp vào ví:
    Chỉ dành cho Quản trị viên (Admin) để cấp tiền, hoàn tiền, hoặc thử nghiệm.
    Học sinh / Người dùng thông thường không được phép tự tăng số dư ví.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Chức năng nạp tiền trực tiếp chỉ dành riêng cho Quản Trị Viên!",
        )

    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Số tiền nạp phải lớn hơn 0!")

    target_user_id = body.userId or current_user.id
    wallet = (
        db.query(models.Wallet)
        .filter(models.Wallet.user_id == target_user_id)
        .with_for_update()
        .first()
    )
    if not wallet:
        raise HTTPException(status_code=404, detail="Không tìm thấy ví người dùng!")

    wallet.balance += body.amount
    now_ts = int(time.time() * 1000)
    tx = models.WalletTransaction(
        id=f"tx_topup_{now_ts}",
        wallet_user_id=wallet.user_id,
        amount=body.amount,
        type="nạp tiền",
        detail=f'Nạp tiền qua hình thức {body.method or "Mô phỏng"} (+{body.amount:,} Sao IQ)',
    )
    db.add(tx)
    db.commit()
    db.refresh(wallet)

    transactions = [
        {
            "id": t.id,
            "amount": t.amount,
            "type": t.type,
            "detail": t.detail,
            "date": t.created_at.isoformat(),
        }
        for t in wallet.transactions
    ]
    return {
        "success": True,
        "balance": wallet.balance,
        "transactions": transactions,
        "message": f"Nạp thành công +{body.amount:,} Sao IQ vào ví IQ Kid! ✨",
    }


# ---------- 2. Tạo yêu cầu nạp tiền kèm sinh mã VietQR ----------
@router.post("/api/wallet/create-topup-intent")
def create_topup_intent(
    body: schemas.CreateTopupIntentIn,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Sinh mã giao dịch nạp tiền duy nhất và URL ảnh VietQR chuẩn Napas 24/7.
    """
    if body.amount < 10000:
        raise HTTPException(status_code=400, detail="Số tiền nạp tối thiểu là 10.000đ!")

    if body.userId and body.userId != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Bạn không thể tạo mã nạp tiền cho tài khoản khác!",
        )

    user = db.get(models.User, body.userId or current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng!")

    tx_id = f"topup_{int(time.time() * 1000)}_{uuid.uuid4().hex[:4]}"
    transfer_content = f"IQKID {user.username} {tx_id[-8:]}"

    encoded_content = urllib.parse.quote(transfer_content)
    encoded_holder = urllib.parse.quote(DEFAULT_ACCOUNT_NAME)
    qr_url = (
        f"https://img.vietqr.io/image/{DEFAULT_BANK_ID}-{DEFAULT_ACCOUNT_NO}-compact2.png"
        f"?amount={body.amount}&addInfo={encoded_content}&accountName={encoded_holder}"
    )

    return {
        "tx_id": tx_id,
        "amount": body.amount,
        "qr_url": qr_url,
        "static_qr_url": "/techcombank_qr.png",
        "bank_name": DEFAULT_BANK_NAME,
        "bank_account": DEFAULT_ACCOUNT_NO,
        "account_holder": DEFAULT_ACCOUNT_NAME,
        "transfer_content": transfer_content,
    }


# ---------- 3. Xác nhận giao dịch nạp tiền thành công (Webhook / Admin) ----------
@router.post("/api/wallet/confirm-topup")
def confirm_topup(
    body: schemas.ConfirmTopupIn,
    current_user: models.User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Xác nhận nạp tiền tự động (giả lập Webhook thanh toán thành công từ ngân hàng).
    Bắt buộc phải là Quản Trị Viên đăng nhập hoặc gọi từ hệ thống kiểm thử có thẩm quyền.
    """
    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="Bạn cần đăng nhập để xác nhận giao dịch!",
        )
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Chức năng xác nhận nạp tiền chỉ dành riêng cho Quản Trị Viên!",
        )

    wallet = (
        db.query(models.Wallet)
        .filter(models.Wallet.user_id == body.userId)
        .with_for_update()
        .first()
    )
    if not wallet:
        raise HTTPException(status_code=404, detail="Không tìm thấy ví người dùng!")

    # Kiểm tra xem giao dịch tx_id này đã được xử lý chưa để tránh nạp trùng
    existing_tx = db.get(models.WalletTransaction, body.tx_id)
    if existing_tx:
        raise HTTPException(status_code=400, detail="Giao dịch nạp tiền này đã được xác nhận trước đó!")

    raw_amount = body.amount if (body.amount and body.amount > 0) else 50000
    # Nếu nạp theo VND (ví dụ 10.000, 20.000, 50.000 >= 1000), quy đổi về Sao IQ (10, 20, 50)
    amount = raw_amount // 1000 if raw_amount >= 1000 else raw_amount
    wallet.balance += amount

    tx = models.WalletTransaction(
        id=body.tx_id,
        wallet_user_id=wallet.user_id,
        amount=amount,
        type="nạp tiền",
        detail=f"Xác nhận thanh toán VietQR thành công (+{amount:,} Sao IQ)",
    )
    db.add(tx)
    db.commit()
    db.refresh(wallet)

    return {
        "success": True,
        "balance": wallet.balance,
        "message": f"Đã xác nhận nạp thành công +{amount:,} Sao IQ vào ví!",
    }


# ---------- 4. Thống kê thu nhập dành cho Tác giả / Giáo viên (Creator Revenue) ----------
@router.get("/api/wallet/creator-earnings")
def get_creator_earnings(
    creatorId: str | None = None,
    current_user: models.User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Lấy tổng doanh thu, số lượt bán và chi tiết thu nhập của Creator/Teacher.
    Bảo vệ IDOR: chỉ cho phép xem thu nhập của chính mình hoặc Quản trị viên.
    """
    target_id = creatorId or current_user.id
    if current_user.id != target_id and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Bạn không có quyền xem thu nhập của tác giả khác!",
        )

    creator = db.get(models.User, target_id)
    if not creator:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin tác giả!")

    # 1. Lấy ví của creator
    wallet = creator.wallet
    available_balance = wallet.balance if wallet else 0

    # 2. Lấy danh sách giao dịch nhận doanh thu (amount > 0, type == "nhận doanh thu")
    earnings_txs = (
        db.query(models.WalletTransaction)
        .filter(
            models.WalletTransaction.wallet_user_id == target_id,
            models.WalletTransaction.type == "nhận doanh thu",
        )
        .order_by(models.WalletTransaction.created_at.desc())
        .all()
    )

    total_revenue = sum(t.amount for t in earnings_txs)

    # 3. Phân tích chi tiết số lượt mua theo từng game do creator tạo ra
    games_created = db.query(models.Game).filter(models.Game.creator_id == target_id).all()
    game_breakdown = []
    total_sales_count = 0

    for g in games_created:
        purchases_count = db.query(models.Purchase).filter(models.Purchase.game_id == g.id).count()
        game_revenue = int(purchases_count * g.price * 0.8)
        total_sales_count += purchases_count
        game_breakdown.append({
            "gameId": g.id,
            "title": g.title,
            "thumbnail": g.thumbnail,
            "price": g.price,
            "salesCount": purchases_count,
            "creatorEarnings": game_revenue,
            "playsCount": g.plays_count or 0,
        })

    return {
        "creatorId": creator.id,
        "creatorName": creator.name,
        "availableBalance": available_balance,
        "totalRevenue": total_revenue,
        "totalSalesCount": total_sales_count,
        "recentEarnings": [
            {
                "id": t.id,
                "amount": t.amount,
                "detail": t.detail,
                "date": t.created_at.isoformat(),
            }
            for t in earnings_txs[:10]
        ],
        "gameBreakdown": game_breakdown,
    }
