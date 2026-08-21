# [FE-16] Tối Ưu Tốc Độ Tải Trang (Code-Splitting), Accessibility & Đa Ngôn Ngữ i18n (Performance & i18n)

> **Mô tả nghiệp vụ**: Hoàn thiện các tiêu chuẩn chất lượng cao cấp nhất cho sản phẩm: Tối ưu hóa hiệu năng tải trang với **Dynamic Imports & Code-Splitting** (Giảm kích thước bundle ban đầu từ 1.3MB xuống < 300KB), hỗ trợ **Đa Ngôn Ngữ Song Ngữ Tiếng Việt - Tiếng Anh (i18n)** phục vụ các trường tiểu học quốc tế / song ngữ, và đảm bảo tiêu chuẩn tiếp cận **Web Accessibility (a11y)** cho trẻ em khi sử dụng bàn phím hoặc đọc màn hình.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-16`
- **Mảng phụ trách**: Frontend (React 19 + Vite Code Splitting + i18next + Accessibility a11y)
- **Độ ưu tiên**: 🟡 P2 (Tối ưu trải nghiệm toàn cầu & Tốc độ tải)
- **Người thực hiện**: Frontend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/fe-16-i18n-performance`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **React 19 `React.lazy()` & `Suspense`**:
   - Hiện tại toàn bộ 9 Pages (`AdminPage`, `ScratchPage`, `MarketplacePage`...) và 12 Game Engines đang được import tĩnh trong `App.tsx`, khiến bundle ban đầu nặng 1.31MB (Vite đã cảnh báo chunk size > 500kB).
   - Áp dụng `lazy()` để chỉ tải `AdminPage.tsx` khi người dùng bấm vào Tab Admin, chỉ tải `ScratchSimulator.tsx` khi vào bài học Scratch.
2. **Internationalization (i18n với `i18next`)**:
   - Chuyển đổi linh hoạt giữa 🇻🇳 Tiếng Việt và 🇬🇧 English:
     - Header, Menus, Nút bấm, Thông báo lỗi, và Lời khen thưởng gamification.
     - Nút chuyển ngôn ngữ gọn gàng trên Header.
3. **Accessibility (a11y)**:
   - Hỗ trợ phím `Tab`, `Enter`, `Escape` điều hướng trọn vẹn mọi Game Engine và Modal.
   - Thêm `aria-label` đầy đủ cho các icon buttons.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Tái Cấu Trúc Lazy Loading trong `src/App.tsx`**:
   ```typescript
   const AdminPage = React.lazy(() => import('./pages/AdminPage'));
   const ScratchPage = React.lazy(() => import('./pages/ScratchPage'));
   const PvPArenaPage = React.lazy(() => import('./pages/PvPArenaPage'));
   ```
   - Bổ sung Skeleton Loading / Loading Shimmer thân thiện khi chuyển tab.
2. **Tích Hợp `react-i18next`**:
   - File từ điển: `src/locales/vi.json` và `src/locales/en.json`.
   - Nút chọn cờ 🇻🇳/🇬🇧 trên Header.
3. **Tối Ưu Cấu Hình Rollup Trong `vite.config.ts`**:
   - Tách riêng vendor chunks: `react-vendor`, `recharts-vendor`, `framer-motion-vendor`.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Cài đặt `i18next` và `react-i18next`**:
  - [ ] Khởi tạo `src/i18n.ts` với 2 ngôn ngữ `vi` và `en`.
- [ ] **2. Tái cấu trúc `App.tsx` với `React.lazy` và `<Suspense fallback={<PageSkeleton />}>`**.
- [ ] **3. Tối ưu `vite.config.ts` chia tách manualChunks**.
- [ ] **4. Thêm nút chuyển ngôn ngữ trên `Header.tsx`**.
- [ ] **5. Chạy `npm run build` kiểm tra kích thước bundle giảm rõ rệt và 0 lỗi**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Bundle ban đầu `dist/assets/index-*.js` giảm từ 1.3MB xuống dưới 350KB.
- [ ] Bấm chuyển ngôn ngữ sang Tiếng Anh ➔ Toàn bộ giao diện Header, Menu, Button chuyển sang English tức thì.
- [ ] Tải ứng dụng trên mạng 3G/4G mượt mà, không bị khựng trang.
