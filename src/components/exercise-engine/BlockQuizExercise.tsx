import React, { useState } from 'react';
import { 
  HelpCircle, CheckCircle2, XCircle, Award, 
  Sparkles, ArrowRight, BrainCircuit 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSynthSound } from '../game-engines/soundUtils';

export interface BlockQuizExerciseProps {
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

interface QuizOption {
  code: string;
  label: string;
  blockCategory?: 'motion' | 'looks' | 'sound' | 'events' | 'control' | 'sensing' | 'operators' | 'variables';
}

export default function BlockQuizExercise({
  lesson,
  onLessonComplete,
  onBack,
}: BlockQuizExerciseProps) {
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

  // Answer can be in sceneData.answer or lesson.target_block_sequence
  const correctAnswer: string = String(
    sceneData.answer || lesson.target_block_sequence || 'A'
  ).trim().toLowerCase();

  const options: QuizOption[] = (() => {
    if (Array.isArray(sceneData.options)) {
      return sceneData.options.map((opt: any) => {
        if (typeof opt === 'string') {
          return { code: opt, label: opt };
        }
        return opt;
      });
    }
    return [
      { code: 'move_10_steps', label: 'Di chuyển 10 bước ➡️', blockCategory: 'motion' },
      { code: 'turn_right_15', label: 'Quay phải 15 độ ↪️', blockCategory: 'motion' },
      { code: 'say_hello', label: 'Nói "Xin chào!" trong 2 giây 💬', blockCategory: 'looks' },
      { code: 'play_sound_meow', label: 'Phát âm thanh vui nhộn 🐒🎶', blockCategory: 'sound' },
    ];
  })();

  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case 'motion': return 'bg-blue-600 border-blue-700 text-white';
      case 'looks': return 'bg-purple-600 border-purple-700 text-white';
      case 'sound': return 'bg-pink-600 border-pink-700 text-white';
      case 'events': return 'bg-amber-500 border-amber-600 text-white';
      case 'control': return 'bg-orange-500 border-orange-600 text-white';
      case 'sensing': return 'bg-sky-500 border-sky-600 text-white';
      case 'operators': return 'bg-emerald-600 border-emerald-700 text-white';
      case 'variables': return 'bg-rose-600 border-rose-700 text-white';
      default: return 'bg-slate-50 border-slate-200 text-slate-800 hover:border-indigo-400';
    }
  };

  const handleSelectChoice = (code: string) => {
    if (isSubmitted && isCorrect) return;
    playSynthSound('click');
    setSelectedChoice(code);
  };

  const handleVerify = () => {
    if (!selectedChoice) return;

    const match = selectedChoice.trim().toLowerCase() === correctAnswer ||
                  correctAnswer.split(';').includes(selectedChoice.trim().toLowerCase());

    setIsSubmitted(true);
    setIsCorrect(match);

    if (match) {
      playSynthSound('correct');
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
    <div className="bg-white rounded-3xl p-5 md:p-8 shadow-xl border border-slate-200/80 max-w-4xl mx-auto text-left">
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
            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider flex items-center gap-1">
              <BrainCircuit className="w-3.5 h-3.5" /> TRẮC NGHIỆM KHỐI LỆNH TRỰC QUAN
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

      {/* Question Prompt */}
      <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-5 mb-6">
        <h4 className="text-xs font-black text-sky-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-sky-600" />
          <span>CÂU HỎI THỬ THÁCH:</span>
        </h4>
        <p className="text-sm md:text-base font-bold text-slate-800 leading-relaxed">
          {lesson.content || 'Khối lệnh nào dưới đây thực hiện đúng nhiệm vụ được yêu cầu?'}
        </p>

        {/* Optional code snippet illustration */}
        {sceneData.code_snippet && Array.isArray(sceneData.code_snippet) && (
          <div className="mt-4 p-4 bg-slate-900 rounded-xl max-w-md border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 block uppercase mb-1">Đoạn mã kịch bản:</span>
            {sceneData.code_snippet.map((snippet: string, idx: number) => (
              <div key={idx} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold shadow-xs">
                {snippet}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Options List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {options.map((opt, idx) => {
          const isSelected = selectedChoice === opt.code;
          const showSuccess = isSubmitted && isCorrect && isSelected;
          const showError = isSubmitted && !isCorrect && isSelected;

          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => handleSelectChoice(opt.code)}
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

      {/* Explanation Banner when answered */}
      {isSubmitted && (
        <div className={`p-4 rounded-2xl border mb-6 text-xs leading-relaxed ${
          isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <p className="font-bold mb-1">
            {isCorrect ? '🎉 CHÍNH XÁC!' : '⚠️ CHƯA ĐÚNG RỒI!'}
          </p>
          <p>
            {sceneData.explanation || (isCorrect ? 'Bạn đã phân tích đúng chức năng của khối lệnh!' : 'Hãy thử lại với một phương án khác nhé!')}
          </p>
        </div>
      )}

      {/* Action Button */}
      {!isCorrect ? (
        <button
          type="button"
          onClick={handleVerify}
          disabled={!selectedChoice}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 transition-all active:scale-98"
        >
          <span>KIỂM TRA ĐÁP ÁN 🎯</span>
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
  );
}
