# [BE-16] Hệ Thống Ghi Log Cấu Trúc Nội Bộ & Docker Local Production (Local Logging & DevOps)

> **Mô tả nghiệp vụ**: Chuẩn hóa toàn bộ hạ tầng vận hành và ghi log của ứng dụng IQ Kid Market **100% Nội Bộ (Không Dùng Dịch Vụ SaaS Third-Party Ngoài Như Sentry)**. Bao gồm: Hệ thống ghi log có cấu trúc (Structured JSON Logging với Loguru có xoay vòng file tự động), API xem log hệ thống dành riêng cho Admin, tối ưu hóa Dockerfile Multi-Stage siêu nhẹ, và cấu hình Nginx Reverse Proxy an toàn.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-16`
- **Mảng phụ trách**: Backend & DevOps (Loguru + Docker + Nginx)
- **Độ ưu tiên**: 🟡 P2 (Ổn định hạ tầng & Dễ bảo trì nội bộ)
- **Người thực hiện**: DevOps / Tech Lead
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-16-devops-logging`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Local Structured JSON Logging (Loguru - 100% Nội Bộ)**:
   - Toàn bộ log lỗi, log request, thời gian xử lý API được ghi ra thư mục `backend/logs/` dưới dạng file xoay vòng theo ngày (`app_YYYY-MM-DD.log`, nén zip sau 7 ngày, tối đa 50MB/file).
   - Không gửi dữ liệu ra bất kỳ server ngoài nào, đảm bảo an toàn thông tin và quyền riêng tư của học sinh.
2. **In-App Error Tracing & Admin Log Viewer**:
   - Tự động bắt unhandled exceptions (HTTP 500), ghi nhận traceback chi tiết vào file log lỗi riêng `logs/errors.log`.
   - Cung cấp API `GET /api/admin/system/logs` để Admin có thể xem 100 dòng log mới nhất trực tiếp trên giao diện Admin Studio.
3. **Multi-Stage Docker Build**:
   - Tinh gọn chỉ giữ các container thiết yếu: Frontend (Nginx Alpine), Backend (FastAPI Python-slim), Database (PostgreSQL).

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Module Logging `backend/app/logger.py`**:
   - Cấu hình Loguru ghi log ra Console và file xoay vòng `logs/app_{time:YYYY-MM-DD}.log`.
   - Bắt và format các exception tự động.
2. **API Tra Cứu Log Dành Cho Admin (`GET /api/admin/system/logs`)**:
   - Chỉ cho phép tài khoản `role == 'admin'` truy cập.
   - Trả về danh sách các log lỗi gần nhất để dễ dàng gỡ lỗi ngay trên web.
3. **Endpoint Health Check (`GET /api/health`)**:
   - Kiểm tra kết nối CSDL và dung lượng ổ đĩa.
4. **Docker Production Compose Tinh Gọn (`docker-compose.prod.yml`)**:
   - Frontend + Backend + PostgreSQL.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Thêm `loguru==0.7.3` vào `requirements.txt`**.
- [ ] **2. Viết Middleware ghi nhận Log Request trong `backend/app/middleware.py`**.
- [ ] **3. Thêm Endpoint `GET /api/admin/system/logs` vào `backend/app/routers/admin.py`**.
- [ ] **4. Cập nhật `backend/Dockerfile` và `Dockerfile` frontend chuẩn Multi-Stage**.
- [ ] **5. Viết tài liệu hướng dẫn chạy Docker `docs/DEPLOY_LOCAL_DOCKER.md`**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Khi có lỗi 500 xảy ra ➔ Chi tiết lỗi được lưu vào `backend/logs/errors.log`.
- [ ] Admin đăng nhập vào xem được log hệ thống trực quan trên web.
- [ ] Không có bất kỳ kết nối hay phụ thuộc nào vào dịch vụ SaaS ngoài.
