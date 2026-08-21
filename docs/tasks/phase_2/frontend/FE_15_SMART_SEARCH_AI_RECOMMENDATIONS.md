# [FE-15] Tìm Kiếm Thông Minh, Tự Động Điền Từ Khóa & Gợi Ý Game Cá Nhân Hóa (Smart Search & Recommendations)

> **Mô tả nghiệp vụ**: Nâng cấp công cụ tìm kiếm và khám phá game trên **Marketplace**: Xây dựng thanh tìm kiếm thông minh có gợi ý từ khóa tức thì (Search Autocomplete Popover & Recent Searches), danh mục **"Dành Riêng Cho Bé 🌟" (AI-driven Personalized Recommendations)** dựa trên khối lớp và sở thích chơi trước đó, và bộ lọc nhanh theo độ khó (Dễ 🌱, Vừa Sức ⚡, Thử Thách Cực Hạn 🏆).

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-15`
- **Mảng phụ trách**: Frontend (React 19 + TypeScript + Client-side Recommendation Engine + Search UI)
- **Độ ưu tiên**: 🟡 P2 (Tối ưu trải nghiệm khám phá nội dung)
- **Người thực hiện**: Frontend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/fe-15-smart-search-recs`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Search Autocomplete & History Dropdown**:
   - Khi bé nhấp chuột vào ô tìm kiếm:
     - Hiển thị danh sách các từ khóa tìm kiếm gần đây (Lưu trong `localStorage`).
     - Hiển thị các từ khóa "hot" được tìm nhiều nhất: *"Bảng cửu chương"*, *"Lập trình chú mèo"*, *"Giải đố hình học"*, *"Từ đồng nghĩa"*.
2. **Rule-based Recommendation Engine**:
   - Gợi ý game dựa trên 3 tiêu chí:
     - 1. Đúng khối lớp của bé (`user.grade`).
     - 2. Thể loại game bé đã chơi nhiều nhất trong lịch sử `attempts`.
     - 3. Các game có `rating_avg >= 4.8` và `plays_count` cao.
3. **Difficulty Badge Filter**:
   - Thêm bộ lọc độ khó 3 mức:
     - 🌱 Dễ (Màn 1-2, hướng dẫn chi tiết)
     - ⚡ Vừa Sức (Màn 3-4, nâng cao tư duy)
     - 🏆 Thử Thách (Màn 5+, câu hỏi phân hóa cao)

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Component `src/components/SearchAutocomplete.tsx`**:
   - Nhúng vào thanh tìm kiếm của `MarketplacePage.tsx` và `LandingPage.tsx`.
   - Bấm vào từ khóa gợi ý ➔ Tự động áp dụng tìm kiếm tức thì.
2. **Carousel "Dành Riêng Cho Bạn" (For You Carousel)**:
   - Đặt ở đầu trang Marketplace và LandingPage.
   - Thẻ game có nhãn nổi bật: *"Gợi ý theo lớp của bé"* hoặc *"Thể loại bé yêu thích"*.
3. **Bộ Lọc Mức Độ Khó Trong Sidebar Marketplace**:
   - Thêm nút chọn: Tất cả | Dễ 🌱 | Vừa Sức ⚡ | Thử Thách 🏆.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Tạo Component `src/components/SearchAutocomplete.tsx`**.
- [ ] **2. Viết hàm gợi ý game cá nhân hóa trong `src/services/recommendationService.ts`**.
- [ ] **3. Nâng cấp `MarketplacePage.tsx` & `LandingPage.tsx` tích hợp Search Autocomplete và Carousel "Dành Riêng Cho Bé"**.
- [ ] **4. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Gõ chữ `"toán"` ➔ Hiển thị dropdown gợi ý *"Toán cộng trừ"*, *"Toán nhân chia"*.
- [ ] Học sinh Lớp 3 đăng nhập ➔ Mục "Dành Riêng Cho Bạn" ưu tiên hiển thị các game lớp 3 có đánh giá cao.
- [ ] Lọc theo mức "Dễ" ➔ Danh sách lọc chính xác các màn khởi động.
