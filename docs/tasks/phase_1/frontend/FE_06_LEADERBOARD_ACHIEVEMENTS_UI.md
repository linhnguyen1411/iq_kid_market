# [FE-06] Màn Hình Bảng Vàng Vinh Danh & Bộ Sưu Tập Huy Hiệu (Gamification UI)

> **Mô tả nghiệp vụ**: Xây dựng trải nghiệm thi đua học tập hào hứng cho trẻ thông qua **Bảng Vàng Vinh Danh** (Leaderboard) rực rỡ với bục Top 1, 2, 3 phong cách hoạt hình 3D, bộ lọc xếp hạng đa chiều (Theo Game, Tuần, Tháng, Khối Lớp), bộ sưu tập Huy hiệu thành tích (Achievement Badges Showcase), và Popup ăn mừng Lên Cấp (Level Up Celebration) kèm pháo hoa rực rỡ.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-06`
- **Mảng phụ trách**: Frontend (React 19 + Framer Motion + Tailwind CSS v4 + Canvas Confetti)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Tăng sự gắn kết của học sinh)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/fe-06-leaderboard-achievements`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Podium 3D Top 3 (Bục Vinh Quang 3 Thứ Hạng Đầu)**:
   - 🥇 **Top 1 (Vàng)**: Ở giữa, bục cao nhất, vương miện vàng lấp lánh `animate-bounce`, hào quang phát sáng.
   - 🥈 **Top 2 (Bạc)**: Bên trái, bục nhì.
   - 🥉 **Top 3 (Đồng)**: Bên phải, bục ba.
   - Các thứ hạng từ 4 trở xuống hiển thị theo danh sách bảng cuộn có Avatar, Tên, Cấp độ và Điểm số.
2. **Confetti Particle Effects (Hiệu Ứng Pháo Hoa Hạt)**:
   - Bắn tung tóe hạt màu sắc lung linh khi học sinh thăng cấp Level hoặc đạt được Huy hiệu mới.
3. **Streak Fire Animation (Ngọn Lửa Chuỗi Ngày Học)**:
   - Biểu tượng 🔥 nhấp nháy phát sáng, thể hiện sự nỗ lực kiên trì học tập liên tục của bé.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Hoàn Thiện Trang `src/pages/LeaderboardPage.tsx`**:
   - **Thanh Chọn Bộ Lọc (Filter Bar)**:
     - Chọn mốc thời gian: Toàn thời gian, Bảng vàng tuần này, Hôm nay.
     - Chọn khối lớp: Lớp 1 -> Lớp 5.
   - **Bục Vinh Quang Top 3 Podium**: Render 3 bạn có điểm cao nhất với hiệu ứng hoạt hình sống động.
   - **Bảng Xếp Hạng Top 4 - 20**: Hiển thị thứ tự, ảnh đại diện linh vật, tên bé, khối lớp, điểm số và chuỗi ngày Streak 🔥.
2. **Bộ Sưu Tập Huy Hiệu Danh Hiệu (`BadgeShowcase.tsx`)**:
   - Danh sách huy hiệu được lấy từ API `GET /api/achievements/user/{user_id}`.
   - Huy hiệu chưa đạt được: Hiển thị mờ (Grayscale) kèm ổ khóa và thanh tiến độ % hoàn thành.
   - Huy hiệu đã đạt được: Hiển thị màu sắc rực rỡ kèm hiệu ứng viền vàng phát sáng (Gold Glow).
3. **Modal Chúc Mừng Lên Cấp (`LevelUpModal.tsx`)**:
   - Tự động hiển thị khi nộp điểm màn chơi mà `levelUp === true`.
   - Âm thanh kèn thắng cuộc tưng bừng (`playSynthSound('victory')`).

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Hoàn thiện `src/pages/LeaderboardPage.tsx`**:
  - [x] Gọi API `GET /api/scores/leaderboard` với các tham số lọc động.
  - [x] Thiết kế bục Top 1, 2, 3 đẹp mắt bằng Tailwind & 3D Podium.
