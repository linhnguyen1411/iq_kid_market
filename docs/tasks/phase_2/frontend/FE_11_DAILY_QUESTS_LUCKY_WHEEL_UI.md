# [FE-11] Trung Tâm Nhiệm Vụ Ngày, Nhận Quà Điểm Danh & Vòng Quay May Mắn 3D (Quests & Wheel UI)

> **Mô tả nghiệp vụ**: Xây dựng **Trung Tâm Nhiệm Vụ Hàng Ngày (Daily Quests Hub)** với thanh tiến độ hoàn thành trực quan, popup nhận quà chúc mừng lấp lánh, bảng điểm danh 7 ngày liên tiếp nhận huy hiệu Streak, và **Vòng Quay May Mắn 3D (Interactive Lucky Spin Wheel)** có âm thanh quay hồi hộp và hiệu ứng nổ pháo hoa hạt nhận Xu thưởng.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-11`
- **Mảng phụ trách**: Frontend (React 19 + Canvas / CSS Animation + Web Audio + Framer Motion)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Tăng tỷ lệ quay lại hàng ngày DAU)
- **Người thực hiện**: Frontend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/fe-11-quests-lucky-wheel`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **CSS / Canvas Lucky Spin Wheel**:
   - Vòng quay 8 ô màu sắc tương phản rực rỡ, kim chỉ cố định ở góc 12 giờ.
   - Khi bấm quay ➔ Vòng quay xoay nhanh dần rồi giảm tốc từ từ (`transition: transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)`), góc dừng cuối cùng được tính toán chính xác khớp với phần thưởng trả về từ Server.
   - Âm thanh "tích tắc tích tắc" theo từng khấc vòng quay.
2. **Quest Progress Card Components**:
   - Thẻ nhiệm vụ gồm: Icon thử thách, Tiêu đề, Thanh đo tiến độ (`2/3 màn`), Phần thưởng (`+50 XP, +20 xu`), và Nút hành động:
     - "Làm ngay ➔" (Nếu chưa xong)
     - "Nhận Thưởng 🎁" (Hiệu ứng nhấp nháy phát sáng nếu đã xong)
     - "Đã Nhận ✅" (Màu xám nếu đã nhận quà)

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Component `src/components/DailyQuestsModal.tsx`**:
   - Nút mở nhanh trên Header (Icon Hộp Quà Nhấp Nháy 🎁 kèm chấm đỏ thông báo nếu có quà chưa nhận).
   - Danh sách 3 nhiệm vụ ngày kèm thanh tiến độ % hoàn thành.
   - Bảng điểm danh 7 ngày: Ngày 1 (+10 xu) ➔ Ngày 7 (+100 xu + Huy hiệu Chuyên Cần 🏆).
2. **Component `src/components/LuckyWheelModal.tsx`**:
   - Vòng quay 3D 8 ô: 10 xu, 20 xu, 50 xu, 100 xu, Vé nhân đôi XP, Hộp bí mật...
   - Nút "QUAY NGAY 🎯" to rõ ràng.
   - Popup chúc mừng nhận quà kèm hiệu ứng pháo hoa Confetti rực rỡ.
3. **Tích Hợp Tự Động Mở Quà Sau Màn Chơi**:
   - Nếu màn chơi vừa hoàn thành giúp giải quyết xong 1 nhiệm vụ ngày ➔ Hiển thị Toast thông báo: *"🎉 Chúc mừng! Bạn vừa hoàn thành nhiệm vụ: Vượt qua 2 màn chơi!"*.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Xây dựng Component `src/components/DailyQuestsModal.tsx`**:
  - [ ] Gọi API `GET /api/quests/daily` và `POST /api/quests/{id}/claim`.
- [ ] **2. Xây dựng Component `src/components/LuckyWheelModal.tsx`**:
  - [ ] Thuật toán tính góc quay chính xác theo Server Result.
  - [ ] Âm thanh quay vòng và âm thanh nhận thưởng.
- [ ] **3. Gắn Icon Hộp Quà 🎁 vào `src/layouts/Header.tsx`**.
- [ ] **4. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Mở Daily Quests Modal thấy đúng 3 nhiệm vụ và tiến độ hiện tại.
- [ ] Bấm nhận thưởng ➔ Số dư ví và XP trên Header tăng lên ngay lập tức.
- [ ] Bấm Quay Vòng May Mắn ➔ Vòng quay mượt mà, kim chỉ đúng ô phần thưởng và popup nhận quà xuất hiện.
