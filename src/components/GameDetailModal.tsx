import React from 'react';
import {
  X, Play, Coins, Star, Trophy, Sparkles,
  BookOpen, Lock, Unlock,
} from 'lucide-react';
import { Game } from '../types';
import { playSynthSound } from './game-engines/soundUtils';
import { FREE_LEVEL_COUNT, canAccessLevel, paidLevelCount } from '../lib/gameAccess';

interface GameDetailModalProps {
  game: Game;
  isPurchased: boolean;
  onClose: () => void;
  onPlayGame: (game: Game, levelNum?: number) => void;
  onInitiatePurchase: (game: Game) => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  isPurchased,
  onClose,
  onPlayGame,
  onInitiatePurchase,
}) => {
  const totalLevels = game.levels?.length || 0;
  const paidCount = paidLevelCount(totalLevels || FREE_LEVEL_COUNT + 15);
  const needsUnlock = !isPurchased && game.price > 0 && paidCount > 0;

  const categoryName = (cat: string) => {
    switch (cat) {
      case 'math': return 'Toán Học Logic & Số Học';
      case 'iq': return 'Tư Duy IQ Não Bộ';
      case 'scratch': return 'Lập Trình Khối Lệnh Robot';
      case 'vietnamese': return 'Tiếng Việt & Ngôn Ngữ Học';
      default: return 'Trí Tuệ Toàn Diện';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative text-left my-8 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-100 via-indigo-50 to-pink-50 flex items-center justify-center text-4xl border border-slate-200 shadow-md shrink-0">
            {game.thumbnail || '🎮'}
          </div>

          <div className="flex-1 pr-6">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100">
                {categoryName(game.category)}
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Khối Lớp {game.grade_from}-{game.grade_to}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {FREE_LEVEL_COUNT} màn free
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-1">
              {game.title}
            </h3>

            <p className="text-xs text-slate-400 font-mono">
              Tác giả: <strong className="text-slate-600">{game.creator_name || 'IQ Kids Studio'}</strong> • {game.plays_count || 0} lượt hoàn thành
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center mb-6">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Số Màn Chơi</span>
            <span className="text-sm font-black text-slate-800 flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>{totalLevels || 1} Màn</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Đánh Giá</span>
            <span className="text-sm font-black text-amber-500 flex items-center justify-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{game.rating_avg ? game.rating_avg.toFixed(1) : '5.0'} / 5.0</span>
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Mở khóa</span>
            <span className={`text-sm font-black ${needsUnlock ? 'text-pink-600 font-mono' : 'text-emerald-600'}`}>
              {isPurchased ? 'Đã mở' : needsUnlock ? `${game.price.toLocaleString('vi-VN')} Sao IQ` : 'Miễn phí'}
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>MÔ TẢ & MỤC TIÊU BÀI HỌC</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {game.detailed_description || game.description}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>
                LỘ TRÌNH ({totalLevels || 1} MÀN · {FREE_LEVEL_COUNT} FREE + {Math.max(0, (totalLevels || 0) - FREE_LEVEL_COUNT)} LOCK)
              </span>
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {(game.levels && game.levels.length > 0
                ? game.levels
                : [{ level_num: 1, title: 'Màn 1: Khởi động trí tuệ', xp_reward: 80, coin_reward: 20 }]
              ).map((lvl, idx) => {
                const levelNum = lvl.level_num || idx + 1;
                const unlocked = canAccessLevel(levelNum, isPurchased);
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                      unlocked
                        ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-100'
                        : 'bg-slate-100/70 border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-lg text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 ${
                        unlocked ? 'bg-indigo-600' : 'bg-slate-400'
                      }`}>
                        {levelNum}
                      </span>
                      <span className="text-xs font-bold text-slate-800 line-clamp-1">{lvl.title}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-bold shrink-0">
                      {unlocked ? (
                        <>
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {levelNum <= FREE_LEVEL_COUNT ? 'Free' : 'Mở'}
                          </span>
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            +{lvl.xp_reward || 80} XP
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          <Lock className="w-3 h-3" /> Khóa
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch gap-3">
          <button
            onClick={() => {
              onClose();
              playSynthSound('click');
              onPlayGame(game, 1);
            }}
            className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>
              {isPurchased ? 'CHƠI TẤT CẢ MÀN 🚀' : `CHƠI ${FREE_LEVEL_COUNT} MÀN FREE 🚀`}
            </span>
          </button>

          {needsUnlock && (
            <button
              onClick={() => {
                playSynthSound('click');
                onInitiatePurchase(game);
              }}
              className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Unlock className="w-4 h-4 text-amber-200" />
              <span>MỞ {paidCount} MÀN · {game.price.toLocaleString('vi-VN')} XU</span>
              <Coins className="w-4 h-4 text-amber-300" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameDetailModal;
