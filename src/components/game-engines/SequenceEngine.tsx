import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { HelpCircle } from "lucide-react";
import { playSynthSound, shuffleArray } from "./soundUtils";
import type { GameEngineProps } from "./types";

// data schema: { sequence: (string|"?")[]; answer: string; options?: string[]; explanation?: string }
export default function SequenceEngine({ question, onComplete }: GameEngineProps) {
  const [seqOptions, setSeqOptions] = useState<string[]>([]);
  const [selectedSeqVal, setSelectedSeqVal] = useState<string | null>(null);
  const [isSeqFailed, setIsSeqFailed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const qData = question.data;
    let options: string[] = [];
    if (qData?.options && Array.isArray(qData.options)) {
      options = [...qData.options];
    } else {
      const correctnessVal = Number(qData?.answer);
      if (!isNaN(correctnessVal)) {
        options.push(String(correctnessVal));
        options.push(String(correctnessVal + (Math.random() > 0.5 ? 2 : -2)));
        options.push(String(correctnessVal * (Math.random() > 0.5 ? 2 : 3)));
        options.push(String(correctnessVal + 5));
      } else if (qData?.answer) {
        options.push(qData.answer);
        options.push("99");
        options.push("0");
        options.push("15");
      }
    }
    setSeqOptions(shuffleArray(Array.from(new Set(options))));
    setSelectedSeqVal(null);
    setIsSeqFailed(false);
    setSolved(false);
    setShowExplanation(false);
  }, [question]);

  const handleChoice = (val: string) => {
    if (solved) return;
    playSynthSound('click');
    setSelectedSeqVal(val);

    const correctAnswer = question.data?.answer || "";
    if (val === correctAnswer) {
      playSynthSound('correct');
      setSolved(true);
      playSynthSound('victory');
      onComplete(question.points);
    } else {
      playSynthSound('incorrect');
      setIsSeqFailed(true);
      setTimeout(() => setIsSeqFailed(false), 800);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      {/* Visual Sequence Balloons */}
      <div id="sequence_display" className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-10">
        {(question.data?.sequence || []).map((item: string, idx: number) => {
          const isUnknown = item === "?";
          return (
            <motion.div
              id={`seq_bubble_${idx}`}
              key={idx}
              initial={{ scale: 0.8, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", delay: idx * 0.1 }}
              className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center font-display text-xl md:text-2xl font-bold shadow-lg relative ${
                isUnknown
                ? "bg-kids-yellow text-slate-800 border-4 border-slate-800 animate-pulse"
                : "bg-white text-slate-700 border-4 border-slate-100"
              }`}
            >
              {item}
              <div className="absolute left-1/2 -bottom-6 w-0.5 h-6 bg-slate-300 transform -translate-x-1/2" />
            </motion.div>
          );
        })}
      </div>

      <h4 className="text-slate-500 font-display text-sm mb-4">CHỌN SỐ ĐÚNG CHO DẤU ?</h4>
      <div className="grid grid-cols-2 gap-4 w-full">
        {seqOptions.map((choice) => {
          const isSelected = selectedSeqVal === choice;
          const isWrong = isSeqFailed && isSelected;

          return (
            <button
              id={`seq_choice_${choice}`}
              key={choice}
              onClick={() => handleChoice(choice)}
              className={`p-4 text-base font-display text-lg font-bold rounded-2xl border-3 transition-all transform active:scale-95 ${
                isSelected && solved
                ? "bg-emerald-500 border-emerald-600 text-white shadow-none"
                : isWrong
                ? "bg-rose-500 border-rose-600 text-white animate-shake"
                : "bg-white border-slate-200 text-slate-700 hover:border-kids-blue shadow-md hover:-translate-y-0.5"
              }`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex gap-3">
        <button
          id="trigger_hints"
          onClick={() => setShowExplanation(!showExplanation)}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs transition-all border border-purple-200"
        >
          <HelpCircle className="w-4 h-4" /> {showExplanation ? "Ẩn gợi ý" : "Xem gợi ý học tập"}
        </button>
      </div>

      {showExplanation && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-50 border border-purple-100 text-purple-900 rounded-xl p-4 mt-4 text-xs md:text-sm text-left leading-relaxed w-full"
        >
          💡 <strong>Cách giải: </strong> {question.data?.explanation || "Chưa có lời giải chi tiết."}
        </motion.div>
      )}
    </div>
  );
}
