import { useState, useEffect } from "react";
import { playSynthSound, shuffleArray } from "./soundUtils";
import type { GameEngineProps } from "./types";

// data schema: { instruction?: string; items: [{id: string; label: string}, ...]; correct_sequence_ids: string[] }
export default function SortingEngine({ question, onComplete }: GameEngineProps) {
  const [sortingPool, setSortingPool] = useState<any[]>([]);
  const [sortingCurrentOrder, setSortingCurrentOrder] = useState<any[]>([]);
  const [isSortingFailed, setIsSortingFailed] = useState(false);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const items = question.data?.items || [];
    setSortingPool(shuffleArray([...items]));
    setSortingCurrentOrder([]);
    setIsSortingFailed(false);
    setSolved(false);
  }, [question]);

  const handleItemSelect = (item: any) => {
    if (solved) return;
    playSynthSound('click');

    setSortingPool(sortingPool.filter(i => i.id !== item.id));
    const newOrder = [...sortingCurrentOrder, item];
    setSortingCurrentOrder(newOrder);

    const initialItems = question.data?.items || [];
    const correctSequence = question.data?.correct_sequence_ids || [];
    const finalIds = newOrder.map((elem: any) => String(elem.id));

    if (correctSequence.length > 0 && newOrder.length === correctSequence.length) {
      const isSequenceCorrect = newOrder.every((elem, idx) => String(elem.id) === String(correctSequence[idx]));
      if (isSequenceCorrect) {
        playSynthSound('correct');
        setSolved(true);
        playSynthSound('victory');
        onComplete(question.points, { sequence: finalIds, orderedIds: finalIds });
      } else {
        playSynthSound('incorrect');
        setIsSortingFailed(true);
        setTimeout(() => {
          setIsSortingFailed(false);
          setSortingPool(shuffleArray([...initialItems]));
          setSortingCurrentOrder([]);
        }, 1200);
      }
    } else if (correctSequence.length === 0 && newOrder.length === initialItems.length && initialItems.length > 0) {
      playSynthSound('correct');
      setSolved(true);
      playSynthSound('victory');
      onComplete(question.points, { sequence: finalIds, orderedIds: finalIds });
    }
  };

  const handleReturnItem = (item: any) => {
    if (solved) return;
    playSynthSound('click');
    setSortingCurrentOrder(sortingCurrentOrder.filter(i => i.id !== item.id));
    setSortingPool([...sortingPool, item]);
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      <div className="bg-emerald-50/40 border-2 border-emerald-100 rounded-2xl p-5 mb-6 text-center text-slate-800 font-bold text-xs md:text-sm w-full">
        ⏳ {question.prompt || question.data?.instruction}
      </div>

      <div className="w-full mb-6">
        <p className="text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">
          Thứ tự sắp xếp của bé (Chạm để hoàn tác):
        </p>
        <div className="min-h-16 w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-center gap-3">
          {sortingCurrentOrder.map((item, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => handleReturnItem(item)}
              className="bg-indigo-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              title="Chạm để đưa thẻ này về khay"
            >
              <span className="bg-indigo-500 text-white w-4 h-4 rounded-full text-xxs flex items-center justify-center">{idx + 1}</span>
              {item.label} ✕
            </button>
          ))}
          {sortingCurrentOrder.length === 0 && (
            <span className="text-slate-400 text-xs font-medium">Chạm các khối bên dưới theo thứ tự chuẩn xác!</span>
          )}
        </div>
      </div>

      <p className="text-xxs font-mono text-slate-400 font-bold uppercase tracking-wider mb-2">Các thẻ quy trình:</p>
      <div className="grid grid-cols-2 gap-3 w-full">
        {sortingPool.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemSelect(item)}
            className="p-3 bg-white border-2 border-slate-200 hover:border-indigo-500 font-black rounded-xl text-xs text-slate-700 shadow-sm hover:-translate-y-0.5 transition-all text-center"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
