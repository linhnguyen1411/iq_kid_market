# [BE-09] Hệ Thống Đơn Nạp Tiền & Sinh Mã QR Nội Bộ 100% (Local QR Payment Orders)

> **Mô tả nghiệp vụ**: Xây dựng hệ thống quản lý Đơn Nạp Tiền (Payment Orders) với cơ chế sinh mã QR thanh toán ngân hàng hoàn toàn **Nội Bộ (Local Self-Hosted QR)**, không phụ thuộc vào bất kỳ dịch vụ API bên thứ 3 nào. Loại bỏ triệt để hardcode tài khoản ngân hàng trong code, hỗ trợ cấu hình qua `.env`, quản lý trạng thái đơn nạp (`PENDING`, `COMPLETED`, `CANCELLED`) và xác nhận an toàn qua mã PIN Phụ huynh / Duyệt đơn nội bộ.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-09`
- **Mảng phụ trách**: Backend (FastAPI + SQLAlchemy + PostgreSQL + Python `qrcode`)
- **Độ ưu tiên**: 🟠 P1 (Giao dịch ví xu nội bộ an toàn)
- **Người thực hiện**: Backend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-09-local-qr-orders`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **100% Self-Hosted Local QR (Không Dùng Third-Party API)**:
   - Thay vì gọi link ảnh từ dịch vụ ngoài, backend sử dụng thư viện Python `qrcode` để sinh trực tiếp chuỗi Base64 Data URL (`data:image/png;base64,...`) hoặc trả về chuỗi VietQR Payload chuẩn để frontend render canvas. Hoàn toàn chạy offline, không lo bị nghẽn mạng hay chết dịch vụ ngoài.
2. **Cấu Hình Động Qua Biến Môi Trường (Dynamic .env)**:
   - Thông tin nhận thanh toán được cấu hình trong `backend/.env`:
     ```env
     PAYMENT_BANK_ID=MB
     PAYMENT_ACCOUNT_NO=0334888999
     PAYMENT_ACCOUNT_NAME=IQ KID MARKET
     ```
3. **Khóa Hàng Ví (`with_for_update`) & Ghi Log Giao Dịch**:
   - Khi hoàn tất đơn nạp tiền, tự động cộng xu vào ví và ghi nhận `wallet_transactions` một cách an toàn, chống cộng tiền 2 lần (Idempotent).

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Bảng `payment_orders` Trong CSDL**:
   - Cột: `id`, `order_code` (Ví dụ `IQKID_8821`), `user_id`, `amount`, `coin_amount`, `qr_data_base64`, `status` (`PENDING`, `COMPLETED`, `CANCELLED`), `created_at`, `completed_at`.
2. **API Tạo Đơn Nạp Tiền (`POST /api/wallet/create-order`)**:
   - Sinh mã đơn ngẫu nhiên và render ảnh QR Base64 trực tiếp từ server.
3. **API Hoàn Tất Đơn Nạp (`POST /api/wallet/complete-order`)**:
   - Xác nhận đơn nạp hợp lệ ➔ Khóa hàng ví, cộng số dư xu, chuyển trạng thái sang `COMPLETED`.
4. **API Lịch Sử Đơn Nạp (`GET /api/wallet/my-orders`)**:
   - Danh sách các đơn nạp tiền của học sinh.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Cài đặt `qrcode[pil]==8.0` vào `requirements.txt`**.
- [ ] **2. Thêm Model `PaymentOrder` & Migration Alembic `0002_add_payment_orders.py`**.
- [ ] **3. Viết Hàm Sinh QR Local trong `backend/app/services/qr_generator.py`**:
  - [ ] `generate_local_qr_base64(account_no, bank_id, amount, memo) -> str`.
- [ ] **4. Cập nhật Router `backend/app/routers/wallet.py`**:
  - [ ] `POST /api/wallet/create-order`
  - [ ] `POST /api/wallet/complete-order`
  - [ ] `GET /api/wallet/my-orders`
- [ ] **5. Viết Pytest trong `backend/tests/test_wallet_orders.py`**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Gọi API tạo đơn nạp ➔ Trả về ảnh QR Base64 hợp lệ, hiển thị ngay trên UI không cần kết nối mạng ngoài.
- [ ] Xác nhận đơn nạp ➔ Ví tăng đúng số xu, không thể xác nhận 2 lần.
- [ ] Hệ thống hoạt động 100% độc lập, không phụ thuộc bất kỳ API nào từ bên ngoài.
