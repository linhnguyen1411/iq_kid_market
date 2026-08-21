# [FE-12] Giao Diện Cổng Phụ Huynh, Biểu Đồ Radar Năng Lực & Đặt Giới Hạn Giờ Chơi (Parent Portal UI)

> **Mô tả nghiệp vụ**: Xây dựng phân hệ giao diện chuyên biệt **Cổng Giám Sát Dành Cho Phụ Huynh (Parent Portal Dashboard)**. Cho phép phụ huynh nhập mã PIN bảo mật cá nhân để mở trang quản trị, theo dõi biểu đồ hình mạng nhện (Radar Chart) phân tích 5 năng lực tư duy não bộ của con, quản lý thời gian sử dụng màn hình (Screen Time Limit Slider), xem chi tiết lịch sử học tập, và nhận báo cáo đánh giá tiến bộ hàng tuần.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-12`
- **Mảng phụ trách**: Frontend (React 19 + Recharts + Tailwind CSS v4 + Parent Security UI)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Tạo sự tin tưởng từ gia đình)
- **Người thực hiện**: Frontend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/fe-12-parent-portal`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Parent Gate / PIN Verification Screen**:
   - Trước khi truy cập vào Cổng Phụ Huynh, hiển thị màn hình nhập mã PIN 4 số phong cách bảo mật cao để các bạn nhỏ không tự ý vào thay đổi cài đặt giới hạn giờ chơi.
2. **5-Axis Cognitive Radar Chart (Biểu Đồ Radar 5 Năng Lực Tư Duy)**:
   - Sử dụng `ResponsiveContainer` và `RadarChart` trong Recharts:
     - 1. **Toán Học & Tính Toán** (Math, Sequence)
     - 2. **Tư Duy Logic & Không Gian** (LogicGrid, Memory)
     - 3. **Ngôn Ngữ & Tiếng Việt** (Language, Flashcard)
     - 4. **Quan Sát & Phản Xạ Nhanh** (Observation, Matching)
     - 5. **Tư Duy Thuật Toán & Công Nghệ** (Scratch, Coding)
3. **Screen Time Range Slider**:
   - Thanh trượt trực quan: 30 phút | 45 phút | 60 phút | 90 phút | 120 phút | Không giới hạn.
   - Nút gạt "Khóa Tạm Thời 🔒" (Tạm dừng quyền chơi của con ngay lập tức khi cần bé đi ngủ hoặc ăn cơm).

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Trang `src/pages/ParentPage.tsx`**:
   - Màn hình nhập PIN xác thực.
   - Danh sách các con được liên kết (Chọn Bé 1, Bé 2).
   - Thẻ thống kê: Tổng thời gian học trong tuần, Số màn chơi hoàn thành, Chuỗi ngày Streak.
2. **Biểu Đồ Phân Tích Radar & Lời Khuyên Sư Phạm**:
   - Biểu đồ mạng nhện 5 góc hiển thị điểm mạnh (Ví dụ: "Bé có tư duy Quan sát xuất sắc 95/100") và khía cạnh cần rèn luyện thêm (Ví dụ: "Nên cho bé chơi thêm 2 game Toán học mỗi tuần").
3. **Bảng Điều Khiển Cài Đặt Giới Hạn (Parental Controls)**:
   - Cài đặt thời gian chơi tối đa trong ngày.
   - Cài đặt khung giờ cấm chơi (Ví dụ: 21:30 - 06:00 sáng).
   - Đổi mã PIN phụ huynh.
4. **Popup Hết Giờ Chơi Cho Học Sinh (`TimeLimitModal.tsx`)**:
   - Khi hết giờ, hiển thị hoạt ảnh chú Mèo Scratch mỉm cười chào tạm biệt: *"Bé đã học chăm chỉ 60 phút hôm nay rồi! Hãy đứng dậy vận động và bảo vệ đôi mắt nhé! 👀✨"*.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Tạo Component `src/components/ParentPinModal.tsx`**.
- [ ] **2. Tạo Trang `src/pages/ParentPage.tsx`**:
  - [ ] Gọi API `GET /api/parent/children` và `GET /api/parent/child/{id}/analytics`.
  - [ ] Tích hợp biểu đồ Recharts RadarChart 5 trục.
- [ ] **3. Xây dựng Form Cài Đặt Thời Gian & Khóa Tài Khoản**:
  - [ ] Gọi API `PUT /api/parent/child/{id}/settings`.
- [ ] **4. Tạo Component `src/components/TimeLimitModal.tsx`**.
- [ ] **5. Thêm Tab "Phụ Huynh" vào `NavigationTabs.tsx` & `App.tsx`**.
- [ ] **6. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Bấm Tab Phụ Huynh yêu cầu nhập đúng mã PIN mới vào được giao diện.
- [ ] Biểu đồ RadarChart render mượt mà, hiển thị đúng 5 trục năng lực.
- [ ] Phụ huynh bật Khóa Tạm Thời ➔ Tab học sinh bị khóa ngay lập tức kèm màn hình thông báo nghỉ ngơi.
