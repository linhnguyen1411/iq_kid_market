# [BE-02] Quản Lý Ví Xu, Giao Dịch & Cổng Nạp Tiền Mô Phỏng (Wallet & Payment)

> **Mô tả nghiệp vụ**: Xây dựng hệ thống quản lý ví xu an toàn, chống gian lận số dư (Race Conditions), hỗ trợ tạo giao dịch nạp tiền mô phỏng kèm mã VietQR chuẩn Napas, trừ tiền khi mua game và tính năng chia sẻ doanh thu (Revenue Sharing) cho Nhà sáng tạo (Creator/Teacher).

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-02`
- **Mảng phụ trách**: Backend (FastAPI + SQLAlchemy + PostgreSQL)
- **Độ ưu tiên**: 🔴 P0 (Bắt buộc / Nền tảng)
- **Người thực hiện**: _[Điền tên thành viên]_
- **Trạng thái**: 🟡 To Do (Chưa bắt đầu)
- **Branch làm việc**: `feature/be-02-wallet-payment`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Row-level Locking (`SELECT FOR UPDATE`)**:
   - Khi có nhiều request mua game hoặc nạp tiền đồng thời (Concurrency), cần khóa dòng dữ liệu của Ví trong CSDL để tránh trừ tiền 2 lần (Double Spending) hoặc số dư bị âm.
   - Trong SQLAlchemy: `db.query(models.Wallet).filter_by(user_id=...).with_for_update().first()`.
2. **ACID Transaction**:
   - Giao dịch tài chính phải là một khối nguyên tử (Atomicity): Trừ tiền ví + Lưu lịch sử giao dịch (Transaction Log) + Cấp quyền sở hữu game (`Purchase`) phải cùng thành công hoặc cùng rollback nếu có lỗi.
3. **VietQR / Quick Pay**:
   - Định dạng chuẩn tạo ảnh QR thanh toán ngân hàng tại Việt Nam (ngân hàng thụ hưởng, số tài khoản, số tiền, nội dung chuyển khoản).
   - Có thể dùng API `https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact.png?amount=...&addInfo=...`.
4. **Creator Revenue Sharing**:
   - Khi người dùng mua game có trả phí do giáo viên/creator tự sáng tạo, doanh thu sẽ được tự động chia tỷ lệ: 80% cho Ví của Creator, 20% phí duy trì nền tảng IQ Kid Market.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Nâng cấp API Mua Game (`POST /api/games/purchase`)**:
   - Sử dụng `with_for_update()` để khóa hàng `Wallet`.
   - Kiểm tra kỹ số dư: `if wallet.balance < game.price` ➔ Báo lỗi 400 rõ ràng.
   - Nếu game có `creator_id` khác `system` ➔ Tự động cộng 80% số tiền vào ví của Creator kèm Transaction log `"Doanh thu bán game"`.
2. **API Sinh Mã QR Nạp Tiền (`POST /api/wallet/create-topup-intent`)**:
   - Nhận số tiền cần nạp (20.000đ, 50.000đ, 100.000đ, 200.000đ, 500.000đ).
   - Sinh mã giao dịch duy nhất `topup_tx_<id>` và trả về link ảnh VietQR kèm thông tin chuyển khoản.
3. **API Xác Nhận Nạp Tiền Thành Công (`POST /api/wallet/confirm-topup`)**:
   - Dùng cho môi trường demo / Webhook giả lập để phụ huynh hoặc admin xác nhận đã chuyển khoản thành công ➔ Cộng tiền tức thì vào ví học sinh.
4. **API Thống Kê Thu Nhập Dành Cho Creator (`GET /api/wallet/creator-earnings`)**:
   - Lấy tổng doanh thu, số lượt mua từng game và danh sách giao dịch hoa hồng nhận được.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Tối ưu hóa Database Transactions trong `backend/app/routers/games.py`**:
  - [ ] Bổ sung khóa hàng `with_for_update()` khi truy vấn ví.
  - [ ] Thêm logic chia sẻ doanh thu 80% cho `creator_id`.
  - [ ] Đảm bảo `db.commit()` ghi nhận đầy đủ bản ghi `Purchase` và `WalletTransaction`.
- [ ] **2. Nâng cấp `backend/app/routers/wallet.py`**:
  - [ ] Thêm endpoint `POST /api/wallet/create-topup-intent`.
  - [ ] Thêm endpoint `POST /api/wallet/confirm-topup`.
  - [ ] Thêm endpoint `GET /api/wallet/creator-earnings`.
- [ ] **3. Cập nhật `backend/app/schemas.py`**:
  - [ ] Bổ sung `CreateTopupIntentIn`, `ConfirmTopupIn`, `CreatorEarningsOut`.
- [ ] **4. Viết Test Concurrency & Kiểm thử thực tế**.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Xử lý Mua Game an toàn với Row Locking & Phân phối hoa hồng:

```python
@router.post("/api/games/purchase")
def purchase_game(body: schemas.PurchaseIn, db: Session = Depends(get_db)):
    # 1. Khóa hàng ví người mua để tránh race condition
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

    if wallet.balance < game.price:
        raise HTTPException(status_code=400, detail="Số dư xu trong ví không đủ. Vui lòng nạp thêm!")

    # 2. Kiểm tra đã mua chưa
    already = db.query(models.Purchase).filter_by(user_id=body.userId, game_id=body.gameId).first()
    if already:
        raise HTTPException(status_code=400, detail="Bạn đã sở hữu trò chơi này!")

    # 3. Trừ tiền người mua
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

    # 4. Chia sẻ 80% doanh thu cho Creator nếu không phải game hệ thống
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
                id=f"tx_rev_{now_ts}",
                wallet_user_id=creator_wallet.user_id,
                amount=revenue_share,
                type="nhận doanh thu",
                detail=f'Hoa hồng tác giả (80%) từ game "{game.title}"',
            )
            db.add(tx_creator)

    # Tăng lượt chơi/lượt tải
    game.plays_count = (game.plays_count or 0) + 1

    db.commit()
    return {"success": True, "balance": wallet.balance}
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/be-02-wallet-payment
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "backend: tích hợp row locking cho wallet và revenue sharing cho creator"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Trừ tiền & Kiểm tra số dư**:
  - Dùng tài khoản có 10.000đ mua game giá 25.000đ ➔ Phải báo lỗi số dư không đủ.
  - Dùng tài khoản có 90.000đ mua game 25.000đ ➔ Số dư còn đúng 65.000đ, bảng `purchases` có bản ghi mới.
- [ ] **2. Test Chia sẻ doanh thu Creator**:
  - Tạo tài khoản Giáo viên `teacher_lan` tạo 1 game giá 50.000đ.
  - Học sinh `student_binh` mua game đó ➔ Ví `student_binh` bị trừ 50.000đ, ví `teacher_lan` được cộng đúng 40.000đ (80%).
- [ ] **3. Test Sinh mã VietQR**:
  - Gửi request nạp 50.000đ ➔ Nhận được URL mã QR hợp lệ, quét thử trên app ngân hàng hiển thị đúng số tiền.
- [ ] **4. Test Idempotency**:
  - Bấm mua liên tục 2 lần cho cùng 1 game ➔ Lần 2 phải báo lỗi "Bạn đã sở hữu trò chơi này", không bị trừ tiền 2 lần.
