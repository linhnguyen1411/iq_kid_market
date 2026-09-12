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

async function computeMatchHash(left: string, right: string, salt: string): Promise<string> {
  const text = `${left.trim().toLowerCase()}::${right.trim().toLowerCase()}::${salt}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }
  return '';
}

export default function MatchingEngine({ question, onComplete }: GameEngineProps) {
  // Trích xuất và chuẩn hóa danh sách cặp (nếu có định dạng thô đầy đủ)
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

  const leftList: string[] = useMemo(() => {
    if (Array.isArray(question?.data?.left_items) && question.data.left_items.length > 0) {
      return question.data.left_items.map((x: any) => String(x || '').trim()).filter(Boolean);
    }
    return rawPairs.map((p) => p.left);
  }, [question, rawPairs]);

  const rightList: string[] = useMemo(() => {
    if (Array.isArray(question?.data?.right_items) && question.data.right_items.length > 0) {
      return question.data.right_items.map((x: any) => String(x || '').trim()).filter(Boolean);
    }
    return rawPairs.map((p) => p.right);
  }, [question, rawPairs]);

  const totalPairs = rawPairs.length > 0 ? rawPairs.length : leftList.length;

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
    if (leftList.length > 0 && rightList.length > 0) {
      const lefts: MatchingCard[] = leftList.map((text, idx) => ({
        uid: `L-${idx}-${text}`,
        text,
        pairIndex: rawPairs.length > 0 ? idx : -1,
      }));
      const rights: MatchingCard[] = rightList.map((text, idx) => ({
        uid: `R-${idx}-${text}`,
        text,
        pairIndex: rawPairs.length > 0 ? idx : -1,
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
  }, [leftList, rightList, rawPairs.length]);

  // Kiểm tra ghép cặp khi đã chọn cả 2 bên
  useEffect(() => {
    if (!selectedLeftCard || !selectedRightCard) return;

    let isCancelled = false;

    const evaluateSelection = async () => {
      let isCorrect = false;
      const leftText = selectedLeftCard.text;
      const rightText = selectedRightCard.text;

      const hashes = question?.data?.match_hashes;
      const salt = question?.data?.match_salt;

      if (Array.isArray(hashes) && typeof salt === 'string' && hashes.length > 0) {
        const h = await computeMatchHash(leftText, rightText, salt);
        isCorrect = hashes.includes(h);
      } else if (rawPairs.length > 0) {
        isCorrect =
          selectedLeftCard.pairIndex === selectedRightCard.pairIndex ||
          rawPairs.some((p) => p.left === leftText && p.right === rightText);
      }

      if (isCancelled) return;

      if (isCorrect) {
        playSynthSound('correct');
        const nextMatchedLefts = new Set(matchedLeftUids);
        const nextMatchedRights = new Set(matchedRightUids);
        nextMatchedLefts.add(selectedLeftCard.uid);
        nextMatchedRights.add(selectedRightCard.uid);

        setMatchedLeftUids(nextMatchedLefts);
        setMatchedRightUids(nextMatchedRights);

        const newPair = { left: leftText, right: rightText };
        const updatedPairs = [...userMatchedPairs, newPair];
        setUserMatchedPairs(updatedPairs);

        setSelectedLeftCard(null);
        setSelectedRightCard(null);

        // Nếu đã hoàn thành tất cả các cặp
        if (nextMatchedLefts.size === totalPairs && totalPairs > 0) {
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
          if (!isCancelled) {
            setWrongMatch(null);
            setSelectedLeftCard(null);
            setSelectedRightCard(null);
          }
        }, 700);
      }
    };

    evaluateSelection();

    return () => {
      isCancelled = true;
    };
  }, [
    selectedLeftCard,
    selectedRightCard,
    rawPairs,
    totalPairs,
    matchedLeftUids,
    matchedRightUids,
    userMatchedPairs,
    question,
    onComplete,
  ]);

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

  if (totalPairs === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs font-medium">
        Đang tải dữ liệu các cặp ghép...
      </div>
    );
  }

  const completedCount = matchedLeftUids.size;
  const totalCount = totalPairs;

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
      <div className="grid grid-cols-2 gap-2.5 sm:gap-6">
        {/* CỘT A */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          <div className="text-center text-[11px] sm:text-xs font-black text-slate-500 uppercase tracking-wider py-1 bg-slate-100 rounded-xl">
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
                className={`p-3 sm:p-4 min-h-[50px] text-xs sm:text-sm font-black rounded-2xl border-2 transition-all duration-150 text-left flex items-center justify-between shadow-xs cursor-pointer ${
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
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0 ml-1.5" />
                ) : isSelected ? (
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping shrink-0 ml-1.5" />
                ) : null}
              </motion.button>
            );
          })}
        </div>

        {/* CỘT B */}
        <div className="flex flex-col gap-2.5 sm:gap-3">
          <div className="text-center text-[11px] sm:text-xs font-black text-slate-500 uppercase tracking-wider py-1 bg-slate-100 rounded-xl">
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
                className={`p-3 sm:p-4 min-h-[50px] text-xs sm:text-sm font-black rounded-2xl border-2 transition-all duration-150 text-left flex items-center justify-between shadow-xs cursor-pointer ${
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
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0 ml-1.5" />
                ) : isSelected ? (
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping shrink-0 ml-1.5" />
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
