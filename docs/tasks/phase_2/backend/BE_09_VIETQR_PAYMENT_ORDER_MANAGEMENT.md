# [BE-09] Hệ Thống Đơn Nạp Tiền VietQR Động & Đối Soát Giao Dịch (VietQR Payment Orders)

> **Mô tả nghiệp vụ**: Xây dựng hệ thống quản lý Đơn Nạp Tiền (Payment Orders) với mã VietQR chuẩn Napas 24/7 theo từng mã giao dịch duy nhất. Loại bỏ hoàn toàn các giá trị hardcode tài khoản ngân hàng trong mã nguồn, chuyển sang cấu hình động qua file `.env`, quản lý vòng đời đơn nạp (`PENDING`, `COMPLETED`, `CANCELLED`) và hỗ trợ luồng xác nhận an toàn nội bộ (Parent PIN / Admin Approval) kèm Row-level Locking chống gian lận số dư.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-09`
- **Mảng phụ trách**: Backend (FastAPI + SQLAlchemy + PostgreSQL)
- **Độ ưu tiên**: 🔴 P0 (Bắt buộc / Nền tảng giao dịch ví xu)
- **Người thực hiện**: Backend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-09-vietqr-payment-orders`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Dynamic Environment Configuration (Loại bỏ Hardcode)**:
   - Thay thế toàn bộ hardcode thông tin ngân hàng trong `wallet.py` (`DEFAULT_BANK_ID = "MB"`, `DEFAULT_ACCOUNT_NO = "0334888999"`).
   - Đọc trực tiếp từ biến môi trường:
     ```env
     VIETQR_BANK_ID=MB
     VIETQR_ACCOUNT_NO=0334888999
     VIETQR_ACCOUNT_NAME=IQ KID MARKET
     VIETQR_TEMPLATE=compact
     ```
2. **VietQR Quick Pay Standard (Chuẩn Napas 24/7)**:
   - Sinh URL ảnh VietQR chuẩn:
     `https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<ORDER_CODE>&accountName=<ACCOUNT_NAME>`
   - `ORDER_CODE`: Mã đơn nạp duy nhất, ví dụ: `IQKID_98241` (ngắn gọn, học sinh hoặc phụ huynh dễ sao chép vào nội dung chuyển khoản).
3. **Idempotency & Row-level Locking**:
   - Khi hoàn tất đơn nạp, dùng `db.query(models.Wallet).with_for_update()` để khóa hàng ví.
   - Chỉ cộng tiền 1 lần duy nhất cho 1 đơn nạp và ghi nhận lịch sử `wallet_transactions`.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Tạo Bảng `payment_orders` Trong CSDL**:
   - Cột:
     - `id`: Mã đơn (ví dụ: `order_1740000000_abcd`)
     - `order_code`: Mã chuyển khoản ngắn gọn (ví dụ: `IQKID_8923`)
     - `user_id`: ID người nhận xu
     - `amount`: Số tiền nạp (VND)
     - `coin_amount`: Số xu nhận được (kèm bonus nếu có khuyến mãi)
     - `qr_url`: Đường link ảnh VietQR sinh tự động
     - `status`: `PENDING` (Đang chờ), `COMPLETED` (Đã hoàn tất), `CANCELLED` (Đã hủy), `EXPIRED` (Hết hạn sau 30 phút)
     - `created_at`, `completed_at`
2. **API Tạo Đơn Nạp Tiền VietQR (`POST /api/wallet/create-order`)**:
   - Nhận: `amount` (20.000đ, 50.000đ, 100.000đ, 200.000đ, 500.000đ).
   - Tạo bản ghi `PaymentOrder`, sinh mã QR và trả về thông tin đầy đủ.
3. **API Xác Nhận Đơn Nạp Tiền (`POST /api/wallet/complete-order`)**:
   - Phụ huynh hoặc Admin xác nhận đơn hàng đã chuyển khoản thành công.
   - Cộng xu tức thì vào ví học sinh, đổi trạng thái đơn sang `COMPLETED`.
4. **API Tra Cứu Lịch Sử Đơn Nạp (`GET /api/wallet/my-orders`)**:
   - Lấy danh sách các đơn nạp tiền của học sinh kèm trạng thái.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Cập nhật Model & Migrations trong `backend/app/models.py`**:
  - [ ] Thêm Model `PaymentOrder` với các quan hệ với `User`.
  - [ ] Sinh migration Alembic `0002_add_payment_orders_table.py` và chạy `alembic upgrade head`.
- [ ] **2. Cập nhật Router `backend/app/routers/wallet.py`**:
  - [ ] Xóa bỏ các giá trị hardcode tài khoản cũ.
  - [ ] Thêm `POST /api/wallet/create-order`.
  - [ ] Thêm `POST /api/wallet/complete-order`.
  - [ ] Thêm `GET /api/wallet/my-orders`.
  - [ ] Thêm `POST /api/wallet/cancel-order/{order_id}`.
- [ ] **3. Cập nhật `backend/app/schemas.py`**:
  - [ ] `PaymentOrderCreateIn`, `PaymentOrderOut`, `PaymentOrderCompleteIn`.
- [ ] **4. Viết Pytest trong `backend/tests/test_wallet_orders.py`**:
  - [ ] Test tạo đơn hàng nhận link QR VietQR hợp lệ.
  - [ ] Test hoàn thành đơn hàng cộng đúng số dư ví.
  - [ ] Test chặn hoàn thành đơn hàng 2 lần liên tiếp.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

```python
import os
import random
import time
from urllib.parse import quote

def generate_vietqr_url(amount: int, order_code: str) -> str:
    bank_id = os.getenv("VIETQR_BANK_ID", "MB")
    account_no = os.getenv("VIETQR_ACCOUNT_NO", "0334888999")
    account_name = os.getenv("VIETQR_ACCOUNT_NAME", "IQ KID MARKET")
    template = os.getenv("VIETQR_TEMPLATE", "compact")
    
    encoded_name = quote(account_name)
    encoded_memo = quote(order_code)
    
    return f"https://img.vietqr.io/image/{bank_id}-{account_no}-{template}.png?amount={amount}&addInfo={encoded_memo}&accountName={encoded_name}"
```

---

## 🧪 6. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Tạo đơn nạp 50.000đ ➔ Nhận được link ảnh QR VietQR đúng chuẩn, quét bằng app ngân hàng tự điền đúng STK, số tiền và nội dung chuyển khoản `IQKID_...`.
- [ ] Xác nhận đơn nạp ➔ Số dư ví tăng đúng 50.000 xu, bảng `payment_orders` đổi sang `COMPLETED`.
- [ ] Thử hoàn tất đơn đã COMPLETED lần thứ 2 ➔ Báo lỗi `400 Đơn hàng đã được xử lý trước đó`.
- [ ] Không còn bất kỳ chuỗi thông tin tài khoản ngân hàng nào bị hardcode trong code.
