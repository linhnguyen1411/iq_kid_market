# [FE-02] Hoàn Thiện UI Auth Modal, Profile 3D Avatar & Đổi Mật Khẩu (Auth & Profile UI)

> **Mô tả nghiệp vụ**: Nâng tầm trải nghiệm người dùng trong toàn bộ luồng Xác thực và Quản lý tài khoản: Tinh chỉnh Modal Đăng Ký / Đăng Nhập cực kỳ lung linh theo phong cách EdTech hiện đại, bộ chọn linh vật 3D hoạt hình sinh động, trang Profile cá nhân hiển thị Thẻ Học Sinh VIP, thanh tiến trình XP / Level, và Modal Đổi mật khẩu an toàn.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-02`
- **Mảng phụ trách**: Frontend (React 19 + Framer Motion + Tailwind CSS v4 + Web Audio)
- **Độ ưu tiên**: 🔴 P0 (Bắt buộc / Trải nghiệm đầu vào)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/fe-02-auth-profile`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Framer Motion (`motion/react`)**:
   - Thư viện tạo hoạt ảnh mượt mà cho React: Hiệu ứng xuất hiện (`initial`, `animate`, `exit`), hiệu ứng co giãn lò xo khi bấm (`whileTap={{ scale: 0.95 }}`), hiệu ứng lơ lửng bồng bềnh (`animate={{ y: [0, -6, 0] }}`).
2. **Glassmorphism & Kid-Friendly Palette**:
   - Sử dụng lớp nền mờ đục `backdrop-blur-md bg-white/90`, viền sáng bóng `border-white/40`, đổ bóng mềm mại `shadow-2xl`.
   - Bảng màu chủ đạo: Xanh da trời (`kids-blue`), Hồng kẹo ngọt (`kids-pink`), Vàng mặt trời (`kids-yellow`), Xanh lá năng lượng (`kids-green`), Tím sáng tạo (`kids-purple`).
3. **Interactive 3D-Style Avatar Picker**:
   - 6 Linh vật đại diện: 🐯 Hổ Trí Tuệ (`smile_tiger`), 🦉 Cú Logic (`wise_owl`), 🦊 Cáo Nhanh Trí (`smart_fox`), 🐼 Gấu Panda Khám Phá (`panda_explorer`), 🦁 Sư Tử Vô Địch (`lion_king`), 🦄 Kỳ Lân Sáng Tạo (`magic_unicorn`).
   - Mỗi lần bấm chọn phát âm thanh vui nhộn qua Web Audio API (`playSynthSound('click')`).
4. **Password Strength Meter (Thanh Đo Độ Mạnh Mật Khẩu)**:
   - Đo độ dài và độ phức tạp: Yếu (< 6 ký tự) ➔ Khá ➔ Siêu mạnh mẽ 🔥 (> 8 ký tự kèm số).

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Hoàn thiện Component `src/components/AuthModal.tsx`**:
   - Tab chuyển đổi mượt mà giữa **Đăng Nhập** và **Đăng Ký Thành Viên**.
   - Bộ chọn vai trò 3D Cards (Học sinh kèm khối lớp 1-9, Giáo viên sáng tạo, Phụ huynh đồng hành).
   - Bộ chọn Avatar linh vật có hiệu ứng nảy hạt Sparkles.
   - Nút **"Đăng nhập 1-chạm Demo"** nhanh (Bé Bình, Cô Lan, Bố Dũng - mật khẩu `123456`).
   - Xử lý thông báo lỗi bằng tiếng Việt rõ ràng, dễ hiểu.
2. **Xây dựng Trang Hồ Sơ Cá Nhân (`src/pages/ProfilePage.tsx`)**:
   - Header Hồ sơ: Avatar 3D xoay nhẹ, Tên hiển thị, Huy hiệu Vai trò, Level & Cúp.
   - Thanh tiến trình XP: `XP hiện tại / XP lên cấp tiếp theo` (kèm % hoàn thành).
   - Thống kê học tập: Số màn chơi đã vượt qua, Chuỗi ngày học liên tục (Streak 🔥), Tổng xu tích lũy.
   - Danh sách Trò chơi đã mua bản quyền (Kèm nút "Chơi ngay").
