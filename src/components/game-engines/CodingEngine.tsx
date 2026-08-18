import { useState, useEffect } from "react";
import { playSynthSound } from "./soundUtils";
import type { GameEngineProps } from "./types";

// data schema: { challenge?: string; code_block: string; options: string[]; answer: string }
export default function CodingEngine({ question, onComplete }: GameEngineProps) {
  const [selectedCodingChoice, setSelectedCodingChoice] = useState<string | null>(null);
  const [isCodingFailed, setIsCodingFailed] = useState(false);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    setSelectedCodingChoice(null);
    setIsCodingFailed(false);
    setSolved(false);
  }, [question]);

  const handleChoice = (val: string) => {
    if (solved) return;
    playSynthSound('click');
    setSelectedCodingChoice(val);

    const targetAnswer = String(question.data?.answer || "").trim().toLowerCase();
    const isCorrect = val.trim().toLowerCase() === targetAnswer;
    if (isCorrect) {
      playSynthSound('correct');
      setSolved(true);
      playSynthSound('victory');
      onComplete(question.points);
    } else {
      playSynthSound('incorrect');
      setIsCodingFailed(true);
      setTimeout(() => setIsCodingFailed(false), 800);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 mb-4 text-center text-slate-700 font-bold text-xs md:text-sm w-full">
        💻 {question.prompt || question.data?.challenge}
      </div>

      <div className="w-full bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-xs mb-6 border border-slate-800 shadow-md text-left overflow-x-auto">
        <span className="text-slate-500 uppercase tracking-widest text-[9px] font-bold block mb-1">Mã Lập Trình Sai (Bugged):</span>
        <pre className="whitespace-pre">{question.data?.code_block}</pre>
      </div>

      <p className="text-xxs font-mono text-slate-400 font-bold uppercase tracking-widest mb-3 text-center">Phương án sửa lỗi chính xác:</p>
      <div className="grid grid-cols-1 gap-3 w-full">
        {(question.data?.options || []).map((choice: string) => {
          const isSelected = selectedCodingChoice === choice;
          const isWrong = isCodingFailed && isSelected;

          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              className={`p-3.5 text-left font-mono text-xs font-bold rounded-xl border-2 transition-all transform active:scale-95 ${
                isSelected && solved
                ? "bg-emerald-950 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30"
                : isWrong
                ? "bg-rose-950 border-rose-500 text-rose-300 animate-shake"
                : "bg-white border-slate-200 text-slate-700 hover:border-kids-blue shadow-sm hover:-translate-y-0.5"
              }`}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}
