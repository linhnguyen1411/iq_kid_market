"""
Script kiểm thử toàn diện Task BE-02: Quản Lý Ví Xu, Giao Dịch & Cổng Nạp Tiền Mô Phỏng (Wallet & Payment)
"""
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app import models

TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_be02_wallet_scenarios():
    print("🚀 BẮT ĐẦU KIỂM THỬ TASK BE-02: WALLET, PAYMENT & REVENUE SHARING...\n")

    # 1. TẠO TÀI KHOẢN HỌC SINH VÀ GIÁO VIÊN
    print("1️⃣ [Chuẩn bị dữ liệu]: Tạo tài khoản Học sinh và Giáo viên...")
    res_student = client.post("/api/auth/register", json={
        "username": "kid_buyer",
        "password": "password123",
        "name": "Bé Mua Game",
        "role": "student",
        "grade": 3,
    })
    assert res_student.status_code == 200
    student_id = res_student.json()["user"]["id"]
    student_token = res_student.json()["access_token"]
    assert res_student.json()["wallet"]["balance"] == 90000

    res_teacher = client.post("/api/auth/register", json={
        "username": "teacher_author",
        "password": "password123",
        "name": "Cô Sáng Tạo Game",
        "role": "teacher",
    })
    assert res_teacher.status_code == 200
    teacher_id = res_teacher.json()["user"]["id"]
    teacher_token = res_teacher.json()["access_token"]
    assert res_teacher.json()["wallet"]["balance"] == 500000
    print("   ✅ Đã khởi tạo học sinh (Ví: 90k xu) và giáo viên (Ví: 500k xu).")

    # 2. GIÁO VIÊN TẠO 1 GAME TRẢ PHÍ 30.000 XU
    print("2️⃣ [Tạo Game Trả Phí]: Giáo viên tạo game giá 30.000 xu...")
    res_game = client.post(
        "/api/admin/games",
        json={
            "title": "Toán Tư Duy Vũ Trụ 🚀",
            "description": "Luyện toán logic cho bé",
            "template_code": "matching",
            "category": "math",
            "price": 30000,
            "creatorId": teacher_id,
        },
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert res_game.status_code == 200
    game_id = res_game.json()["game"]["id"]
    print(f"   ✅ Game đã tạo thành công với ID: {game_id}, Giá: 30.000 xu.")

    # 3. TEST MUA GAME KHI SỐ DƯ VÍ KHÔNG ĐỦ
    print("3️⃣ [Test Số Dư Không Đủ]: Tạo học sinh 0 xu mua game 30k...")
    res_poor = client.post("/api/auth/register", json={
        "username": "poor_kid",
        "password": "password123",
        "name": "Bé Chưa Có Xu",
        "role": "student",
    })
    poor_id = res_poor.json()["user"]["id"]
    # Rút hết tiền về 0 để test
    with TestingSessionLocal() as db:
        w = db.get(models.Wallet, poor_id)
        w.balance = 0
        db.commit()

    res_fail_buy = client.post("/api/games/purchase", json={
        "userId": poor_id,
        "gameId": game_id,
    })
    assert res_fail_buy.status_code == 400
    assert "không đủ" in res_fail_buy.json()["detail"].lower()
    print("   ✅ Đã chặn thành công giao dịch khi số dư không đủ (Mã lỗi 400).")

    # 4. TEST MUA GAME THÀNH CÔNG VÀ CHIA SẺ DOANH THU 80% CHO CREATOR
    print("4️⃣ [Test Mua Game & Chia Sẻ Doanh Thu 80%]...")
    res_buy = client.post("/api/games/purchase", json={
        "userId": student_id,
        "gameId": game_id,
    })
    assert res_buy.status_code == 200, f"Purchase failed: {res_buy.text}"
    data_buy = res_buy.json()
    assert data_buy["balance"] == 60000  # 90.000 - 30.000 = 60.000
    assert game_id in data_buy["purchases"]

    # Kiểm tra ví của Giáo viên (Creator) được cộng 80% = 24.000 xu (500k + 24k = 524.000 xu)
    with TestingSessionLocal() as db:
        teacher_wallet = db.get(models.Wallet, teacher_id)
        assert teacher_wallet.balance == 524000, f"Expected 524000 but got {teacher_wallet.balance}"
        # Kiểm tra Transaction của Creator
        rev_tx = db.query(models.WalletTransaction).filter_by(wallet_user_id=teacher_id, type="nhận doanh thu").first()
        assert rev_tx is not None
        assert rev_tx.amount == 24000
    print("   ✅ Học sinh bị trừ đúng 30.000 xu. Giáo viên nhận đủ 24.000 xu (80% hoa hồng)!")

    # 5. TEST CHỐNG MUA LẶP LẠI (IDEMPOTENCY)
    print("5️⃣ [Test Chống Mua 2 Lần]...")
    res_buy_again = client.post("/api/games/purchase", json={
        "userId": student_id,
        "gameId": game_id,
    })
    assert res_buy_again.status_code == 400
    assert "đã mua" in res_buy_again.json()["detail"].lower()
    print("   ✅ Đã chặn mua lặp lại thành công cho game đã sở hữu.")

    # 6. TEST TẠO YÊU CẦU NẠP TIỀN VIETQR (TOPUP INTENT)
    print("6️⃣ [Test Sinh Mã VietQR Nạp Tiền]...")
    res_intent = client.post("/api/wallet/create-topup-intent", json={
        "userId": student_id,
        "amount": 50000,
        "method": "VietQR",
    })
    assert res_intent.status_code == 200
    intent_data = res_intent.json()
    assert "tx_id" in intent_data
    assert "qr_url" in intent_data
    assert "vietqr.io" in intent_data["qr_url"]
    assert intent_data["amount"] == 50000
    tx_id = intent_data["tx_id"]
    print(f"   ✅ Đã sinh mã VietQR thành công: {intent_data['qr_url'][:60]}...")

    # 7. TEST XÁC NHẬN NẠP TIỀN THÀNH CÔNG (CONFIRM TOPUP)
    print("7️⃣ [Test Xác Nhận Nạp Tiền Thành Công]...")
    res_confirm = client.post("/api/wallet/confirm-topup", json={
        "userId": student_id,
        "tx_id": tx_id,
        "amount": 50000,
    })
    assert res_confirm.status_code == 200
    assert res_confirm.json()["balance"] == 110000  # 60.000 + 50.000 = 110.000

    # Thử xác nhận lại cùng 1 tx_id -> Phải báo lỗi nạp trùng
    res_confirm_dup = client.post("/api/wallet/confirm-topup", json={
        "userId": student_id,
        "tx_id": tx_id,
        "amount": 50000,
    })
    assert res_confirm_dup.status_code == 400
    print("   ✅ Nạp tiền thành công và chặn được nạp trùng lặp.")

    # 8. TEST BẢNG THỐNG KÊ DOANH THU CREATOR
    print("8️⃣ [Test Creator Earnings Dashboard]...")
    res_earnings = client.get(f"/api/wallet/creator-earnings?creatorId={teacher_id}")
    assert res_earnings.status_code == 200
    earn_data = res_earnings.json()
    assert earn_data["totalRevenue"] == 24000
    assert earn_data["totalSalesCount"] == 1
    assert len(earn_data["gameBreakdown"]) == 1
    assert earn_data["gameBreakdown"][0]["creatorEarnings"] == 24000
    print("   ✅ Thống kê thu nhập Creator hiển thị chuẩn xác từng số liệu.")

    print("\n🎉 TẤT CẢ CÁC TEST CASES CỦA TASK BE-02 ĐÃ PASSED 100%! HỆ THỐNG VÍ & THANH TOÁN HOẠT ĐỘNG HOÀN HẢO.")


if __name__ == "__main__":
    test_be02_wallet_scenarios()
