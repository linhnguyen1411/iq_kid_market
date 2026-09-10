import sys
from sqlalchemy.orm import Session
from . import models

def run_currency_migration(db: Session) -> dict:
    """
    Quy đổi toàn bộ số dư ví, lịch sử giao dịch và giá game/khóa học hiện hữu trong DB
    từ đơn vị cũ (xu) sang Sao IQ mới (tỉ lệ 1 Sao IQ = 1.000 xu).
    An toàn và idempotent (chỉ quy đổi các giá trị >= 1000).
    """
    summary = {
        "wallets_updated": 0,
        "transactions_updated": 0,
        "games_updated": 0,
        "courses_updated": 0,
        "purchases_updated": 0,
    }

    try:
        # 1. Cập nhật số dư ví
        wallets = db.query(models.Wallet).all()
        for w in wallets:
            if w.balance and w.balance >= 1000:
                old_bal = w.balance
                w.balance = int(round(w.balance / 1000))
                summary["wallets_updated"] += 1

        # 2. Cập nhật lịch sử giao dịch ví
        txs = db.query(models.WalletTransaction).all()
        for tx in txs:
            updated = False
            if tx.amount and abs(tx.amount) >= 1000:
                tx.amount = int(round(tx.amount / 1000))
                updated = True
            if tx.detail:
                if "xu" in tx.detail or "Xu" in tx.detail or "Token" in tx.detail:
                    tx.detail = tx.detail.replace("xu", "Sao IQ").replace("Xu", "Sao IQ").replace("Token", "Sao IQ")
                    updated = True
            if updated:
                summary["transactions_updated"] += 1

        # 3. Cập nhật giá game
        games = db.query(models.Game).all()
        for g in games:
            if g.price and g.price >= 1000:
                g.price = int(g.price // 1000)
                summary["games_updated"] += 1

        # 4. Cập nhật giá khóa học Scratch
        courses = db.query(models.ScratchCourse).all()
        for c in courses:
            if c.price and c.price >= 1000:
                c.price = int(c.price // 1000)
                summary["courses_updated"] += 1

        # 5. Cập nhật lịch sử mua game / khóa học
        purchases = db.query(models.Purchase).all()
        for p in purchases:
            if p.purchased_price and p.purchased_price >= 1000:
                p.purchased_price = int(p.purchased_price // 1000)
                summary["purchases_updated"] += 1

        course_purchases = db.query(models.CoursePurchase).all()
        for cp in course_purchases:
            if cp.purchased_price and cp.purchased_price >= 1000:
                cp.purchased_price = int(cp.purchased_price // 1000)
                summary["purchases_updated"] += 1

        db.commit()
        if any(summary.values()):
            print(f"✅ [Currency Migration] Đã hoàn tất migrate sang Token: {summary}")
    except Exception as e:
        db.rollback()
        print(f"⚠️ [Currency Migration Warning] Không thể thực hiện migrate: {e}", file=sys.stderr)

    return summary
