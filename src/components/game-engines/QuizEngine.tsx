import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { playSynthSound } from "./soundUtils";
import type { GameEngineProps } from "./types";

// data schema: { options: string[]; answer: string }
export default function QuizEngine({ question, onComplete }: GameEngineProps) {
  const [selectedQuizChoice, setSelectedQuizChoice] = useState<string | null>(null);
  const [isQuizFailed, setIsQuizFailed] = useState(false);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    setSelectedQuizChoice(null);
    setIsQuizFailed(false);
    setSolved(false);
  }, [question]);

  const handleChoice = (val: string) => {
    if (solved) return;
    playSynthSound('click');
    setSelectedQuizChoice(val);

    const targetAnswer = String(question.data?.answer || "").trim().toLowerCase();
    const cleanVal = val.trim().toLowerCase();

    if (targetAnswer) {
      const isCorrect =
        cleanVal === targetAnswer ||
        (cleanVal.length === 1 && (targetAnswer.startsWith(`${cleanVal}.`) || targetAnswer.startsWith(`${cleanVal})`))) ||
        (targetAnswer.length === 1 && (cleanVal.startsWith(`${targetAnswer}.`) || cleanVal.startsWith(`${targetAnswer})`)));
      if (!isCorrect) {
        playSynthSound('incorrect');
        setIsQuizFailed(true);
        setTimeout(() => setIsQuizFailed(false), 800);
        return;
      }
    }

    playSynthSound('correct');
    setSolved(true);
    playSynthSound('victory');
    onComplete(question.points, { selectedOption: val });
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 mb-6 text-slate-800 font-bold text-center text-sm md:text-base w-full">
        ❓ {question.prompt}
      </div>
      <div className="grid grid-cols-1 gap-3.5 w-full">
        {(question.data?.options || []).map((choice: string) => {
          const isSelected = selectedQuizChoice === choice;
          const isWrong = isQuizFailed && isSelected;

          return (
            <button
              id={`quiz_choice_${choice.replace(/\s+/g, '')}`}
              key={choice}
              onClick={() => handleChoice(choice)}
              className={`p-4 text-left font-display text-xs md:text-sm font-bold rounded-2xl border-2 transition-all transform active:scale-98 flex items-center justify-between ${
                isSelected && solved
                ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-none ring-4 ring-emerald-100"
                : isWrong
                ? "bg-rose-50 border-rose-500 text-rose-800 animate-shake"
                : "bg-white border-slate-200 text-slate-700 hover:border-kids-blue shadow-md hover:-translate-y-0.5"
              }`}
            >
              <span>{choice}</span>
              {isSelected && solved && <Check className="w-5 h-5 text-emerald-500 stroke-[3]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
