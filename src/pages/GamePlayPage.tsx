import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Sparkles, Coins,
  CheckCircle2, RefreshCw, Lock, ShieldCheck, Award,
} from 'lucide-react';
import { Game, Level } from '../types';
import QuestionRenderer from '../components/QuestionRenderer';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { canAccessLevel, FREE_LEVEL_COUNT } from '../lib/gameAccess';

const LEVEL_POPUP_MS = 2000;

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
  const [lockNotice, setLockNotice] = useState<string | null>(null);
  const [levelPopup, setLevelPopup] = useState<{
    levelNum: number;
  } | null>(null);
  /** Chỉ hiện khi clear cả game lần đầu (có XP/xu thật). */
  const [gameClearResult, setGameClearResult] = useState<{
    xpAwarded: number;
    coinReward: number;
    newStreak: number;
    message?: string;
  } | null>(null);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const levels: Level[] = game.levels || [];
  const currentLevel = levels.find((l) => l.level_num === currentLevelNum) || levels[0];
  const gameXpReward = levels.reduce((sum, l) => sum + (l.xp_reward || 80), 0);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const goNextOrFinish = (fromLevelNum: number) => {
    const nextNum = fromLevelNum + 1;
    const hasNext = levels.some((l) => l.level_num === nextNum);
    if (!hasNext) {
      onBack();
      return;
    }
    if (!canAccessLevel(nextNum, isPurchased, accessOpts)) {
      setLockNotice(
        `Màn ${nextNum}+ cần mở khóa bằng ví. Chỉ ${FREE_LEVEL_COUNT} màn đầu miễn phí.`,
      );
      onRequestUnlock?.(game);
      return;
    }
    setLockNotice(null);
    setCurrentLevelNum(nextNum);
  };

  const scheduleAdvance = (fromLevelNum: number) => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      setLevelPopup(null);
      goNextOrFinish(fromLevelNum);
    }, LEVEL_POPUP_MS);
  };

  const handleLevelComplete = async (score: number) => {
    if (!user) {
      throw new Error('Bạn cần đăng nhập lại để ghi nhận kết quả.');
    }

    const levelJustFinished = currentLevelNum;

    try {
      const res = await api.attempts.submit({
        userId: user.id,
        gameId: game.id,
        levelNum: levelJustFinished,
        score,
        completed: true,
      });

      if (!res?.success) {
        throw new Error('Máy chủ không xác nhận hoàn thành màn. Thử lại nhé!');
      }

      if (!isAdminPreview) {
        updateUserStats(res.xpAwarded ?? 0, res.newLevel, res.newStreak);
        const serverBal = Number((res as { newBalance?: number }).newBalance);
        if (Number.isFinite(serverBal)) {
          updateUserWallet(serverBal);
        } else if ((res.coinReward ?? 0) > 0 && wallet && Number.isFinite(Number(wallet.balance))) {
          updateUserWallet(Number(wallet.balance) + (res.coinReward ?? 0));
        }
      }

      // Clear cả game lần đầu → màn thưởng (không auto nhảy)
      if (res.gameCleared) {
        setLevelPopup(null);
        setGameClearResult({
          xpAwarded: res.xpAwarded ?? 0,
          coinReward: res.coinReward ?? 0,
          newStreak: res.newStreak,
          message: res.message || '',
        });
        return;
      }

      // Popup hoàn thành màn ~2s rồi nhảy tiếp
      setLevelPopup({ levelNum: levelJustFinished });
      scheduleAdvance(levelJustFinished);
    } catch (err: unknown) {
      console.error('Lỗi nộp điểm màn chơi:', err);
      const message = err instanceof Error ? err.message : String(err || 'Lỗi ghi nhận');
      if (message.includes('mở khóa')) {
        setLockNotice(message);
      }
      throw err instanceof Error ? err : new Error(message);
    }
  };

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
              <span title="Chỉ cộng 1 lần khi hoàn thành toàn bộ màn">
                +{gameXpReward} XP / game
              </span>
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

      {gameClearResult ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center animate-in zoom-in-95 duration-150">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-4xl shadow-lg mb-4 animate-bounce">
            🏆
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            CLEAR GAME — NHẬN THƯỞNG
          </span>

          <h3 className="text-2xl font-black text-slate-800 mt-2 mb-1">Hoàn thành toàn bộ game!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            {gameClearResult.message || 'Bạn vừa nhận thưởng XP / xu (chỉ 1 lần / game).'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto mb-8">
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
              <Sparkles className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Kinh nghiệm</span>
              <span className="text-sm font-black text-indigo-700">+{gameClearResult.xpAwarded} XP</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
              <Coins className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Thưởng ví</span>
              <span className="text-sm font-black text-amber-700">+{gameClearResult.coinReward} xu</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 col-span-2 sm:col-span-1">
              <span className="text-lg block mb-0.5">🔥</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Chuỗi ngày</span>
              <span className="text-sm font-black text-rose-700">{gameClearResult.newStreak} ngày</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
            <button
              onClick={() => {
                setGameClearResult(null);
                setCurrentLevelNum(1);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Chơi lại từ đầu</span>
            </button>
            <button
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Về Sàn Game</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : levelPopup ? (
        <div className="bg-white rounded-3xl p-5 md:p-8 shadow-xl border-4 border-slate-100 max-w-4xl mx-auto kids-card-bouncy">
          <div className="text-center py-6 flex flex-col items-center animate-in zoom-in-95 duration-150">
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-5 animate-bounce shadow">
              <Award className="w-12 h-12 text-yellow-500 stroke-[2.5]" />
            </div>

            <h2 className="font-display text-2xl md:text-3xl text-emerald-600 mb-2">QUÁ TUYỆT VỜI! 🎉</h2>
            <p className="text-slate-600 text-sm md:text-base max-w-md mb-6 leading-relaxed">
              Bạn nhỏ đã vượt qua Màn {levelPopup.levelNum} xuất sắc! Chuẩn bị sang câu tiếp theo…
            </p>

            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Tự chuyển màn sau 2 giây…
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-md">
          {currentLevel?.questions?.[0] ? (
            <QuestionRenderer
              key={`${game.id}-${currentLevelNum}`}
              question={{
                ...currentLevel.questions[0],
                points: currentLevel.questions[0].points ?? 25,
              } as any}
              levelNum={currentLevelNum}
              xpReward={0}
              coinReward={0}
              showLocalRewardScreen={false}
              onSuccess={handleLevelComplete}
              onBack={onBack}
            />
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Màn chơi chưa có câu hỏi nào được thiết lập!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GamePlayPage;
