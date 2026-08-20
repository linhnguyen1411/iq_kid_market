# [FE-04] Chuẩn Hóa & Mở Rộng Hệ Thống 10+ Game Engines (Game Engine Ecosystem)

> **Mô tả nghiệp vụ**: Nâng cấp độ mượt mà và tính tương tác của 10 Game Engines hiện có, đồng thời phát triển thêm 2 Game Engine mới (**`MathEngine.tsx`** - Giải toán tương tác với bàn phím số thông minh và **`LogicGridEngine.tsx`** - Giải đố ma trận hình ảnh Sudoku nhí). **BẮT BUỘC** tuân thủ tuyệt đối các nguyên tắc trong tài liệu `docs/GAME_ENGINE_RULES.md`.

---

## 📌 1. THÔNG TIN TASK
- **Mã Task**: `FE-04`
- **Mảng phụ trách**: Frontend (Game Engines Development / React 19 / Web Audio)
- **Độ ưu tiên**: 🟠 P1 (Quan trọng / Cốt lõi trải nghiệm chơi)
- **Người thực hiện**: _[Điền tên thành viên]_
- **Trạng thái**: 🟡 To Do (Chưa bắt đầu)
- **Branch làm việc**: `feature/fe-04-game-engines`

---

## 📖 2. ĐIỂM LƯU Ý VỀ CÔNG NGHỆ & THUẬT NGỮ CẦN NẮM

> [!IMPORTANT]
> **ĐỌC KỸ `docs/GAME_ENGINE_RULES.md` TRƯỚC KHI VIẾT CODE!**

1. **Giao Diện Bắt Buộc (`src/components/game-engines/types.ts`)**:
   - Mọi engine component chỉ được nhận đúng 2 props:
     ```typescript
     export interface GameEngineProps {
       question: Question;
       onComplete: (score: number) => void;
     }
     ```
   - **Tuyệt đối KHÔNG nhận thêm props ngoài quy ước** (như thời gian, điểm tích lũy toàn cục... — đó là việc của `QuestionRenderer.tsx`).
2. **Quy Tắc Đăng Ký Registry (`src/components/game-engines/registry.ts`)**:
   - Thêm game mới = Thêm 1 file component + Đăng ký 1 dòng vào `GAME_ENGINES`.
   - **Tuyệt đối KHÔNG sửa file `QuestionRenderer.tsx`** để thêm if/else cho loại game mới!
3. **Quy Chuẩn Âm Thanh & Hoạt Ảnh Bắt Buộc**:
   - Dùng `playSynthSound` từ `./soundUtils` (không viết lại):
     - `playSynthSound('click')`: Khi chạm/chọn phần tử.
     - `playSynthSound('correct')`: Khi giải đúng 1 bước.
     - `playSynthSound('incorrect')`: Khi chọn sai kèm hiệu ứng rung lắc `animate-shake`.
     - `playSynthSound('victory')` + `onComplete(question.points)`: Khi hoàn thành toàn bộ câu hỏi.
4. **State Guard Chống Spam**:
   - Sử dụng cờ `solved` (hoặc `matchedPairs`) để chặn người dùng tiếp tục bấm sau khi đã giải xong.

---

## 🎯 3. CHI TIẾT TÍNH NĂNG CẦN PHÁT TRIỂN (FEATURE SCOPE)

1. **Tối Ưu & Sửa Edge-cases Cho 10 Game Engines Hiện Có**:
   - `MatchingEngine.tsx`: Tối ưu vẽ đường nối hoặc highlight thẻ được chọn trên iPad/Touch screen.
   - `SortingEngine.tsx`: Cho phép kéo thả (Drag & Drop) hoặc bấm chạm tuần tự linh hoạt.
   - `MemoryEngine.tsx`: Thêm hiệu ứng lật thẻ 3D (Flip Card 180 độ).
   - `SequenceEngine.tsx`: Tự động focus vào ô trống và hiển thị nút "Xem gợi ý logic 💡".
2. **Xây Dựng Game Engine Mới: `MathEngine.tsx` (Toán Học Tương Tác)**:
   - Hiển thị phép tính trực quan bằng que tính, quả táo hoặc số học.
   - Cung cấp bàn phím số ảo (Virtual Numpad 0-9) to rõ ràng, chống ấn nhầm cho bé lớp 1-3.
   - Schema `data`:
     ```typescript
     {
       expression: "15 + 28 = ?",
       answer: "43",
       visual_items?: { emoji: "🍎", count_left: 15, count_right: 28 },
       hint?: "Cộng hàng đơn vị 5 + 8 = 13, viết 3 nhớ 1..."
     }
     ```
