import { useState, useEffect } from "react";
import { playSynthSound } from "./soundUtils";
import type { GameEngineProps } from "./types";

// data schema, 2 sub-type qua data.type:
// a) unscramble: { type: "unscramble"; scrambled_words: string[]; correct_order: string[] }
// b) fill_blank:  { type?: "fill_blank"; sentence: string; options: string[]; answer: string }
interface WordToken {
  id: number;
  text: string;
}

export default function LanguageEngine({ question, onComplete }: GameEngineProps) {
  const [selectedTokens, setSelectedTokens] = useState<WordToken[]>([]);
  const [langBlankValue, setLangBlankValue] = useState<string | null>(null);
  const [isLangFailed, setIsLangFailed] = useState(false);
  const [solved, setSolved] = useState(false);

  const availableTokens: WordToken[] = (question.data?.scrambled_words || []).map((w: string, idx: number) => ({
    id: idx,
    text: w,
  }));

  useEffect(() => {
    setSelectedTokens([]);
    setLangBlankValue(null);
    setIsLangFailed(false);
    setSolved(false);
  }, [question]);

  const handleBlankChoice = (val: string) => {
    if (solved) return;
    playSynthSound('click');
    setLangBlankValue(val);

    const targetAnswer = question.data?.answer ? String(question.data.answer).trim().toLowerCase() : null;
    if (targetAnswer) {
      if (val.trim().toLowerCase() !== targetAnswer) {
        playSynthSound('incorrect');
        setIsLangFailed(true);
        setTimeout(() => setIsLangFailed(false), 800);
        return;
      }
    }

    playSynthSound('correct');
    setSolved(true);
    playSynthSound('victory');
    onComplete(question.points, { answer: val });
  };

  const handleUnscrambleTap = (token: WordToken) => {
    if (solved) return;
    playSynthSound('click');

    const updated = [...selectedTokens, token];
    setSelectedTokens(updated);

    const correctOrder: string[] = question.data?.correct_order || [];
    if (correctOrder.length > 0 && updated.length === correctOrder.length) {
      const isOk = updated.every((t, i) => t.text.trim().toLowerCase() === String(correctOrder[i]).trim().toLowerCase());
      if (isOk) {
        playSynthSound('correct');
        setSolved(true);
        playSynthSound('victory');
        onComplete(question.points, { tokens: updated.map(t => t.text) });
      } else {
        playSynthSound('incorrect');
        setIsLangFailed(true);
        setTimeout(() => {
          setIsLangFailed(false);
          setSelectedTokens([]);
        }, 1200);
      }
    } else if (correctOrder.length === 0 && updated.length === availableTokens.length) {
      playSynthSound('correct');
      setSolved(true);
      playSynthSound('victory');
      onComplete(question.points, { tokens: updated.map(t => t.text) });
    }
  };

  const handleRemoveToken = (tokenId: number) => {
    if (solved) return;
    playSynthSound('click');
    setSelectedTokens(selectedTokens.filter(t => t.id !== tokenId));
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      <div className="bg-kids-blue/5 border-2 border-kids-blue/20 rounded-2xl p-6 mb-6 text-slate-800 font-bold text-center text-sm md:text-base w-full">
        🔤 {question.prompt}
      </div>

      {question.data?.type === "unscramble" ? (
        <div className="w-full flex flex-col items-center">
          <p className="text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">
            Các từ đã chọn (Chạm từ để hoàn tác):
          </p>
          <div className="min-h-14 w-full bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-3 flex flex-wrap items-center justify-center gap-2 mb-6">
            {selectedTokens.length === 0 ? (
              <span className="text-xs text-slate-400 font-semibold italic">Chạm các từ bên dưới theo đúng thứ tự…</span>
            ) : (
              selectedTokens.map((token) => (
                <button
                  type="button"
                  key={token.id}
                  onClick={() => handleRemoveToken(token.id)}
                  className="bg-kids-purple text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-rose-500 transition-colors cursor-pointer"
                  title="Chạm để bỏ từ này"
                >
                  {token.text} ✕
                </button>
              ))
            )}
          </div>

          <p className="text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">Từ khoá xáo trộn (Chạm để ghép):</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {availableTokens.map((token) => {
              const isUsed = selectedTokens.some(t => t.id === token.id);
              return (
                <button
                  key={token.id}
                  disabled={isUsed}
                  onClick={() => handleUnscrambleTap(token)}
                  className={`px-4 py-2 rounded-xl text-xs font-black shadow transition-all ${
                    isUsed
                    ? "bg-slate-200 text-slate-400 border border-slate-200 scale-95 opacity-50 cursor-not-allowed"
                    : "bg-white border-2 border-slate-200 text-slate-700 hover:border-kids-purple hover:-translate-y-0.5 cursor-pointer"
                  }`}
                >
                  {token.text}
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
                    : "bg-white border-slate-200 text-slate-700 hover:border-kids-blue hover:-translate-y-0.5 shadow-sm cursor-pointer"
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
