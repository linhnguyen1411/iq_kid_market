import { useState, useEffect } from "react";
import { playSynthSound } from "./soundUtils";
import type { GameEngineProps } from "./types";

// data schema, 2 sub-type qua data.type:
// a) unscramble: { type: "unscramble"; scrambled_words: string[]; correct_order: string[] }
// b) fill_blank:  { type?: "fill_blank"; sentence: string; options: string[]; answer: string }
export default function LanguageEngine({ question, onComplete }: GameEngineProps) {
  const [langSelectedWords, setLangSelectedWords] = useState<string[]>([]);
  const [langBlankValue, setLangBlankValue] = useState<string | null>(null);
  const [isLangFailed, setIsLangFailed] = useState(false);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    setLangSelectedWords([]);
    setLangBlankValue(null);
    setIsLangFailed(false);
    setSolved(false);
  }, [question]);

  const handleBlankChoice = (val: string) => {
    if (solved) return;
    playSynthSound('click');
    setLangBlankValue(val);

    const targetAnswer = String(question.data?.answer || "").trim().toLowerCase();
    const isCorrect = val.trim().toLowerCase() === targetAnswer;
    if (isCorrect) {
      playSynthSound('correct');
      setSolved(true);
      playSynthSound('victory');
      onComplete(question.points);
    } else {
      playSynthSound('incorrect');
      setIsLangFailed(true);
      setTimeout(() => setIsLangFailed(false), 800);
    }
  };

  const handleUnscrambleTap = (word: string) => {
    if (solved) return;
    playSynthSound('click');

    const updated = [...langSelectedWords, word];
    setLangSelectedWords(updated);

    const correctOrder = question.data.correct_order || [];
    if (updated.length === correctOrder.length) {
      const isOk = updated.every((w, i) => w.trim().toLowerCase() === correctOrder[i].trim().toLowerCase());
      if (isOk) {
        playSynthSound('correct');
        setSolved(true);
        playSynthSound('victory');
        onComplete(question.points);
      } else {
        playSynthSound('incorrect');
        setIsLangFailed(true);
        setTimeout(() => {
          setIsLangFailed(false);
          setLangSelectedWords([]);
        }, 1200);
      }
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      <div className="bg-kids-blue/5 border-2 border-kids-blue/20 rounded-2xl p-6 mb-6 text-slate-800 font-bold text-center text-sm md:text-base w-full">
        🔤 {question.prompt}
      </div>

      {question.data?.type === "unscramble" ? (
        <div className="w-full flex flex-col items-center">
          <p className="text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">Các từ đã chọn ghép thành câu:</p>
          <div className="min-h-14 w-full bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-3 flex flex-wrap items-center justify-center gap-2 mb-6">
            {langSelectedWords.map((word, idx) => (
              <span key={idx} className="bg-kids-purple text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md">
                {word}
              </span>
            ))}
          </div>

          <p className="text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">Từ khoá xáo trộn (Chạm để ghép):</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {(question.data?.scrambled_words || []).map((word: string, idx: number) => {
              const isUsed = langSelectedWords.includes(word);
              return (
                <button
                  key={idx}
                  disabled={isUsed}
                  onClick={() => handleUnscrambleTap(word)}
                  className={`px-4 py-2 rounded-xl text-xs font-black shadow transition-all ${
                    isUsed
                    ? "bg-slate-200 text-slate-400 border border-slate-200 scale-95 opacity-50 cursor-not-allowed"
                    : "bg-white border-2 border-slate-200 text-slate-700 hover:border-kids-purple hover:-translate-y-0.5"
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          <div className="text-center font-display text-sm md:text-base font-bold text-slate-700 bg-white shadow rounded-2xl p-4 border-2 border-slate-100 mb-6 w-full">
            {String(question.data?.sentence || "").replace("_", " " + (langBlankValue || "_________") + " ")}
          </div>

          <div className="grid grid-cols-2 gap-3.5 w-full">
            {(question.data?.options || []).map((opt: string) => {
              const isSelected = langBlankValue === opt;
              const isWrong = isLangFailed && isSelected;
              return (
                <button
                  key={opt}
                  onClick={() => handleBlankChoice(opt)}
                  className={`p-3 text-xs md:text-sm font-black rounded-xl border-2 transition-all transform active:scale-95 ${
                    isSelected && solved
                    ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                    : isWrong
                    ? "bg-rose-50 border-rose-400 text-rose-800"
                    : "bg-white border-slate-200 text-slate-700 hover:border-kids-blue hover:-translate-y-0.5 shadow-sm"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
