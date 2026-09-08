import React, { useState, useEffect } from 'react';
import { 
  Trophy, Sparkles, Star, Flame, Award, CheckCircle2, 
  Lock, TrendingUp, Layers, ChevronRight, BarChart3
} from 'lucide-react';
import { api } from '../../services/api';
import { ScratchAnalytics } from '../../types';

export const ScratchAnalyticsWidget: React.FC = () => {
  const [analytics, setAnalytics] = useState<ScratchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('iqkids_auth_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await api.scratch.getAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu phân tích Scratch:', err);
      setError(err.message || 'Không thể tải báo cáo năng lực.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex items-center justify-center py-10">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tính toán chỉ số năng lực lập trình của bé...</span>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/80 shadow-xs flex flex-col gap-6">
      {/* Header Widget */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-800">
                Bảng Theo Dõi Năng Lực & Kỹ Năng Lập Trình
              </h3>
              <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                CSTA Standard
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Đo lường tiến độ 11 cấp độ và mức độ thông thạo các nhóm kỹ năng tư duy máy tính
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-black flex items-center gap-1.5 border border-amber-200/60">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Chuỗi: {analytics.streak_days} Ngày</span>
          </span>
        </div>
      </div>

      {/* 4 Chỉ Số Tổng Quan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cấp Độ Đã Qua</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-800">
              {analytics.total_completed_lessons}
            </span>
            <span className="text-xs font-bold text-slate-400">
              / {analytics.total_curriculum_lessons}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, analytics.completion_rate)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sao Tích Lũy</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-600">
              {analytics.total_stars}
            </span>
            <span className="text-xs font-bold text-slate-400">⭐</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">Đạt tối đa 3 sao mỗi bài</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dự Án Sáng Tạo</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-600">
              {analytics.total_projects}
            </span>
            <span className="text-xs font-bold text-slate-400">dự án</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">Lưu trữ trên đám mây</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kinh Nghiệm XP</span>
            <Sparkles className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-orange-600">
              {analytics.xp_earned}
            </span>
            <span className="text-xs font-bold text-slate-400">XP</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">Tích lũy nâng cấp bậc</p>
        </div>
      </div>

      {/* Tiến Độ 8 Nhóm Kỹ Năng Cốt Lõi */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Mức Độ Thông Thạo 8 Nhóm Kỹ Năng
          </h4>
          <span className="text-[11px] font-bold text-slate-400">
            {analytics.skills_mastery.filter(s => s.mastery_percent >= 100).length} / 8 Đã Làm Chủ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {analytics.skills_mastery.map((item) => {
            const isMastered = item.mastery_percent >= 100;
            return (
              <div 
                key={item.skill}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isMastered
                    ? 'bg-emerald-50/40 border-emerald-200/80'
                    : item.mastery_percent > 0
                    ? 'bg-amber-50/30 border-amber-200/60'
                    : 'bg-slate-50/50 border-slate-100 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">
                    {item.title}
                  </span>
                  <span className={`text-[10px] font-mono font-black shrink-0 ${
                    isMastered ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                    {item.mastery_percent}%
                  </span>
                </div>

                <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mb-1.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isMastered 
                        ? 'bg-emerald-500' 
                        : item.mastery_percent > 0 
                        ? 'bg-amber-500' 
                        : 'bg-slate-300'
                    }`}
                    style={{ width: `${item.mastery_percent}%` }}
                  />
                </div>

                <span className="text-[9px] font-bold text-slate-400 block">
                  {isMastered ? '✨ Đã đạt yêu cầu' : `Mở khóa ở Cấp độ ${item.level_required}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bộ Sưu Tập Huy Hiệu Scratch */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            Huy Hiệu Thành Tích Scratch Studio
          </h4>
          <span className="text-[11px] font-bold text-amber-600">
            {analytics.badges.filter(b => b.unlocked).length} / {analytics.badges.length} Đã Mở Khóa
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {analytics.badges.map((badge) => {
            return (
              <div 
                key={badge.id}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  badge.unlocked
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50/50 border-amber-200 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                  badge.unlocked ? 'bg-white shadow-xs' : 'bg-slate-200 grayscale'
                }`}>
                  {badge.icon || '🏆'}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <h5 className="text-xs font-black text-slate-800 truncate">
                      {badge.title}
                    </h5>
                    {badge.unlocked ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1 leading-tight mb-1">
                    {badge.description}
                  </p>
                  <span className="inline-block text-[9px] font-bold text-amber-600 bg-amber-100/70 px-1.5 py-0.2 rounded">
                    +{badge.xp_bonus} XP
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ScratchAnalyticsWidget;
