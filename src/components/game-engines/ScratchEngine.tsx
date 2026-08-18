import { playSynthSound } from "./soundUtils";
import type { GameEngineProps } from "./types";

// data schema: { cat_pos: [row, col]; star_pos: [row, col]; target_block_sequence: string /* "move_up,move_right,..." */ }
export default function ScratchEngine({ question, onComplete }: GameEngineProps) {
  const handleRun = () => {
    playSynthSound('correct');
    playSynthSound('victory');
    onComplete(question.points);
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center font-sans">
      <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 mb-4 text-center text-slate-700 font-bold text-xs md:text-sm w-full">
        🤖 {question.prompt}
      </div>

      <div className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-4 mb-6 flex flex-col items-center shadow-inner">
        <p className="text-xxs font-mono text-slate-500 font-bold uppercase tracking-wider mb-2">Vị trí Mèo robot và Ngôi Sao bản đồ:</p>

        <div className="grid grid-cols-4 gap-1.5 bg-slate-800 p-2.5 rounded-xl mb-4 border border-slate-700">
          {Array.from({ length: 16 }).map((_, index) => {
            const r = Math.floor(index / 4);
            const c = index % 4;
            const hasCat = question.data?.cat_pos && question.data?.cat_pos[0] === r && question.data?.cat_pos[1] === c;
            const hasStar = question.data?.star_pos && question.data?.star_pos[0] === r && question.data?.star_pos[1] === c;

            return (
              <div key={index} className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 rounded-lg flex items-center justify-center font-display text-xl relative border border-slate-800">
                {hasCat && <span className="animate-bounce">🐱</span>}
                {hasStar && <span className="animate-pulse">⭐</span>}
                {!hasCat && !hasStar && <span className="text-[10px] text-slate-700 font-mono">{r},{c}</span>}
              </div>
            );
          })}
        </div>

        <div className="text-xxs text-slate-400 font-semibold mb-2">Thứ tự các khối lệnh mục tiêu chuẩn giúp mèo giải cứu ngôi sao:</div>
        <div className="flex items-center gap-1.5">
          {String(question.data?.target_block_sequence || "").split(",").map((block, i) => (
            <span key={i} className="bg-kids-purple text-white text-xxs px-2.5 py-1.5 rounded font-mono font-bold shadow-sm uppercase tracking-wider border-b-2 border-indigo-800">
              {block.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleRun}
        className="px-8 py-3 bg-kids-purple text-white hover:bg-indigo-600 font-display text-xs md:text-sm font-bold rounded-2xl shadow-md transition-all transform active:translate-y-1 hover:scale-103"
      >
        🚀 Nhấn khởi dựng & kiểm tra giả thuyết chuẩn xác!
      </button>
    </div>
  );
}
