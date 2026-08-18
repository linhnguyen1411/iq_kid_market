# GAME ENGINE — RULES & HƯỚNG DẪN SỬ DỤNG

> File này là **rule bắt buộc đọc trước khi đụng vào bất kỳ game/level nào** trong IQ Kids Marketplace.
> Dùng trực tiếp làm system prompt/rule cho Cursor, Claude Code khi làm việc trong repo này.

---

## 1. KIẾN TRÚC TỔNG QUAN

```
src/components/
  QuestionRenderer.tsx        <- SHELL: chỉ lo header/timer/success-screen. KHÔNG chứa logic game.
  game-engines/
    types.ts                  <- interface chung, MỌI engine phải tuân theo
    soundUtils.ts              <- playSynthSound(), shuffleArray() dùng chung
    registry.ts                 <- map question_type -> Component. CHỖ DUY NHẤT đăng ký engine mới
    MatchingEngine.tsx
    SequenceEngine.tsx
    MemoryEngine.tsx
    QuizEngine.tsx
    LanguageEngine.tsx
    ObservationEngine.tsx
    SortingEngine.tsx
    FlashcardEngine.tsx
    ScratchEngine.tsx
    CodingEngine.tsx
```

**Nguyên tắc bất biến:**
- Mỗi loại game = 1 file component riêng, tự quản lý state, tự vẽ UI, tự chấm đúng/sai.
- `QuestionRenderer.tsx` không bao giờ biết chi tiết bên trong 1 game cụ thể — nó chỉ lookup `GAME_ENGINES[question.question_type]` rồi render.
- **Thêm game mới = thêm 1 file + 1 dòng registry. KHÔNG BAO GIỜ sửa `QuestionRenderer.tsx` để thêm loại game.**

---

## 2. INTERFACE BẮT BUỘC (`types.ts`)

```ts
export interface Question {
  id: string;
  question_type: string;   // key trong registry, vd "matching", "quiz"...
  prompt: string;           // câu hỏi/hướng dẫn hiển thị
  points: number;           // điểm thưởng khi giải xong
  data: any;                 // schema riêng theo từng loại game (xem mục 4)
}

export interface GameEngineProps {
  question: Question;
  onComplete: (score: number) => void;  // GỌI ĐÚNG 1 LẦN khi giải xong
}
```

Mọi engine component:
```tsx
export default function TenEngine({ question, onComplete }: GameEngineProps) {
  // state nội bộ ở đây (useState, useEffect reset theo `question`)
  // khi user giải đúng: onComplete(question.points)
  return <div>...</div>;
}
```

**Không nhận thêm props nào khác.** Nếu thấy cần thêm state global (điểm, thời gian...) — đó là việc của `QuestionRenderer.tsx`, không phải của engine.

---

## 3. QUY TRÌNH THÊM 1 GAME ENGINE MỚI

1. Tạo file `src/components/game-engines/TenEngineMoi.tsx`.
2. Import `playSynthSound`, `shuffleArray` từ `./soundUtils` nếu cần (không tự viết lại).
3. Component nhận đúng `{ question, onComplete }: GameEngineProps`.
4. Trong file, viết comment schema `data` ngay trên khai báo component (xem cách các file khác đang làm), để không ai phải đoán field.
5. Đăng ký vào `registry.ts`:
   ```ts
   import TenEngineMoi from "./TenEngineMoi";
   export const GAME_ENGINES: Record<string, GameEngineComponent> = {
     ...
     ten_type_moi: TenEngineMoi,
   };
   ```
6. **XONG.** Không đụng `QuestionRenderer.tsx`, không đụng engine khác.
7. Viết data mẫu, push vào `seedData.ts` (hoặc tạo qua Admin CMS `/api/admin/games` / `/api/admin/levels/add`) với `question_type: "ten_type_moi"`.

**Quy tắc âm thanh/UX bắt buộc theo mọi engine hiện có** (giữ nhất quán trải nghiệm):
- `playSynthSound('click')` khi user tương tác (chọn, chạm).
- `playSynthSound('correct')` khi đúng 1 bước.
- `playSynthSound('incorrect')` khi sai + hiệu ứng `animate-shake`/`animate-bounce` khoảng 800ms rồi reset.
- `playSynthSound('victory')` + `onComplete(question.points)` khi giải xong toàn bộ.
- Guard chặn spam bấm sau khi đã giải xong bằng 1 state cục bộ `solved` (xem `QuizEngine.tsx`, `SequenceEngine.tsx` làm mẫu) — **trừ** loại nào việc unmount ngay là đủ (như `MatchingEngine.tsx` chặn bằng chính state `matchedPairs`).

---

## 4. SCHEMA `data` CHO 10 ENGINE HIỆN CÓ

### `matching` — Nối cột A-B
```ts
{ pairs: [{ left: string; right: string }, ...] }
```
Tự check đúng/sai theo `pairs`, không cần field `answer` riêng.

### `sequence` — Điền số/chữ vào dãy
```ts
{
  sequence: (string | "?")[];  // "?" là ô cần điền
  answer: string;
  options?: string[];           // không có thì engine tự sinh nhiễu quanh answer
  explanation?: string;         // hiện khi bấm "Xem gợi ý"
}
```

