# [FE-08] Tối Ưu Giao Diện iPad/Tablet, Hỗ Trợ PWA & Trình Quản Lý Âm Thanh (UX & Sound System)

> **Mô tả nghiệp vụ**: Hoàn thiện toàn diện trải nghiệm người dùng dành riêng cho trẻ em: Tối ưu hóa kích thước nút bấm và bố cục giao diện cho màn hình cảm ứng **iPad / Máy tính bảng**, hỗ trợ cài đặt ứng dụng lên màn hình chính theo chuẩn **PWA (Progressive Web App)**, xây dựng **Trình Quản Lý Âm Thanh Toàn Cục (Global Sound Manager)** cho phép bật/tắt nhạc nền và hiệu ứng âm thanh, cùng tính năng Hỗ trợ Giọng Đọc Đề Bài Tiếng Việt (Text-to-Speech).

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-08`
- **Mảng phụ trách**: Frontend (React 19 + PWA + Web Audio API + Web Speech API + Responsive CSS)
- **Độ ưu tiên**: 🟡 P2 (Nâng cao trải nghiệm & Khả năng tiếp cận)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/fe-08-tablet-pwa-sound`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Tablet & Touch-First Design (Thiết Kế Thân Thiện Với Máy Tính Bảng)**:
   - Trẻ em phần lớn học tập trên iPad / Android Tablet. Nút bấm phải có kích thước tối thiểu `48px x 48px`, khoảng cách bấm an toàn (Touch Target Size) để không bị ấn nhầm.
   - Hạn chế hover states và ưu tiên phản hồi chạm (`active:scale-95`).
2. **PWA (Progressive Web App)**:
   - Cung cấp `manifest.json` và Service Worker giúp ứng dụng có thể "Thêm vào màn hình chính" (Add to Home Screen) trên iPad và điện thoại như một App thực thụ, có icon và màn hình chờ (Splash Screen) rực rỡ.
3. **Global Sound Manager (`SoundContext.tsx`)**:
   - Quản lý 2 luồng âm thanh độc lập:
     - 🎵 **Nhạc Nền (Background Music - BGM)**: Giai điệu học tập nhẹ nhàng, êm dịu, không gây ồn ào.
     - 🔊 **Hiệu Ứng Âm Thanh (Sound Effects - SFX)**: Tiếng bấm `click`, tiếng đúng `correct`, tiếng sai `incorrect`, tiếng thắng cuộc `victory`.
   - Nút bật/tắt âm thanh nhanh nằm trên Header (Lưu cài đặt vào `localStorage`).
4. **Web Speech API (Giọng Đọc Trí Tuệ Nhân Tạo)**:
   - Dùng `window.speechSynthesis` đọc câu hỏi bằng tiếng Việt giọng chuẩn (`vi-VN`) giúp các bé lớp 1-2 chưa đọc thạo chữ vẫn có thể nghe hiểu đề bài dễ dàng.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Xây dựng `src/context/SoundContext.tsx`**:
   - State: `isSoundEnabled` (Mặc định `true`), `isBgmEnabled` (Mặc định `false`).
   - Functions: `toggleSound()`, `toggleBgm()`, `playSound(name)`.
   - Nút Icon Loa 🔊 trên `Header.tsx` cho phép tắt tiếng tức thì khi bé học trong lớp hoặc ban đêm.
2. **Cấu Hình PWA Hoàn Chỉnh (`public/manifest.json` & Icons)**:
   - Cấu hình `theme_color: "#3B82F6"`, `background_color: "#F8FAFC"`, `display: "standalone"`.
3. **Tối Ưu Breakpoints Cho iPad / Tablet**:
   - Tối ưu các lưới Grid: 1 cột (Mobile) ➔ 2 cột (Tablet dọc - 768px) ➔ 3 cột (iPad ngang - 1024px) ➔ 4 cột (Desktop - 1280px).
   - Tăng cỡ chữ đề bài trong `QuestionRenderer.tsx` trên tablet.
4. **Nút Đọc Đề Bài Bằng Giọng Nói (`TextToSpeechButton.tsx`)**:
   - Đặt cạnh câu hỏi: Biểu tượng Chiếc Loa Phát Thanh 📢.
   - Bấm vào sẽ đọc to nội dung `question.prompt` bằng tiếng Việt giọng chuẩn (`vi-VN`).

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Xây dựng `src/context/SoundContext.tsx` & Tích hợp vào `App.tsx`**:
  - [x] Nút điều khiển âm thanh trên Header.
  - [x] Tích hợp vào `soundUtils.ts` để kiểm tra cờ `isSoundEnabled`.
- [x] **2. Cấu hình PWA Web App Manifest**:
  - [x] Tạo file `public/manifest.json`.
  - [x] Bổ sung thẻ `<link rel="manifest" href="/manifest.json">` vào `index.html`.
- [x] **3. Xây dựng component `TextToSpeechButton.tsx`**:
  - [x] Sử dụng `SpeechSynthesisUtterance` với `lang = 'vi-VN'`.
  - [x] Nhúng vào `QuestionRenderer.tsx`.
- [x] **4. Rà soát & Tối ưu Responsive CSS trên toàn bộ các trang**.
- [x] **5. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Component Đọc Đề Bài Tiếng Việt (Text-to-Speech):

```tsx
import { useState } from "react";
import { Volume2 } from "lucide-react";

export function TextToSpeechButton({ text }: { text: string }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if (!('speechSynthesis' in window) || !text) return;

    window.speechSynthesis.cancel(); // Dừng câu đang đọc trước đó

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9; // Tốc độ đọc vừa phải, rõ ràng cho bé nghe
    utterance.pitch = 1.1; // Giọng hơi trong trẻo, thân thiện

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={handleSpeak}
      title="Bấm để nghe đọc đề bài"
      className={`p-2 rounded-xl transition-all ${
        isSpeaking
          ? "bg-amber-100 text-amber-700 animate-pulse ring-2 ring-amber-300"
          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
      }`}
    >
      <Volume2 className="w-5 h-5" />
    </button>
  );
}
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/fe-08-tablet-pwa-sound
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "frontend: tối ưu responsive tablet, tích hợp PWA và bộ quản lý âm thanh toàn cục"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Nút Âm Thanh Header**:
  - Bấm nút Loa trên Header để tắt âm thanh ➔ Chơi game thử không còn phát ra tiếng click hoặc tiếng đúng/sai.
  - F5 tải lại trang ➔ Cài đặt tắt tiếng vẫn được ghi nhớ.
- [ ] **2. Test Giọng Đọc Đề Bài**:
  - Bấm vào biểu tượng Loa cạnh đề bài ➔ Trình duyệt phát ra giọng đọc tiếng Việt rõ ràng câu hỏi.
- [ ] **3. Test Cài Đặt PWA**:
  - Mở Chrome / Safari ➔ Kiểm tra biểu tượng "Cài đặt ứng dụng / Thêm vào màn hình chính" xuất hiện trên thanh địa chỉ.
- [ ] **4. Test Responsive Trên iPad**:
  - Dùng DevTools chuyển sang chế độ iPad Air / iPad Pro ➔ Bố cục cân đối, các nút bấm to rõ ràng, không bị che khuất nội dung.
