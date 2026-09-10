import React, { useState, useEffect } from 'react';
import { 
  Play, RotateCcw, Plus, Trash2, ArrowRight, 
  Award, BrainCircuit, Flag, Sparkles, CheckCircle2, ChevronUp, ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSynthSound } from '../game-engines/soundUtils';

export interface BlockSequenceExerciseProps {
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

interface BlockDefinition {
  code: string;
  label: string;
  color: string;
  category?: string;
}

const DEFAULT_BLOCKS_MAP: Record<string, BlockDefinition> = {
  when_flag: { code: 'when_flag', label: 'Khi bấm Cờ Xanh ⛳', color: 'bg-amber-500 border-amber-600', category: 'event' },
  when_clicked: { code: 'when_clicked', label: 'Khi bấm vào Nhân Vật 🐒', color: 'bg-amber-500 border-amber-600', category: 'event' },
  move_forward: { code: 'move_forward', label: 'Di chuyển 1 bước ➡️', color: 'bg-blue-600 border-blue-700', category: 'motion' },
  move_10_steps: { code: 'move_10_steps', label: 'Di chuyển 10 bước ➡️', color: 'bg-blue-600 border-blue-700', category: 'motion' },
  turn_right: { code: 'turn_right', label: 'Quay phải 90° ↪️', color: 'bg-indigo-600 border-indigo-700', category: 'motion' },
  turn_left: { code: 'turn_left', label: 'Quay trái 90° ↩️', color: 'bg-purple-600 border-purple-700', category: 'motion' },
  say_hello: { code: 'say_hello', label: 'Nói "Xin chào!" trong 2 giây 💬', color: 'bg-violet-600 border-violet-700', category: 'looks' },
  say_meow: { code: 'say_meow', label: 'Phát tiếng kêu vui nhộn 🐒🎶', color: 'bg-pink-600 border-pink-700', category: 'sound' },
  play_drum: { code: 'play_drum', label: 'Đánh trống nhịp 1 🥁', color: 'bg-pink-600 border-pink-700', category: 'sound' },
  repeat_2: { code: 'repeat_2', label: 'Lặp lại 2 lần 🔄', color: 'bg-orange-500 border-orange-600', category: 'control' },
  repeat_3: { code: 'repeat_3', label: 'Lặp lại 3 lần 🔄', color: 'bg-orange-500 border-orange-600', category: 'control' },
  wait_1_sec: { code: 'wait_1_sec', label: 'Đợi 1 giây ⏳', color: 'bg-amber-600 border-amber-700', category: 'control' },
};

export default function BlockSequenceExercise({
  lesson,
  onLessonComplete,
  onBack,
}: BlockSequenceExerciseProps) {
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

  // Target sequence parsed
  const targetSequence: string[] = (() => {
    if (Array.isArray(sceneData.target_sequence)) return sceneData.target_sequence;
    if (Array.isArray(lesson.target_block_sequence)) return lesson.target_block_sequence;
    if (typeof lesson.target_block_sequence === 'string') {
      return lesson.target_block_sequence.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return ['when_flag', 'move_10_steps', 'say_hello'];
  })();

  // Initial available pool: either provided in sceneData.available_blocks or derived by shuffling target
  const initialPool: string[] = (() => {
    if (Array.isArray(sceneData.available_blocks)) return sceneData.available_blocks;
    // Shuffle target sequence
    return [...targetSequence].sort(() => Math.random() - 0.5);
  })();

  const [availablePool, setAvailablePool] = useState<string[]>(initialPool);
  const [workspaceBlocks, setWorkspaceBlocks] = useState<string[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setAvailablePool(initialPool);
    setWorkspaceBlocks([]);
    setActiveStepIndex(-1);
    setIsVerifying(false);
    setSuccess(false);
    setErrorMessage(null);
  }, [lesson]);

  const resolveBlock = (code: string): BlockDefinition => {
    return DEFAULT_BLOCKS_MAP[code] || {
      code,
      label: code.replace(/_/g, ' '),
      color: 'bg-indigo-600 border-indigo-700',
    };
  };

  const handleAddToWorkspace = (code: string, indexInPool: number) => {
    playSynthSound('click');
    setErrorMessage(null);
    setWorkspaceBlocks([...workspaceBlocks, code]);
    const updated = [...availablePool];
    updated.splice(indexInPool, 1);
    setAvailablePool(updated);
  };

  const handleRemoveFromWorkspace = (index: number) => {
    playSynthSound('click');
    setErrorMessage(null);
    const code = workspaceBlocks[index];
    const updated = [...workspaceBlocks];
    updated.splice(index, 1);
    setWorkspaceBlocks(updated);
    setAvailablePool([...availablePool, code]);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    playSynthSound('click');
    const updated = [...workspaceBlocks];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setWorkspaceBlocks(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === workspaceBlocks.length - 1) return;
    playSynthSound('click');
    const updated = [...workspaceBlocks];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setWorkspaceBlocks(updated);
  };

  const handleReset = () => {
    playSynthSound('click');
    setAvailablePool(initialPool);
    setWorkspaceBlocks([]);
    setActiveStepIndex(-1);
    setIsVerifying(false);
    setSuccess(false);
    setErrorMessage(null);
  };

  const handleVerify = async () => {
    if (workspaceBlocks.length === 0) {
      setErrorMessage('Hãy xếp các khối lệnh vào khung kịch bản trước khi kiểm tra!');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    playSynthSound('click');

    // Stepping simulation through blocks
    for (let i = 0; i < workspaceBlocks.length; i++) {
      setActiveStepIndex(i);
      playSynthSound('click');
      await new Promise((r) => setTimeout(r, 450));
    }
    setActiveStepIndex(-1);

    const isMatch =
      workspaceBlocks.length === targetSequence.length &&
      workspaceBlocks.every((b, idx) => b.trim().toLowerCase() === targetSequence[idx].trim().toLowerCase());

    if (isMatch) {
      playSynthSound('victory');
      setSuccess(true);
    } else {
      playSynthSound('incorrect');
      if (workspaceBlocks.length < targetSequence.length) {
        setErrorMessage(`Kịch bản còn thiếu khối lệnh (${workspaceBlocks.length}/${targetSequence.length}). Hãy bổ sung thêm!`);
      } else {
        setErrorMessage('Thứ tự các khối lệnh chưa chính xác. Hãy quan sát quy luật logic từ trên xuống dưới nhé!');
      }
    }
    setIsVerifying(false);
  };

  const handleClaim = () => {
    playSynthSound('victory');
    onLessonComplete(workspaceBlocks);
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
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <BrainCircuit className="w-3.5 h-3.5" /> SẮP XẾP KHỐI LỆNH (PARSONS PROBLEM)
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

      {/* Mission prompt */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 mb-6">
        <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-1">
          🎯 Mục Tiêu Lập Trình:
        </h4>
        <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
          {lesson.content || 'Sắp xếp các khối lệnh sau theo thứ tự logic đúng để hoàn thành kịch bản hoàn chỉnh.'}
        </p>
      </div>

      {/* 2-Column Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Column 1: Source Pool */}
        <div className="md:col-span-5 bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              📦 KHO KHỐI LỆNH ({availablePool.length})
            </h4>
            <span className="text-[10px] text-slate-400 font-normal">Nhấp để thêm</span>
          </div>

          {availablePool.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 font-medium">
              Tất cả khối lệnh đã được đưa vào kịch bản! 🚀
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {availablePool.map((code, idx) => {
                const block = resolveBlock(code);
                return (
                  <button
                    key={`${code}-${idx}`}
                    type="button"
                    onClick={() => handleAddToWorkspace(code, idx)}
                    disabled={isVerifying || success}
                    className={`w-full p-3 text-white rounded-xl border text-left font-bold text-xs flex items-center justify-between shadow-xs transition-all cursor-pointer hover:scale-101 active:scale-98 disabled:opacity-50 ${block.color}`}
                  >
                    <span>{block.label}</span>
                    <Plus className="w-4 h-4 text-white/80 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2: Target Solution Workspace */}
        <div className="md:col-span-7 bg-purple-50/40 rounded-2xl p-4 border-2 border-dashed border-purple-200 min-h-[340px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-100">
              <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider">
                📑 KỊCH BẢN CỦA BẠN ({workspaceBlocks.length}/{targetSequence.length})
              </h4>
              {workspaceBlocks.length > 0 && !isVerifying && !success && (
                <button
                  onClick={handleReset}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xếp lại</span>
                </button>
              )}
            </div>

            {workspaceBlocks.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-400 font-medium">
                👈 Bấm vào các khối lệnh bên trái để ghép thành kịch bản chạy từ trên xuống dưới!
              </div>
            ) : (
              <div className="space-y-2">
                {workspaceBlocks.map((code, idx) => {
                  const block = resolveBlock(code);
                  const isStepping = activeStepIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between text-white shadow-xs transition-all ${
                        isStepping
                          ? 'ring-4 ring-amber-400 scale-102 bg-amber-500 shadow-md'
                          : block.color
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-mono">
                          {idx + 1}
                        </span>
                        <span>{block.label}</span>
                      </div>

                      {!isVerifying && !success && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                            className="p-1 hover:bg-black/20 rounded disabled:opacity-30 cursor-pointer"
                            title="Di chuyển lên"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === workspaceBlocks.length - 1}
                            className="p-1 hover:bg-black/20 rounded disabled:opacity-30 cursor-pointer"
                            title="Di chuyển xuống"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromWorkspace(idx)}
                            className="p-1 hover:bg-rose-500/80 rounded ml-1 cursor-pointer"
                            title="Bỏ khỏi kịch bản"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Feedback & Actions */}
          <div className="pt-4 mt-4 border-t border-purple-100">
            {errorMessage && (
              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium animate-shake">
                ⚠️ {errorMessage}
              </div>
            )}

            {!success ? (
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying || workspaceBlocks.length === 0}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 transition-all active:scale-98"
              >
                <Flag className="w-4 h-4 fill-white" />
                <span>{isVerifying ? 'Đang Chạy Thử Nghiệm…' : 'CHẠY THỬ & KIỂM TRA THỨ TỰ ⛳'}</span>
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
