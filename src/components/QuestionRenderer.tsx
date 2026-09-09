import React, { useState, useEffect } from "react";
import { Sparkles, Award, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GAME_ENGINES } from "./game-engines/registry";
import type { Question } from "./game-engines/types";
import TextToSpeechButton from "./TextToSpeechButton";

export interface QuestionRendererProps {
  key?: React.Key;
  question: Question;
  levelNum: number;
  xpReward: number;
  coinReward: number;
  onSuccess: (score: number, submittedAnswer?: any) => void | Promise<void>;
  onBack: () => void;
  /**
   * true (mặc định, dùng admin preview): hiện màn thưởng local rồi mới gọi onSuccess.
   * false (GamePlayPage): gọi onSuccess ngay khi giải xong — parent hiện thưởng từ API (tránh double UI).
   */
  showLocalRewardScreen?: boolean;
}

export default function QuestionRenderer({
  question,
  levelNum,
  xpReward,
  coinReward,
  onSuccess,
  onBack,
  showLocalRewardScreen = true,
}: QuestionRendererProps) {
  const [levelSolved, setLevelSolved] = useState(false);
  const [scoreEarned, setScoreEarned] = useState(0);
  const [submittedAnswerPayload, setSubmittedAnswerPayload] = useState<any>(null);
  const [seconds, setSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset khi đổi màn / câu hỏi (không phụ thuộc object identity từng render)
  useEffect(() => {
    setLevelSolved(false);
    setScoreEarned(0);
    setSubmittedAnswerPayload(null);
    setSeconds(0);
    setSubmitting(false);
    setSubmitError(null);
  }, [levelNum, question.id, question.prompt, question.question_type]);

  // Timer trong lúc chơi
  useEffect(() => {
    if (levelSolved || submitting) return;
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [levelSolved, submitting]);

  const handleEngineComplete = async (score: number, submittedAnswer?: any) => {
    setScoreEarned(score);
    setSubmittedAnswerPayload(submittedAnswer);
    setSubmitError(null);
    if (showLocalRewardScreen) {
      setLevelSolved(true);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await Promise.resolve(onSuccess(score, submittedAnswer));
      // Parent unmount khi thành công (levelCompleted). Nếu vẫn mount → giữ submitting đến khi parent đổi.
    } catch (err: any) {
      setSubmitting(false);
      setSubmitError(err?.message || "Không ghi nhận được kết quả. Thử lại nhé!");
    }
  };

  const handleFinishLevelAndReward = () => {
    onSuccess(scoreEarned, submittedAnswerPayload);
  };

  const handleRetrySubmit = () => {
    setSubmitError(null);
    void handleEngineComplete(scoreEarned, submittedAnswerPayload);
  };

  const Engine = GAME_ENGINES[question.question_type];

  return (
    <div className="bg-white rounded-3xl p-5 md:p-8 shadow-xl border-4 border-slate-100 max-w-4xl mx-auto kids-card-bouncy">

      {/* Upper header */}
      <div className="flex flex-wrap justify-between items-center pb-4 mb-6 border-b-2 border-slate-100">
        <div className="flex items-center gap-3">
          <button
            id="back_to_game_prep"
            onClick={onBack}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
          >
            ↩️ Thoát
          </button>
          <div>
            <h5 className="font-display text-xs tracking-wide text-kids-blue uppercase">Hệ Thống Smart Puzzle</h5>
            <h3 className="font-display text-lg md:text-xl text-slate-800">Màn Chơi Số {levelNum}</h3>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-600 font-mono text-sm mt-2 sm:mt-0">
          <div className="flex items-center gap-1 bg-yellow-50 text-yellow-600 px-3 py-1.5 rounded-xl font-bold border border-yellow-100">
            ⏳ {seconds} giây
          </div>
          <div className="flex items-center gap-1 bg-purple-50 text-purple-600 px-3 py-1.5 rounded-xl font-bold border border-purple-100">
            🎯 {question.points} điểm
          </div>
        </div>
      </div>

      {/* Prompts and Instructions */}
      <div className="text-center mb-8 flex items-center justify-center gap-2">
        <p className="inline-block bg-kids-blue/10 text-slate-800 px-5 py-2.5 rounded-full text-sm md:text-base font-medium border border-kids-blue/20">
          💡 {question.prompt}
        </p>
        <TextToSpeechButton text={question.prompt} />
      </div>

      <AnimatePresence mode="wait">
        {submitError && !showLocalRewardScreen ? (
          <motion.div
            key="submit_error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-10 flex flex-col items-center gap-4"
          >
            <p className="text-sm font-bold text-rose-600 max-w-md">{submitError}</p>
            <button
              type="button"
              onClick={handleRetrySubmit}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black"
            >
              Thử ghi nhận lại
            </button>
          </motion.div>
        ) : submitting && !showLocalRewardScreen ? (
          <motion.div
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-slate-500 text-sm font-bold"
          >
            Đang ghi nhận kết quả…
          </motion.div>
        ) : !levelSolved ? (
          <motion.div
            key="gameplay"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-[250px] flex items-center justify-center"
          >
            {Engine ? (
              <Engine question={question} onComplete={(score, submittedAnswer) => { void handleEngineComplete(score, submittedAnswer); }} />
            ) : (
              <div className="text-center text-rose-500 font-bold text-sm p-8">
                ⚠️ Chưa có game engine cho question_type: "{question.question_type}".
                <br />
                Kiểm tra <code>src/components/game-engines/registry.ts</code>.
              </div>
            )}
          </motion.div>
        ) : (
          /* LEVEL COMPLETE REWARDS SCREEN (admin / preview only) */
          <motion.div
            key="success_screen"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6 flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-5 animate-bounce shadow">
              <Award className="w-12 h-12 text-yellow-500 stroke-[2.5]" />
            </div>

            <h2 className="font-display text-2xl md:text-3xl text-emerald-600 mb-2">QUÁ TUYỆT VỜI! 🎉</h2>
            <p className="text-slate-600 text-sm md:text-base max-w-md mb-6 leading-relaxed">
              Bạn nhỏ đã vận dụng tư duy xuất sắc giải mã thành công màn chơi này!
            </p>

            <div className="grid grid-cols-3 gap-3 md:gap-5 w-full max-w-md mb-8">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-xl md:text-2xl mb-1">⭐️</span>
                <span className="text-xs text-slate-500 font-medium">Điểm số</span>
                <span className="font-mono font-bold text-sm md:text-base text-blue-700">+{scoreEarned}</span>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-xl md:text-2xl mb-1">⚡</span>
                <span className="text-xs text-slate-500 font-medium font-sans">Kinh nghiệm</span>
                <span className="font-mono font-bold text-sm md:text-base text-yellow-700">+{xpReward} XP</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-xl md:text-2xl mb-1">🪙</span>
                <span className="text-xs text-slate-500 font-medium">Sao Xu</span>
                <span className="font-mono font-bold text-sm md:text-base text-emerald-700">+{coinReward} xu</span>
              </div>
            </div>

            <button
              id="submit_rewards_btn"
              onClick={handleFinishLevelAndReward}
              className="px-8 py-4 bg-kids-green text-slate-900 hover:bg-green-400 font-display text-base font-bold rounded-2xl shadow-lg transition-all transform active:translate-y-1 hover:scale-103 flex items-center gap-2 kids-btn-shadow-green"
            >
              <Sparkles className="w-5 h-5" />
              Tiếp tục
              <ArrowRight className="w-5 h-5 ml-1" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
