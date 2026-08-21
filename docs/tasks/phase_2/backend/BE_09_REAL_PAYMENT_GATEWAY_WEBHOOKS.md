# [BE-09] Tích Hợp Cổng Thanh Toán Tự Động Thật & Webhook Verification (Payment Gateway & Webhooks)

> **Mô tả nghiệp vụ**: Nâng cấp từ cơ chế nạp tiền mô phỏng sang cổng thanh toán tự động thực tế (Tích hợp PayOS / VietQR Open API / Casso / SeAPay). Cung cấp endpoint nhận Webhook an toàn từ ngân hàng với chữ ký HMAC-SHA256, đối soát mã giao dịch (`tx_id`) chống nạp khống (Replay Attacks), và cấu hình tài khoản thụ hưởng động qua biến môi trường.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-09`
- **Mảng phụ trách**: Backend (FastAPI + SQLAlchemy + PostgreSQL + Cryptography)
- **Độ ưu tiên**: 🔴 P0 (Bắt buộc / Thương mại hóa nền tảng)
- **Người thực hiện**: Backend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-09-payment-webhooks`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **HMAC-SHA256 Signature Verification**:
   - Webhook từ các cổng thanh toán (PayOS / Casso / Ngân hàng) luôn gửi kèm Header `x-api-signature` hoặc trường `signature` trong body.
   - Backend bắt buộc phải băm payload nhận được với `PAYMENT_CHECKSUM_KEY` và so sánh với chữ ký gửi lên. Nếu không khớp ➔ Trả về `400 Bad Request` ngay lập tức để chống kẻ xấu giả mạo request.
2. **Idempotency & Replay Attack Protection**:
   - Giao dịch ngân hàng có thể gửi Webhook nhiều lần (retry). Backend phải kiểm tra xem mã `payment_ref` hoặc `tx_id` đã ở trạng thái `SUCCESS` trong bảng `payment_orders` chưa. Nếu đã xử lý rồi thì trả về `200 OK` mà không cộng tiền lần thứ hai.
3. **Dynamic Environment Configuration**:
   - Loại bỏ toàn bộ hardcode thông tin ngân hàng trong `wallet.py` (`DEFAULT_BANK_ID = "MB"`, `DEFAULT_ACCOUNT_NO = "0334888999"`). Thay bằng các biến môi trường:
     - `BANK_ID`, `BANK_ACCOUNT_NO`, `BANK_ACCOUNT_NAME`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Tạo Bảng `payment_orders` Quản Lý Đơn Nạp Tiền**:
   - Cột: `id`, `user_id`, `amount`, `status` (`PENDING`, `SUCCESS`, `EXPIRED`, `FAILED`), `payment_method`, `qr_url`, `checkout_url`, `created_at`, `updated_at`.
2. **API Tạo Đơn Thanh Toán Chuẩn (`POST /api/wallet/payment-order`)**:
   - Gọi API của Payment Gateway (ví dụ PayOS SDK hoặc VietQR) để sinh mã QR động chứa đúng số tiền và mã đơn hàng duy nhất.
   - Lưu trạng thái `PENDING` vào bảng `payment_orders` có thời hạn hết hạn 15 phút.
3. **API Nhận Webhook Tự Động (`POST /api/wallet/webhook/payos`)**:
   - Xác thực chữ ký HMAC-SHA256.
   - Khóa hàng ví (`with_for_update`) và cộng số dư xu vào ví của học sinh.
   - Ghi nhận `WalletTransaction` loại `"nạp tiền tự động"`.
   - Cập nhật trạng thái đơn nạp thành `SUCCESS`.
4. **API Tra Cứu Trạng Thái Đơn Nạp Cho Frontend Polling (`GET /api/wallet/payment-order/{order_id}`)**:
   - Giúp Frontend hiển thị trạng thái "Đang chờ thanh toán" ➔ Tự động chuyển thành "Nạp tiền thành công!" khi Webhook hoàn tất mà không bắt người dùng bấm nút thủ công.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Cập nhật Model & Migrations trong `backend/app/models.py`**:
  - [ ] Thêm Model `PaymentOrder` với các quan hệ với `User`.
  - [ ] Sinh migration Alembic `0002_add_payment_orders_table.py` và chạy `alembic upgrade head`.
- [ ] **2. Tạo Module Tích Hợp Cổng Thanh Toán `backend/app/services/payment_service.py`**:
  - [ ] Hàm `create_payment_link(order_id: str, amount: int, description: str) -> dict`.
  - [ ] Hàm `verify_webhook_signature(payload: dict, signature: str) -> bool`.
- [ ] **3. Cập nhật Router `backend/app/routers/wallet.py`**:
  - [ ] Thêm `POST /api/wallet/payment-order`.
  - [ ] Thêm `POST /api/wallet/webhook/payos`.
  - [ ] Thêm `GET /api/wallet/payment-order/{order_id}`.
  - [ ] Xóa bỏ thông tin ngân hàng hardcode cũ.
- [ ] **4. Cập nhật `backend/app/schemas.py`**:
  - [ ] Thêm `PaymentOrderCreateIn`, `PaymentOrderOut`, `WebhookPayloadIn`.
- [ ] **5. Viết Pytest trong `backend/tests/test_payment_gateway.py`**:
  - [ ] Test sinh đơn nạp tiền.
  - [ ] Test webhook thành công (cộng đúng số dư ví).
  - [ ] Test webhook sai chữ ký (bị chặn 400).
  - [ ] Test webhook trùng lặp (chỉ cộng tiền 1 lần duy nhất).

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

```python
import hmac
import hashlib
import json
import os

CHECKSUM_KEY = os.getenv("PAYOS_CHECKSUM_KEY", "test_checksum_key_iqkids_2026")

def verify_payos_signature(data: dict, received_signature: str) -> bool:
    # Sắp xếp các key theo bảng chữ cái theo chuẩn PayOS
    sorted_data = dict(sorted(data.items()))
    data_str = "&".join(f"{k}={v}" for k, v in sorted_data.items() if v is not None)
    
    calculated_signature = hmac.new(
        CHECKSUM_KEY.encode("utf-8"),
        data_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(calculated_signature, received_signature)
```

---

## 🧪 6. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Tạo đơn nạp 50.000đ nhận được link PayOS / VietQR chứa đúng số tiền.
- [ ] Gửi Webhook giả lập có chữ ký hợp lệ ➔ Ví được cộng 50.000 xu tức thì.
- [ ] Gửi Webhook với signature sai ➔ Trả về mã lỗi `400 Bad Request`.
- [ ] Gửi 2 request Webhook cùng `order_id` ➔ Chỉ cộng tiền 1 lần, lần 2 trả về 200 OK không trừ thêm.
