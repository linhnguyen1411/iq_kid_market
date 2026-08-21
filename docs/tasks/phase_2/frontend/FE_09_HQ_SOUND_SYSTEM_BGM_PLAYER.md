# [FE-09] Tích Hợp Bộ Âm Thanh Bản Quyền Chất Lượng Cao & Trình Phát Nhạc Nền BGM (HQ Audio System)

> **Mô tả nghiệp vụ**: Nâng cấp toàn diện hệ thống âm thanh từ bộ âm thanh sóng tổng hợp (Synth bip-bop) sang **Bộ sưu tập âm thanh hiệu ứng chuyên nghiệp chất lượng cao (HQ SFX Pack MP3/OGG)** dành cho giáo dục trẻ em. Tích hợp **Trình phát nhạc nền thư giãn (Background Music BGM Player)** với nhiều giai điệu êm dịu hỗ trợ tập trung học tập, thanh điều chỉnh âm lượng độc lập (BGM Volume & SFX Volume Slider), và hiệu ứng âm thanh 3D khi thắng cuộc.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-09`
- **Mảng phụ trách**: Frontend (React 19 + Web Audio API + HTML5 Audio + Howler.js / Custom Audio Engine)
- **Độ ưu tiên**: 🔴 P0 (Quan trọng / Cảm xúc & Trải nghiệm chơi của trẻ)
- **Người thực hiện**: Frontend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/fe-09-hq-sound-bgm`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **HQ Audio Asset Management**:
   - Thư mục lưu trữ tài nguyên âm thanh: `public/audio/sfx/` và `public/audio/bgm/`.
   - Định dạng: Tối ưu hóa file nén `.mp3` và `.ogg` nhẹ (< 50KB cho SFX, < 800KB cho BGM) để tải tức thì mà không lag game.
2. **Audio Sprite / Preloading**:
   - Tải trước (Preload) các âm thanh tương tác thường xuyên:
     - `click.mp3`: Tiếng chạm nút nảy bọt bóng vui tai.
     - `correct.mp3`: Tiếng chuông leng keng vui sướng khi giải đúng một bước.
     - `wrong.mp3`: Tiếng "ồ ố" nhẹ nhàng, không gây ức chế tâm lý cho bé.
     - `victory.mp3`: Tiếng kèn chiến thắng rộn rã kèm pháo hoa.
     - `level_up.mp3`: Tiếng thăng cấp thần thánh lấp lánh sao.
     - `coin.mp3`: Tiếng tiền xu rơi lách cách khi nhận thưởng ví.
3. **BGM Looping & Crossfade (Chuyển Nhạc Êm Dịu)**:
   - Nhạc nền phát lặp vô tận (Loop) với âm lượng mặc định êm ái (25%).
   - Khi chuyển từ màn hình Chợ Game sang Màn Chơi Game ➔ Âm lượng tự động giảm nhẹ để bé tập trung đọc đề bài.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Bộ Thu Âm & File Audio Chuẩn trong `public/audio/`**:
   - SFX: `click.mp3`, `correct.mp3`, `wrong.mp3`, `victory.mp3`, `level_up.mp3`, `coin_reward.mp3`, `streak_fire.mp3`.
   - BGM: `bgm_happy_kids.mp3`, `bgm_peaceful_study.mp3`, `bgm_scratch_coding.mp3`.
2. **Nâng Cấp `src/context/SoundContext.tsx`**:
   - Quản lý Volume: `sfxVolume` (0-100%), `bgmVolume` (0-100%), `isMuted` (Boolean).
   - Chọn bài nhạc BGM yêu thích (Selector).
   - Lưu trữ toàn bộ cài đặt vào `localStorage`.
3. **Menu Cài Đặt Âm Thanh Trên Header (Audio Settings Popover)**:
   - Bấm vào icon Loa 🔊 trên Header ➔ Mở Popover tinh chỉnh thanh kéo âm lượng SFX, BGM và nút Bật/Tắt tức thì.
4. **Sửa Lỗi Đồng Bộ Số Dư Ví Trong `GamePlayPage.tsx` & `ScratchPage.tsx`**:
   - Khắc phục triệt để lỗi cập nhật nhầm `user.xp` thành số dư ví khi nộp điểm màn chơi.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Thêm các file âm thanh chất lượng cao vào `public/audio/sfx/` và `public/audio/bgm/`**.
- [ ] **2. Tái cấu trúc `src/components/game-engines/soundUtils.ts`**:
  - [ ] Sử dụng `AudioContext` hoặc `new Audio()` nạp file thật thay vì sóng oscillator cơ bản (vẫn giữ fallback nếu file lỗi).
- [ ] **3. Nâng cấp `src/context/SoundContext.tsx`**:
  - [ ] Quản lý BGM HTMLAudioElement, hỗ trợ pause, play, loop, volume control.
- [ ] **4. Tạo Component `src/components/AudioSettingsModal.tsx`**:
  - [ ] Gắn vào `Header.tsx`.
- [ ] **5. Fix lỗi tính toán `updateUserWallet` trong `GamePlayPage.tsx` và `ScratchPage.tsx`**.
- [ ] **6. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Khi bấm các nút trong app phát tiếng click bọt bóng rõ ràng, sinh động.
- [ ] Khi giải đúng phát tiếng chuông trong trẻo, khi thắng cuộc phát nhạc kèn tưng bừng.
- [ ] Bật BGM ➔ Nhạc nền phát êm dịu, không giật lag.
- [ ] Kéo thanh volume xuống 0% ➔ Tắt tiếng hoàn toàn.
- [ ] Hoàn thành màn chơi ➔ Số dư ví được cộng đúng xu thưởng, không bị ghi đè thành điểm XP.