### `memory` — Lật thẻ tìm cặp
```ts
{ items: string[]; theme?: "con_vat" | "trai_cay" | string }
```
`items` sẽ tự nhân đôi để tạo cặp lật thẻ.

### `quiz` — Trắc nghiệm 1 đáp án
```ts
{ options: string[]; answer: string }  // so khớp không phân biệt hoa/thường
```

### `language` — 2 sub-type qua `data.type`
**Unscramble (ghép từ thành câu):**
```ts
{ type: "unscramble"; scrambled_words: string[]; correct_order: string[] }
```
**Fill-blank (điền chỗ trống):**
```ts
{ type?: "fill_blank" | undefined; sentence: string; options: string[]; answer: string }
```
`sentence` chứa dấu `_` làm chỗ trống.

### `observation` — Tìm ô đúng trong lưới
```ts
{
  grid: string[][];
  answer?: string;        // match theo nội dung ô
  target_row?: number;    // hoặc match theo toạ độ
  target_col?: number;
}
```

### `sorting` — Sắp xếp thứ tự quy trình
```ts
{
  instruction?: string;
  items: [{ id: string; label: string }, ...];
  correct_sequence_ids: string[];
}
```

### `flashcard` — Học từ vựng/kiến thức (không có sai, học xong bấm hoàn thành)
```ts
{
  cards: [{ front: string; back: string; pronounce?: string; fact?: string }, ...]
}
```

### `scratch` — Lập trình kéo-thả kiểu Scratch (demo, bấm nút là qua, chưa check logic thật)
```ts
{
  cat_pos: [row: number, col: number];   // lưới 4x4
  star_pos: [row: number, col: number];
  target_block_sequence: string;          // vd "move_up,move_right,turn_left"
}
```

### `coding` — Sửa lỗi code (trắc nghiệm)
```ts
{ challenge?: string; code_block: string; options: string[]; answer: string }
```

---

## 5. CÁCH THÊM DATA CHO GAME/MÀN CÓ SẴN (không cần code)

**Cách 1 — sửa trực tiếp seed (chỉ áp dụng lúc dev/seed lại DB):**
Sửa `src/data/seedData.ts` → chạy lại export + seed backend (xem `backend/README.md`, mục seed).

**Cách 2 — qua Admin API (khuyên dùng, không cần đụng code/deploy lại):**
```
POST /api/admin/games              -> tạo game mới (level 1 mặc định theo template_code)
POST /api/admin/levels/add         -> thêm/ghi đè 1 màn cho game đã có
POST /api/admin/games/ai-generate  -> AI (Gemini) tự sinh game 3 màn theo chủ đề
POST /api/admin/games/upload       -> upload nguyên khối JSON game (đóng gói sẵn)
```
Body của `/api/admin/levels/add`:
```json
{
  "gameId": "g1",
  "level_num": 5,
  "title": "Màn 5: ...",
  "xp_reward": 80,
  "coin_reward": 20,
  "creatorId": "u2",
  "question": {
    "question_type": "matching",
    "prompt": "...",
    "points": 25,
    "data": { "pairs": [...] }
  }
}
```
`question.data` phải đúng schema ở mục 4 theo `question_type` tương ứng.

---

## 6. NHỮNG GÌ **KHÔNG ĐƯỢC LÀM**

- ❌ Sửa `QuestionRenderer.tsx` để thêm if/else cho loại game mới — luôn luôn dùng registry.
- ❌ Cho 1 engine tự ý đọc/ghi state của engine khác hoặc của `QuestionRenderer` (ngoài `question`, `onComplete`).
- ❌ Gọi `onComplete` nhiều lần hoặc gọi trước khi thật sự giải xong.
- ❌ Đặt `question_type` mới mà không thêm vào `registry.ts` — sẽ rơi vào fallback lỗi "Chưa có game engine cho question_type: ..." (xem `QuestionRenderer.tsx`), không crash trắng màn hình nhưng game sẽ không chơi được.
- ❌ Thêm field vào `data` mà không viết comment schema trên đầu file engine tương ứng.

---

## 7. CHECKLIST NHANH KHI AI CODING TOOL (Cursor/Claude Code) ĐƯỢC YÊU CẦU "THÊM GAME MỚI"

1. Hỏi/xác định: loại tương tác có khớp 1 trong 10 `question_type` sẵn có không?
   - Khớp → chỉ cần viết `data` theo mục 4, dùng Admin API hoặc seed, KHÔNG viết code.
   - Không khớp (cơ chế chơi hoàn toàn mới) → làm theo mục 3.
2. Nếu viết engine mới: copy cấu trúc 1 file gần giống nhất (vd `QuizEngine.tsx` cho dạng chọn đáp án, `SortingEngine.tsx` cho dạng kéo-thả tuần tự) làm khung, không viết lại từ đầu.
3. Luôn giữ nguyên: Tailwind class pattern, `motion/react` cho animation, sound effect 4 loại (`click/correct/incorrect/victory`) — để đồng bộ trải nghiệm với 10 engine hiện có.
4. Chạy `npx tsc --noEmit` trước khi coi là xong.
