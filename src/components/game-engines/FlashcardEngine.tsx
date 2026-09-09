import { useState, useEffect } from "react";
import { Volume2 } from "lucide-react";
import { playSynthSound } from "./soundUtils";
import type { GameEngineProps } from "./types";

// data schema: { cards: [{ front: string; back: string; pronounce?: string; fact?: string }, ...] }
export default function FlashcardEngine({ question, onComplete }: GameEngineProps) {
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  useEffect(() => {
    setFlashcardIdx(0);
    setCardFlipped(false);
  }, [question]);

  const handleLearnComplete = () => {
    playSynthSound('correct');
    playSynthSound('victory');
    const total = (question.data?.cards || []).length;
    onComplete(question.points, { completed: true, cardsViewed: total });
  };

  const card = (question.data?.cards || [])[flashcardIdx] || { front: "Front Data", back: "Back Data", fact: "Fact", pronounce: "Pronounce" };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      <div className="text-xxs font-mono text-slate-400 font-bold uppercase tracking-widest mb-4">
        Thẻ thông tin: {flashcardIdx + 1} / {(question.data?.cards || []).length}
      </div>

      <div className="w-full max-w-sm h-64 relative cursor-pointer mb-6" onClick={() => setCardFlipped(!cardFlipped)}>
        <div className={`w-full h-full rounded-2xl border-3 bg-white shadow-xl transition-all duration-500 transform flex flex-col items-center justify-center p-6 text-center ${
          cardFlipped ? "border-kids-purple rotate-y-180" : "border-slate-200"
        }`}>
          {!cardFlipped ? (
            <div className="flex flex-col items-center gap-3">
              <span className="text-2xl md:text-3xl text-kids-purple">📚</span>
              <h3 className="text-xl md:text-2xl font-bold font-display text-slate-800">{card.front}</h3>
              {card.pronounce && <p className="text-xxs font-mono bg-slate-100 text-slate-500 py-1 px-2.5 rounded-full font-bold">Phát âm: /{card.pronounce}/</p>}
              <span className="text-[10px] text-slate-300 uppercase tracking-widest font-mono font-bold mt-4">Chạm để lật mở mặt sau</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 transform rotate-y-180">
              <span className="text-xl md:text-2xl text-emerald-500 font-bold">Ý nghĩa</span>
              <p className="text-sm md:text-base font-bold text-slate-700 leading-relaxed font-sans">{card.back}</p>
              {card.fact && <p className="text-xxs text-slate-400 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100 mt-2">💡 Sự thật thú vị: {card.fact}</p>}
              <span className="text-[10px] text-slate-300 uppercase tracking-widest font-mono font-bold mt-4">Chạm để quay lại mặt trước</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 w-full justify-center">
        <button
          type="button"
          onClick={() => {
            const c = (question.data?.cards || [])[flashcardIdx];
            if (c) {
              playSynthSound('click');
              const textToSpeak = cardFlipped ? c.back : c.front;
              const cleanText = textToSpeak.replace(/🇦🇳|🇬🇧|🇻🇳|🇺🇸/g, "");
              const utterance = new SpeechSynthesisUtterance(cleanText);
              utterance.rate = 0.95;
              window.speechSynthesis.speak(utterance);
            }
          }}
          className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-bold flex items-center gap-1 text-xs"
        >
          <Volume2 className="w-4 h-4 text-kids-purple animate-bounce" /> Đọc âm thanh
        </button>

        {flashcardIdx < (question.data?.cards || []).length - 1 ? (
          <button
            type="button"
            onClick={() => {
              playSynthSound('click');
              setFlashcardIdx(flashcardIdx + 1);
              setCardFlipped(false);
            }}
            className="px-5 py-3 bg-kids-purple text-white rounded-xl transition-all shadow font-extrabold text-xs hover:-translate-y-0.5"
          >
            Thẻ tiếp theo ➡️
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLearnComplete}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all font-extrabold text-xs shadow hover:-translate-y-0.5"
          >
            🎉 Hoàn thành bài học!
          </button>
        )}
      </div>
    </div>
  );
}
