import React from 'react';
import { 
  Brain, BookOpen, Sparkles, TrendingUp, Code, 
  Trophy, ChevronRight, Gamepad2, ArrowRight 
} from 'lucide-react';
import { Game, LeaderboardItem } from '../types';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  games: Game[];
  leaderboard: LeaderboardItem[];
  onExplore: () => void;
  onSelectCategory: (category: string) => void;
  onSelectGame: (game: Game) => void;
  onViewLeaderboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  games,
  leaderboard,
  onExplore,
  onSelectCategory,
  onSelectGame,
  onViewLeaderboard,
}) => {
  const { purchases, user } = useAuth();

  const categories = [
    { code: 'iq', label: 'PHÁT TRIỂN IQ COGNITIVE', count: '40 Màn Chơi', color: 'from-sky-400 to-blue-500', icon: <Brain className="w-6 h-6" /> },
    { code: 'math', label: 'TOÁN HỌC LOGIC STEM', count: '30 Màn Chơi', color: 'from-amber-400 to-orange-500', icon: <TrendingUp className="w-6 h-6" /> },
    { code: 'scratch', label: 'LẬP TRÌNH ROBOT SCRATCH', count: '2 Khóa học • 9 Bài', color: 'from-purple-400 to-indigo-500', icon: <Code className="w-6 h-6" /> },
    { code: 'vietnamese', label: 'TIẾNG VIỆT & NGÔN NGỮ', count: '4 Loại Game', color: 'from-emerald-400 to-green-500', icon: <BookOpen className="w-6 h-6" /> },
  ];

  const categoryToVietnamese = (cat: string) => {
    switch (cat) {
      case 'math': return 'Toán Học Logic';
      case 'iq': return 'Tư Duy IQ';
      case 'scratch': return 'Lập Trình Robot';
      case 'vietnamese': return 'Tiếng Việt';
      default: return 'Trí Tuệ';
    }
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Playful Banner Hero Slider */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-4 sm:p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden text-white">
        <div className="flex-1 text-center md:text-left z-10 w-full">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md font-bold text-xs px-3.5 py-1.5 rounded-full mb-3 tracking-wide shadow-xs border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            HỆ THỐNG EDTECH THÔNG THÁI 2026
          </span>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight mb-3 uppercase">
            Chinh Phục Thử Thách <br className="hidden sm:inline" /> Nhận Vương Miện Trí Tuệ!
          </h1>
          <p className="text-white/90 text-xs md:text-sm max-w-md mb-6 font-medium leading-relaxed">
            Marketplace thông minh tập hợp 90+ màn chơi từ lớp 1 đến lớp 9: Toán học, IQ Logic, Tiếng Việt và Kéo thả Robot Scratch diệu kỳ.
          </p>
          <button
            onClick={onExplore}
            className="w-full sm:w-auto px-8 py-3.5 min-h-[48px] bg-white text-indigo-600 hover:bg-slate-50 font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 mx-auto md:mx-0"
          >
            <span>Khám Phá Sàn Game Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Graphical 3D Illustration */}
        <div className="w-56 h-48 md:h-56 shrink-0 relative flex items-center justify-center text-8xl select-none">
          🎮
          <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl shadow-lg animate-bounce">
            ⭐
          </div>
          <div className="absolute bottom-2 left-2 bg-white/20 backdrop-blur-md text-white rounded-xl px-3 py-1 text-xs font-bold border border-white/20 transform -rotate-6">
            Lớp 1-9 🎒
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl text-slate-800 font-black flex items-center gap-2">
            <span>🏛️</span>
            <span>DANH MỤC TRÒ CHƠI NỔI BẬT</span>
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.code}
              onClick={() => onSelectCategory(cat.code)}
              className="bg-white hover:bg-slate-50 rounded-2xl p-4.5 border border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col items-center text-center group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${cat.color} text-white flex items-center justify-center mb-3 shadow-xs group-hover:scale-110 transition-transform`}>
                {cat.icon}
              </div>
              <span className="text-xs text-slate-700 font-extrabold block group-hover:text-indigo-600 transition-colors uppercase tracking-wide leading-tight">
                {cat.label}
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold block mt-1">
                {cat.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Games & Quick Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Top Games (8 Cols) */}
        <div className="lg:col-span-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg md:text-xl text-slate-800 font-black flex items-center gap-2">
              <span>⭐</span>
              <span>THƯ VIỆN GAME KIỂU MẪU</span>
            </h3>
            <button
              onClick={onExplore}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả ({games.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {games.slice(0, 4).map((game) => {
              const isBought = user?.role === 'admin' || purchases.includes(game.id);

              return (
                <div
                  key={game.id}
                  onClick={() => onSelectGame(game)}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 p-4 shadow-xs hover:shadow-md cursor-pointer transform hover:-translate-y-0.5 transition-all flex gap-4 text-left"
                >
                  <div className="w-16 h-16 shrink-0 rounded-xl bg-gradient-to-tr from-slate-50 to-indigo-50/30 flex items-center justify-center text-3xl border border-slate-100 shadow-2xs">
                    {game.thumbnail || '🎮'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-pink-600 block mb-0.5">
                      {categoryToVietnamese(game.category)}
                    </span>
                    <h4 className="text-sm text-slate-800 font-black truncate">{game.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-2 leading-relaxed">
                      {game.description}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        🔥 Lớp {game.grade_from}-{game.grade_to}
                      </span>
                      <span className="font-bold">
                        {isBought ? (
                          <span className="text-indigo-600 text-[10px] bg-indigo-50 px-2 py-0.5 rounded-md font-bold border border-indigo-100">
                            ĐÃ MỞ KHÓA
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[10px] font-extrabold">
                            5 màn free
                            {game.price > 0 ? ` · ${game.price.toLocaleString('vi-VN')} xu` : ''}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Leaderboard Preview (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-xs text-left">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3.5">
            <h4 className="text-sm text-slate-800 font-extrabold flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>BẢNG VÀNG TUẦN NÀY</span>
            </h4>
            <button
              onClick={onViewLeaderboard}
              className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Xem tất cả
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {leaderboard.slice(0, 5).map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-6 h-6 font-mono text-xs font-black rounded-full flex items-center justify-center ${
                      idx === 0
                        ? 'bg-amber-400 text-slate-900 shadow-2xs'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : idx === 2
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-400 bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="text-xs text-slate-800 font-bold block truncate">
                      {item.name || item.username}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Cấp {item.level || 1} • {item.streak || 0} ngày 🔥
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-black text-rose-500">
                  {item.xp || 0} XP
                </span>
              </div>
            ))}

            {leaderboard.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs font-medium">
                Chưa có dữ liệu bảng vàng!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
