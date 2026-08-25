export const DEFAULT_LEVEL_COUNT = 20;
export const FREE_LEVEL_COUNT = 5;
/** Giá mở khóa 15 màn còn lại khi AI tạo game (xu). */
export const DEFAULT_UNLOCK_PRICE = 15000;

/** Thể loại text/emoji — giáo viên export/import pack, không cần media. */
export const TEXT_PACK_TEMPLATES = [
  { code: 'quiz', label: 'Trắc nghiệm (Quiz)' },
  { code: 'matching', label: 'Nối cặp (Matching)' },
  { code: 'sequence', label: 'Dãy số (Sequence)' },
  { code: 'math', label: 'Toán (Math)' },
  { code: 'memory', label: 'Trí nhớ (Memory)' },
  { code: 'language', label: 'Ngôn ngữ (Language)' },
  { code: 'observation', label: 'Quan sát (Observation)' },
  { code: 'sorting', label: 'Sắp xếp (Sorting)' },
  { code: 'flashcard', label: 'Thẻ ghi nhớ (Flashcard)' },
  { code: 'coding', label: 'Lập trình chữ (Coding)' },
] as const;

export function isLevelFree(levelNum: number): boolean {
  return levelNum >= 1 && levelNum <= FREE_LEVEL_COUNT;
}

/** Màn 1–5 luôn chơi được; màn 6+ cần đã mua/mở khóa bằng ví. */
export function canAccessLevel(levelNum: number, isPurchased: boolean): boolean {
  return isLevelFree(levelNum) || isPurchased;
}

export function paidLevelCount(totalLevels = DEFAULT_LEVEL_COUNT): number {
  return Math.max(0, totalLevels - FREE_LEVEL_COUNT);
}
