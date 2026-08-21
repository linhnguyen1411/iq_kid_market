# 🌟 IQ KID MARKET — MASTER TASK CHECKLIST & QUY TRÌNH TRIỂN KHAI PHASE 2

> **Giai đoạn**: Phase 2 — Giao Diện Lung Linh, Tinh Gọn 100% Nội Bộ (Không Third-Party), Cổng Phụ Huynh, Đánh Giá Sao & Gamification Nâng Cao.  
> **Định hướng chiến lược**: 
> 1. **ƯU TIÊN SỐ 1**: Tập trung làm giao diện cực kỳ đẹp mắt, màu sắc lung linh, âm thanh vui tươi chuẩn EdTech thiếu nhi và sửa triệt để các lỗi state / hiển thị.
> 2. **100% NỘI BỘ (KHÔNG DÙNG THIRD-PARTY)**: Loại bỏ hoàn toàn các dịch vụ bên ngoài như Webhook, Redis, Sentry, Image API bên thứ 3. Ứng dụng tự vận hành độc lập, an toàn và dễ bảo trì.

---

## 📌 1. BẢNG PHÂN CẤP ƯU TIÊN & TIẾN ĐỘ PHASE 2 (MASTER CHECKLIST)

### 🔴 NHÓM P0: ƯU TIÊN CAO NHẤT (LÀM GIAO DIỆN ĐẸP, ÂM THANH NỘI BỘ & FIX BUG)

| Mã Task | Mảng | Tên Tính Năng & Trọng Tâm Phát Triển | Phụ Trách | Link Chi Tiết |
| :--- | :---: | :--- | :---: | :--- |
| **FE-09** | Frontend | Nâng Cấp Giao Diện Lung Linh, Bộ Âm Thanh HQ Nội Bộ & Sửa Lỗi State | Frontend Lead | [Xem FE_09](./frontend/FE_09_HQ_SOUND_SYSTEM_BGM_PLAYER.md) |
| **FE-10** | Frontend | Màn Hình Đánh Giá 5 Sao, Viết Nhận Xét Khách Quan & Yêu Thích (Wishlist) | Frontend Dev | [Xem FE_10](./frontend/FE_10_REVIEWS_RATINGS_UI_WISHLIST.md) |
| **FE-12** | Frontend | Giao Diện Cổng Phụ Huynh, Biểu Đồ Radar 5 Năng Lực & Đặt Giới Hạn Giờ Chơi | Frontend Dev | [Xem FE_12](./frontend/FE_12_PARENT_PORTAL_CHILD_ANALYTICS_UI.md) |
| **FE-13** | Frontend | Hoàn Thiện Dynamic Form Cho Toàn Bộ 12 Game Engines Trong Creator Studio | Frontend Dev | [Xem FE_13](./frontend/FE_13_STUDIO_CMS_FULL_12_ENGINES_EDITOR.md) |
| **BE-10** | Backend | Hệ Thống Đánh Giá, Xếp Hạng Sao & Kiểm Duyệt Bình Luận (Local DB) | Backend Dev | [Xem BE_10](./backend/BE_10_REVIEWS_RATINGS_FEEDBACK_SYSTEM.md) |
| **BE-12** | Backend | Cổng Phụ Huynh, Quản Lý Giờ Chơi & Mã PIN Bcrypt An Toàn | Backend Dev | [Xem BE_12](./backend/BE_12_PARENT_PORTAL_SCREEN_TIME_CONTROLS.md) |

---

### 🟠 NHÓM P1: TÍNH NĂNG TƯƠNG TÁC, NHIỆM VỤ & KHÁM PHÁ (LOCAL 100%)

| Mã Task | Mảng | Tên Tính Năng & Trọng Tâm Phát Triển | Phụ Trách | Link Chi Tiết |
| :--- | :---: | :--- | :---: | :--- |
| **FE-11** | Frontend | Trung Tâm Nhiệm Vụ Ngày, Nhận Quà Điểm Danh & Vòng Quay May Mắn 3D | Frontend Dev | [Xem FE_11](./frontend/FE_11_DAILY_QUESTS_LUCKY_WHEEL_UI.md) |
| **FE-15** | Frontend | Tìm Kiếm Thông Minh, Tự Động Điền Từ Khóa & Gợi Ý Game Cá Nhân Hóa | Frontend Dev | [Xem FE_15](./frontend/FE_15_SMART_SEARCH_AI_RECOMMENDATIONS.md) |
| **BE-11** | Backend | Động Cơ Nhiệm Vụ Hàng Ngày, Điểm Danh 7 Ngày & Vòng Quay May Mắn | Backend Dev | [Xem BE_11](./backend/BE_11_DAILY_QUESTS_LOGIN_REWARDS.md) |
| **BE-09** | Backend | Quản Lý Đơn Nạp Tiền & Sinh Mã QR Local (Không Dùng Third-Party API) | Backend Dev | [Xem BE_09](./backend/BE_09_VIETQR_PAYMENT_ORDER_MANAGEMENT.md) |
| **BE-13** | Backend | Question Bank Caching & Bộ Kiểm Chuẩn Chất Lượng Câu Hỏi Tự Động | Backend Dev | [Xem BE_13](./backend/BE_13_AI_PIPELINE_CACHING_CURRICULUM_VALIDATION.md) |

