import type { GameEngineComponent } from "./types";
import MatchingEngine from "./MatchingEngine";
import SequenceEngine from "./SequenceEngine";
import MemoryEngine from "./MemoryEngine";
import QuizEngine from "./QuizEngine";
import LanguageEngine from "./LanguageEngine";
import ObservationEngine from "./ObservationEngine";
import SortingEngine from "./SortingEngine";
import FlashcardEngine from "./FlashcardEngine";
import ScratchEngine from "./ScratchEngine";
import CodingEngine from "./CodingEngine";

/**
 * ĐĂNG KÝ GAME ENGINE Ở ĐÂY.
 *
 * Thêm 1 game engine mới:
 *  1. Tạo file NewEngine.tsx trong thư mục này, export default component nhận props { question, onComplete }.
 *  2. Thêm 1 dòng vào map bên dưới: "new_type": NewEngine.
 *  3. Xong. Không cần sửa QuestionRenderer.tsx hay bất kỳ file nào khác.
 *  4. Data cho game mới chỉ cần push vào seedData.ts / DB với question_type: "new_type".
 */
export const GAME_ENGINES: Record<string, GameEngineComponent> = {
  matching: MatchingEngine,
  sequence: SequenceEngine,
  memory: MemoryEngine,
  quiz: QuizEngine,
  language: LanguageEngine,
  observation: ObservationEngine,
  sorting: SortingEngine,
  flashcard: FlashcardEngine,
  scratch: ScratchEngine,
  coding: CodingEngine,
};
