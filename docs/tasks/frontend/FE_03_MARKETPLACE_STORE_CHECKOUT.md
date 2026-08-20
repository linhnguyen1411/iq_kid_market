# [FE-03] Chợ Game Trí Tuệ, Bộ Lọc Đa Chiều & Mua Game 1-Chạm (Marketplace & Checkout)

> **Mô tả nghiệp vụ**: Xây dựng trải nghiệm duyệt Chợ Game Giáo Dục (Marketplace) sinh động và cuốn hút cho trẻ em và phụ huynh. Hỗ trợ tìm kiếm thời gian thực (Real-time Search), bộ lọc đa chiều (Khối lớp 1-9, Thể loại, Mức giá), Modal xem chi tiết thông tin trò chơi, và quy trình xác nhận mua bản quyền game 1-Chạm bằng Ví Xu kèm hiệu ứng ăn mừng rực rỡ.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-03`
- **Mảng phụ trách**: Frontend (React 19 + TypeScript + Framer Motion + Tailwind CSS v4)
- **Độ ưu tiên**: 🔴 P0 (Bắt buộc / Trải nghiệm cốt lõi)
- **Người thực hiện**: _[Điền tên thành viên]_
- **Trạng thái**: 🟡 To Do (Chưa bắt đầu)
- **Branch làm việc**: `feature/fe-03-marketplace-checkout`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Marketplace Card Design (Thiết Kế Thẻ Game Sinh Động)**:
   - Mỗi thẻ game hiển thị: Thumbnail emoji/ảnh 3D lớn, Tiêu đề bắt mắt, Tag Khối lớp (`Lớp 1-3`, `Lớp 4-5`), Tag Thể loại (`Toán Học`, `Logic`, `Tiếng Anh`, `Lập Trình`), Đánh giá sao ⭐, Số lượt chơi, Giá bán (Miễn Phí hoặc Số xu kèm icon 🪙).
   - Nút hành động thông minh:
     - Nếu đã sở hữu hoặc là game miễn phí ➔ Nút **"Chơi Ngay 🚀"** màu xanh lá.
     - Nếu chưa mua ➔ Nút **"Mua 25.000 xu 🪙"** màu vàng rực rỡ.
2. **Debounced Search Input (Tìm Kiếm Chống Giật Lag)**:
   - Khi người dùng gõ từ khóa tìm kiếm, dùng kỹ thuật Debounce (trì hoãn 300ms) trước khi gọi API lọc để tránh spam request liên tục.
3. **One-Click Checkout Flow (Xác Nhận Mua 1-Chạm)**:
   - Mở Popup xác nhận mua: Hiển thị giá game, số dư ví hiện tại, số dư còn lại sau khi mua.
   - Nếu số dư không đủ: Hiển thị nút **"Nạp Thêm Xu Ngay ⚡"** chuyển hướng nhanh sang trang Ví.
   - Khi mua thành công: Bắn pháo hoa hạt (Confetti particles), phát âm thanh thắng lợi và tự động cập nhật danh sách `purchases` trong context.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Xây dựng `src/pages/MarketplacePage.tsx`**:
   - **Thanh Banner Quảng Bá (Hero Banner)**: Trình chiếu các bộ game nổi bật (Featured Games) có animation chuyển động.
   - **Bộ Lọc Đa Chiều (Filter Toolbar)**:
     - Thanh tìm kiếm từ khóa.
     - Thanh chọn Khối lớp: Tất cả, Lớp 1, Lớp 2, Lớp 3, Lớp 4, Lớp 5...
     - Thanh chọn Thể loại: Tất cả, IQ & Logic, Toán Vui, Ngôn Ngữ, Khám Phá, Lập Trình.
     - Lọc theo Giá: Tất cả, Miễn Phí, Có Phí.
   - **Lưới Game (Games Grid)**: Hiển thị danh sách thẻ game dạng Grid 3-4 cột mượt mà với Framer Motion `layout`.
2. **Modal Xem Chi Tiết Game (`src/components/GameDetailModal.tsx`)**:
   - Hiển thị mô tả chi tiết, giá trị giáo dục sư phạm, thông tin tác giả sáng tạo, số lượng màn chơi (VD: "5 Màn chơi hấp dẫn").
   - Xem trước danh sách các màn chơi (Preview Level Roadmap).
3. **Modal Xác Nhận Thanh Toán (`src/components/PurchaseModal.tsx`)**:
   - Gọi API `POST /api/games/purchase`.
   - Cập nhật số dư ví và danh sách game đã mua ngay lập tức trong `AuthContext`.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Hoàn thiện Component `MarketplacePage.tsx`**:
  - [ ] Tích hợp API `api.getGames(filters)` lấy danh sách game động từ Backend.
  - [ ] Viết hook `useDebounce` cho ô tìm kiếm từ khóa.
  - [ ] Animation chuyển động khi đổi tab lọc (Framer Motion `AnimatePresence`).
- [ ] **2. Xây dựng `GameCard.tsx` tái sử dụng**:
  - [ ] Hiệu ứng hover nổi bồng bềnh (`hover:-translate-y-1 hover:shadow-xl`).
  - [ ] Hiển thị nhãn `"ĐÃ SỞ HỮU"` đối với các game học sinh đã mua hoặc game miễn phí.
- [ ] **3. Xây dựng `GameDetailModal.tsx` & `PurchaseModal.tsx`**:
  - [ ] Xử lý logic mua game và thông báo lỗi số dư không đủ.
  - [ ] Hiệu ứng ăn mừng khi mua thành công (`playSynthSound('victory')`).
- [ ] **4. Chạy `npm run lint` & Kiểm thử trên trình duyệt**.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Hook `useDebounce` đơn giản và hiệu quả:

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### Xử lý Mua Game trong Modal Checkout:

```tsx
const handleConfirmPurchase = async () => {
  if (!user) {
    setIsAuthModalOpen(true);
    return;
  }

  if (wallet.balance < selectedGame.price) {
    alert("Số dư xu của bạn không đủ! Hãy nhờ bố mẹ nạp thêm xu nhé!");
    return;
  }

  setIsLoading(true);
  try {
    const res = await api.purchaseGame(user.id, selectedGame.id);
    if (res.success) {
      playSynthSound('victory');
      updateWalletBalance(res.balance);
      addPurchasedGame(selectedGame.id);
      setIsSuccessOpen(true);
    }
  } catch (err: any) {
    alert(err.message || "Giao dịch không thành công!");
  } finally {
    setIsLoading(false);
  }
};
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/fe-03-marketplace-checkout
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "frontend: hoàn thiện giao diện Marketplace, bộ lọc đa chiều và modal mua game"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Bộ Lọc & Tìm Kiếm**:
  - Gõ từ khóa `"toán"` vào ô tìm kiếm ➔ Danh sách lọc tức thì chỉ hiện các game toán học.
  - Chọn nút lọc `"Lớp 2"` ➔ Chỉ hiện các game có `grade_from <= 2` và `grade_to >= 2`.
  - Chọn nút lọc `"Miễn Phí"` ➔ Chỉ hiện các game có giá 0đ.
- [ ] **2. Test Mua Game Có Phí**:
  - Đăng nhập tài khoản có 90.000 xu.
  - Bấm mua 1 game giá 25.000 xu ➔ Modal xác nhận mở ra ➔ Bấm xác nhận ➔ Xu trừ còn 65.000, game chuyển trạng thái sang "Đã sở hữu", nút đổi thành "Chơi ngay 🚀".
- [ ] **3. Test Trường Hợp Hết Tiền**:
  - Mua game với tài khoản 0 xu ➔ Thông báo số dư không đủ kèm nút nạp tiền.
