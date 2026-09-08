import React, { useState } from 'react';
import { 
  Bug, CheckCircle2, XCircle, Award, 
  Sparkles, ArrowRight, BrainCircuit, Wrench, RotateCcw, AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSynthSound } from '../game-engines/soundUtils';

export interface BlockDebugExerciseProps {
  lesson: {
    lesson_num: number;
    title: string;
    content: string;
    target_block_sequence: string | string[];
    start_scene_json: string | any;
    xp_reward: number;
  };
  onLessonComplete: (submittedSequence: string[]) => void;
  onBack: () => void;
}

export default function BlockDebugExercise({
  lesson,
  onLessonComplete,
  onBack,
}: BlockDebugExerciseProps) {
  let sceneData: any = {};
  try {
    if (typeof lesson.start_scene_json === 'string') {
      sceneData = JSON.parse(lesson.start_scene_json);
    } else if (lesson.start_scene_json) {
      sceneData = lesson.start_scene_json;
    }
  } catch (e) {
    sceneData = {};
  }

  // Initial buggy script
  const initialBuggyScript: string[] = Array.isArray(sceneData.buggy_script)
    ? sceneData.buggy_script
    : ['Khi bấm cờ xanh ⛳', 'Di chuyển 10 bước ➡️', 'Quay trái 180° ↩️', 'Nói "Chào bạn!" 💬'];

  // Target fixed script
  const targetScript: string[] = Array.isArray(sceneData.target_sequence)
    ? sceneData.target_sequence
    : ['Khi bấm cờ xanh ⛳', 'Di chuyển 10 bước ➡️', 'Quay phải 90° ↪️', 'Nói "Chào bạn!" 💬'];

  // Replacement candidates for the bug
  const replacements: string[] = Array.isArray(sceneData.replacements)
    ? sceneData.replacements
    : ['Quay phải 90° ↪️', 'Quay trái 90° ↩️', 'Nhảy 50 bước 🦘'];

  const bugIndex: number = typeof sceneData.bug_index === 'number' ? sceneData.bug_index : 2;

  const [currentScript, setCurrentScript] = useState<string[]>(initialBuggyScript);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number | null>(null);
  const [selectedReplacement, setSelectedReplacement] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectBlockToFix = (idx: number) => {
    if (isFixed) return;
    playSynthSound('click');
    setErrorMessage(null);
    setSelectedBlockIdx(idx);
  };

  const handleApplyReplacement = (replacement: string) => {
    if (selectedBlockIdx === null || isFixed) return;
    playSynthSound('click');
    setSelectedReplacement(replacement);
    const updated = [...currentScript];
    updated[selectedBlockIdx] = replacement;
    setCurrentScript(updated);
  };

  const handleReset = () => {
    playSynthSound('click');
    setCurrentScript(initialBuggyScript);
    setSelectedBlockIdx(null);
    setSelectedReplacement(null);
    setIsFixed(false);
    setErrorMessage(null);
  };

  const handleVerify = () => {
    playSynthSound('click');

    // Check if user spotted the correct bug index and replaced it with target
    const isTargetMatched = currentScript.every(
      (b, i) => b.trim().toLowerCase() === (targetScript[i] || '').trim().toLowerCase()
    );

    if (isTargetMatched) {
      playSynthSound('victory');
      setIsFixed(true);
      setErrorMessage(null);
    } else {
      playSynthSound('incorrect');
      if (selectedBlockIdx !== bugIndex) {
        setErrorMessage(`Khối lệnh số ${selectedBlockIdx !== null ? selectedBlockIdx + 1 : '?'} không phải là khối gây lỗi. Hãy quan sát lại!`);
      } else {
        setErrorMessage('Bạn đã chọn đúng khối bị lỗi nhưng khối thay thế chưa chính xác!');
      }
    }
  };

  const handleClaim = () => {
    playSynthSound('victory');
    onLessonComplete(currentScript);
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-8 shadow-xl border border-slate-200/80 max-w-5xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center pb-4 mb-5 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            ↩️ Trở Lại
          </button>
          <div>
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <Bug className="w-3.5 h-3.5" /> GỠ LỖI KỊCH BẢN (BUG HUNTING)
            </span>
            <h3 className="text-lg md:text-xl font-black text-slate-800">
              Bài {lesson.lesson_num}: {lesson.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>+{lesson.xp_reward || 100} XP</span>
        </div>
      </div>

      {/* Mission Description */}
      <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 mb-6">
        <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>NHIỆM VỤ GỠ LỖI:</span>
        </h4>
        <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
          {lesson.content || 'Kịch bản dưới đây đang có 1 khối lệnh bị sai khiến nhân vật hoạt động không đúng. Hãy tìm khối lỗi và chọn khối đúng để thay thế!'}
        </p>
      </div>

      {/* 2-Column: Script on Left, Replacement Toolbox on Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Current Script */}
        <div className="md:col-span-6 bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              📑 KỊCH BẢN CẦN KIỂM TRA
            </h4>
            {!isFixed && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Hoàn tác</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mb-3">
            Bấm vào dòng lệnh mà bạn cho rằng đang bị lỗi:
          </p>

          <div className="space-y-2">
            {currentScript.map((line, idx) => {
              const isSelected = selectedBlockIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectBlockToFix(idx)}
                  disabled={isFixed}
                  className={`w-full p-3 rounded-xl text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between border-2 shadow-xs ${
                    isFixed
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-600 ring-4 ring-amber-200 scale-102 font-black'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      isSelected ? 'bg-black/20 text-slate-900' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span>{line}</span>
                  </div>

                  {isSelected && !isFixed && (
                    <span className="text-[10px] font-bold bg-black/20 px-2 py-0.5 rounded-full">
                      Đang chọn sửa 🛠️
                    </span>
                  )}
                  {isFixed && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Replacement Candidates */}
        <div className="md:col-span-6 bg-indigo-50/40 rounded-2xl p-4 border-2 border-dashed border-indigo-200 min-h-[320px] flex flex-col justify-between">
          <div>
            <div className="pb-3 mb-3 border-b border-indigo-100">
              <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                🔧 KHO KHỐI LỆNH THAY THẾ
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedBlockIdx !== null
                  ? `Chọn khối đúng để thay thế cho dòng số ${selectedBlockIdx + 1}:`
                  : 'Hãy chọn 1 dòng ở cột bên trái trước'}
              </p>
            </div>

            <div className="space-y-2.5">
              {replacements.map((cand, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyReplacement(cand)}
                  disabled={selectedBlockIdx === null || isFixed}
                  className="w-full p-3 bg-white hover:bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-500 text-indigo-900 rounded-xl font-bold text-xs text-left shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
                >
                  <span>{cand}</span>
                  <Wrench className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Feedback & Actions */}
          <div className="pt-4 mt-4 border-t border-indigo-100">
            {errorMessage && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium animate-shake">
                ⚠️ {errorMessage}
              </div>
            )}

            {isFixed && (
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
                🎉 TUYỆT VỜI! Kịch bản đã được gỡ lỗi và phục hồi hoạt động chính xác!
              </div>
            )}

            {!isFixed ? (
              <button
                type="button"
                onClick={handleVerify}
                disabled={selectedBlockIdx === null}
                className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 transition-all active:scale-98"
              >
                <Wrench className="w-4 h-4 fill-white" />
                <span>KIỂM TRA GỠ LỖI 🔍</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClaim}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:opacity-95 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98 animate-bounce"
              >
                <Award className="w-5 h-5" />
                <span>XUẤT SẮC! NHẬN +{lesson.xp_reward || 100} XP & HOÀN THÀNH 🎉</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
