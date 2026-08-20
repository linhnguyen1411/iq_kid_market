import React, { useState, useMemo } from 'react';
import { 
  Gamepad2, Search, Filter, Lock, Play, 
  Sparkles, CheckCircle2, Star, Coins, ArrowRight, X 
} from 'lucide-react';
import { Game } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface MarketplacePageProps {
  games: Game[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onPlayGame: (game: Game, levelNum?: number) => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  games,
  selectedCategory,
  setSelectedCategory,
  onPlayGame,
}) => {
  const { user, wallet, purchases, addPurchase, updateUserWallet, openAuthModal } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedGameDetail, setSelectedGameDetail] = useState<Game | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const categoryToVietnamese = (cat: string) => {
    switch (cat) {
      case 'math': return 'Toán Học Logic';
      case 'iq': return 'Tư Duy IQ';
      case 'scratch': return 'Lập Trình Robot';
      case 'vietnamese': return 'Tiếng Việt';
      default: return 'Trí Tuệ';
    }
  };

  // Filter & Search logic
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      // 1. Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
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

      // 4. Type
      if (selectedType === 'free' && game.price > 0) return false;
      if (selectedType === 'paid' && game.price === 0) return false;

      return true;
    });
  }, [games, searchTerm, selectedCategory, selectedGrade, selectedType]);

  const handleBuyGame = async (game: Game) => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    if ((wallet?.balance || 0) < game.price) {
      setPurchaseError(`Số dư ví (${(wallet?.balance || 0).toLocaleString('vi-VN')} xu) không đủ ${game.price.toLocaleString('vi-VN')} xu để mua game này!`);
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);
    try {
      const res = await api.games.purchaseGame(user.id, game.id);
      if (res.success) {
        addPurchase(game.id);
        updateUserWallet(res.newBalance);
        setSelectedGameDetail(null);
      }
    } catch (err: any) {
      setPurchaseError(err.message || 'Không thể thực hiện giao dịch mua game!');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl p-4.5 shadow-xs border border-slate-200/80 text-left">
        <div>
          <h2 className="text-lg md:text-xl text-slate-800 font-black flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-pink-600" />
            <span>SÀN GAME THÔNG THÁI</span>
          </h2>
          <p className="text-slate-500 text-xs font-medium">
            Lọc và khám phá 90+ trò chơi rèn trí tuệ cho học sinh tiểu học & THCS
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm trò chơi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white outline-hidden rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 transition-all"
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

      {/* Main Layout: Filters (Left) + Grid (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Filters Sidebar (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs text-left flex flex-col gap-5">
          <div className="flex items-center gap-1.5 text-slate-800 text-xs font-black pb-2 border-b border-slate-100 uppercase tracking-wide">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>BỘ LỌC TÌM KIẾM</span>
          </div>

          {/* Filter 1: Grade */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
              KHỐI LỚP HỌC
            </h4>
            <div className="grid grid-cols-3 gap-1.5">
              {['all', '1', '2', '3', '4', '5'].map((gradeVal) => (
                <button
                  key={gradeVal}
                  onClick={() => setSelectedGrade(gradeVal)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    selectedGrade === gradeVal
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {gradeVal === 'all' ? 'Tất cả' : `Lớp ${gradeVal}`}
                </button>
              ))}
            </div>
          </div>

          {/* Filter 2: Category */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
              THỂ LOẠI
            </h4>
            <div className="flex flex-col gap-1">
              {[
                { code: 'all', label: 'Tất Cả Thể Loại' },
                { code: 'iq', label: 'Tư Duy IQ Cognitive' },
                { code: 'math', label: 'Toán Học Logic' },
                { code: 'scratch', label: 'Lập Trình Robot Scratch' },
                { code: 'vietnamese', label: 'Tiếng Việt & Ngôn Ngữ' },
              ].map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => setSelectedCategory(cat.code)}
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

          {/* Filter 3: Type */}
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
              LOẠI PHÍ
            </h4>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { code: 'all', label: 'Tất cả' },
                { code: 'free', label: 'Miễn phí' },
                { code: 'paid', label: 'Có phí' },
              ].map((typeItem) => (
                <button
                  key={typeItem.code}
                  onClick={() => setSelectedType(typeItem.code)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    selectedType === typeItem.code
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {typeItem.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Games Grid (9 Cols) */}
        <div className="lg:col-span-9">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs font-bold text-slate-500">
              Hiển thị <span className="text-indigo-600 font-extrabold">{filteredGames.length}</span> trò chơi phù hợp
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredGames.map((game) => {
              const isBought = purchases.includes(game.id) || game.price === 0;

              return (
                <div
                  key={game.id}
                  onClick={() => setSelectedGameDetail(game)}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 p-4.5 shadow-xs hover:shadow-md cursor-pointer transform hover:-translate-y-0.5 transition-all flex flex-col justify-between text-left group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-50 to-indigo-50 flex items-center justify-center text-2xl border border-slate-100 group-hover:scale-105 transition-transform">
                        {game.thumbnail || '🎮'}
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                        {categoryToVietnamese(game.category)}
                      </span>
                    </div>

                    <h4 className="text-sm text-slate-800 font-black line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">
                      {game.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {game.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{game.rating_avg ? game.rating_avg.toFixed(1) : '5.0'}</span>
                      <span className="text-slate-400 font-normal">({game.plays_count || 0})</span>
                    </div>

                    <div>
                      {game.price === 0 ? (
                        <span className="text-emerald-600 font-extrabold text-xs">MIỄN PHÍ</span>
                      ) : isBought ? (
                        <span className="text-indigo-600 text-[10px] bg-indigo-50 px-2 py-0.5 rounded-md font-bold border border-indigo-100">
                          ĐÃ SỞ HỮU
                        </span>
                      ) : (
                        <span className="text-pink-600 font-mono font-black text-xs">
                          {game.price.toLocaleString('vi-VN')} xu
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredGames.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
              <div className="text-5xl mb-3">🔍</div>
              <h3 className="text-base font-bold text-slate-700 mb-1">Không tìm thấy trò chơi nào</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Vui lòng thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại các tiêu chí bộ lọc.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Game Detail Modal */}
      {selectedGameDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 text-left relative">
            <button
              onClick={() => {
                setSelectedGameDetail(null);
                setPurchaseError(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-50 to-pink-50 flex items-center justify-center text-4xl border border-slate-100 shadow-2xs">
                {selectedGameDetail.thumbnail || '🎮'}
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-100">
                  {categoryToVietnamese(selectedGameDetail.category)}
                </span>
                <h3 className="text-lg font-black text-slate-800 mt-1">
                  {selectedGameDetail.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Tác giả: <span className="font-semibold text-slate-600">{selectedGameDetail.creator_name || 'Hệ thống'}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {selectedGameDetail.detailed_description || selectedGameDetail.description}
            </p>

            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl mb-4 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Độ tuổi</span>
                <span className="text-xs font-black text-slate-700">Lớp {selectedGameDetail.grade_from}-{selectedGameDetail.grade_to}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Số Màn</span>
                <span className="text-xs font-black text-slate-700">{selectedGameDetail.levels?.length || 1} Màn</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Giá bán</span>
                <span className="text-xs font-black text-pink-600">
                  {selectedGameDetail.price === 0 ? 'Miễn phí' : `${selectedGameDetail.price.toLocaleString('vi-VN')} xu`}
                </span>
              </div>
            </div>

            {purchaseError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                ⚠️ {purchaseError}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3">
              {purchases.includes(selectedGameDetail.id) || selectedGameDetail.price === 0 ? (
                <button
                  onClick={() => {
                    const game = selectedGameDetail;
                    setSelectedGameDetail(null);
                    onPlayGame(game, 1);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>VÀO CHƠI NGAY (MÀN 1)</span>
                </button>
              ) : (
                <button
                  disabled={isPurchasing}
                  onClick={() => handleBuyGame(selectedGameDetail)}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Coins className="w-4 h-4 text-amber-300" />
                  <span>
                    {isPurchasing ? 'Đang xử lý mua...' : `MUA GAME BẰNG ${selectedGameDetail.price.toLocaleString('vi-VN')} XU`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
