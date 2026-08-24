import React, { useState, useMemo, useEffect } from 'react';
import { 
  Gamepad2, Search, Filter, Lock, Play, 
  Sparkles, CheckCircle2, Star, Coins, ArrowRight, X, 
  ArrowUpDown, RotateCcw, Flame, Trophy, Layers 
} from 'lucide-react';
import { Game } from '../types';
import { useAuth } from '../context/AuthContext';
import { GameCard } from '../components/GameCard';
import { GameDetailModal } from '../components/GameDetailModal';
import { PurchaseModal } from '../components/PurchaseModal';
import { playSynthSound } from '../components/game-engines/soundUtils';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface MarketplacePageProps {
  games: Game[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onPlayGame: (game: Game, levelNum?: number) => void;
  onNavigateToWallet?: () => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  games,
  selectedCategory,
  setSelectedCategory,
  onPlayGame,
  onNavigateToWallet = () => {},
}) => {
  const { user, purchases } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 250);

  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('popular');

  // Modals state
  const [detailGame, setDetailGame] = useState<Game | null>(null);
  const [purchaseGame, setPurchaseGame] = useState<Game | null>(null);

  // Featured Games for top carousel / banner
  const featuredGames = useMemo(() => {
    return games.filter((g) => g.rating_avg && g.rating_avg >= 4.8).slice(0, 3);
  }, [games]);

  // Filter & Search & Sort logic
  const filteredAndSortedGames = useMemo(() => {
    const list = games.filter((game) => {
      // 1. Search with debounce
      if (debouncedSearch.trim()) {
        const term = debouncedSearch.toLowerCase();
        const matchTitle = game.title.toLowerCase().includes(term);
        const matchDesc = game.description.toLowerCase().includes(term);
        if (!matchTitle && !matchDesc) return false;
      }

      // 2. Category
      if (selectedCategory !== 'all' && game.category !== selectedCategory) {
        return false;
      }

      // 3. Grade
      if (selectedGrade !== 'all') {
        const gNum = parseInt(selectedGrade, 10);
        if (gNum < game.grade_from || gNum > game.grade_to) return false;
      }

      // 4. Type (Free vs Paid)
      if (selectedType === 'free' && game.price > 0) return false;
      if (selectedType === 'paid' && game.price === 0) return false;

      return true;
    });

    // Sort logic
    return list.sort((a, b) => {
      if (sortBy === 'newest') return (b.id || '').localeCompare(a.id || '');
      if (sortBy === 'rating') return (b.rating_avg || 5) - (a.rating_avg || 5);
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      return (b.plays_count || 0) - (a.plays_count || 0); // popular default
    });
  }, [games, debouncedSearch, selectedCategory, selectedGrade, selectedType, sortBy]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedGrade('all');
    setSelectedType('all');
    setSortBy('popular');
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* 1. Hero Featured Games Banner */}
      {featuredGames.length > 0 && selectedCategory === 'all' && !searchTerm && (
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-purple-500/20">
          <div className="z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider text-yellow-300 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              BỘ TRÒ CHƠI TIÊU BIỂU TRONG TUẦN
            </span>
            <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
              Khám Phá Sàn Game Trí Tuệ IQ Kids 🚀
            </h2>
            <p className="text-xs md:text-sm text-purple-100 leading-relaxed">
              Bộ sưu tập hơn 90+ màn chơi Toán học, Não bộ IQ, Lập trình Scratch và Tiếng Việt được thiết kế chuẩn sư phạm dành riêng cho học sinh Việt Nam.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10 overflow-x-auto max-w-full pb-2 md:pb-0">
            {featuredGames.map((fg) => (
              <div
                key={fg.id}
                onClick={() => setDetailGame(fg)}
                className="bg-white/10 backdrop-blur-md hover:bg-white/20 p-3.5 rounded-2xl border border-white/20 cursor-pointer transition-all duration-300 hover:scale-105 min-w-[140px] text-center"
              >
                <div className="text-3xl mb-1">{fg.thumbnail || '🎮'}</div>
                <h5 className="text-xs font-black text-white line-clamp-1">{fg.title}</h5>
                <span className="text-[10px] text-amber-300 font-bold flex items-center justify-center gap-0.5 mt-0.5">
                  <Star className="w-3 h-3 fill-amber-300" />
                  {fg.rating_avg ? fg.rating_avg.toFixed(1) : '5.0'}
                </span>
              </div>
            ))}
          </div>

          {/* Background Ornaments */}
          <div className="absolute -right-12 -bottom-12 w-56 h-56 bg-pink-500/20 rounded-full blur-3xl" />
          <div className="absolute -left-12 -top-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl" />
        </div>
      )}

      {/* 2. Search & Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl p-4.5 shadow-xs border border-slate-200/80">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-pink-600" />
            <span>DANH MỤC TRÒ CHƠI GIÁO DỤC</span>
          </h3>
          <p className="text-slate-400 text-xs">
            Tìm kiếm theo từ khóa hoặc tùy chọn khối lớp phù hợp với bé
          </p>
        </div>

        {/* Real-time Debounced Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên trò chơi, chủ đề..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white outline-hidden rounded-xl py-2.5 pl-9 pr-8 text-xs font-semibold text-slate-800 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Layout: Filters Sidebar (Left) + Games Grid (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Filters Sidebar (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex flex-col gap-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-800 text-xs font-black uppercase tracking-wide">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>BỘ LỌC ĐA CHIỀU</span>
            </div>
            {(selectedCategory !== 'all' || selectedGrade !== 'all' || selectedType !== 'all' || searchTerm) && (
              <button
                onClick={handleResetFilters}
                className="text-[10px] text-slate-400 hover:text-indigo-600 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          {/* Filter 1: Khối Lớp */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
              KHỐI LỚP HỌC
            </h4>
            <div className="grid grid-cols-3 gap-1.5">
              {['all', '1', '2', '3', '4', '5'].map((gradeVal) => (
                <button
                  key={gradeVal}
                  onClick={() => {
                    setSelectedGrade(gradeVal);
                    playSynthSound('click');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    selectedGrade === gradeVal
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs font-extrabold'
                      : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {gradeVal === 'all' ? 'Tất cả' : `Lớp ${gradeVal}`}
                </button>
              ))}
            </div>
          </div>

          {/* Filter 2: Thể Loại */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
              THỂ LOẠI BÀI HỌC
            </h4>
            <div className="flex flex-col gap-1">
              {[
                { code: 'all', label: 'Tất Cả Thể Loại' },
                { code: 'iq', label: 'Tư Duy IQ Não Bộ' },
                { code: 'math', label: 'Toán Học Logic' },
                { code: 'scratch', label: 'Lập Trình Robot Scratch' },
                { code: 'vietnamese', label: 'Tiếng Việt & Ngôn Ngữ' },
              ].map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => {
                    setSelectedCategory(cat.code);
                    playSynthSound('click');
                  }}
                  className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === cat.code
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter 3: Loại Phí */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
              LOẠI BẢN QUYỀN
            </h4>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { code: 'all', label: 'Tất cả' },
                { code: 'free', label: 'Miễn phí' },
                { code: 'paid', label: 'Có phí' },
              ].map((typeItem) => (
                <button
                  key={typeItem.code}
                  onClick={() => {
                    setSelectedType(typeItem.code);
                    playSynthSound('click');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    selectedType === typeItem.code
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs font-extrabold'
                      : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {typeItem.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Games Grid & Sort (9 Cols) */}
        <div className="lg:col-span-9">
          {/* Sắp xếp & Số lượng Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white rounded-xl p-3 border border-slate-200/80">
            <p className="text-xs font-bold text-slate-600">
              Tìm thấy <strong className="text-indigo-600 font-extrabold">{filteredAndSortedGames.length}</strong> trò chơi phù hợp
            </p>

            <div className="flex items-center gap-2 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-medium">Sắp xếp theo:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
              >
                <option value="popular">Phổ biến nhất 🔥</option>
                <option value="rating">Đánh giá cao ⭐</option>
                <option value="price_asc">Giá: Thấp đến Cao</option>
                <option value="price_desc">Giá: Cao đến Thấp</option>
                <option value="newest">Mới nhất</option>
              </select>
            </div>
          </div>

          {/* Games Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredAndSortedGames.map((game) => {
              const isBought = purchases.includes(game.id);

              return (
                <GameCard
                  key={game.id}
                  game={game}
                  isPurchased={isBought}
                  onSelectDetail={(g) => setDetailGame(g)}
                  onPlayDirect={(g) => onPlayGame(g, 1)}
                  onBuyDirect={(g) => setPurchaseGame(g)}
                />
              );
            })}
          </div>

          {/* Empty State */}
          {filteredAndSortedGames.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
              <div className="text-5xl mb-3">🔍</div>
              <h3 className="text-base font-bold text-slate-700 mb-1">Không tìm thấy trò chơi nào phù hợp</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm đặt lại toàn bộ bộ lọc.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Đặt lại tất cả bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Game Detail Modal */}
      {detailGame && (
        <GameDetailModal
          game={detailGame}
          isPurchased={purchases.includes(detailGame.id)}
          onClose={() => setDetailGame(null)}
          onPlayGame={(g, lvl) => {
            setDetailGame(null);
            onPlayGame(g, lvl);
          }}
          onInitiatePurchase={(g) => {
            setDetailGame(null);
            setPurchaseGame(g);
          }}
        />
      )}

      {/* 5. One-Click Purchase Checkout Modal */}
      {purchaseGame && (
        <PurchaseModal
          game={purchaseGame}
          onClose={() => setPurchaseGame(null)}
          onSuccess={(g) => {
            setPurchaseGame(null);
            onPlayGame(g, 1);
          }}
          onNavigateToWallet={() => {
            setPurchaseGame(null);
            onNavigateToWallet();
          }}
        />
      )}
    </div>
  );
};

export default MarketplacePage;
