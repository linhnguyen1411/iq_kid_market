# [FE-05] Nâng Cấp Scratch Simulator Studio Kéo Thả Khối Lệnh & Canvas Mô Phỏng (Scratch Studio)

> **Mô tả nghiệp vụ**: Nâng cấp toàn diện môi trường lập trình trực quan kéo-thả **Scratch Simulator** (`src/components/ScratchSimulator.tsx`). Xây dựng không gian làm việc (Workspace) lắp ghép khối lệnh đa màu sắc, sân khấu mô phỏng 2D sống động hiển thị chú Mèo di chuyển theo từng bước lệnh khi bấm nút **"Cờ Xanh ⛳"**, kiểm tra logic chuỗi lệnh mục tiêu và cấp thưởng XP / Sao Xu.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-05`
- **Mảng phụ trách**: Frontend (React 19 + TypeScript + Canvas / Grid Animation + Web Audio)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Điểm nhấn công nghệ EdTech)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/fe-05-scratch-simulator`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Khối Lệnh Trực Quan (Visual Coding Blocks)**:
   - Các khối lệnh được phân loại màu sắc chuẩn theo ngôn ngữ Scratch:
     - 🔵 **Khối Chuyển Động (Motion - Xanh Dương)**: `Di chuyển 1 bước`, `Xoay phải 90°`, `Xoay trái 90°`, `Nhảy vọt 2 bước`.
     - 🟡 **Khối Sự Kiện (Events - Vàng)**: `Khi bấm Cờ Xanh ⛳`.
     - 🟠 **Khối Điều Khiển (Control - Cam)**: `Lặp lại 2 lần`, `Lặp lại 3 lần`.
     - 🟣 **Khối Âm Thanh (Sound - Tím)**: `Phát tiếng Kêu Meo Meo 🐱`.
2. **Bộ Thực Thi Tuần Tự (Async Execution Engine)**:
   - Khi học sinh bấm **"Chạy Cờ Xanh ⛳"**, hệ thống đọc mảng khối lệnh và thực thi từng lệnh tuần tự kèm độ trễ (`await sleep(550)`), giúp bé quan sát từng bước di chuyển của nhân vật trên màn hình.
3. **Mê Cung / Sân Khấu Mô Phỏng (Stage Arena Grid)**:
   - Lưới ma trận 4x4 hoặc 5x5: Ô bắt đầu của Mèo 🐱, Ô chướng ngại vật (Đá 🪨, Vực 🕳️), và Ô đích là Ngôi sao phát sáng 🌟.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Giao Diện 3 Cột Chuẩn Scratch**:
   - **Cột Trái (Block Palette)**: Danh mục các khối lệnh có thể chọn hoặc kéo.
   - **Cột Giữa (Coding Workspace)**: Khu vực lắp ghép các khối lệnh theo hàng dọc từ trên xuống dưới, có nút xóa từng lệnh và nút làm lại từ đầu.
   - **Cột Phải (Live Stage Arena)**: Sân khấu mô phỏng 2D hiển thị bản đồ, nút "Chạy Cờ Xanh ⛳" và nút "Dừng 🛑".
2. **Động Cơ Mô Phỏng Bước Đi (Step-by-Step Step Animator)**:
   - Di chuyển nhân vật Mèo mượt mà giữa các ô ma trận, tự động phát âm thanh và hiệu ứng xoay hướng mặt Mèo.
   - Nếu va chạm chướng ngại vật ➔ Hoạt ảnh va chạm, rung lắc và dừng chương trình.
3. **Tích Hợp Chấm Điểm & Nộp Bài Lên Server**:
   - Gọi API `POST /api/scratch/lessons/submit`.
   - Mở khóa bài học kế tiếp trong danh sách khóa học và thưởng XP.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Tái cấu trúc `src/components/ScratchSimulator.tsx`**:
  - [x] Chia layout 3 cột: `Block Palette`, `Coding Workspace`, `Live 2D Stage Canvas`.
