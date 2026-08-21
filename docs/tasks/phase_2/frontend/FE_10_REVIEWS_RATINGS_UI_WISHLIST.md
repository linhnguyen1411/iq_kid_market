# [FE-10] Màn Hình Đánh Giá 5 Sao, Viết Nhận Xét & Danh Sách Yêu Thích (Reviews & Wishlist UI)

> **Mô tả nghiệp vụ**: Xây dựng giao diện Đánh giá xếp hạng trò chơi (Star Rating UI 1-5 sao có hiệu ứng hoạt hình tương tác), Modal gửi nhận xét kèm cảm xúc (Review & Emoji Feedback Modal) xuất hiện sau khi hoàn thành game, Tab hiển thị nhận xét của cộng đồng trong `GameDetailModal`, và tính năng Thêm vào danh sách yêu thích (Wishlist Heart Button) trên các thẻ GameCard.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-10`
- **Mảng phụ trách**: Frontend (React 19 + Framer Motion + Tailwind CSS v4)
- **Độ ưu tiên**: 🔴 P0 (Quan trọng / Tăng tương tác & Tính cộng đồng)
- **Người thực hiện**: Frontend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/fe-10-reviews-wishlist`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Interactive Star Rating Component**:
   - 5 Ngôi sao vàng lớn: Khi di chuột hoặc chạm ngón tay ➔ Các ngôi sao đổi màu vàng phát sáng kèm hiệu ứng nảy hạt (`hover:scale-125`).
   - Gắn nhãn cảm xúc theo số sao:
     - 1⭐: Cần cải thiện 😢
     - 2⭐: Tạm được 😐
     - 3⭐: Khá hay 🙂
     - 4⭐: Rất thích 😊
     - 5⭐: Siêu phẩm tuyệt vời! 🌟🔥
2. **Wishlist State Synchronization**:
   - Trạng thái yêu thích được lưu tức thì vào backend và cập nhật Icon Trái Tim ❤️ trên `GameCard.tsx` và `GameDetailModal.tsx`.
3. **Review Card Layout**:
   - Hiển thị Avatar linh vật của bạn nhỏ, Tên học sinh, Khối lớp, Số sao đánh giá, Thời gian nhận xét, và nội dung bình luận dễ thương.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Component `src/components/RatingModal.tsx`**:
   - Modal bật lên sau khi bé vượt qua màn chơi cuối cùng của game, khuyến khích bé chấm điểm và viết vài lời cảm ơn tác giả.
2. **Nâng Cấp `src/components/GameDetailModal.tsx`**:
   - Thêm Tab **"Đánh Giá & Nhận Xét"** bên cạnh Tab "Danh Sách Màn Chơi".
   - Hiển thị biểu đồ phân bổ sao (5 sao, 4 sao, 3 sao...) và danh sách nhận xét có phân trang.
3. **Nút Yêu Thích Trên `src/components/GameCard.tsx`**:
   - Icon Trái Tim ở góc trên bên phải thẻ game.
   - Bấm vào phát hiệu ứng nảy tim (`animate-ping`) và âm thanh `click`.
4. **Tab "Game Yêu Thích" Trong Trang `ProfilePage.tsx`**:
   - Hiển thị danh sách các trò chơi mà bé đã thả tim để mở lại chơi nhanh bất cứ lúc nào.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Tạo Component `src/components/StarRatingInput.tsx`**:
  - [ ] Hỗ trợ chọn từ 1 đến 5 sao với animation mượt mà.
- [ ] **2. Tạo Component `src/components/RatingModal.tsx`**:
  - [ ] Gọi API `POST /api/games/{id}/reviews`.
- [ ] **3. Nâng cấp `src/components/GameDetailModal.tsx`**:
  - [ ] Tab hiển thị review list gọi API `GET /api/games/{id}/reviews`.
- [ ] **4. Nâng cấp `src/components/GameCard.tsx`**:
  - [ ] Nút Bookmark / Trái tim yêu thích.
- [ ] **5. Thêm danh mục Game Yêu Thích vào `ProfilePage.tsx`**.
- [ ] **6. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Bấm chọn 5 sao ➔ Nhãn "Siêu phẩm tuyệt vời!" hiển thị, gửi review thành công.
- [ ] Mở GameDetailModal ➔ Thấy ngay nhận xét vừa gửi nằm ở đầu danh sách.
- [ ] Bấm Trái Tim trên GameCard ➔ Thêm vào danh sách yêu thích trong Profile.
