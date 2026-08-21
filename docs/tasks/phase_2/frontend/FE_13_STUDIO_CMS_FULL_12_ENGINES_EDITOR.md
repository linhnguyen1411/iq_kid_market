# [FE-13] Hoàn Thiện Dynamic Form Cho Toàn Bộ 12 Game Engines Trong Creator Studio (Full Studio Editor)

> **Mô tả nghiệp vụ**: Nâng cấp toàn diện **Studio Sáng Tạo Game (`src/pages/AdminPage.tsx`)**. Trong Phase 1, form tạo màn chơi mới chỉ hỗ trợ 4 template cơ bản (`matching`, `quiz`, `sequence`, `math`). Trong Phase 2, bắt buộc phải hoàn thiện Form nhập liệu trực quan (Dynamic WYSIWYG Form Builders) cho toàn bộ **12 Game Engines** (`memory`, `sorting`, `flashcard`, `scratch`, `language`, `observation`, `coding`, `logic_grid`), giúp giáo viên dễ dàng tự thiết kế mọi dạng bài tập mà không cần biết viết mã JSON.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-13`
- **Mảng phụ trách**: Frontend (React 19 + TypeScript + Dynamic Forms + Live Preview)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Đột phá khả năng sáng tạo của Giáo viên)
- **Người thực hiện**: Frontend Developer
- **Trạng thái**: ⚪ Ready (Sẵn sàng triển khai)
- **Branch làm việc**: `feature/fe-13-full-studio-editor`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **WYSIWYG Level Form Builders**:
   - Khi chọn loại game trong dropdown:
     - 🎴 **`memory`**: Cho phép giáo viên chọn bộ chủ đề (Trái cây 🍎, Động vật 🐶, Xe cộ 🚗) và chọn 4-8 cặp hình ảnh.
     - 📊 **`sorting`**: Cho phép nhập danh sách các bước và kéo thả sắp xếp thứ tự đúng.
     - 🃏 **`flashcard`**: Nhập Mặt trước (Khái niệm), Mặt sau (Định nghĩa), Phát âm chuẩn, và Sự thật thú vị.
     - 🐱 **`scratch`**: Chọn vị trí ban đầu của Mèo `[x, y]`, vị trí Ngôi sao `[x, y]`, và chọn chuỗi khối lệnh mục tiêu.
     - 🔤 **`language`**: Nhập câu có dấu gạch dưới `_` để điền từ và 4 phương án lựa chọn.
     - 🔍 **`observation`**: Chọn kích thước lưới ma trận (3x3, 4x4), chọn icon chung và vị trí icon khác biệt `(row, col)`.
     - 💻 **`coding`**: Nhập đoạn mã mẫu và danh sách các phương án sửa lỗi.
     - 🧩 **`logic_grid`**: Thiết lập lưới quy luật ma trận 2x2 hoặc 3x3.
2. **Instant Live Preview Synchronization**:
   - Bên cạnh hoặc phía dưới Form nhập liệu có cửa sổ Chơi Thử Trực Tiếp (Live Demo Shell). Mọi thay đổi về câu chữ, hình ảnh lập tức phản ánh sang cửa sổ demo để giáo viên trải nghiệm ngay.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Thư Mục `src/components/studio-forms/` Chứa 12 Sub-Form Builders**:
   - `QuizFormBuilder.tsx`
   - `MatchingFormBuilder.tsx`
   - `SequenceFormBuilder.tsx`
   - `MathFormBuilder.tsx`
   - `MemoryFormBuilder.tsx`
   - `SortingFormBuilder.tsx`
   - `FlashcardFormBuilder.tsx`
   - `ScratchFormBuilder.tsx`
   - `LanguageFormBuilder.tsx`
   - `ObservationFormBuilder.tsx`
   - `CodingFormBuilder.tsx`
   - `LogicGridFormBuilder.tsx`
2. **Nâng Cấp Tab "Soạn Thảo Màn Chơi" Trong `src/pages/AdminPage.tsx`**:
   - Render tự động Sub-Form Builder tương ứng theo `question_type`.
   - Nút "Chơi thử màn này 🎮" bật modal demo.
3. **Tính Năng Nhân Bản Màn Chơi (Duplicate Level)**:
   - Giáo viên có thể bấm "Nhân bản Màn 1" để tạo Màn 2 nhanh chóng rồi chỉ cần sửa lại số liệu câu hỏi.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Tạo 12 Component Form Builders trong `src/components/studio-forms/`**.
- [ ] **2. Tái cấu trúc Tab "Soạn Thảo Màn Chơi" trong `src/pages/AdminPage.tsx`**:
  - [ ] Hỗ trợ đầy đủ 12 loại template.
  - [ ] Validate dữ liệu form trước khi gửi lên API `POST /api/admin/levels/add`.
- [ ] **3. Thêm tính năng Chơi thử trực tiếp (Test Play) và Nhân bản màn chơi (Duplicate)**.
- [ ] **4. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 🧪 5. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Chọn bất kỳ loại nào trong 12 template ➔ Giao diện form hiển thị đúng các trường nhập liệu tương ứng.
- [ ] Giáo viên tạo game Lật thẻ (Memory) hoặc Kéo sắp xếp (Sorting) hoàn toàn bằng chuột ➔ Lưu thành công vào game.
- [ ] Bấm Chơi thử ➔ Câu hỏi vừa soạn chạy mượt mà trên `QuestionRenderer.tsx`.