- [x] **2. Xây dựng thư viện khối lệnh Scratch**:
  - [x] `move_forward`: Đi thẳng 1 ô.
  - [x] `turn_left`: Quay sang trái 90°.
  - [x] `turn_right`: Quay sang phải 90°.
  - [x] `jump_forward`: Nhảy vọt 2 bước qua chướng ngại vật.
  - [x] `repeat_2` & `repeat_3`: Vòng lặp tự động unroll lệnh.
  - [x] `meow_sound`: Kêu meo meo.
- [x] **3. Viết vòng lặp thực thi bất đồng bộ (Async Runner Loop)**:
  - [x] Điều khiển tọa độ và hướng nhìn (Angle: 0°, 90°, 180°, 270°) của chú Mèo.
- [x] **4. Kết nối với `ScratchPage.tsx`**:
  - [x] Chọn bài học ➔ Nạp cấu hình đề bài ➔ Học sinh thực hành ➔ Nhận thưởng XP.
- [x] **5. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Bộ thực thi lệnh Scratch tuần tự với Animation:

```typescript
const executeBlocks = async () => {
  if (isRunning || blocks.length === 0) return;
  setIsRunning(true);
  
  // Đưa mèo về vị trí ban đầu
  let curPos = { ...initialCatPos };
  let curDirection = 0; // 0: Phải, 90: Dưới, 180: Trái, 270: Trên

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    setActiveBlockIndex(i); // Highlight khối lệnh đang chạy
    playSynthSound('click');

    if (block.type === 'move_forward') {
      if (curDirection === 0) curPos.col += 1;
      else if (curDirection === 90) curPos.row += 1;
      else if (curDirection === 180) curPos.col -= 1;
      else if (curDirection === 270) curPos.row -= 1;
    } else if (block.type === 'turn_right') {
      curDirection = (curDirection + 90) % 360;
    } else if (block.type === 'turn_left') {
      curDirection = (curDirection + 270) % 360;
    }

    setCatPosition({ ...curPos, direction: curDirection });
    await new Promise((r) => setTimeout(r, 600)); // Nghỉ 600ms giữa các bước

    // Kiểm tra va chạm biên
    if (curPos.row < 0 || curPos.row >= 4 || curPos.col < 0 || curPos.col >= 4) {
      playSynthSound('incorrect');
      alert('Chú Mèo bị va vào tường rồi! Hãy thử lại nhé!');
      setIsRunning(false);
      return;
    }
  }

  // Kiểm tra về đích
  if (curPos.row === starPos.row && curPos.col === starPos.col) {
    playSynthSound('victory');
    onSuccess();
  } else {
    playSynthSound('incorrect');
    alert('Chú Mèo chưa đến được Ngôi sao 🌟. Hãy thêm lệnh nhé!');
  }
  setIsRunning(false);
  setActiveBlockIndex(-1);
};
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/fe-05-scratch-simulator
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "frontend: hoàn thiện Scratch Simulator kéo thả và bộ thực thi tuần tự"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Thêm & Xóa khối lệnh**:
  - Bấm thêm 3 khối lệnh "Đi thẳng", "Rẽ phải", "Đi thẳng" ➔ Workspace hiển thị danh sách 3 khối.
  - Bấm xóa khối thứ 2 ➔ Khối biến mất, danh sách tự sắp xếp lại.
- [ ] **2. Test Chạy Mô Phỏng ⛳**:
  - Bấm nút "Cờ Xanh" ➔ Mèo bước từng ô một cách trực quan, khối lệnh tương ứng sáng đèn theo nhịp.
- [ ] **3. Test Về đích thành công**:
  - Khi Mèo chạm đúng tọa độ Ngôi sao ➔ Hiệu ứng chiến thắng xuất hiện, điểm XP được cộng vào tài khoản.
