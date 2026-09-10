import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, BookOpen, Sparkles, TrendingUp, Code, 
  Trophy, ChevronRight, ChevronLeft, Gamepad2, ArrowRight,
  Star, Zap, Flame, CheckCircle2
} from 'lucide-react';
import { Game, LeaderboardItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { paths } from '../routes/paths';

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
  const navigate = useNavigate();

  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const categories = [
    { code: 'iq', label: 'PHÁT TRIỂN IQ COGNITIVE', count: '40 Màn Chơi', color: 'from-sky-400 to-blue-500', icon: <Brain className="w-6 h-6" /> },
    { code: 'math', label: 'TOÁN HỌC LOGIC STEM', count: '30 Màn Chơi', color: 'from-amber-400 to-orange-500', icon: <TrendingUp className="w-6 h-6" /> },
    { code: 'scratch', label: 'LẬP TRÌNH ROBOT SCRATCH', count: '2 Khóa học • 9 Bài', color: 'from-purple-400 to-indigo-500', icon: <Code className="w-6 h-6" /> },
    { code: 'vietnamese', label: 'TIẾNG VIỆT & NGÔN NGỮ', count: '4 Loại Game', color: 'from-emerald-400 to-green-500', icon: <BookOpen className="w-6 h-6" /> },
  ];

  const slides = [
    {
      id: 'overview',
      tabLabel: 'Đa Trí Tuệ',
      tabIcon: '🚀',
      badge: 'HỆ THỐNG EDTECH THÔNG THÁI 2026',
      subBadge: 'HỌC NHƯ CHƠI · PHÁT TRIỂN TOÀN DIỆN',
      title: (
        <>
          Chinh Phục Thử Thách Trí Tuệ <br className="hidden sm:inline" /> Nhận Vương Miện Tinh Anh!
        </>
      ),
      description: 'Hệ sinh thái học tập tương tác thế hệ mới: Đập tan áp lực sách vở, biến mỗi giờ học thành cuộc phiêu lưu hấp dẫn kết hợp Toán Logic, Tiếng Việt, Tiếng Anh & Lập trình Scratch. Giúp trẻ tự giác ngồi vào bàn học với niềm say mê bất tận!',
      highlights: [
        '90+ Màn chơi trực quan hóa kiến thức, học mà không áp lực',
        'Kích thích phản xạ tư duy nhạy bén & phát triển toàn diện não bộ',
        'Đồng hành cùng phụ huynh: Con học tự giác, tiến bộ vượt bậc mỗi ngày',
      ],
      ctaLabel: 'Khám Phá Sàn Game Trí Tuệ',
      ctaAction: onExplore,
      bgGradient: 'from-indigo-600 via-purple-600 to-pink-500',
      heroEmoji: '🎮',
      floatingBadge1: 'Lớp 1-9 🎒',
      floatingBadge2: '⭐ Trực Quan 100%',
    },
    {
      id: 'math',
      tabLabel: 'Toán Logic',
      tabIcon: '🔢',
      badge: 'HỆ THỐNG EDTECH THÔNG THÁI 2026',
      subBadge: 'TOÁN HỌC LOGIC STEM · TƯ DUY ĐỘT PHÁ',
      title: (
        <>
          Những Con Số Biết Nhảy Múa <br className="hidden sm:inline" /> Đập Tan Nỗi Sợ Môn Toán!
        </>
      ),
      description: 'Không còn học vẹt công thức khô khan! Bé thấu hiểu bản chất toán học từ gốc qua chuỗi quy luật số học, mê cung logic và phân số hình học trực quan đa giác quan. Rèn luyện tư duy phân tích nhạy bén và khơi dậy đam mê toán học tự nhiên.',
      highlights: [
        'Truy tìm quy luật số học bí ẩn & ma trận tư duy logic',
        'Hình học không gian sinh động, biến trừu tượng thành trực quan',
        'Rèn luyện siêu phản xạ tính nhẩm và giải quyết vấn đề chuẩn STEM',
      ],
      ctaLabel: 'Thử Sức Toán Logic Ngay',
      ctaAction: () => onSelectCategory('math'),
      bgGradient: 'from-blue-700 via-indigo-800 to-cyan-600',
      heroEmoji: '📐',
      floatingBadge1: 'Toán Tư Duy 🧮',
      floatingBadge2: '💡 +100 IQ Não Trái',
    },
    {
      id: 'language',
      tabLabel: 'Việt - Anh',
      tabIcon: '📚',
      badge: 'HỆ THỐNG EDTECH THÔNG THÁI 2026',
      subBadge: 'TIẾNG VIỆT GIÀU ĐẸP · TIẾNG ANH TOÀN CẦU',
      title: (
        <>
          Ghép Chữ Kỳ Diệu <br className="hidden sm:inline" /> Đánh Thức Phản Xạ Ngôn Ngữ Song Ngữ!
        </>
      ),
      description: 'Phương pháp thẩm thấu ngôn ngữ qua âm thanh và hình ảnh sống động: Vừa cảm thụ nét đẹp tinh tế của Tiếng Việt qua đố vui ca dao, thành ngữ; vừa hấp thu vốn từ vựng Tiếng Anh quốc tế chuẩn bản ngữ tự nhiên như hơi thở.',
      highlights: [
        'Đố vui ca dao ngữ nghĩa & ghép từ sáng tạo rèn sự mạch lạc',
        'Kho từ vựng Tiếng Anh tương tác trực quan, nhớ lâu gấp 3 lần',
        'Tự tin biểu đạt suy nghĩ, bồi đắp tư duy ngôn từ phong phú từ nhỏ',
      ],
      ctaLabel: 'Khám Phá Game Ngôn Ngữ',
      ctaAction: () => onSelectCategory('vietnamese'),
      bgGradient: 'from-rose-600 via-pink-600 to-amber-600',
      heroEmoji: '📚',
      floatingBadge1: 'Song Ngữ A+ 🌏',
      floatingBadge2: '✨ Nhớ Sâu Gấp 3',
    },
    {
      id: 'scratch',
      tabLabel: 'Lập Trình Scratch',
      tabIcon: '🤖',
      badge: 'HỆ THỐNG EDTECH THÔNG THÁI 2026',
      subBadge: 'LẬP TRÌNH ROBOT SCRATCH · KỶ NGUYÊN AI',
      title: (
        <>
          Kéo Thả Khối Lệnh Diệu Kỳ <br className="hidden sm:inline" /> Bé Tự Tay Làm Game & Điều Khiển Robot!
        </>
      ),
      description: 'Chuyển hóa con từ người tiêu thụ trò chơi thụ động thành nhà sáng tạo công nghệ tương lai! Giáo trình lập trình khối Scratch chuẩn MIT giúp trẻ làm chủ tư duy thuật toán, vòng lặp, biến số và điều kiện cực kỳ trực quan và dễ hiểu.',
      highlights: [
        'Lắp ghép khối lệnh màu sắc trực quan, học bản chất lập trình thật',
        'Rèn luyện tính kiên nhẫn, tư duy chia nhỏ vấn đề và tư duy phản biện',
        'Tự hào xuất bản những game, phim hoạt hình và dự án AI đầu đời',
      ],
      ctaLabel: 'Vào Học Lập Trình Scratch',
      ctaAction: () => navigate(paths.scratch),
      bgGradient: 'from-teal-700 via-emerald-600 to-cyan-700',
      heroEmoji: '🤖',
      floatingBadge1: 'Kỹ Sư Nhí 🚀',
      floatingBadge2: '💻 Chuẩn MIT AI',
    },
    {
      id: 'gamification',
      tabLabel: 'Động Lực Sao IQ',
      tabIcon: '⭐',
      badge: 'HỆ THỐNG EDTECH THÔNG THÁI 2026',
      subBadge: 'ĐỘNG LỰC SAO IQ ⭐ · BA MẸ YÊN TÂM ĐỒNG HÀNH',
      title: (
        <>
          Chơi Có Thưởng, Học Say Mê <br className="hidden sm:inline" /> Tích Lũy Sao IQ & Leo Bảng Vàng!
        </>
      ),
      description: 'Ứng dụng tâm lý học tích cực: Mỗi thử thách vượt qua là một lần nhận thưởng Sao IQ ⭐, duy trì chuỗi ngày học tập rực lửa Streak và thăng hạng trên Bảng Vàng. Cha mẹ an tâm dõi theo tiến độ học tập thực tế và sự tự tin lớn lên mỗi ngày!',
      highlights: [
        'Thưởng Sao IQ ⭐ mở khóa trò chơi yêu thích, nuôi dưỡng động lực tự thân',
        'Chuỗi ngày học tập rực lửa 🔥 rèn luyện thói quen kiên trì bền bỉ',
        'Bảng Vàng vinh danh nỗ lực xứng đáng, xây dựng lòng tự tin vững chắc',
      ],
      ctaLabel: 'Xem Bảng Vàng Vinh Danh',
      ctaAction: onViewLeaderboard,
      bgGradient: 'from-amber-600 via-orange-600 to-rose-600',
      heroEmoji: '🏆',
      floatingBadge1: 'Thủ Khoa Tuần 👑',
      floatingBadge2: '⭐ Sao IQ Rực Rỡ',
    },
  ];

  // Auto-play interval
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isHovered, slides.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  const curSlide = slides[activeSlide];

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
      {/* Interactive EdTech 2026 Hero Slider Section */}
      <div 
        className="relative group flex flex-col gap-3"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Quick Curriculum Switcher Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
          {slides.map((s, idx) => {
            const isActive = idx === activeSlide;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm ring-2 ring-indigo-500/50 scale-102'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <span>{s.tabIcon}</span>
                <span>{s.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Slide Card */}
        <div className={`bg-gradient-to-r ${curSlide.bgGradient} rounded-3xl p-5 sm:p-7 md:p-10 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden text-white transition-all duration-500`}>
          {/* Content Left */}
          <div className="flex-1 text-center md:text-left z-10 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md font-black text-[11px] sm:text-xs px-3.5 py-1 rounded-full tracking-wide shadow-xs border border-white/25">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {curSlide.badge}
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-900 font-extrabold text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                {curSlide.subBadge}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight mb-3 uppercase">
              {curSlide.title}
            </h1>

            {/* Description */}
            <p className="text-white/95 text-xs sm:text-sm max-w-xl mb-4 font-medium leading-relaxed">
              {curSlide.description}
            </p>

            {/* Highlights List */}
            <div className="space-y-1.5 mb-6 text-left max-w-lg mx-auto md:mx-0">
              {curSlide.highlights.map((point, pIdx) => (
                <div key={pIdx} className="flex items-start gap-2 text-xs text-white/90">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                  <span className="font-semibold leading-snug">{point}</span>
                </div>
              ))}
            </div>

            {/* CTA & Controls Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
              <button
                type="button"
                onClick={curSlide.ctaAction}
                className="w-full sm:w-auto px-8 py-3.5 min-h-[48px] bg-white text-slate-900 hover:bg-slate-50 font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{curSlide.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 text-indigo-600" />
              </button>

              <span className="text-[11px] font-bold text-white/70 hidden sm:inline">
                Học như chơi · Trực quan 100%
              </span>
            </div>
          </div>

          {/* Right Visual 3D Graphics */}
          <div className="w-48 sm:w-56 h-44 sm:h-52 md:h-60 shrink-0 relative flex items-center justify-center select-none animate-in zoom-in-95 duration-300">
            <div className="text-7xl sm:text-8xl filter drop-shadow-2xl hover:scale-110 transition-transform cursor-pointer">
              {curSlide.heroEmoji}
            </div>

            {/* Floating Badges */}
            <div className="absolute top-2 right-1 sm:right-2 bg-white/20 backdrop-blur-md text-white rounded-full px-3 py-1.5 text-xs font-black shadow-lg border border-white/30 animate-bounce">
              {curSlide.floatingBadge2}
            </div>

            <div className="absolute bottom-2 left-1 sm:left-2 bg-white/20 backdrop-blur-md text-white rounded-xl px-3 py-1 text-xs font-extrabold border border-white/20 transform -rotate-6 shadow-md">
              {curSlide.floatingBadge1}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            type="button"
            onClick={handlePrev}
            title="Slide trước"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all opacity-80 hover:opacity-100 cursor-pointer shadow-md"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            title="Slide kế tiếp"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all opacity-80 hover:opacity-100 cursor-pointer shadow-md"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Bottom Indicators & Slide Index */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {slides.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setActiveSlide(dotIdx)}
                title={`Chuyển đến slide ${dotIdx + 1}`}
                className={`transition-all rounded-full cursor-pointer ${
                  dotIdx === activeSlide
                    ? 'w-7 h-2 bg-white shadow-xs'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            ))}
          </div>

          {/* Slide counter indicator */}
          <div className="absolute bottom-2.5 right-4 hidden md:block text-[10px] font-mono font-bold tracking-widest text-white/60">
            0{activeSlide + 1} / 0{slides.length}
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
                            {game.price > 0 ? ` · ${game.price.toLocaleString('vi-VN')} Sao IQ` : ''}
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