- [x] **2. Xây dựng Tab/Component `BadgeShowcase.tsx`**:
  - [x] Gọi API `GET /api/achievements/user/{id}`.
  - [x] Hiển thị danh sách huy hiệu dạng lưới 3D sinh động kèm thanh tiến độ.
- [x] **3. Xây dựng Component `LevelUpModal.tsx`**:
  - [x] Hiển thị danh hiệu Level mới (VD: "Tập Sự ➔ Siêu Nhân Trí Tuệ 🌟").
  - [x] Nút "Tiếp tục học ngay 🚀" đóng modal.
- [x] **4. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Cấu trúc Bục Vinh Quang Top 3 Podium:

```tsx
export function LeaderboardPodium({ top3 }: { top3: any[] }) {
  const [first, second, third] = [top3[0], top3[1], top3[2]];

  return (
    <div className="flex justify-center items-end gap-3 md:gap-6 pt-10 pb-6">
      {/* HẠNG 2 (BẠC) */}
      {second && (
        <div className="flex flex-col items-center">
          <div className="text-3xl mb-2">🥈</div>
          <div className="w-16 h-16 bg-slate-100 rounded-full border-4 border-slate-300 flex items-center justify-center text-2xl shadow">
            {second.avatar || "🦉"}
          </div>
          <p className="font-bold text-slate-700 text-sm mt-2">{second.username}</p>
          <p className="text-xs text-blue-600 font-mono font-bold">{second.score} pts</p>
          <div className="w-24 md:w-28 h-28 bg-gradient-to-t from-slate-300 to-slate-200 rounded-t-2xl mt-2 flex items-center justify-center font-bold text-slate-600 text-xl shadow">
            2
          </div>
        </div>
      )}

      {/* HẠNG 1 (VÀNG) - Ở GIỮA, CAO NHẤT */}
      {first && (
        <div className="flex flex-col items-center -mt-6">
          <div className="text-4xl mb-1 animate-bounce">👑</div>
          <div className="w-20 h-20 bg-amber-50 rounded-full border-4 border-amber-400 flex items-center justify-center text-3xl shadow-xl ring-4 ring-amber-200">
            {first.avatar || "🐯"}
          </div>
          <p className="font-bold text-slate-800 text-base mt-2">{first.username}</p>
          <p className="text-sm text-amber-600 font-mono font-bold">{first.score} pts</p>
          <div className="w-28 md:w-32 h-36 bg-gradient-to-t from-amber-400 to-yellow-300 rounded-t-2xl mt-2 flex items-center justify-center font-bold text-amber-900 text-2xl shadow-lg">
            1
          </div>
        </div>
      )}

      {/* HẠNG 3 (ĐỒNG) */}
      {third && (
        <div className="flex flex-col items-center">
          <div className="text-3xl mb-2">🥉</div>
          <div className="w-16 h-16 bg-amber-50 rounded-full border-4 border-amber-600 flex items-center justify-center text-2xl shadow">
            {third.avatar || "🦊"}
          </div>
          <p className="font-bold text-slate-700 text-sm mt-2">{third.username}</p>
          <p className="text-xs text-blue-600 font-mono font-bold">{third.score} pts</p>
          <div className="w-24 md:w-28 h-20 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-2xl mt-2 flex items-center justify-center font-bold text-white text-xl shadow">
            3
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/fe-06-leaderboard-achievements
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "frontend: hoàn thiện bục vinh quang Leaderboard và kho huy hiệu Gamification"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Bảng Xếp Hạng**:
  - Đổi các bộ lọc Tuần / Tháng / Khối Lớp ➔ Danh sách cập nhật đúng dữ liệu trả về từ API.
  - Bục Top 1, 2, 3 hiển thị đúng 3 người điểm cao nhất.
- [ ] **2. Test Kho Huy Hiệu (Badges)**:
  - Huy hiệu chưa đạt có màu xám kèm thanh tiến độ.
  - Huy hiệu đã đạt có màu sắc rực rỡ và ngày nhận.
- [ ] **3. Test Modal Level Up**:
  - Chơi game và nộp điểm đủ để vượt mốc Level ➔ Popup chúc mừng bật lên kèm âm thanh kèn chiến thắng.
