import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { playSynthSound, shuffleArray } from "./soundUtils";
import type { GameEngineProps } from "./types";

// data schema: { pairs: [{ left: string; right: string }, ...] }
export default function MatchingEngine({ question, onComplete }: GameEngineProps) {
  const [matchingLefts, setMatchingLefts] = useState<string[]>([]);
  const [matchingRights, setMatchingRights] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [wrongMatchKeys, setWrongMatchKeys] = useState<{ left: string; right: string } | null>(null);

  useEffect(() => {
    const pairs = question.data?.pairs || [];
    setMatchingLefts(shuffleArray(pairs.map((p: any) => p?.left || "")));
    setMatchingRights(shuffleArray(pairs.map((p: any) => p?.right || "")));
    setSelectedLeft(null);
    setMatchedPairs({});
    setWrongMatchKeys(null);
  }, [question]);

  const handleLeftClick = (leftVal: string) => {
    if (matchedPairs[leftVal]) return; // Already linked
    playSynthSound('click');
    setSelectedLeft(leftVal);
  };

  const handleRightClick = (rightVal: string) => {
    if (!selectedLeft) return; // Must select left card first

    const pairs = question.data?.pairs || [];
    const targetPair = pairs.find((p: any) => p?.left === selectedLeft);
    const isCorrect = targetPair && targetPair.right === rightVal;

    if (isCorrect) {
      playSynthSound('correct');
      const updated = { ...matchedPairs, [selectedLeft]: rightVal };
      setMatchedPairs(updated);
      setSelectedLeft(null);

      if (Object.keys(updated).length === pairs.length) {
        playSynthSound('victory');
        onComplete(question.points);
      }
    } else {
      playSynthSound('incorrect');
      setWrongMatchKeys({ left: selectedLeft, right: rightVal });
      setTimeout(() => {
        setWrongMatchKeys(null);
        setSelectedLeft(null);
      }, 800);
    }
  };

  return (
    <div id="matching_board" className="w-full grid grid-cols-2 gap-x-8 md:gap-x-16 gap-y-4 max-w-xl mx-auto">
      {/* Left Scrambled Terms */}
      <div className="flex flex-col gap-3.5">
        <div className="text-center font-display text-sm text-slate-500 mb-1 font-bold">CỘT A</div>
        {matchingLefts.map((leftItem) => {
          const isMatched = !!matchedPairs[leftItem];
          const isSelected = selectedLeft === leftItem;
          const isWrongHighlight = wrongMatchKeys?.left === leftItem;

          return (
            <motion.button
              id={`match_left_${leftItem.replace(/\s+/g, '')}`}
              key={leftItem}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleLeftClick(leftItem)}
              disabled={isMatched}
              className={`p-4 md:p-5 text-sm md:text-base font-bold rounded-2xl border-2 transition-all duration-200 text-left flex justify-between items-center ${
                isMatched
                ? "bg-emerald-50 border-emerald-400 text-emerald-800 pointer-events-none shadow-none"
                : isSelected
                ? "bg-kids-blue/20 border-kids-blue text-kids-blue scale-102 ring-4 ring-kids-blue/25"
                : isWrongHighlight
                ? "bg-rose-100 border-rose-400 text-rose-800 animate-bounce"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-md transform hover:-translate-y-0.5"
              }`}
            >
              <span className="truncate max-w-[150px]">{leftItem}</span>
              {isMatched ? (
                <Check className="w-5 h-5 text-emerald-500 stroke-[3]" />
              ) : isSelected ? (
                <div className="w-2.5 h-2.5 rounded-full bg-kids-blue animate-ping" />
              ) : null}
            </motion.button>
          );
        })}
      </div>

      {/* Right Scrambled Matches */}
      <div className="flex flex-col gap-3.5">
        <div className="text-center font-display text-sm text-slate-500 mb-1 font-bold">CỘT B</div>
        {matchingRights.map((rightItem) => {
          const linkedLeft = Object.keys(matchedPairs).find(k => matchedPairs[k] === rightItem);
          const isMatched = !!linkedLeft;
          const isWrongHighlight = wrongMatchKeys?.right === rightItem;

          return (
            <motion.button
              id={`match_right_${rightItem.replace(/\s+/g, '')}`}
              key={rightItem}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRightClick(rightItem)}
              disabled={isMatched || !selectedLeft}
              className={`p-4 md:p-5 text-sm md:text-base font-bold rounded-2xl border-2 transition-all duration-200 text-left flex justify-between items-center ${
                isMatched
                ? "bg-emerald-50 border-emerald-400 text-emerald-800 pointer-events-none shadow-none"
                : !selectedLeft
                ? "bg-slate-50 border-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                : isWrongHighlight
                ? "bg-rose-100 border-rose-400 text-rose-800 animate-bounce"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-md transform hover:-translate-y-0.5"
              }`}
            >
              <span className="truncate max-w-[150px]">{rightItem}</span>
              {isMatched && <Check className="w-5 h-5 text-emerald-500 stroke-[3]" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
