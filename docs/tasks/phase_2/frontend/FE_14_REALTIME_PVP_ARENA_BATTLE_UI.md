# [FE-14] Màn Hình Đấu Trường Trí Tuệ 1v1 Thời Gian Thực (PvP Battle Arena UI)

> **Mô tả nghiệp vụ**: Xây dựng giao diện **Đấu Trường Trí Tuệ Đối Kháng 1v1 (Real-time PvP Battle Arena)** kết nối qua WebSocket. Bao gồm: Màn hình Tìm trận (Matchmaking Radar Scan), Màn hình đối đầu (Versus Screen hiển thị 2 đối thủ), Giao diện thi đấu so tài tốc độ giải đố 3 câu hỏi liên tiếp kèm thanh tiến độ của đối thủ thời gian thực (Live Rival Progress Bar), và Màn hình kết quả trao thưởng Cúp & Điểm Elo.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-14`
- **Mảng phụ trách**: Frontend (React 19 + WebSocket + Canvas Animation + Framer Motion + Web Audio)
- **Độ ưu tiên**: 🟡 P2 (Tính năng tương tác cộng đồng nổi bật)
- **Người thực hiện**: Frontend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/fe-14-pvp-battle-arena`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **WebSocket Client Connection (`usePvPSocket` Hook)**:
   - Quản lý trạng thái kết nối socket: `CONNECTING`, `MATCHMAKING`, `IN_BATTLE`, `ENDED`, `DISCONNECTED`.
   - Tự động reconnect nếu rớt mạng tạm thời.
2. **Split-Screen / Dual Progress Battle Arena**:
   - Bên trái (hoặc Phía dưới): Khu vực làm bài của bé (User).
   - Bên phải (hoặc Phía trên): Khu vực hiển thị Avatar đối thủ, Điểm Elo đối thủ, và Thanh tiến độ 3 nấc câu hỏi (Nấc 1, Nấc 2, Nấc 3) chuyển xanh khi đối thủ trả lời đúng.
3. **Battle Tension Audio & Countdown Timer**:
   - Đồng hồ đếm ngược 60 giây hồi hộp (`⏳ 60s -> 0s`).
   - Âm thanh kèn giao chiến lúc bắt đầu trận đấu và nhạc kịch tính.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Trang `src/pages/PvPArenaPage.tsx`**:
   - **Giai đoạn 1: Lobby & Matchmaking**:
     - Hiển thị Cấp bậc Đấu Trường (Đồng ➔ Bạc ➔ Vàng ➔ Kim Cương ➔ Cao Thủ Trí Tuệ 👑), Điểm Elo hiện tại.
     - Nút "TÌM ĐỐI THỦ XỨNG TẦM ⚔️" kèm hiệu ứng radar quét vòng tròn.
   - **Giai đoạn 2: Versus Intro Screen**:
     - Hiển thị 2 Avatar linh vật bay vào giữa màn hình kèm chữ **VS** rực lửa.
   - **Giai đoạn 3: Live Dual Battle Arena**:
     - Nhúng `QuestionRenderer.tsx` cho 3 câu hỏi tốc độ.
     - Đồng bộ tiến độ đối thủ qua WebSocket event.
   - **Giai đoạn 4: Victory / Defeat Ceremony**:
     - Hiển thị kết quả: Thắng (+25 Elo, +50 xu) hoặc Thua (-10 Elo, +10 xu an ủi).
2. **Thêm Nút "Đấu Trường 1v1" Vào Navigation**:
   - Thêm Tab Đấu Trường vào `NavigationTabs.tsx` với icon Hai Thanh Kiếm Chéo ⚔️.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Tạo Hook `src/hooks/usePvPSocket.ts`** kết nối WebSocket endpoint `/ws/pvp`.
- [ ] **2. Xây dựng Trang `src/pages/PvPArenaPage.tsx`** với 4 giai đoạn trận đấu.
- [ ] **3. Thêm âm thanh trận đấu `battle_start.mp3`, `round_win.mp3`, `defeat.mp3` vào Sound System**.
- [ ] **4. Thêm Tab Đấu Trường vào `NavigationTabs.tsx` & `App.tsx`**.
- [ ] **5. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Bấm Tìm trận ➔ Radar quét đẹp mắt. Khi server ghép cặp thành công ➔ Chuyển ngay sang màn hình VS.
- [ ] Trong trận đấu, người chơi làm đúng câu 1 ➔ Phía đối thủ lập tức thấy thanh tiến độ nhảy lên nấc 1.
- [ ] Kết thúc trận đấu ➔ Hiển thị rõ số điểm Elo được cộng/trừ và số xu thưởng.