3. **Xây Dựng Game Engine Mới: `LogicGridEngine.tsx` (Ma Trận Logic 2x2 / 3x3)**:
   - Lưới logic điền hình còn thiếu (tương tự Sudoku nhí hoặc Raven's Matrices).
   - Bé chọn hình từ khay đáp án bên dưới kéo vào ô có dấu hỏi `?`.

---

## 📋 4. DANH SÁCH CÔNG VIỆC CHI TIẾT (CHECKLIST)

- [ ] **1. Nâng cấp 10 Game Engines hiện hữu**:
  - [ ] Kiểm tra và bổ sung đầy đủ âm thanh 4 loại (`click`, `correct`, `incorrect`, `victory`).
  - [ ] Đảm bảo comment schema `data` đầy đủ ở đầu mỗi file engine.
- [ ] **2. Tạo mới `src/components/game-engines/MathEngine.tsx`**:
  - [ ] Bàn phím số ảo to rõ ràng, phím Xóa (Backspace) và phím Xác nhận (OK).
  - [ ] Logic so khớp đáp án và gọi `onComplete(question.points)`.
- [ ] **3. Tạo mới `src/components/game-engines/LogicGridEngine.tsx`**:
  - [ ] Render ma trận 2x2 hoặc 3x3 kèm ô trống cần điền.
- [ ] **4. Đăng ký 2 engine mới vào `src/components/game-engines/registry.ts`**:
  - [ ] `math: MathEngine`
  - [ ] `logic_grid: LogicGridEngine`
- [ ] **5. Thêm dữ liệu mẫu vào `src/data/seedData.ts` & Kiểm thử**.

---

## 💡 5. HƯỚNG DẪN CODE MẪU THAM KHẢO

### Cấu trúc chuẩn của `MathEngine.tsx`:

```tsx
import { useState } from "react";
import type { GameEngineProps } from "./types";
import { playSynthSound } from "./soundUtils";
import { Delete, Check } from "lucide-react";

/**
 * SCHEMA DATA FOR MathEngine:
 * {
 *   expression: string;     // vd: "25 + 17 = ?"
 *   answer: string;         // vd: "42"
 *   hint?: string;          // Lời gợi ý khi bé cần
 * }
 */
export default function MathEngine({ question, onComplete }: GameEngineProps) {
  const data = question.data || {};
  const [inputVal, setInputVal] = useState("");
  const [isWrong, setIsWrong] = useState(false);
  const [solved, setSolved] = useState(false);

  const handleDigit = (digit: string) => {
    if (solved || inputVal.length >= 6) return;
    playSynthSound("click");
    setInputVal((prev) => prev + digit);
    setIsWrong(false);
  };

  const handleDelete = () => {
    if (solved) return;
    playSynthSound("click");
    setInputVal((prev) => prev.slice(0, -1));
  };

  const handleCheck = () => {
    if (solved || !inputVal) return;

    if (inputVal.trim() === String(data.answer).trim()) {
      setSolved(true);
      playSynthSound("victory");
      onComplete(question.points);
    } else {
      setIsWrong(true);
      playSynthSound("incorrect");
      setTimeout(() => setIsWrong(false), 800);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {/* Phép tính lớn */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-6 w-full text-center">
        <h2 className="text-3xl md:text-4xl font-bold font-mono text-slate-800 tracking-wider">
          {data.expression || "1 + 1 = ?"}
        </h2>
        {/* Ô hiển thị kết quả bé đang gõ */}
        <div
          className={`mt-4 mx-auto w-36 h-14 bg-white rounded-2xl border-4 flex items-center justify-center text-2xl font-mono font-bold transition-all ${
            isWrong
              ? "border-rose-500 bg-rose-50 animate-shake text-rose-600"
              : solved
              ? "border-emerald-500 bg-emerald-50 text-emerald-600"
              : "border-kids-blue text-slate-800"
          }`}
        >
          {inputVal || <span className="text-slate-300">?</span>}
        </div>
      </div>

      {/* Bàn phím số ảo */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            disabled={solved}
            onClick={() => handleDigit(String(num))}
            className="h-14 bg-white hover:bg-slate-100 border-2 border-slate-200 rounded-2xl font-bold text-2xl text-slate-700 shadow active:translate-y-1 transition-all"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          disabled={solved}
          onClick={handleDelete}
          className="h-14 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 rounded-2xl flex items-center justify-center text-rose-600 shadow active:translate-y-1 transition-all"
        >
          <Delete className="w-6 h-6" />
        </button>
        <button
          type="button"
          disabled={solved}
          onClick={() => handleDigit("0")}
          className="h-14 bg-white hover:bg-slate-100 border-2 border-slate-200 rounded-2xl font-bold text-2xl text-slate-700 shadow active:translate-y-1 transition-all"
        >
          0
        </button>
        <button
          type="button"
          disabled={solved}
          onClick={handleCheck}
          className="h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg active:translate-y-1 transition-all"
        >
          <Check className="w-7 h-7 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}
```

---

## 🚫 6. QUY TẮC GIT & TẠO PULL REQUEST (BẮT BUỘC)

1. **Khởi tạo branch**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/fe-04-game-engines
   ```
2. **Tuyệt đối KHÔNG commit trực tiếp vào `main`**.
3. **Commit message chuẩn**:
   ```bash
   git commit -m "game-engine: bổ sung MathEngine và LogicGridEngine theo chuẩn registry"
   ```
4. **Quy trình gửi PR**: Push branch lên remote và mở PR trỏ vào `main`.

---

## 🧪 7. TIÊU CHÍ NGHIỆM THU & BƯỚC TEST KỸ TRƯỚC KHI TẠO PR

- [ ] **1. Kiểm tra biên dịch & Không phá vỡ Registry**:
  - Chạy `npm run lint` (`tsc --noEmit`) ➔ 0 lỗi.
  - Không sửa file `QuestionRenderer.tsx`.
- [ ] **2. Chơi thử toàn bộ 10 game engines cũ**:
  - Vào chơi thử game Nối Cột (Matching), Điền Số (Sequence), Lật Thẻ (Memory), Trắc Nghiệm (Quiz)... ➔ Vẫn nộp điểm và nhận phần thưởng bình thường.
- [ ] **3. Chơi thử 2 game engines mới**:
  - Thử gõ số sai ➔ Bàn phím rung lắc màu đỏ, phát tiếng `incorrect`.
  - Thử gõ số đúng ➔ Nút chuyển xanh, phát tiếng `victory`, popup nhận thưởng xuất hiện.
