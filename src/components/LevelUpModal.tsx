import React, { useEffect } from 'react';
import { Trophy, Sparkles, Star, ArrowRight, Award } from 'lucide-react';
import { playSynthSound } from './game-engines/soundUtils';

interface LevelUpModalProps {
  newLevel: number;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ newLevel, onClose }) => {
  useEffect(() => {
    playSynthSound('victory');
  }, []);

  const getLevelTitle = (lvl: number) => {
    if (lvl >= 10) return 'Đại Tướng Trí Tuệ Vô Địch 👑';
    if (lvl >= 7) return 'Bậc Thầy Logic Siêu Phàm ⚡';
    if (lvl >= 5) return 'Chiến Binh Trí Não Xuất Sắc 🛡️';
    if (lvl >= 3) return 'Nhà Thám Hiểm Trí Tuệ 🌟';
    return 'Học Sinh Chăm Chỉ Tài Năng 🎓';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-gradient-to-b from-amber-500 via-orange-500 to-pink-600 rounded-3xl max-w-sm w-full p-8 shadow-2xl text-center text-white relative overflow-hidden border-4 border-amber-300 animate-in zoom-in-95 duration-200">
        {/* Background glow & sparkles */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-yellow-300/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-pink-400/30 rounded-full blur-2xl pointer-events-none" />

        {/* Crown Badge */}
        <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border-4 border-yellow-300 mx-auto flex items-center justify-center text-5xl mb-4 shadow-xl animate-bounce">
          👑
        </div>

        <span className="inline-flex items-center gap-1 bg-white/25 backdrop-blur-md text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-yellow-200 border border-white/30 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          CHÚC MỪNG BÉ THĂNG CẤP!
        </span>

        <h2 className="text-3xl font-black mb-1 drop-shadow-md">
          CẤP ĐỘ {newLevel}
        </h2>

        <p className="text-xs font-bold text-yellow-100 mb-6 font-mono">
          {getLevelTitle(newLevel)}
        </p>

        <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-4 border border-white/20 text-xs space-y-2 mb-6">
          <div className="flex items-center justify-between font-bold">
            <span className="text-white/80">Phần thưởng thăng cấp:</span>
            <span className="text-yellow-300 font-mono">+100 XP & Huy hiệu</span>
          </div>
          <div className="flex items-center justify-between font-bold">
            <span className="text-white/80">Năng lượng não bộ:</span>
            <span className="text-emerald-300 font-mono">100% Đầy</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playSynthSound('click');
            onClose();
          }}
          className="w-full py-3.5 bg-white hover:bg-yellow-50 text-slate-900 font-black text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <span>TIẾP TỤC HỌC TẬP NGAY 🚀</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default LevelUpModal;
