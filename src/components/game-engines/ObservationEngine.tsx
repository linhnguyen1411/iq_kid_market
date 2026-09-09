import { useState, useEffect } from "react";
import { playSynthSound } from "./soundUtils";
import type { GameEngineProps } from "./types";

// data schema: { grid: string[][]; answer?: string; target_row?: number; target_col?: number }
export default function ObservationEngine({ question, onComplete }: GameEngineProps) {
  const [solved, setSolved] = useState(false);
  const [isObsFailed, setIsObsFailed] = useState(false);

  useEffect(() => {
    setSolved(false);
    setIsObsFailed(false);
  }, [question]);

  const handleTap = (cell: string, r: number, c: number) => {
    if (solved) return;
    playSynthSound('click');

    const cellText = String(cell || "").trim();
    const answerText = question.data?.answer ? String(question.data.answer).trim() : null;
    const targetRow = question.data?.target_row;
    const targetCol = question.data?.target_col;

    if (answerText || (targetRow !== undefined && targetCol !== undefined)) {
      const isCorrect =
        (answerText && cellText === answerText) ||
        (targetRow === r && targetCol === c);
      if (!isCorrect) {
        playSynthSound('incorrect');
        setIsObsFailed(true);
        setTimeout(() => setIsObsFailed(false), 800);
        return;
      }
    }

    playSynthSound('correct');
    setSolved(true);
    playSynthSound('victory');
    onComplete(question.points, { row: r, col: c, cell: cellText, answer: cellText });
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 mb-6 text-center text-slate-700 font-bold text-sm w-full">
        👀 {question.prompt}
      </div>

      <div className="bg-white border-2 border-slate-100 shadow rounded-2xl p-5 w-auto flex flex-col gap-2.5 justify-center items-center">
        {(question.data?.grid || []).map((row: string[], rIdx: number) => (
          <div key={rIdx} className="flex gap-2.5">
            {row.map((cell: string, cIdx: number) => (
              <button
                key={cIdx}
                onClick={() => handleTap(cell, rIdx, cIdx)}
                className={`w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 rounded-xl text-2xl flex items-center justify-center border-2 border-slate-200 shadow-sm transition-all duration-100 active:scale-90`}
              >
                {cell}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
