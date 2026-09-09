import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { playSynthSound, shuffleArray } from "./soundUtils";
import type { GameEngineProps } from "./types";

// data schema: { items: string[]; theme?: "con_vat" | "trai_cay" | string }
export default function MemoryEngine({ question, onComplete }: GameEngineProps) {
  const [memCards, setMemCards] = useState<Array<{ id: number; symbol: string; isFlipped: boolean; isMatched: boolean }>>([]);
  const [selectedCardIdxs, setSelectedCardIdxs] = useState<number[]>([]);
  const [flipsCount, setFlipsCount] = useState(0);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const items = question.data?.items || [];
    const doubled = [...items, ...items].map((symbol, index) => ({
      id: index,
      symbol,
      isFlipped: false,
      isMatched: false
    }));
    setMemCards(shuffleArray(doubled));
    setSelectedCardIdxs([]);
    setFlipsCount(0);
    setSolved(false);
  }, [question]);

  const handleCardClick = (idx: number) => {
    if (solved) return;
    const card = memCards[idx];
    if (card.isFlipped || card.isMatched) return;
    if (selectedCardIdxs.length >= 2) return;

    playSynthSound('click');
    setFlipsCount(f => f + 1);

    const updatedCards = [...memCards];
    updatedCards[idx].isFlipped = true;
    setMemCards(updatedCards);

    const newFlipped = [...selectedCardIdxs, idx];
    setSelectedCardIdxs(newFlipped);

    if (newFlipped.length === 2) {
      const idx1 = newFlipped[0];
      const idx2 = newFlipped[1];
      const card1 = updatedCards[idx1];
      const card2 = updatedCards[idx2];

      if (card1.symbol === card2.symbol) {
        setTimeout(() => {
          playSynthSound('correct');
          const matchedList = updatedCards.map((c, i) => {
            if (i === idx1 || i === idx2) {
              return { ...c, isMatched: true, isFlipped: true };
            }
            return c;
          });
          setMemCards(matchedList);
          setSelectedCardIdxs([]);

          const isAllSolved = matchedList.every(c => c.isMatched);
          if (isAllSolved) {
            setSolved(true);
            playSynthSound('victory');
            const totalPairs = (question.data?.items || []).length;
            onComplete(question.points, {
              completed: true,
              matchesCount: totalPairs,
              flipsCount: Math.max(flipsCount + 1, totalPairs * 2),
            });
          }
        }, 500);
      } else {
        setTimeout(() => {
          playSynthSound('incorrect');
          const resetList = updatedCards.map((c, i) => {
            if (i === idx1 || i === idx2) {
              return { ...c, isFlipped: false };
            }
            return c;
          });
          setMemCards(resetList);
          setSelectedCardIdxs([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex justify-between items-center w-full max-w-sm mb-4 px-2 text-xs font-mono text-slate-500 font-bold">
        <span>Chủ Đề: {question.data?.theme === 'con_vat' ? "Sở Thú 🦁" : question.data?.theme === 'trai_cay' ? "Trái Cây 🍎" : "Trường Học 🎒"}</span>
        <span>Lượt lật: {flipsCount}</span>
      </div>

      <div
        id="memory_grid"
        className={`grid gap-3.5 max-w-md w-full p-2 bg-slate-50 rounded-2xl border border-slate-100 justify-center ${
          memCards.length <= 4
          ? "grid-cols-2"
          : memCards.length <= 8
          ? "grid-cols-4"
          : "grid-cols-4"
        }`}
      >
        {memCards.map((card, idx) => {
          const visible = card.isFlipped || card.isMatched;

          return (
            <motion.button
              id={`card_tile_${idx}`}
              key={card.id}
              whileHover={{ scale: visible ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardClick(idx)}
              className={`w-18 h-18 md:w-20 md:h-20 rounded-2xl flex items-center justify-center font-display text-2xl md:text-3xl font-bold transition-all duration-300 shadow ${
                card.isMatched
                ? "bg-emerald-50 border-3 border-emerald-300 text-emerald-700 pointer-events-none opacity-80"
                : card.isFlipped
                ? "bg-white border-3 border-kids-blue text-slate-800 rotate-y-180"
                : "bg-gradient-to-br from-kids-purple to-indigo-600 text-white border-3 border-white select-none shadow-md"
              }`}
            >
              {visible ? card.symbol : "❓"}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
