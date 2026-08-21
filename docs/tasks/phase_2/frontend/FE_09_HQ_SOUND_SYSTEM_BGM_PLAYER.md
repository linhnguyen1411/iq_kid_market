# [FE-09] Nâng Cấp Giao Diện Lung Linh, Tích Hợp Âm Thanh HQ & Sửa Triệt Để Lỗi State (UI Polish & Sound System)

> **Mô tả nghiệp vụ**: **ƯU TIÊN HÀNG ĐẦU (P0)**: Tinh chỉnh giao diện toàn bộ ứng dụng đạt độ lung linh, mượt mà chuẩn EdTech quốc tế dành cho thiếu nhi. Tích hợp bộ sưu tập **Âm Thanh Bản Quyền Chất Lượng Cao (HQ Audio Pack MP3/OGG Nội Bộ 100%)** thay thế sóng tổng hợp thô sơ, tích hợp Trình Phát Nhạc Nền Thư Giãn (BGM Player), hoàn thiện hiệu ứng nảy hạt Sparkles, pháo hoa Confetti, và sửa triệt để các lỗi state giao diện (ví xu, âm thanh, responsive màn hình bé).

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-09`
- **Mảng phụ trách**: Frontend (React 19 + Framer Motion + Tailwind CSS v4 + Canvas Confetti + HTML5 Audio)
- **Độ ưu tiên**: 🔴 P0 (Ưu tiên cao nhất / Trải nghiệm thị giác, thính giác & Sửa lỗi)
- **Người thực hiện**: Frontend Lead / UI Designer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/fe-09-ui-polish-sound`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Kid-Friendly Visual Polish (Nâng Tầm Giao Diện Thiếu Nhi)**:
   - Màu sắc tươi sáng, độ tương phản cao, bo góc tròn trĩnh 3D (`rounded-3xl`, viền sáng bóng `ring-4`, đổ bóng mềm `shadow-xl`).
   - Hoạt ảnh phản hồi chạm nảy lò xo (`active:scale-95 transition-all`), hiệu ứng hào quang lấp lánh khi đạt điểm cao (`animate-pulse`, `animate-bounce`).
2. **100% Offline HQ Audio Assets (Bộ Âm Thanh Bản Quyền Nội Bộ)**:
   - Các file âm thanh chất lượng cao được lưu cục bộ trong `public/audio/` (không tải từ CDN ngoài):
     - `public/audio/sfx/`: `bubble_click.mp3`, `correct_bell.mp3`, `try_again.mp3`, `victory_fanfare.mp3`, `coin_reward.mp3`, `level_up.mp3`.
     - `public/audio/bgm/`: `bgm_playful_study.mp3`, `bgm_relaxing_piano.mp3`.
3. **BGM Player & Volume Popover Control**:
   - Trình phát nhạc nền chạy mượt mà, lặp vô tận (Loop), âm lượng mặc định êm ái (25%).
   - Nút chỉnh âm lượng dạng Popover trên Header với 2 thanh trượt riêng: Âm Lượng Nhạc Nền (BGM) và Âm Lượng Hiệu Ứng (SFX).

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Chuẩn Hóa Âm Thanh Toàn Diện (`soundUtils.ts` & `SoundContext.tsx`)**:
   - Sử dụng `HTMLAudioElement` nạp các file trong `public/audio/`.
   - Bổ sung hiệu ứng âm thanh cho toàn bộ 12 Game Engine: Nối thẻ, Lật bài, Điền số, Kéo thả Scratch.
2. **Nâng Cấp Hiệu Ứng Thị Giác (Visual Polish)**:
   - Màn chúc mừng chiến thắng (Victory Screen) trong `QuestionRenderer.tsx`: Bắn pháo hoa Confetti hạt màu rực rỡ khi giải đúng câu hỏi.
   - Thẻ bài học sinh trong `ProfilePage.tsx`: Hiệu ứng Hologram 3D xoay góc khi rê chuột.
   - Các nút bấm trong ứng dụng có hiệu ứng bóng nảy 3D (Kid Buttons 3D Shadow).
3. **Sửa Lỗi State & Responsive**:
   - Kiểm tra và đảm bảo số dư ví, điểm XP và cấp độ Level luôn được cập nhật mượt mà, tức thì sau mỗi màn chơi.
   - Tối ưu khoảng cách nút bấm trên iPad và màn hình cảm ứng điện thoại (Touch-Target >= 48px).

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Tải và bổ sung đầy đủ bộ file âm thanh vào `public/audio/sfx/` và `public/audio/bgm/`**.
- [ ] **2. Cập nhật `src/components/game-engines/soundUtils.ts` nạp file audio thật**.
- [ ] **3. Nâng cấp `src/context/SoundContext.tsx` quản lý phát BGM và Volume**.
- [ ] **4. Tạo Popover chỉnh âm lượng trên `src/layouts/Header.tsx`**.
- [ ] **5. Tinh chỉnh hoạt ảnh Framer Motion, đổ bóng 3D và Confetti cho QuestionRenderer**.
- [ ] **6. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Toàn bộ các tương tác nút bấm, lật thẻ, giải đúng/sai phát âm thanh rõ ràng, trong trẻo.
- [ ] Bật BGM ➔ Nhạc nền phát êm ái, kéo thanh trượt chỉnh âm lượng hoạt động chính xác.
- [ ] Màn hình chiến thắng có pháo hoa Confetti rực rỡ, giao diện tươi sáng, bắt mắt.
- [ ] Không có lỗi giật lag, không có phụ thuộc nào vào tài nguyên mạng bên ngoài.
