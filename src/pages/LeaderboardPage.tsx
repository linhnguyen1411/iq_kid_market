import React, { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Sparkles, Award, 
  Flame, Filter, CheckCircle2, Lock, Clock, Calendar, Zap 
} from 'lucide-react';
import { LeaderboardItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { BadgeShowcase } from '../components/BadgeShowcase';
import { playSynthSound } from '../components/game-engines/soundUtils';

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('all_time');
  const [loading, setLoading] = useState(true);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
      const lbData = await api.scores.getLeaderboard({
        grade: selectedGrade !== 'all' ? Number(selectedGrade) : undefined,
        timeframe: timeframe !== 'all_time' ? timeframe : undefined,
      });
      setLeaderboard(lbData);
    } catch (err) {
      console.error('Lỗi khi tải bảng xếp hạng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [selectedGrade, timeframe, user?.id]);

  const top3 = leaderboard.slice(0, 3);
  const remainingList = leaderboard.slice(3);

  // Avatar helper
  const renderAvatarEmoji = (avatarCode?: string) => {
    switch (avatarCode) {
      case 'smile_tiger': return '🐯';
      case 'smart_owl': return '🦉';
      case 'cool_fox': return '🦊';
      case 'happy_panda': return '🐼';
      case 'super_rabbit': return '🐰';
      case 'brave_dragon': return '🐲';
      default: return '🎓';
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5 text-yellow-200" />
            ĐUA TOP TRÍ TUỆ TOÀN TRƯỜNG
          </span>
          <h2 className="text-2xl md:text-3xl font-black mb-2">
            Bảng Vàng Vinh Danh & Danh Hiệu 🏆
          </h2>
          <p className="text-xs md:text-sm text-white/90 leading-relaxed max-w-xl">
            Tích lũy điểm kinh nghiệm XP, vượt qua các thử thách game logic và duy trì chuỗi ngày học Daily Streak để ghi tên vào bảng vàng trường học!
          </p>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab('leaderboard');
              playSynthSound('click');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-white text-orange-600 shadow-md'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Bảng Vàng Thi Đua</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('badges');
              playSynthSound('click');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'badges'
                ? 'bg-white text-orange-600 shadow-md'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Kho Huy Hiệu</span>
          </button>
        </div>
      </div>

      {activeTab === 'badges' ? (
        /* Tab 2: Badges Showcase */
        <BadgeShowcase />
      ) : (
        /* Tab 1: Leaderboard */
        <div className="space-y-6">
          {/* Filters Bar: Timeframe & Grade */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
            {/* Filter: Khối Lớp */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 font-mono">Khối Lớp:</span>
              <div className="flex flex-wrap items-center gap-1">
                {['all', '1', '2', '3', '4', '5'].map((grade) => (
                  <button
                    key={grade}
                    onClick={() => {
                      setSelectedGrade(grade);
                      playSynthSound('click');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedGrade === grade
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {grade === 'all' ? 'Tất cả khối' : `Lớp ${grade}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter: Mốc Thời Gian */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 font-mono">Thời gian:</span>
              <div className="flex items-center gap-1">
                {[
                  { code: 'all_time', label: 'Toàn thời gian' },
                  { code: 'weekly', label: 'Tuần này' },
                  { code: 'daily', label: 'Hôm nay' },
                ].map((tf) => (
                  <button
                    key={tf.code}
                    onClick={() => {
                      setTimeframe(tf.code);
                      playSynthSound('click');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      timeframe === tf.code
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Top 3 Podium (Bục Vinh Quang) */}
          {top3.length > 0 && (
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-indigo-900/50">
              <div className="text-center mb-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                  TOP 3 HỌC SINH XUẤT SẮC NHẤT
                </span>
              </div>

              <div className="flex justify-center items-end gap-1.5 sm:gap-4 md:gap-8 pt-4 sm:pt-6 pb-2">
                {/* Hạng 2 (Bạc) */}
                {top3[1] && (
                  <div className="flex flex-col items-center flex-1 max-w-[95px] sm:max-w-[140px]">
                    <div className="text-xl sm:text-2xl mb-1">🥈</div>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 text-2xl sm:text-3xl flex items-center justify-center border-2 sm:border-3 border-slate-300 shadow-md">
                      {renderAvatarEmoji(top3[1].avatar)}
                    </div>
                    <p className="font-black text-[11px] sm:text-xs text-slate-200 mt-1.5 line-clamp-1 text-center">
                      {top3[1].name || top3[1].username}
                    </p>
                    <span className="text-[9px] sm:text-[11px] font-mono font-bold text-slate-400">
                      {top3[1].score.toLocaleString('vi-VN')} XP
                    </span>
                    <div className="w-full h-16 sm:h-24 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-2xl mt-2 flex items-center justify-center font-black text-slate-200 text-lg sm:text-2xl shadow-lg border-t-2 border-slate-300">
                      2
                    </div>
                  </div>
                )}

                {/* Hạng 1 (Vàng - Ở Giữa, Cao Nhất) */}
                {top3[0] && (
                  <div className="flex flex-col items-center flex-1 max-w-[110px] sm:max-w-[160px] -mt-4 sm:-mt-6">
                    <div className="text-3xl sm:text-4xl mb-1 animate-bounce">👑</div>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-300 to-yellow-100 text-3xl sm:text-4xl flex items-center justify-center border-3 sm:border-4 border-amber-400 shadow-2xl ring-2 sm:ring-4 ring-amber-400/40">
                      {renderAvatarEmoji(top3[0].avatar)}
                    </div>
                    <p className="font-black text-xs sm:text-sm text-yellow-300 mt-1.5 line-clamp-1 text-center">
                      {top3[0].name || top3[0].username}
                    </p>
                    <span className="text-[10px] sm:text-xs font-mono font-black text-amber-400">
                      {top3[0].score.toLocaleString('vi-VN')} XP
                    </span>
                    <div className="w-full h-24 sm:h-36 bg-gradient-to-t from-amber-500 to-yellow-400 rounded-t-2xl mt-2 flex items-center justify-center font-black text-amber-950 text-2xl sm:text-4xl shadow-xl border-t-2 border-yellow-200">
                      1
                    </div>
                  </div>
                )}

                {/* Hạng 3 (Đồng) */}
                {top3[2] && (
                  <div className="flex flex-col items-center flex-1 max-w-[95px] sm:max-w-[140px]">
                    <div className="text-xl sm:text-2xl mb-1">🥉</div>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-600 text-2xl sm:text-3xl flex items-center justify-center border-2 sm:border-3 border-amber-600 shadow-md">
                      {renderAvatarEmoji(top3[2].avatar)}
                    </div>
                    <p className="font-black text-[11px] sm:text-xs text-amber-200 mt-1.5 line-clamp-1 text-center">
                      {top3[2].name || top3[2].username}
                    </p>
                    <span className="text-[9px] sm:text-[11px] font-mono font-bold text-amber-300">
                      {top3[2].score.toLocaleString('vi-VN')} XP
                    </span>
                    <div className="w-full h-12 sm:h-18 bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-2xl mt-2 flex items-center justify-center font-black text-amber-100 text-base sm:text-2xl shadow-lg border-t-2 border-amber-500">
                      3
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Top 4 - 20 Leaderboard Table */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-indigo-600" />
              <span>BẢNG XẾP HẠNG THÀNH TÍCH (HẠNG 4 TRỞ ĐI)</span>
            </h3>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 bg-slate-50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : remainingList.length > 0 ? (
              <div className="space-y-2">
                {remainingList.map((item, index) => {
                  const rank = index + 4;
                  const isCurrentUser = user && (user.id === item.userId || user.username === item.username);

                  return (
                    <div
                      key={item.userId || index}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                        isCurrentUser
                          ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200 shadow-xs'
                          : 'bg-slate-50/60 border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 font-mono font-black text-xs flex items-center justify-center">
                          {rank}
                        </span>

                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-2xl border border-slate-200 shadow-2xs">
                          {renderAvatarEmoji(item.avatar)}
                        </div>

                        <div>
                          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span>{item.name || item.username}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">
                                (Bạn)
                              </span>
                            )}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Cấp độ {item.level || 1} • {item.grade ? `Lớp ${item.grade}` : 'Học sinh'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {item.streak > 0 && (
                          <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-200 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                            <span>{item.streak} ngày</span>
                          </span>
                        )}

                        <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                          {item.score.toLocaleString('vi-VN')} XP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400 font-medium">
                Chưa có thêm học sinh nào trong khoảng xếp hạng này. Hãy là người tiếp theo! 🚀
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
