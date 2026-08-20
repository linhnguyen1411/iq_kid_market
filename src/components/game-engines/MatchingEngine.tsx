import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Sparkles, AlertCircle, HelpCircle } from "lucide-react";
import { playSynthSound, shuffleArray } from "./soundUtils";
import type { GameEngineProps } from "./types";

interface PairItem {
  left: string;
  right: string;
}

export default function MatchingEngine({ question, onComplete }: GameEngineProps) {
  // Trích xuất và chuẩn hóa danh sách cặp
  const rawPairs: PairItem[] = useMemo(() => {
    let raw = question?.data?.pairs || question?.data?.matching_pairs || (question as any)?.pairs || [];
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = [];
      }
    }
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((p: any) => p && typeof p === 'object')
      .map((p: any) => ({
        left: String(p.left || p.term || p.question || '').trim(),
        right: String(p.right || p.match || p.answer || '').trim(),
      }))
      .filter((p: PairItem) => p.left && p.right);
  }, [question]);

  const [matchingLefts, setMatchingLefts] = useState<string[]>([]);
  const [matchingRights, setMatchingRights] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [wrongMatch, setWrongMatch] = useState<{ left: string; right: string } | null>(null);

  // Xáo trộn các thẻ khi chuyển câu hỏi
  useEffect(() => {
    if (rawPairs.length > 0) {
      setMatchingLefts(shuffleArray(rawPairs.map((p) => p.left)));
      setMatchingRights(shuffleArray(rawPairs.map((p) => p.right)));
    } else {
      setMatchingLefts([]);
      setMatchingRights([]);
    }
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairs({});
    setWrongMatch(null);
  }, [rawPairs]);

  // Kiểm tra cặp ghép khi có cả selectedLeft và selectedRight
  useEffect(() => {
    if (!selectedLeft || !selectedRight) return;

    const targetPair = rawPairs.find((p) => p.left === selectedLeft);
    const isCorrect = targetPair && targetPair.right === selectedRight;

    if (isCorrect) {
      playSynthSound('correct');
      const updated = { ...matchedPairs, [selectedLeft]: selectedRight };
      setMatchedPairs(updated);
      setSelectedLeft(null);
      setSelectedRight(null);

      // Nếu đã ghép hết tất cả các cặp
      if (Object.keys(updated).length === rawPairs.length) {
        playSynthSound('victory');
        setTimeout(() => {
          onComplete(question.points || 25);
        }, 600);
      }
    } else {
      playSynthSound('incorrect');
      setWrongMatch({ left: selectedLeft, right: selectedRight });
      const timer = setTimeout(() => {
        setWrongMatch(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [selectedLeft, selectedRight, rawPairs, matchedPairs, question.points, onComplete]);

  const handleLeftClick = (leftVal: string) => {
    if (matchedPairs[leftVal]) return; // Đã ghép rồi
    playSynthSound('click');
    setSelectedLeft(selectedLeft === leftVal ? null : leftVal);
  };

  const handleRightClick = (rightVal: string) => {
    // Kiểm tra xem rightVal đã được ghép chưa
    const isAlreadyMatched = Object.values(matchedPairs).includes(rightVal);
    if (isAlreadyMatched) return;
    playSynthSound('click');
    setSelectedRight(selectedRight === rightVal ? null : rightVal);
  };

  if (rawPairs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs font-medium">
        Đang tải dữ liệu các cặp ghép...
      </div>
    );
  }

  const completedCount = Object.keys(matchedPairs).length;
  const totalCount = rawPairs.length;

  return (
    <div id="matching_board" className="w-full flex flex-col gap-5 max-w-2xl mx-auto select-none">
      {/* Thanh trạng thái tiến độ */}
      <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-600">
        <span className="flex items-center gap-1.5 text-indigo-600">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Chạm vào 1 ô ở Cột A và 1 ô ở Cột B để nối cặp:</span>
        </span>
        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-mono">
          {completedCount} / {totalCount} cặp
        </span>
      </div>

      {/* Bảng ghép cặp 2 cột */}
      <div className="grid grid-cols-2 gap-4 md:gap-8">
        {/* CỘT A */}
        <div className="flex flex-col gap-3">
          <div className="text-center text-xs font-black text-slate-500 uppercase tracking-wider py-1 bg-slate-100 rounded-xl">
            CỘT A
          </div>

          {matchingLefts.map((leftItem, idx) => {
            const isMatched = !!matchedPairs[leftItem];
            const isSelected = selectedLeft === leftItem;
            const isWrong = wrongMatch?.left === leftItem;

            return (
              <motion.button
                key={`left-${idx}-${leftItem}`}
                type="button"
                whileTap={{ scale: isMatched ? 1 : 0.96 }}
                onClick={() => handleLeftClick(leftItem)}
                disabled={isMatched}
                className={`p-4 text-xs md:text-sm font-black rounded-2xl border-2 transition-all duration-150 text-left flex items-center justify-between shadow-xs cursor-pointer ${
                  isMatched
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 opacity-90 cursor-default shadow-none'
                    : isWrong
                    ? 'bg-rose-100 border-rose-500 text-rose-800 animate-shake ring-2 ring-rose-300'
                    : isSelected
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-4 ring-indigo-200 shadow-md scale-[1.02]'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800 hover:shadow-sm'
                }`}
              >
                <span className="line-clamp-2">{leftItem}</span>
                {isMatched ? (
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0 ml-2" />
                ) : isSelected ? (
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping shrink-0 ml-2" />
                ) : null}
              </motion.button>
            );
          })}
        </div>

        {/* CỘT B */}
        <div className="flex flex-col gap-3">
          <div className="text-center text-xs font-black text-slate-500 uppercase tracking-wider py-1 bg-slate-100 rounded-xl">
            CỘT B
          </div>

          {matchingRights.map((rightItem, idx) => {
            const isMatched = Object.values(matchedPairs).includes(rightItem);
            const isSelected = selectedRight === rightItem;
            const isWrong = wrongMatch?.right === rightItem;

            return (
              <motion.button
                key={`right-${idx}-${rightItem}`}
                type="button"
                whileTap={{ scale: isMatched ? 1 : 0.96 }}
                onClick={() => handleRightClick(rightItem)}
                disabled={isMatched}
                className={`p-4 text-xs md:text-sm font-black rounded-2xl border-2 transition-all duration-150 text-left flex items-center justify-between shadow-xs cursor-pointer ${
                  isMatched
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 opacity-90 cursor-default shadow-none'
                    : isWrong
                    ? 'bg-rose-100 border-rose-500 text-rose-800 animate-shake ring-2 ring-rose-300'
                    : isSelected
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-4 ring-indigo-200 shadow-md scale-[1.02]'
                    : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800 hover:shadow-sm'
                }`}
              >
                <span className="line-clamp-2">{rightItem}</span>
                {isMatched ? (
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0 ml-2" />
                ) : isSelected ? (
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping shrink-0 ml-2" />
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
