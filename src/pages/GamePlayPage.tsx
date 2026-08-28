import React, { useState } from 'react';
import {
  ArrowLeft, Sparkles, Coins,
  CheckCircle2, RefreshCw, ChevronRight, Lock, ShieldCheck,
} from 'lucide-react';
import { Game, Level } from '../types';
import QuestionRenderer from '../components/QuestionRenderer';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { canAccessLevel, FREE_LEVEL_COUNT } from '../lib/gameAccess';

interface GamePlayPageProps {
  game: Game;
  initialLevelNum?: number;
  onBack: () => void;
  onRequestUnlock?: (game: Game) => void;
}

export const GamePlayPage: React.FC<GamePlayPageProps> = ({
  game,
  initialLevelNum = 1,
  onBack,
  onRequestUnlock,
}) => {
  const { user, wallet, purchases, updateUserStats, updateUserWallet } = useAuth();
  const isAdminPreview = user?.role === 'admin';
  const isPurchased = isAdminPreview || purchases.includes(game.id);
  const accessOpts = { isAdminPreview };

  const safeInitial = canAccessLevel(initialLevelNum, isPurchased, accessOpts) ? initialLevelNum : 1;
  const [currentLevelNum, setCurrentLevelNum] = useState(safeInitial);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const [attemptResult, setAttemptResult] = useState<{
    xpAwarded: number;
    coinReward: number;
    newLevel: number;
    levelUp: boolean;
    newStreak: number;
    score: number;
  } | null>(null);

  const levels: Level[] = game.levels || [];
  const currentLevel = levels.find((l) => l.level_num === currentLevelNum) || levels[0];

  const handleLevelComplete = async (score: number) => {
    if (!user) return;

    try {
      const res = await api.attempts.submit({
        userId: user.id,
        gameId: game.id,
        levelNum: currentLevelNum,
        score: score,
        completed: true,
      });

      if (res.success) {
        setAttemptResult({
          xpAwarded: res.xpAwarded,
          coinReward: res.coinReward,
          newLevel: res.newLevel,
          levelUp: res.levelUp,
          newStreak: res.newStreak,
          score,
        });
        if (!isAdminPreview) {
          updateUserStats(res.xpAwarded, res.newLevel, res.newStreak);
          const serverBal = Number((res as any).newBalance);
          if (Number.isFinite(serverBal)) {
            updateUserWallet(serverBal);
          } else if (res.coinReward > 0 && wallet && Number.isFinite(Number(wallet.balance))) {
            updateUserWallet(Number(wallet.balance) + res.coinReward);
          }
        }
        setLevelCompleted(true);
      }
    } catch (err: any) {
      console.error('Lỗi nộp điểm màn chơi:', err);
      if (err?.message?.includes('mở khóa')) {
        setLockNotice(err.message);
      } else {
        setLevelCompleted(true);
      }
    }
  };

  const handleNextLevel = () => {
    const nextNum = currentLevelNum + 1;
    const hasNext = levels.some((l) => l.level_num === nextNum);
    if (!hasNext) {
      onBack();
      return;
    }
    if (!canAccessLevel(nextNum, isPurchased, accessOpts)) {
      setLockNotice(
        `Màn ${nextNum}+ cần mở khóa bằng ví. Chỉ ${FREE_LEVEL_COUNT} màn đầu miễn phí.`,
      );
      return;
    }
    setCurrentLevelNum(nextNum);
    setLevelCompleted(false);
    setAttemptResult(null);
    setLockNotice(null);
  };

  const handleReplay = () => {
    setLevelCompleted(false);
    setAttemptResult(null);
    setLockNotice(null);
  };

  const hasNextLevel = levels.some((l) => l.level_num === currentLevelNum + 1);
  const nextIsLocked = hasNextLevel && !canAccessLevel(currentLevelNum + 1, isPurchased, accessOpts);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Trở về</span>
        </button>

        <div className="text-center">
          <h2 className="text-sm font-black text-slate-800 line-clamp-1">{game.title}</h2>
          <span className="text-[10px] font-mono font-bold text-indigo-600">
            Màn {currentLevelNum} / {levels.length} • {currentLevel?.title || 'Màn chơi'}
            {isAdminPreview
              ? ' • Admin preview'
              : currentLevelNum <= FREE_LEVEL_COUNT
                ? ' • Free'
                : ''}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
          {isAdminPreview ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-indigo-700">Không tính điểm</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>+{currentLevel?.xp_reward || 80} XP</span>
            </>
          )}
        </div>
      </div>

      {isAdminPreview && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            Chế độ chơi thử Admin — mở toàn bộ màn, không trừ xu, không ghi XP / bảng xếp hạng.
          </span>
        </div>
      )}

      {lockNotice && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-2 text-sm text-amber-900 font-bold">
            <Lock className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{lockNotice}</span>
          </div>
          {onRequestUnlock && game.price > 0 && !isAdminPreview && (
            <button
              type="button"
              onClick={() => onRequestUnlock(game)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black"
            >
              Mở khóa {game.price.toLocaleString('vi-VN')} xu
            </button>
          )}
        </div>
      )}

      {!levelCompleted ? (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-md">
          {currentLevel?.questions?.[0] ? (
            <QuestionRenderer
              question={{
                ...currentLevel.questions[0],
                points: currentLevel.questions[0].points ?? 25,
              } as any}
              levelNum={currentLevelNum}
              xpReward={isAdminPreview ? 0 : currentLevel.xp_reward || 80}
              coinReward={isAdminPreview ? 0 : currentLevel.coin_reward || 20}
              onSuccess={handleLevelComplete}
              onBack={onBack}
            />
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Màn chơi chưa có câu hỏi nào được thiết lập!
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center animate-in zoom-in-95 duration-150">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-4xl shadow-lg mb-4 animate-bounce">
            🏆
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {isAdminPreview ? 'HOÀN THÀNH (CHƠI THỬ)' : 'HOÀN THÀNH XUẤT SẮC!'}
          </span>

          <h3 className="text-2xl font-black text-slate-800 mt-2 mb-1">
            {isAdminPreview
              ? `Đã xem thử Màn ${currentLevelNum}`
              : `Chúc mừng bạn đã vượt qua Màn ${currentLevelNum}!`}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            {isAdminPreview
              ? 'Không cộng XP / xu / bảng xếp hạng. Có thể sang màn tiếp để kiểm tra nội dung.'
              : 'Bạn đã rèn luyện phản xạ tư duy logic tuyệt vời. Hãy giữ vững phong độ!'}
          </p>

          {!isAdminPreview && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto mb-8">
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                <Sparkles className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Kinh nghiệm</span>
                <span className="text-sm font-black text-indigo-700">+{attemptResult?.xpAwarded || 80} XP</span>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                <Coins className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Thưởng ví</span>
                <span className="text-sm font-black text-amber-700">+{attemptResult?.coinReward || 20} xu</span>
              </div>

              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 col-span-2 sm:col-span-1">
                <span className="text-lg block mb-0.5">🔥</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Chuỗi ngày</span>
                <span className="text-sm font-black text-rose-700">{attemptResult?.newStreak || user?.streak || 1} ngày</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
            <button
              onClick={handleReplay}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Chơi lại</span>
            </button>

            {hasNextLevel ? (
              nextIsLocked ? (
                <button
                  onClick={() => {
                    setLockNotice(
                      `Màn ${currentLevelNum + 1}+ cần mở khóa bằng ví. Chỉ ${FREE_LEVEL_COUNT} màn đầu miễn phí.`,
                    );
                    onRequestUnlock?.(game);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Mở khóa màn tiếp</span>
                </button>
              ) : (
                <button
                  onClick={handleNextLevel}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Sang Màn {currentLevelNum + 1}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )
            ) : (
              <button
                onClick={onBack}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Về Sàn Game</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePlayPage;
