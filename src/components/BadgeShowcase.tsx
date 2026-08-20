import React, { useState, useEffect } from 'react';
import { Trophy, Award, Lock, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Achievement } from '../types';
import { playSynthSound } from './game-engines/soundUtils';

export const BadgeShowcase: React.FC = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.scores.getUserAchievements(user.id);
      setBadges(data);
    } catch (err) {
      console.error('Lỗi tải danh sách huy hiệu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadges();
  }, [user?.id]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="flex flex-col gap-6 text-left animate-in fade-in duration-200">
      {/* Header Stat Summary */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 rounded-3xl p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            BỘ SƯU TẬP DANH HIỆU & HUY CHƯƠNG
          </span>
          <h3 className="text-xl md:text-2xl font-black">
            Kho Huy Hiệu Thành Tích Của Bé 🎖️
          </h3>
          <p className="text-xs text-white/85 mt-1">
            Vượt qua các thử thách, duy trì chuỗi học tập để mở khóa huy hiệu vàng lấp lánh!
          </p>
        </div>

        <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 text-center">
          <span className="text-xs text-white/80 block font-bold">ĐÃ MỞ KHÓA</span>
          <span className="text-2xl font-black font-mono">
            {unlockedCount} / {badges.length || 6}
          </span>
        </div>
      </div>

      {/* Badges Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const isUnlocked = badge.unlocked;

            return (
              <div
                key={badge.id}
                onClick={() => {
                  if (isUnlocked) playSynthSound('victory');
                  else playSynthSound('click');
                }}
                className={`p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                  isUnlocked
                    ? 'bg-gradient-to-b from-amber-50/80 to-white border-amber-300 shadow-md hover:shadow-xl hover:-translate-y-1 ring-1 ring-amber-200'
                    : 'bg-slate-50/80 border-slate-200 opacity-75 hover:opacity-90'
                }`}
              >
                {/* Glow effect for unlocked */}
                {isUnlocked && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-bl-full pointer-events-none" />
                )}

                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xs transition-transform ${
                        isUnlocked
                          ? 'bg-gradient-to-tr from-amber-100 to-yellow-100 border-2 border-amber-300 scale-105'
                          : 'bg-slate-200/80 border border-slate-300 grayscale'
                      }`}
                    >
                      {badge.icon || '🏆'}
                    </div>

                    <div>
                      {isUnlocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-300">
                          <CheckCircle2 className="w-3 h-3 text-amber-600" />
                          <span>ĐÃ ĐẠT</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>CHƯA MỞ</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <h4
                    className={`text-sm font-black mb-1 line-clamp-1 ${
                      isUnlocked ? 'text-slate-800' : 'text-slate-600'
                    }`}
                  >
                    {badge.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                    {badge.description}
                  </p>
                </div>

                {/* Progress bar or Unlocked Date */}
                <div className="pt-3 border-t border-slate-100">
                  {isUnlocked ? (
                    <div className="flex items-center justify-between text-[11px] text-amber-600 font-bold">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>+{badge.xp_bonus || 100} XP Thưởng</span>
                      </span>
                      <span className="text-slate-400 font-normal">
                        {badge.unlocked_at ? new Date(badge.unlocked_at).toLocaleDateString('vi-VN') : 'Đã đạt'}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mb-1">
                        <span>Tiến độ mở khóa</span>
                        <span className="font-mono">{badge.progress_percent || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${badge.progress_percent || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BadgeShowcase;
