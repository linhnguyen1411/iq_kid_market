# [BE-16] Giám Sát Lỗi Sentry, Logging Cấu Trúc & Docker Production Architecture (DevOps & Reliability)

> **Mô tả nghiệp vụ**: Chuẩn hóa toàn bộ hạ tầng vận hành Production của dự án IQ Kid Market. Bao gồm: Hệ thống ghi log có cấu trúc (Structured Logging với Loguru), bắt lỗi và cảnh báo thời gian thực với **Sentry SDK**, tối ưu hóa **Dockerfile Multi-Stage** cho cả Frontend và Backend, cấu hình Nginx Reverse Proxy kèm chứng chỉ SSL/TLS, và thiết lập Health Check / Prometheus Metrics.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `BE-16`
- **Mảng phụ trách**: Backend & DevOps (Loguru + Sentry + Docker + Nginx + Prometheus)
- **Độ ưu tiên**: 🟡 P2 (Ổn định hệ thống & Chuẩn hóa triển khai Production)
- **Người thực hiện**: DevOps / Tech Lead
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/be-16-devops-logging`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Structured JSON Logging (Loguru / structlog)**:
   - Toàn bộ log của backend (Request URL, Client IP, User ID, Processing Time, Exception Traceback) được định dạng theo chuỗi JSON chuẩn có trường rõ ràng, dễ dàng đẩy lên Grafana Loki hoặc CloudWatch.
2. **Sentry Error Tracking**:
   - Tự động bắt mọi ngoại lệ Unhandled Exceptions (HTTP 500), ghi nhận ngữ cảnh (Request body, headers, database query lỗi) và gửi thông báo tức thì tới Telegram / Slack của đội ngũ kỹ thuật.
3. **Multi-Stage Docker Build**:
   - Frontend: Stage 1 build Node 20 ➔ Stage 2 chỉ giữ artifact HTML/CSS/JS chạy trên Nginx Alpine siêu nhẹ (< 25MB).
   - Backend: Stage 1 cài dependencies ➔ Stage 2 chạy Python 3.10-slim không chứa công cụ build thừa (< 150MB).
4. **Nginx Reverse Proxy & Gzip / Brotli Compression**:
   - Nén tài nguyên tĩnh và bảo vệ FastAPI server đằng sau proxy.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Module Logging `backend/app/logger.py`**:
   - Cấu hình Loguru ghi log ra Console và file xoay vòng (Log Rotation: `logs/app_{time:YYYY-MM-DD}.log`, max 50MB).
2. **Tích Hợp Sentry SDK**:
   - Đọc `SENTRY_DSN` từ biến môi trường.
   - Bắt các lỗi exception và trace request timeline.
3. **Endpoint Metrics & Health Check Mở Rộng**:
   - `GET /api/health`: Kiểm tra tình trạng kết nối PostgreSQL, Redis và Disk Space.
   - `GET /metrics`: Đo lường số lượng request/giây và thời gian phản hồi cho Prometheus.
4. **Docker Production Compose (`docker-compose.prod.yml`)**:
   - Bao gồm các container: `frontend` (Nginx), `backend` (FastAPI Gunicorn 4 workers), `postgres` (PostgreSQL 16), `redis` (Redis 7), `certbot` (Let's Encrypt SSL).

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Thêm `loguru==0.7.3` và `sentry-sdk[fastapi]==2.19.2` vào `requirements.txt`**.
- [ ] **2. Viết Middleware ghi nhận Request Timeline & Log trong `backend/app/middleware.py`**.
- [ ] **3. Cập nhật `backend/Dockerfile` và `Dockerfile` frontend chuẩn Multi-Stage**.
- [ ] **4. Tạo file cấu hình `nginx/default.conf`**.
- [ ] **5. Tạo file `docker-compose.prod.yml` hoàn chỉnh**.
- [ ] **6. Viết tài liệu hướng dẫn triển khai 1-chạm `docs/DEPLOY_PRODUCTION_GUIDE.md`**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Chạy `docker compose -f docker-compose.prod.yml up -d` ➔ Toàn bộ services khởi động thành công và truy cập được web qua cổng 80/443.
- [ ] Gọi API bị lỗi ➔ Sentry ghi nhận issue kèm stack trace đầy đủ.
- [ ] Log hệ thống được xuất ra file JSON có cấu trúc rõ ràng.