---

### 🟡 NHÓM P2: ĐẤU TRƯỜNG THỜI GIAN THỰC & TỐI ƯU HẠ TẦNG NỘI BỘ

| Mã Task | Mảng | Tên Tính Năng & Trọng Tâm Phát Triển | Phụ Trách | Link Chi Tiết |
| :--- | :---: | :--- | :---: | :--- |
| **FE-14** | Frontend | Màn Hình Đấu Trường Trí Tuệ 1v1 Đối Kháng Thời Gian Thực (PvP Battle UI) | Frontend Dev | [Xem FE_14](./frontend/FE_14_REALTIME_PVP_ARENA_BATTLE_UI.md) |
| **FE-16** | Frontend | Tối Ưu Tốc Độ Tải Trang (Code-Splitting), Accessibility & Đa Ngôn Ngữ i18n | Frontend Dev | [Xem FE_16](./frontend/FE_16_I18N_PERFORMANCE_ACCESSIBILITY.md) |
| **BE-14** | Backend | Máy Chủ WebSocket Đấu Trường 1v1 Ghép Cặp & Phòng Thi Đấu Nội Bộ | Backend Dev | [Xem BE_14](./backend/BE_14_REALTIME_MULTIPLAYER_PVP_ROOMS.md) |
| **BE-15** | Backend | Bộ Nhớ Đệm Nhẹ In-Memory & Giới Hạn Tần Suất Truy Cập (Không Dùng Redis) | Backend Dev | [Xem BE_15](./backend/BE_15_LIGHTWEIGHT_CACHING_RATE_LIMITING.md) |
| **BE-16** | Backend | Hệ Thống Ghi Log Cấu Trúc Nội Bộ & Docker Local (Không Dùng Sentry) | DevOps / Lead | [Xem BE_16](./backend/BE_16_STRUCTURED_LOGGING_MONITORING_DEVOPS.md) |

---

## 🚫 2. NGUYÊN TẮC PHÁT TRIỂN & QUY ƯỚC GIT

> [!CAUTION]
> **TUYỆT ĐỐI KHÔNG COMMIT HOẶC PUSH TRỰC TIẾP VÀO BRANCH `main`!**
> Mọi tính năng phát triển đều bắt buộc tạo branch riêng theo định dạng chuẩn và mở Pull Request (PR) kèm kết quả kiểm thử.

### 2.1. Quy ước đặt tên Branch Phase 2 (Branch Naming)
Khi nhận task, thành viên checkout từ branch `main` mới nhất:
- **Frontend Task**: `feature/fe-<mã-task>-<tên-ngắn-gọn>`
  - *Ví dụ*: `git checkout -b feature/fe-09-ui-polish-sound`
  - *Ví dụ*: `git checkout -b feature/fe-10-reviews-wishlist`
  - *Ví dụ*: `git checkout -b feature/fe-12-parent-portal`
- **Backend Task**: `feature/be-<mã-task>-<tên-ngắn-gọn>`
  - *Ví dụ*: `git checkout -b feature/be-10-reviews-ratings`
  - *Ví dụ*: `git checkout -b feature/be-12-parent-portal`
- **Bugfix**: `fix/be-<mã-task>-<mô-tả>` hoặc `fix/fe-<mã-task>-<mô-tả>`

---

## 🧪 3. CHECKLIST NGHIỆM THU BẮT BUỘC TRƯỚC KHI TẠO PR

- [ ] **1. Kiểm tra biên dịch & Không phát sinh lỗi**:
  - Frontend: `npx tsc --noEmit` & `npm run build` đạt 0 lỗi type.
  - Backend: `pytest -v` phải pass 100% toàn bộ test suite.
- [ ] **2. Thẩm mỹ & Trải nghiệm (UI/UX)**:
  - Màu sắc tươi sáng, nút bấm nảy hạt 3D, âm thanh tương tác rõ ràng, không giật lag.
- [ ] **3. Tính độc lập (Zero Third-Party)**:
  - Không sử dụng thêm bất kỳ thư viện hoặc dịch vụ cloud trả phí nào từ bên ngoài.
