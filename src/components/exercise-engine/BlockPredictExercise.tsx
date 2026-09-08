import React, { useState } from 'react';
import { 
  Eye, CheckCircle2, XCircle, Award, 
  Sparkles, ArrowRight, BrainCircuit, Play, RotateCcw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSynthSound } from '../game-engines/soundUtils';

export interface BlockPredictExerciseProps {
  lesson: {
    lesson_num: number;
    title: string;
    content: string;
    target_block_sequence: string | string[];
    start_scene_json: string | any;
    xp_reward: number;
  };
  onLessonComplete: (submittedChoice: string[]) => void;
  onBack: () => void;
}

export default function BlockPredictExercise({
  lesson,
  onLessonComplete,
  onBack,
}: BlockPredictExerciseProps) {
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

  const script: string[] = Array.isArray(sceneData.script)
    ? sceneData.script
    : ['Khi bấm cờ xanh ⛳', 'Di chuyển 10 bước ➡️', 'Di chuyển 10 bước ➡️', 'Quay phải 90° ↪️'];

  const correctAnswer = String(sceneData.answer || lesson.target_block_sequence || 'A').trim().toLowerCase();

  const options: Array<{ code: string; label: string }> = Array.isArray(sceneData.options)
    ? sceneData.options.map((opt: any) => (typeof opt === 'string' ? { code: opt, label: opt } : opt))
    : [
        { code: 'x20_down', label: 'Tọa độ X = 20 và hướng mặt nhìn xuống dưới ⬇️' },
        { code: 'x10_right', label: 'Tọa độ X = 10 và hướng mặt nhìn sang phải ➡️' },
        { code: 'x20_up', label: 'Tọa độ X = 20 và hướng mặt nhìn lên trên ⬆️' },
        { code: 'x0_left', label: 'Tọa độ X = 0 và hướng mặt nhìn sang trái ⬅️' },
      ];

  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [isVerified, setIsVerified] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSelect = (code: string) => {
    if (isVerified && isCorrect) return;
    playSynthSound('click');
    setSelectedChoice(code);
  };

  const handleRunSimulationAndVerify = async () => {
    if (!selectedChoice) return;

    setIsSimulating(true);
    playSynthSound('click');

    // Visual stepping through the script blocks
    for (let i = 0; i < script.length; i++) {
      setActiveStep(i);
      playSynthSound('click');
      await new Promise((r) => setTimeout(r, 500));
    }
    setActiveStep(-1);
    setIsSimulating(false);

    const match = selectedChoice.trim().toLowerCase() === correctAnswer ||
                  correctAnswer.split(';').includes(selectedChoice.trim().toLowerCase());

    setIsVerified(true);
    setIsCorrect(match);

    if (match) {
      playSynthSound('victory');
    } else {
      playSynthSound('incorrect');
    }
  };

  const handleClaim = () => {
    playSynthSound('victory');
    if (selectedChoice) {
      onLessonComplete([selectedChoice]);
    }
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
            <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> ĐOÁN KẾT QUẢ KỊCH BẢN (CODE TRACING)
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

      {/* 2-Column: Script on Left, Question & Predictions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: The Code Script */}
        <div className="lg:col-span-5 bg-slate-900 rounded-3xl p-5 border-4 border-slate-800 text-white">
          <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
            <span>📜 ĐOẠN KỊCH BẢN SCRATCH</span>
          </h4>

          <div className="space-y-2 py-2">
            {script.map((line, idx) => {
              const isStepping = activeStep === idx;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-xs ${
                    isStepping
                      ? 'bg-amber-500 text-slate-950 scale-103 ring-4 ring-amber-300'
                      : idx === 0
                      ? 'bg-amber-600 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{line}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
            {isSimulating ? '🚀 Đang lần vết từng dòng lệnh…' : 'Đọc kỹ từng bước lệnh từ trên xuống dưới'}
          </div>
        </div>

        {/* Right Column: Question & Multiple Choices */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-violet-50/70 border border-violet-200 rounded-2xl p-5">
            <h4 className="text-xs font-black text-violet-900 uppercase tracking-wider mb-1">
              🔮 CÂU HỎI DỰ ĐOÁN:
            </h4>
            <p className="text-xs md:text-sm font-bold text-slate-800 leading-relaxed">
              {lesson.content || 'Sau khi thực thi kịch bản trên, kết quả cuối cùng sẽ là gì?'}
            </p>
          </div>

          {/* Choices */}
          <div className="flex flex-col gap-3">
            {options.map((opt, idx) => {
              const isSelected = selectedChoice === opt.code;
              const showSuccess = isVerified && isCorrect && isSelected;
              const showError = isVerified && !isCorrect && isSelected;

              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleSelect(opt.code)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between shadow-xs ${
                    showSuccess
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-4 ring-emerald-100'
                      : showError
                      ? 'bg-rose-50 border-rose-500 text-rose-900 animate-shake'
                      : isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md scale-101'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-xs md:text-sm font-bold text-slate-800">
                      {opt.label}
                    </span>
                  </div>

                  {showSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                  {showError && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Feedback & Explanation */}
          {isVerified && (
            <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
              isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <p className="font-bold mb-1">
                {isCorrect ? '🎉 DỰ ĐOÁN XUẤT SẮC!' : '⚠️ CHƯA KHỚP VỚI HÀNH VI CỦA KỊCH BẢN!'}
              </p>
              <p>
                {sceneData.explanation || (isCorrect ? 'Bạn đã phân tích chính xác từng bước thực thi của máy tính!' : 'Hãy lần vết lại từng khối lệnh theo thứ tự nhé!')}
              </p>
            </div>
          )}

          {/* Actions */}
          {!isCorrect ? (
            <button
              type="button"
              onClick={handleRunSimulationAndVerify}
              disabled={isSimulating || !selectedChoice}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 transition-all active:scale-98"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isSimulating ? 'Đang Chạy Mô Phỏng…' : 'CHẠY MÔ PHỎNG & ĐỐI CHIẾU DỰ ĐOÁN 🎯'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClaim}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:opacity-95 text-slate-950 font-black text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98 animate-bounce"
            >
              <Award className="w-5 h-5" />
              <span>XUẤT SẮC! NHẬN +{lesson.xp_reward || 100} XP & HOÀN THÀNH 🎉</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
