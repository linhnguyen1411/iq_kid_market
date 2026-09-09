import React, { useState } from 'react';
import type { GameEngineProps } from './types';
import { playSynthSound } from './soundUtils';
import { Lightbulb, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react';

/**
 * SCHEMA DATA FOR LogicGridEngine:
 * {
 *   grid_size?: number;          // 2 (cho 2x2) hoặc 3 (cho 3x3), mặc định 2
 *   grid: string[][];            // Ma trận các emoji, ô cần tìm có giá trị '?'
 *   options: string[];           // Các lựa chọn hình ảnh ở khay dưới (vd: ['🐱', '🐶', '🐰', '🐼'])
 *   answer: string;              // Đáp án đúng để điền vào ô '?'
 *   hint?: string;               // Gợi ý quy luật hàng/cột
 * }
 */
export default function LogicGridEngine({ question, onComplete }: GameEngineProps) {
  const data = question.data || {};
  const grid: string[][] = data.grid || [
    ['🍎', '🍌'],
    ['🍌', '?'],
  ];
  const options: string[] = data.options || ['🍎', '🍌', '🍇', '🍊'];
  const correctAnswer = data.answer ? String(data.answer).trim() : null;

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleSelectOption = (opt: string) => {
    if (solved) return;
    playSynthSound('click');
    setSelectedOption(opt);

    if (correctAnswer) {
      if (opt.trim() !== correctAnswer) {
        setIsWrong(true);
        playSynthSound('incorrect');
        setTimeout(() => {
          setIsWrong(false);
          setSelectedOption(null);
        }, 700);
        return;
      }
    }

    setSolved(true);
    setIsWrong(false);
    playSynthSound('victory');
    onComplete(question.points, { selectedOption: opt, answer: opt });
  };

  const gridSize = grid.length || 2;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto text-left">
      {/* Title & Instructions */}
      <div className="text-center w-full">
        <p className="text-xs font-bold text-slate-500 mb-1">
          {question.prompt || 'Quan sát quy luật ma trận và chọn hình thích hợp điền vào dấu ?'}
        </p>
      </div>

      {/* Logic Matrix Grid Board */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200/80 rounded-3xl p-6 shadow-md flex items-center justify-center">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
        >
          {grid.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const isTargetCell = cell === '?';

              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  className={`w-18 h-18 md:w-22 md:h-22 rounded-2xl flex items-center justify-center text-3xl md:text-4xl font-bold shadow-xs transition-all ${
                    isTargetCell
                      ? isWrong
                        ? 'border-4 border-rose-500 bg-rose-50 animate-shake text-rose-500'
                        : solved
                        ? 'border-4 border-emerald-500 bg-emerald-50 text-emerald-600 scale-105 shadow-md'
                        : selectedOption
                        ? 'border-3 border-indigo-400 bg-white'
                        : 'border-3 border-dashed border-indigo-400 bg-white/80 text-indigo-400 animate-pulse'
                      : 'border-2 border-slate-200/90 bg-white text-slate-800'
                  }`}
                >
                  {isTargetCell ? (
                    solved ? (
                      correctAnswer
                    ) : selectedOption ? (
                      selectedOption
                    ) : (
                      <HelpCircle className="w-8 h-8 text-indigo-400" />
                    )
                  ) : (
                    cell
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Hint Section */}
      {data.hint && (
        <div className="w-full">
          {!showHint ? (
            <button
              type="button"
              onClick={() => {
                setShowHint(true);
                playSynthSound('click');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 mx-auto bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-200/60 cursor-pointer transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Gợi ý quy luật 💡</span>
            </button>
          ) : (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-medium text-center animate-in fade-in">
              💡 <strong>Gợi ý:</strong> {data.hint}
            </div>
          )}
        </div>
      )}

      {/* Options Tray for Kid to Tap */}
      <div className="w-full bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
          CHỌN HÌNH ĐIỀN VÀO Ô DẤU HỎI ?
        </h4>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={solved}
              onClick={() => handleSelectOption(opt)}
              className={`w-15 h-15 md:w-16 md:h-16 rounded-2xl border-2 flex items-center justify-center text-3xl transition-all cursor-pointer shadow-xs active:scale-95 ${
                solved && opt === correctAnswer
                  ? 'border-emerald-500 bg-emerald-50 shadow-md'
                  : 'border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-400'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