3. **Modal Đổi Mật Khẩu (`ChangePasswordModal.tsx`)**:
   - Nhập mật khẩu cũ, mật khẩu mới, xác nhận mật khẩu mới.
   - Thanh đo độ an toàn mật khẩu thời gian thực.
   - Gọi API `/api/auth/change-password` và thông báo thành công rực rỡ.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Tinh chỉnh `src/components/AuthModal.tsx`**:
  - [x] Thêm hiệu ứng âm thanh khi bấm chọn linh vật và đổi role.
  - [x] Hiển thị thông tin quà tặng khởi tạo theo role: Học sinh (90k xu + 100 XP), Giáo viên (500k xu), Phụ huynh (1.000k xu).
  - [x] Lưu Access Token vào `localStorage` và tự động cập nhật Context sau khi đăng nhập thành công.
- [x] **2. Hoàn thiện `src/pages/ProfilePage.tsx`**:
  - [x] Thiết kế thẻ học sinh / giáo viên phong cách thẻ bài VIP 3D.
  - [x] Nút "Đổi Ảnh Đại Diện" cho phép chọn lại linh vật.
  - [x] Nút "Đổi Mật Khẩu" kích hoạt đổi pass kèm Password Strength Meter.
- [x] **3. Thêm tính năng Auto-Logout khi Token hết hạn**:
  - [x] Bắt mã lỗi 401 từ API ➔ Tự động xóa token và mở AuthModal thông báo phiên đăng nhập hết hạn.
- [x] **4. Chạy `npx tsc --noEmit` & Kiểm thử giao diện trên trình duyệt**.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Password Strength Meter đơn giản, đẹp mắt:

```tsx
function getPasswordStrength(password: string) {
  if (!password) return { score: 0, text: '', color: '' };
  if (password.length < 4) return { score: 1, text: 'Quá ngắn', color: 'bg-rose-500 text-rose-500' };
  if (password.length < 6) return { score: 2, text: 'Tạm được 🙂', color: 'bg-amber-500 text-amber-500' };
  if (password.length >= 8 && /\d/.test(password)) {
    return { score: 4, text: 'Siêu cấp Pro! 🔥', color: 'bg-emerald-500 text-emerald-500' };
  }
  return { score: 3, text: 'Mạnh mẽ ⚡', color: 'bg-blue-500 text-blue-500' };
}

// Trong JSX của Form Đăng Ký:
const strength = getPasswordStrength(password);

<div className="mt-2">
  <div className="flex justify-between text-xs font-bold mb-1">
    <span className="text-slate-500">Độ mạnh mật khẩu:</span>
    <span className={strength.color.split(' ')[1]}>{strength.text}</span>
  </div>
  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
    {[1, 2, 3, 4].map((step) => (
      <div
        key={step}
        className={`h-full flex-1 transition-all duration-300 ${
          step <= strength.score ? strength.color.split(' ')[0] : 'bg-slate-200'
        }`}
      />
    ))}
  </div>
</div>
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/fe-02-auth-profile
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "frontend: hoàn thiện AuthModal lung linh và trang Profile cá nhân 3D"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Đăng Ký Tài Khoản Mới**:
  - Bấm "Đăng Ký" ➔ Chọn Cú Logic 🦉, Chọn vai trò Học sinh Lớp 4, Nhập user `be_nam`, mật khẩu `123456`.
  - Kết quả: Đăng ký thành công, popup chúc mừng xuất hiện, Header hiển thị Avatar Cú Logic, số dư ví 90.000đ, Level 1.
- [ ] **2. Test Đăng Nhập 1-Chạm Demo**:
  - Bấm chọn "Bé Bình (Học sinh)" ➔ Đăng nhập thành công ngay lập tức không cần gõ phím.
- [ ] **3. Test Đổi Mật Khẩu**:
  - Vào Profile ➔ Bấm "Đổi mật khẩu" ➔ Nhập pass cũ `123456`, pass mới `654321` ➔ Đổi thành công ➔ Đăng xuất và đăng nhập lại bằng pass mới.
- [ ] **4. Test Responsive**:
  - Thu nhỏ màn hình điện thoại / iPad ➔ Modal Auth co giãn vừa vặn, không bị tràn màn hình.
