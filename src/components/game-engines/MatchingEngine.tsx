import React, { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { playSynthSound, shuffleArray } from "./soundUtils";
import type { GameEngineProps } from "./types";

interface PairItem {
  left: string;
  right: string;
}

interface MatchingCard {
  uid: string;
  text: string;
  pairIndex: number;
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

  const [shuffledLefts, setShuffledLefts] = useState<MatchingCard[]>([]);
  const [shuffledRights, setShuffledRights] = useState<MatchingCard[]>([]);
  const [selectedLeftCard, setSelectedLeftCard] = useState<MatchingCard | null>(null);
  const [selectedRightCard, setSelectedRightCard] = useState<MatchingCard | null>(null);
  const [matchedLeftUids, setMatchedLeftUids] = useState<Set<string>>(new Set());
  const [matchedRightUids, setMatchedRightUids] = useState<Set<string>>(new Set());
  const [wrongMatch, setWrongMatch] = useState<{ leftUid: string; rightUid: string } | null>(null);

  const [userMatchedPairs, setUserMatchedPairs] = useState<Array<{ left: string; right: string }>>([]);

  // Xáo trộn các thẻ với định danh duy nhất (UID) khi đổi câu hỏi
  useEffect(() => {
    if (rawPairs.length > 0) {
      const lefts: MatchingCard[] = rawPairs.map((p, idx) => ({
        uid: `L-${idx}-${p.left}`,
        text: p.left,
        pairIndex: idx,
      }));
      const rights: MatchingCard[] = rawPairs.map((p, idx) => ({
        uid: `R-${idx}-${p.right}`,
        text: p.right,
        pairIndex: idx,
      }));
      setShuffledLefts(shuffleArray(lefts));
      setShuffledRights(shuffleArray(rights));
    } else {
      setShuffledLefts([]);
      setShuffledRights([]);
    }
    setSelectedLeftCard(null);
    setSelectedRightCard(null);
    setMatchedLeftUids(new Set());
    setMatchedRightUids(new Set());
    setUserMatchedPairs([]);
    setWrongMatch(null);
  }, [rawPairs]);

  // Kiểm tra ghép cặp khi đã chọn cả 2 bên
  useEffect(() => {
    if (!selectedLeftCard || !selectedRightCard) return;

    // So khớp theo pairIndex hoặc theo giá trị hợp lệ trong rawPairs
    const isCorrect =
      selectedLeftCard.pairIndex === selectedRightCard.pairIndex ||
      rawPairs.some(
        (p) => p.left === selectedLeftCard.text && p.right === selectedRightCard.text
      );

    if (isCorrect) {
      playSynthSound('correct');
      const nextMatchedLefts = new Set(matchedLeftUids);
      const nextMatchedRights = new Set(matchedRightUids);
      nextMatchedLefts.add(selectedLeftCard.uid);
      nextMatchedRights.add(selectedRightCard.uid);

      setMatchedLeftUids(nextMatchedLefts);
      setMatchedRightUids(nextMatchedRights);

      const newPair = { left: selectedLeftCard.text, right: selectedRightCard.text };
      const updatedPairs = [...userMatchedPairs, newPair];
      setUserMatchedPairs(updatedPairs);

      setSelectedLeftCard(null);
      setSelectedRightCard(null);

      // Nếu đã hoàn thành tất cả các cặp
      if (nextMatchedLefts.size === rawPairs.length) {
        playSynthSound('victory');
        setTimeout(() => {
          onComplete(question.points || 25, { pairs: updatedPairs });
        }, 600);
      }
    } else {
      playSynthSound('incorrect');
      setWrongMatch({
        leftUid: selectedLeftCard.uid,
        rightUid: selectedRightCard.uid,
      });
      const timer = setTimeout(() => {
        setWrongMatch(null);
        setSelectedLeftCard(null);
        setSelectedRightCard(null);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [selectedLeftCard, selectedRightCard, rawPairs, matchedLeftUids, matchedRightUids, question.points, onComplete]);

  const handleLeftClick = (card: MatchingCard) => {
    if (matchedLeftUids.has(card.uid)) return; // Đã ghép rồi
    playSynthSound('click');
    setSelectedLeftCard(selectedLeftCard?.uid === card.uid ? null : card);
  };

  const handleRightClick = (card: MatchingCard) => {
    if (matchedRightUids.has(card.uid)) return; // Đã ghép rồi
    playSynthSound('click');
    setSelectedRightCard(selectedRightCard?.uid === card.uid ? null : card);
  };

  if (rawPairs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs font-medium">
        Đang tải dữ liệu các cặp ghép...
      </div>
    );
  }

  const completedCount = matchedLeftUids.size;
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

          {shuffledLefts.map((leftCard) => {
            const isMatched = matchedLeftUids.has(leftCard.uid);
            const isSelected = selectedLeftCard?.uid === leftCard.uid;
            const isWrong = wrongMatch?.leftUid === leftCard.uid;

            return (
              <motion.button
                key={leftCard.uid}
                type="button"
                whileTap={{ scale: isMatched ? 1 : 0.96 }}
                onClick={() => handleLeftClick(leftCard)}
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
                <span className="line-clamp-2">{leftCard.text}</span>
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

          {shuffledRights.map((rightCard) => {
            const isMatched = matchedRightUids.has(rightCard.uid);
            const isSelected = selectedRightCard?.uid === rightCard.uid;
            const isWrong = wrongMatch?.rightUid === rightCard.uid;

            return (
              <motion.button
                key={rightCard.uid}
                type="button"
                whileTap={{ scale: isMatched ? 1 : 0.96 }}
                onClick={() => handleRightClick(rightCard)}
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
                <span className="line-clamp-2">{rightCard.text}</span>
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
