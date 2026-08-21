# 🌟 IQ KID MARKET — MASTER TASK CHECKLIST & QUY TRÌNH TRIỂN KHAI PHASE 2

> **Giai đoạn**: Phase 2 — Production-Ready, Real Payment, Parent Portal, Real-time PvP, AI Caching & Advanced Gamification.  
> **Mục tiêu**: Hoàn thiện toàn bộ các điểm còn thiếu sót / hardcode / mock data của Phase 1, nâng cấp hệ thống lên chất lượng Production thương mại hóa thực tế, tích hợp cổng thanh toán thật, cổng giám sát phụ huynh, đấu trường đối kháng thời gian thực, và tối ưu hóa hạ tầng chịu tải.

---

## 📌 1. BẢNG TỔNG HỢP TIẾN ĐỘ PHASE 2 (MASTER CHECKLIST)

### ⚙️ A. BACKEND TASKS (FastAPI + SQLAlchemy + PostgreSQL + Redis + WebSocket + Webhooks)

| Mã Task | Tên Nhiệm Vụ & Nghiệp Vụ | Độ Ưu Tiên | Phụ Trách | Trạng Thái | Link Chi Tiết |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **BE-09** | Tích Hợp Cổng Thanh Toán Tự Động Thật & Webhook Verification (PayOS/VietQR API) | 🔴 P0 | Backend Team | ⚪ Ready | [Xem BE_09](./backend/BE_09_REAL_PAYMENT_GATEWAY_WEBHOOKS.md) |
| **BE-10** | Hệ Thống Đánh Giá, Xếp Hạng Sao & Kiểm Duyệt Bình Luận (Reviews & Ratings) | 🔴 P0 | Backend Team | ⚪ Ready | [Xem BE_10](./backend/BE_10_REVIEWS_RATINGS_FEEDBACK_SYSTEM.md) |
| **BE-11** | Động Cơ Nhiệm Vụ Hàng Ngày, Điểm Danh & Vòng Quay May Mắn (Daily Quests Engine) | 🟠 P1 | Backend Team | ⚪ Ready | [Xem BE_11](./backend/BE_11_DAILY_QUESTS_LOGIN_REWARDS.md) |
| **BE-12** | Cổng Phụ Huynh, Giới Hạn Giờ Chơi & Báo Cáo Năng Lực (Parent Portal API) | 🟠 P1 | Backend Team | ⚪ Ready | [Xem BE_12](./backend/BE_12_PARENT_PORTAL_SCREEN_TIME_CONTROLS.md) |
| **BE-13** | Nâng Cấp AI Generator: Question Caching & Kiểm Chuẩn Đa Engine Tự Động | 🟠 P1 | Backend Team | ⚪ Ready | [Xem BE_13](./backend/BE_13_AI_PIPELINE_CACHING_CURRICULUM_VALIDATION.md) |
| **BE-14** | Đấu Trường 1v1 Đối Kháng Thời Gian Thực (WebSocket Real-time PvP Rooms) | 🟡 P2 | Backend Team | ⚪ Ready | [Xem BE_14](./backend/BE_14_REALTIME_MULTIPLAYER_PVP_ROOMS.md) |
| **BE-15** | Tích Hợp Caching Redis & Rate Limiting Phân Tán (Redis Cache & Security) | 🟡 P2 | Backend / DevOps | ⚪ Ready | [Xem BE_15](./backend/BE_15_REDIS_CACHING_DISTRIBUTED_RATE_LIMITING.md) |
| **BE-16** | Giám Sát Lỗi Sentry, Logging Cấu Trúc & Docker Production Architecture | 🟡 P2 | DevOps Team | ⚪ Ready | [Xem BE_16](./backend/BE_16_STRUCTURED_LOGGING_MONITORING_DEVOPS.md) |

---

### 🎨 B. FRONTEND TASKS (React 19 + TypeScript + Vite + Tailwind CSS v4 + WebSocket + Audio)

