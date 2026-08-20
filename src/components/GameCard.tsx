import React from 'react';
import { Star, Play, Coins, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { Game } from '../types';
import { playSynthSound } from './game-engines/soundUtils';

interface GameCardProps {
  game: Game;
  isPurchased: boolean;
  onSelectDetail: (game: Game) => void;
  onPlayDirect: (game: Game) => void;
  onBuyDirect: (game: Game) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  isPurchased,
  onSelectDetail,
  onPlayDirect,
  onBuyDirect,
}) => {
  const isFree = game.price === 0;
  const canPlay = isFree || isPurchased;

  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'math':
        return { label: 'Toán Học Logic', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'iq':
        return { label: 'Tư Duy IQ', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'scratch':
        return { label: 'Lập Trình Robot', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'vietnamese':
        return { label: 'Tiếng Việt', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: 'Trí Tuệ', bg: 'bg-pink-50 text-pink-700 border-pink-200' };
    }
  };

  const catMeta = getCategoryMeta(game.category);

  return (
    <div
      onClick={() => onSelectDetail(game)}
      className="bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-400 p-5 shadow-xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between text-left group relative overflow-hidden"
    >
      {/* Top Banner Ornament */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-pink-500/5 rounded-bl-full pointer-events-none" />

      <div>
        {/* Header Row: Thumbnail & Badges */}
        <div className="flex items-start justify-between gap-2 mb-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-50 via-indigo-50 to-pink-50 flex items-center justify-center text-3xl border border-slate-100 shadow-2xs group-hover:scale-110 transition-transform duration-300">
            {game.thumbnail || '🎮'}
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${catMeta.bg}`}>
              {catMeta.label}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Lớp {game.grade_from}-{game.grade_to}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <h4 className="text-sm md:text-base font-black text-slate-800 line-clamp-1 mb-1.5 group-hover:text-indigo-600 transition-colors">
          {game.title}
        </h4>
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
          {game.description}
        </p>
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{game.rating_avg ? game.rating_avg.toFixed(1) : '5.0'}</span>
            <span className="text-[11px] text-slate-400 font-normal">({game.plays_count || 0} lượt chơi)</span>
          </div>

          <div>
            {isFree ? (
              <span className="text-emerald-600 font-extrabold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                MIỄN PHÍ
              </span>
            ) : isPurchased ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                <span>ĐÃ MUA</span>
              </span>
            ) : (
              <span className="text-pink-600 font-mono font-black text-xs">
                {game.price.toLocaleString('vi-VN')} xu
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        {canPlay ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playSynthSound('click');
              onPlayDirect(game);
            }}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white rounded-xl font-black text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>CHƠI NGAY (MÀN 1) 🚀</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playSynthSound('click');
              onBuyDirect(game);
            }}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl font-black text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
          >
            <Coins className="w-3.5 h-3.5 text-amber-300" />
            <span>MUA GAME ({game.price.toLocaleString('vi-VN')} XU)</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default GameCard;
