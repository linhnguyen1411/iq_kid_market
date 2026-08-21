# [FE-07] Studio Sáng Tạo Game Cho Giáo Viên & Trình Sinh Game AI (Creator Studio & AI CMS)

> **Mô tả nghiệp vụ**: Xây dựng bộ công cụ Quản trị CMS và **Studio Sáng Tạo Trò Chơi** (`src/pages/AdminPage.tsx`) chuyên nghiệp dành cho Giáo Viên, Tác giả sáng tạo (Creator) và Admin. Bao gồm: Form tạo game trực quan, Trình biên soạn Màn chơi động theo từng loại Game Engine, Studio Sinh Game Bằng Trí Tuệ Nhân Tạo Google Gemini với tính năng Xem Trước Trực Quan (Live Preview), và Giao diện Hàng Đợi Kiểm Duyệt Giáo Án (Review Queue).

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-07`
- **Mảng phụ trách**: Frontend (React 19 + TypeScript + Dynamic Forms + Recharts)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Đột phá tính năng sáng tạo)
- **Người thực hiện**: Antigravity Assistant
- **Trạng thái**: 🟢 Done (Đã hoàn thành 100%)
- **Branch làm việc**: `feature/fe-07-admin-cms-studio`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

1. **Dynamic Form Builder (Trình Soạn Thảo Form Động)**:
   - Khi giáo viên chọn loại game `quiz` ➔ Form hiển thị ô nhập Câu hỏi + 4 Lựa chọn + Đáp án đúng.
   - Khi chọn `matching` ➔ Form hiển thị danh sách các Cặp Nối Cột A-B kèm nút "Thêm Cặp Mới ➕".
   - Khi chọn `sequence` ➔ Form hiển thị các ô số và chọn vị trí dấu hỏi `?`.
   - Khi chọn `math` ➔ Form hiển thị biểu thức phép tính và đáp án.
2. **AI Real-time Live Preview (Xem Trước Game AI Thời Gian Thực)**:
   - Sau khi Gemini sinh xong cấu hình game JSON, hệ thống render ngay lập tức bản chơi thử (Demo Gameplay) để giáo viên chơi thử trước khi quyết định bấm "Xuất Bản Trò Chơi".
3. **Review Queue State Workflow**:
   - Chỉ người dùng có role `admin` hoặc `teacher` mới thấy Tab "Hàng Đợi Kiểm Duyệt".
   - Hỗ trợ xem chi tiết toàn bộ các màn chơi của game chờ duyệt, bấm "Duyệt Thông Qua ✅" hoặc "Yêu Cầu Chỉnh Sửa 📝" kèm nhập phản hồi góp ý.
4. **Biểu Đồ Thống Kê (Recharts)**:
   - Hiển thị biểu đồ doanh thu xu, số lượng học sinh đăng ký mới và số lượt chơi game theo ngày.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Tái Cấu Trúc Trang `src/pages/AdminPage.tsx` Thành 5 Sub-Tabs**:
   - 📊 **Tab 1: Thống Kê Tổng Quan (Dashboard Analytics)**: Số liệu Tổng User, Tổng Game, Doanh Thu, Lượt Chơi, Biểu đồ tăng trưởng.
   - 🤖 **Tab 2: Trợ Lý AI Sinh Game (AI Game Creator Studio)**: Nhập chủ đề, chọn khối lớp, chọn template ➔ Bấm Sinh Game ➔ Xem Live Preview.
   - ✍️ **Tab 3: Tự Thiết Kế Game (Manual Game Builder)**: Form nhập thông tin game & Màn chơi level 1.
   - ➕ **Tab 4: Soạn Thảo Thêm Màn Chơi (Level Editor)**: Chọn game của mình ➔ Thêm màn 2, 3, 4, 5...
   - ⚖️ **Tab 5: Hàng Đợi Kiểm Duyệt (Review Queue)**: Duyệt game của cộng đồng trước khi lên sàn công khai.
2. **Tích Hợp API Sinh Game AI (`POST /api/admin/games/ai-generate`)**:
   - Loading State đẹp mắt với biểu tượng Robot 🤖 quay nhẹ và thông điệp động viên.
   - Live Preview Demo với `QuestionRenderer.tsx`.
3. **Phân Quyền Giao Diện Theo Role**:
   - Nếu là `creator`: Chỉ thấy các game do chính mình tạo ra, không duyệt được game của người khác.
   - Nếu là `teacher` / `admin`: Có toàn quyền duyệt game và xem thống kê.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [x] **1. Hoàn thiện các Sub-Tabs trong `src/pages/AdminPage.tsx`**:
  - [x] Thống kê Dashboard & Biểu đồ doanh thu Recharts.
  - [x] Trình sinh game Gemini AI kèm Live Preview trực quan.
  - [x] Form tạo game thủ công (Manual Game Creator).
  - [x] Soạn thảo câu hỏi chi tiết đa dạng (Dynamic Level Builder).
  - [x] Hàng đợi kiểm duyệt giáo án (Review Queue).
- [x] **2. Xây dựng Trình Soạn Thảo Động (Dynamic Form)**:
  - [x] Hỗ trợ các loại template game: `quiz`, `matching`, `sequence`, `math`, `memory`.
- [x] **3. Xây dựng Trình Live Preview**:
  - [x] Nhúng component `QuestionRenderer.tsx` để chơi thử ngay trong Studio.
- [x] **4. Kết nối các API Admin tương ứng**.
- [x] **5. Chạy `npx tsc --noEmit` & `npm run build` kiểm tra 0 lỗi**.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Giao diện Live Preview Game AI sau khi sinh:

```tsx
export function AiGameStudio() {
  const [topic, setTopic] = useState("");
  const [template, setTemplate] = useState("matching");
  const [grade, setGrade] = useState(3);
  const [loading, setLoading] = useState(false);
  const [generatedGame, setGeneratedGame] = useState<any>(null);
  const [previewLevelIndex, setPreviewLevelIndex] = useState(0);

  const handleGenerate = async () => {
    if (!topic) return alert("Vui lòng nhập chủ đề học tập!");
    setLoading(true);
    try {
      const res = await api.aiGenerateGame({
        topic,
        template_code: template,
        grade_from: grade,
        grade_to: grade + 2,
        category: "iq",
      });
      setGeneratedGame(res.game);
    } catch (err: any) {
      alert(err.message || "Lỗi khi sinh game AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form cấu hình */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Chủ đề bài học</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ví dụ: Vòng đời của loài bướm..."
            className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Loại game</label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
          >
            <option value="matching">Nối Cột A-B</option>
            <option value="quiz">Trắc Nghiệm</option>
            <option value="sequence">Điền Dãy Số</option>
            <option value="memory">Lật Thẻ Trí Nhớ</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow active:scale-95 transition-all"
          >
            {loading ? "🤖 AI Đang Thiết Kế..." : "✨ Sinh Game Bằng AI Ngay"}
          </button>
        </div>
      </div>

      {/* Live Preview nếu đã sinh xong */}
      {generatedGame && (
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800">
            <div>
              <span className="text-xs text-purple-400 font-bold uppercase">Bản Chơi Thử Trực Tiếp</span>
              <h3 className="text-xl font-bold text-white">{generatedGame.title}</h3>
            </div>
            <div className="flex gap-2">
              {generatedGame.levels.map((lvl: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setPreviewLevelIndex(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    previewLevelIndex === idx ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Màn {lvl.level_num}
                </button>
              ))}
            </div>
          </div>
          {/* Question Shell */}
          <QuestionRenderer
            question={generatedGame.levels[previewLevelIndex].questions[0]}
            levelNum={generatedGame.levels[previewLevelIndex].level_num}
            xpReward={80}
            coinReward={20}
            onSuccess={() => alert("🎉 Bạn vừa giải mã thành công màn chơi AI!")}
            onBack={() => setGeneratedGame(null)}
          />
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
   git checkout -b feature/fe-07-admin-cms-studio
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "frontend: hoàn thiện Admin CMS Studio, AI Game Creator và Review Queue"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Test Sinh Game Bằng AI**:
  - Nhập chủ đề `"Các loài động vật rừng nhiệt đới"` ➔ Bấm Sinh Game ➔ Sau 5s hiển thị bản xem trước trò chơi 3 màn hoàn chỉnh.
  - Chơi thử màn 1 trong bản xem trước ➔ Nối cặp thành công, hiệu ứng mượt mà.
- [ ] **2. Test Thêm Màn Chơi Mới**:
  - Vào Tab "Soạn Thảo Màn Chơi" ➔ Thêm Màn 2 cho game của mình ➔ Điền dữ liệu ➔ Bấm Lưu ➔ Màn mới xuất hiện trong danh sách.
- [ ] **3. Test Hàng Đợi Kiểm Duyệt**:
  - Đăng nhập tài khoản Giáo viên ➔ Duyệt 1 game đang chờ ➔ Game được publish thành công lên sàn.