| Mã Task | Tên Tính Năng & Trải Nghiệm Người Dùng | Độ Ưu Tiên | Phụ Trách | Trạng Thái | Link Chi Tiết |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **FE-09** | Tích Hợp Bộ Âm Thanh Bản Quyền Chất Lượng Cao & Trình Phát Nhạc Nền BGM | 🔴 P0 | Frontend Team | ⚪ Ready | [Xem FE_09](./frontend/FE_09_HQ_SOUND_SYSTEM_BGM_PLAYER.md) |
| **FE-10** | Màn Hình Đánh Giá 5 Sao, Viết Nhận Xét & Danh Sách Yêu Thích (Wishlist) | 🔴 P0 | Frontend Team | ⚪ Ready | [Xem FE_10](./frontend/FE_10_REVIEWS_RATINGS_UI_WISHLIST.md) |
| **FE-11** | Trung Tâm Nhiệm Vụ Ngày, Nhận Quà Điểm Danh & Vòng Quay May Mắn 3D | 🟠 P1 | Frontend Team | ⚪ Ready | [Xem FE_11](./frontend/FE_11_DAILY_QUESTS_LUCKY_WHEEL_UI.md) |
| **FE-12** | Giao Diện Cổng Phụ Huynh, Biểu Đồ Radar Năng Lực & Đặt Giới Hạn Giờ Chơi | 🟠 P1 | Frontend Team | ⚪ Ready | [Xem FE_12](./frontend/FE_12_PARENT_PORTAL_CHILD_ANALYTICS_UI.md) |
| **FE-13** | Hoàn Thiện Dynamic Form Cho Toàn Bộ 12 Game Engines Trong Creator Studio | 🟠 P1 | Frontend Team | ⚪ Ready | [Xem FE_13](./frontend/FE_13_STUDIO_CMS_FULL_12_ENGINES_EDITOR.md) |
| **FE-14** | Màn Hình Đấu Trường Trí Tuệ 1v1 Thời Gian Thực (PvP Battle Arena UI) | 🟡 P2 | Frontend Team | ⚪ Ready | [Xem FE_14](./frontend/FE_14_REALTIME_PVP_ARENA_BATTLE_UI.md) |
| **FE-15** | Tìm Kiếm Thông Minh, Tự Động Điền Từ Khóa & Gợi Ý Game Cá Nhân Hóa | 🟡 P2 | Frontend Team | ⚪ Ready | [Xem FE_15](./frontend/FE_15_SMART_SEARCH_AI_RECOMMENDATIONS.md) |
| **FE-16** | Tối Ưu Tốc Độ Tải Trang (Code-Splitting), Accessibility & Đa Ngôn Ngữ i18n | 🟡 P2 | Frontend Team | ⚪ Ready | [Xem FE_16](./frontend/FE_16_I18N_PERFORMANCE_ACCESSIBILITY.md) |

---

## 🚫 2. QUY TẮC BẤT DI BẤT DỊCH VỀ GIT & BRANCHING

> [!CAUTION]
> **TUYỆT ĐỐI KHÔNG COMMIT HOẶC PUSH TRỰC TIẾP VÀO BRANCH `main`!**
> Mọi tính năng phát triển đều bắt buộc tạo branch riêng theo định dạng chuẩn và mở Pull Request (PR) kèm kết quả kiểm thử.

### 2.1. Quy ước đặt tên Branch Phase 2 (Branch Naming)
Khi nhận task, thành viên checkout từ branch `main` mới nhất:
- **Backend Task**: `feature/be-<mã-task>-<tên-ngắn-gọn>`
  - *Ví dụ*: `git checkout -b feature/be-09-payment-webhooks`
  - *Ví dụ*: `git checkout -b feature/be-10-reviews-ratings`
- **Frontend Task**: `feature/fe-<mã-task>-<tên-ngắn-gọn>`
  - *Ví dụ*: `git checkout -b feature/fe-09-hq-sound-bgm`
  - *Ví dụ*: `git checkout -b feature/fe-12-parent-portal`
- **Bugfix**: `fix/be-<mã-task>-<mô-tả>` hoặc `fix/fe-<mã-task>-<mô-tả>`

---

## 🧪 3. CHECKLIST KIỂM THỬ BẮT BUỘC TRƯỚC KHI TẠO PR

- [ ] **1. Kiểm tra biên dịch & Linting**:
  - Frontend: `npx tsc --noEmit` & `npm run build` không được có lỗi type nào.
  - Backend: `pytest -v` phải pass 100% toàn bộ test suite.
- [ ] **2. Kiểm tra tính toàn vẹn (No Regression)**:
  - Tất cả 12 Game Engine vẫn hoạt động trơn tru trên `QuestionRenderer.tsx`.
  - Luồng Mua Game, Nộp điểm, và Đăng nhập Demo vẫn hoạt động ổn định.
- [ ] **3. Bảo mật & Xử lý ngoại lệ**:
  - Không hardcode các secret keys, PIN hoặc mật khẩu trong mã nguồn.
  - Xử lý đầy đủ trường hợp timeout, rớt mạng, lỗi token hết hạn.
