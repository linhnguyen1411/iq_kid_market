import React, { useState } from 'react';
import type { GameEngineProps } from './types';
import { playSynthSound } from './soundUtils';
import { Delete, Check, Lightbulb, Sparkles, HelpCircle } from 'lucide-react';

/**
 * SCHEMA DATA FOR MathEngine:
 * {
 *   expression?: string;        // vd: "25 + 17 = ?" hoặc "15 x 3 = ?"
 *   answer: string | number;    // vd: "42" hoặc 42
 *   visual_items?: {            // Hình ảnh que tính, hoa quả minh họa
 *     emoji: string;            // vd: "🍎"
 *     count_left: number;
 *     count_right: number;
 *     operator: string;
 *   };
 *   hint?: string;              // Lời gợi ý phương pháp giải
 * }
 */
export default function MathEngine({ question, onComplete }: GameEngineProps) {
  const data = question.data || {};
  const [inputVal, setInputVal] = useState('');
  const [isWrong, setIsWrong] = useState(false);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const correctAnswer = data.answer !== undefined && data.answer !== null ? String(data.answer).trim() : null;

  const handleDigit = (digit: string) => {
    if (solved || inputVal.length >= 6) return;
    playSynthSound('click');
    setInputVal((prev) => prev + digit);
    setIsWrong(false);
  };

  const handleDelete = () => {
    if (solved) return;
    playSynthSound('click');
    setInputVal((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (solved) return;
    playSynthSound('click');
    setInputVal('');
  };

  const handleCheck = () => {
    if (solved || !inputVal) return;

    if (correctAnswer) {
      if (inputVal.trim() !== correctAnswer) {
        setIsWrong(true);
        playSynthSound('incorrect');
        setTimeout(() => setIsWrong(false), 800);
        return;
      }
    }

    setSolved(true);
    playSynthSound('victory');
    onComplete(question.points, { answer: inputVal.trim() });
  };

  const expressionDisplay =
    data.expression ||
    (data.num1 !== undefined && data.num2 !== undefined
      ? `${data.num1} ${data.operator || '+'} ${data.num2} = ?`
      : 'Điền kết quả = ?');

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto text-left">
      {/* Phép tính lớn trực quan */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-pink-50 border-2 border-indigo-200/80 rounded-3xl p-6 w-full text-center shadow-xs relative overflow-hidden">
        {/* Decorative sparkle */}
        <div className="absolute top-2 right-3 text-indigo-400 opacity-60">
          <Sparkles className="w-5 h-5" />
        </div>

        {/* Prompt Header */}
        <p className="text-xs font-bold text-slate-500 mb-2">
          {question.prompt || 'Em hãy tính và điền kết quả chính xác:'}
        </p>

        {/* Math Expression */}
        <h2 className="text-3xl md:text-4xl font-black font-mono text-indigo-950 tracking-wider mb-4">
          {expressionDisplay}
        </h2>

        {/* Visual Item Demonstration if available */}
        {data.visual_items && (
          <div className="flex items-center justify-center gap-3 py-2 px-3 bg-white/70 backdrop-blur-xs rounded-2xl border border-indigo-100 mb-4 max-w-xs mx-auto text-xs font-bold">
            <div className="flex flex-wrap items-center justify-center gap-0.5 max-w-[90px]">
              {Array.from({ length: Math.min(15, data.visual_items.count_left || 0) }).map((_, i) => (
                <span key={i} className="text-base">{data.visual_items.emoji || '🍎'}</span>
              ))}
            </div>
            <span className="text-sm font-black text-indigo-600 font-mono">
              {data.visual_items.operator || '+'}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-0.5 max-w-[90px]">
              {Array.from({ length: Math.min(15, data.visual_items.count_right || 0) }).map((_, i) => (
                <span key={i} className="text-base">{data.visual_items.emoji || '🍎'}</span>
              ))}
            </div>
          </div>
        )}

        {/* Ô hiển thị kết quả bé đang gõ */}
        <div
          className={`mx-auto min-w-[140px] max-w-[180px] h-14 bg-white rounded-2xl border-3 flex items-center justify-center text-2xl md:text-3xl font-mono font-black transition-all shadow-inner ${
            isWrong
              ? 'border-rose-500 bg-rose-50 text-rose-600 animate-shake'
              : solved
              ? 'border-emerald-500 bg-emerald-50 text-emerald-600 scale-105'
              : 'border-indigo-400 text-slate-800 focus:border-indigo-600'
          }`}
        >
          {inputVal ? inputVal : <span className="text-slate-300 font-normal">?</span>}
        </div>
      </div>

      {/* Hint Button & Banner */}
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
              <span>Gợi ý cách giải 💡</span>
            </button>
          ) : (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-medium text-center animate-in fade-in">
              💡 <strong>Gợi ý:</strong> {data.hint}
            </div>
          )}
        </div>
      )}

      {/* Bàn Phím Số Ảo Smart Numpad (0-9 + Backspace + OK) */}
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            disabled={solved}
            onClick={() => handleDigit(String(num))}
            className="h-13 bg-white hover:bg-slate-50 border-2 border-slate-200/80 active:border-indigo-400 rounded-2xl font-black text-xl text-slate-700 shadow-xs active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {num}
          </button>
        ))}

        {/* Backspace Button */}
        <button
          type="button"
          disabled={solved || !inputVal}
          onClick={handleDelete}
          className="h-13 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200/80 rounded-2xl flex items-center justify-center text-rose-600 shadow-xs active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
          title="Xóa 1 ký tự"
        >
          <Delete className="w-5 h-5" />
        </button>

        {/* Digit 0 */}
        <button
          type="button"
          disabled={solved}
          onClick={() => handleDigit('0')}
          className="h-13 bg-white hover:bg-slate-50 border-2 border-slate-200/80 active:border-indigo-400 rounded-2xl font-black text-xl text-slate-700 shadow-xs active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
        >
          0
        </button>

        {/* Submit Check Button */}
        <button
          type="button"
          disabled={solved || !inputVal}
          onClick={handleCheck}
          className="h-13 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-md active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
          title="Kiểm tra đáp án"
        >
          <Check className="w-6 h-6 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}
