import React, { useState, useEffect } from "react";
import { playSynthSound } from "./soundUtils";
import type { GameEngineProps } from "./types";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, RotateCcw, Star } from "lucide-react";

// data schema: { cat_pos: [row, col]; star_pos: [row, col]; target_block_sequence: string }
const COMMAND_OPTIONS = [
  { id: "move_up", label: "Lên", icon: ArrowUp, color: "bg-blue-500" },
  { id: "move_down", label: "Xuống", icon: ArrowDown, color: "bg-blue-600" },
  { id: "move_left", label: "Trái", icon: ArrowLeft, color: "bg-amber-500" },
  { id: "move_right", label: "Phải", icon: ArrowRight, color: "bg-amber-600" },
  { id: "collect_star", label: "Nhặt sao", icon: Star, color: "bg-yellow-500" },
];

export default function ScratchEngine({ question, onComplete }: GameEngineProps) {
  const catInitial = question.data?.cat_pos || [0, 0];
  const starPos = question.data?.star_pos || [3, 3];
  const targetSeqStr = question.data?.target_block_sequence ? String(question.data.target_block_sequence) : "";

  const [sequence, setSequence] = useState<string[]>([]);
  const [currentCatPos, setCurrentCatPos] = useState<[number, number]>(catInitial);
  const [isRunning, setIsRunning] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    setSequence([]);
    setCurrentCatPos(catInitial);
    setIsRunning(false);
    setIsFailed(false);
    setSolved(false);
  }, [question]);

  const handleAddCommand = (cmdId: string) => {
    if (solved || isRunning || sequence.length >= 10) return;
    playSynthSound('click');
    setSequence([...sequence, cmdId]);
  };

  const handleRemoveCommand = (index: number) => {
    if (solved || isRunning) return;
    playSynthSound('click');
    setSequence(sequence.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    if (isRunning) return;
    playSynthSound('click');
    setSequence([]);
    setCurrentCatPos(catInitial);
    setIsFailed(false);
  };

  const handleRunSimulation = async () => {
    if (solved || isRunning || sequence.length === 0) return;
    setIsRunning(true);
    setIsFailed(false);

    let [r, c] = [...catInitial];
    let collected = false;

    for (let i = 0; i < sequence.length; i++) {
      const cmd = sequence[i];
      playSynthSound('click');

      if (cmd === "move_up") r = Math.max(0, r - 1);
      else if (cmd === "move_down") r = Math.min(3, r + 1);
      else if (cmd === "move_left") c = Math.max(0, c - 1);
      else if (cmd === "move_right") c = Math.min(3, c + 1);
      else if (cmd === "collect_star") {
        if (r === starPos[0] && c === starPos[1]) {
          collected = true;
        }
      }

      setCurrentCatPos([r, c]);
      await new Promise((res) => setTimeout(res, 350));
    }

    setIsRunning(false);

    // Kiểm tra kết quả
    const reachedStar = (r === starPos[0] && c === starPos[1]);
    const targetSeq = targetSeqStr
      ? targetSeqStr.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    let isCorrect = false;
    if (targetSeq.length > 0) {
      isCorrect =
        sequence.length === targetSeq.length &&
        sequence.every((cmd, idx) => cmd.toLowerCase() === targetSeq[idx]);
    } else {
      isCorrect = reachedStar || collected;
    }

    if (isCorrect) {
      playSynthSound('correct');
      playSynthSound('victory');
      setSolved(true);
      onComplete(question.points, { sequence });
    } else {
      playSynthSound('incorrect');
      setIsFailed(true);
      setTimeout(() => {
        setIsFailed(false);
        setCurrentCatPos(catInitial);
      }, 1000);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center font-sans">
      <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 mb-4 text-center text-slate-700 font-bold text-xs md:text-sm w-full">
        🤖 {question.prompt || "Lập trình các bước di chuyển đưa Khỉ con đến Ngôi Sao!"}
      </div>

      {/* Grid 4x4 */}
      <div className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 mb-4 flex flex-col items-center shadow-md">
        <div className="grid grid-cols-4 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
          {Array.from({ length: 16 }).map((_, index) => {
            const r = Math.floor(index / 4);
            const c = index % 4;
            const hasCat = currentCatPos[0] === r && currentCatPos[1] === c;
            const hasStar = starPos[0] === r && starPos[1] === c;

            return (
              <div
                key={index}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-2xl relative border transition-all ${
                  hasCat && hasStar
                    ? "border-yellow-400 bg-yellow-950/40"
                    : hasCat
                    ? "border-kids-blue bg-indigo-950/50 scale-105 shadow-md shadow-indigo-500/20"
                    : hasStar
                    ? "border-yellow-500/50 bg-slate-900"
                    : "border-slate-800/80 bg-slate-900/60"
                }`}
              >
                {hasCat && <span className="animate-bounce select-none" title="Chú Khỉ Thông Thái">🐒</span>}
                {!hasCat && hasStar && <span className="animate-pulse select-none">⭐</span>}
                {!hasCat && !hasStar && <span className="text-[10px] text-slate-700 font-mono select-none">{r},{c}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Program Sequence Tray */}
      <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider">
            Khối lệnh đã ghép ({sequence.length}/10) — Chạm để xoá:
          </span>
          {sequence.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isRunning}
              className="text-xxs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Làm lại
            </button>
          )}
        </div>

        <div className="min-h-12 flex flex-wrap items-center gap-1.5 p-1">
          {sequence.length === 0 ? (
            <span className="text-xs text-slate-400 font-medium italic">
              Chạm các nút mũi tên bên dưới để nạp lệnh cho Khỉ robot…
            </span>
          ) : (
            sequence.map((cmdId, idx) => {
              const cmdInfo = COMMAND_OPTIONS.find((c) => c.id === cmdId);
              const Icon = cmdInfo?.icon || ArrowRight;
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleRemoveCommand(idx)}
                  disabled={isRunning}
                  className={`${cmdInfo?.color || "bg-indigo-600"} text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm hover:opacity-80 transition-opacity cursor-pointer`}
                  title="Chạm để xoá lệnh này"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cmdInfo?.label || cmdId}</span>
                  <span className="text-white/60 text-[10px] ml-0.5">✕</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Command Palette */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-5 w-full">
        {COMMAND_OPTIONS.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <button
              type="button"
              key={cmd.id}
              disabled={isRunning || sequence.length >= 10 || solved}
              onClick={() => handleAddCommand(cmd.id)}
              className="px-3.5 py-2.5 bg-white border-2 border-slate-200 hover:border-kids-purple hover:bg-purple-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon className="w-4 h-4 text-kids-purple" />
              <span>{cmd.label}</span>
            </button>
          );
        })}
      </div>

      {/* Run button */}
      <button
        type="button"
        disabled={isRunning || sequence.length === 0 || solved}
        onClick={handleRunSimulation}
        className={`w-full py-3.5 px-6 rounded-2xl font-display text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
          isFailed
            ? "bg-rose-500 animate-shake"
            : solved
            ? "bg-emerald-500"
            : isRunning
            ? "bg-amber-500 opacity-80"
            : "bg-gradient-to-r from-kids-purple to-indigo-600 hover:opacity-95 active:scale-98"
        }`}
      >
        <Play className="w-4 h-4 fill-white" />
        <span>
          {isRunning
            ? "Khỉ robot đang di chuyển…"
            : solved
            ? "Đã giải cứu thành công! 🎉"
            : isFailed
            ? "Chưa đến đích, thử lại nhé!"
            : "Chạy thuật toán 🚀"}
        </span>
      </button>
    </div>
  );
}
