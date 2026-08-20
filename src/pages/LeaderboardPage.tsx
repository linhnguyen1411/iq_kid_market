import React, { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Sparkles, Award, 
  Flame, Filter, CheckCircle2, Lock 
} from 'lucide-react';
import { LeaderboardItem, Achievement } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();

  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
      const [lbData, achData] = await Promise.all([
        api.scores.getLeaderboard({
          grade: selectedGrade !== 'all' ? selectedGrade : undefined,
        }),
        user?.id ? api.scores.getUserAchievements(user.id) : Promise.resolve([]),
      ]);
      setLeaderboard(lbData);
      setAchievements(achData);
    } catch (err) {
      console.error('Lỗi khi tải bảng xếp hạng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [selectedGrade, user?.id]);

  const top3 = leaderboard.slice(0, 3);
  const remainingList = leaderboard.slice(3);

  return (
    <div className="flex flex-col gap-8 text-left">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5 text-yellow-200" />
            ĐUA TOP TRÍ TUỆ TOÀN DIỆN
          </span>
          <h2 className="text-2xl md:text-3xl font-black mb-2">
            Bảng Vàng Vinh Danh & Danh Hiệu 🏆
          </h2>
          <p className="text-xs md:text-sm text-white/90 leading-relaxed max-w-xl">
            Tích lũy điểm kinh nghiệm XP, vượt qua các thử thách game logic và duy trì chuỗi ngày học Daily Streak để ghi tên vào bảng vàng trường học!
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/20 flex items-center gap-1">
          {['all', '1', '2', '3', '4', '5'].map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedGrade === grade
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {grade === 'all' ? 'Toàn Trường' : `Lớp ${grade}`}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-4xl mx-auto w-full pt-6">
          {/* Top 2 */}
          {top3[1] && (
            <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm flex flex-col items-center text-center order-2 md:order-1 relative">
              <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-800 font-black text-sm flex items-center justify-center absolute -top-4 shadow-sm">
                🥈
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-slate-400 to-slate-600 text-white flex items-center justify-center text-2xl font-bold shadow-md mb-2">
                {top3[1].avatar === 'smile_tiger' ? '🐯' : '👦'}
              </div>
              <h4 className="text-sm font-black text-slate-800">{top3[1].name}</h4>
              <span className="text-[10px] text-slate-400 font-mono mb-2">@{top3[1].username}</span>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {top3[1].xp} XP
              </span>
            </div>
          )}

          {/* Top 1 */}
          {top3[0] && (
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-3xl p-8 border-2 border-amber-300 shadow-lg flex flex-col items-center text-center order-1 md:order-2 relative scale-105">
              <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-900 font-black text-base flex items-center justify-center absolute -top-5 shadow-md animate-bounce">
                👑
              </div>
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-white flex items-center justify-center text-3xl font-bold shadow-lg mb-2">
                {top3[0].avatar === 'smile_tiger' ? '🐯' : '🌟'}
              </div>
              <h4 className="text-base font-black text-slate-900">{top3[0].name}</h4>
              <span className="text-xs text-slate-400 font-mono mb-2">@{top3[0].username}</span>
              <span className="text-sm font-black text-amber-600 bg-amber-100/80 px-4 py-1.5 rounded-full border border-amber-200">
                {top3[0].xp} XP
              </span>
            </div>
          )}

          {/* Top 3 */}
          {top3[2] && (
            <div className="bg-white rounded-3xl p-6 border-2 border-amber-200 shadow-sm flex flex-col items-center text-center order-3 md:order-3 relative">
              <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-black text-sm flex items-center justify-center absolute -top-4 shadow-sm">
                🥉
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-orange-700 text-white flex items-center justify-center text-2xl font-bold shadow-md mb-2">
                {top3[2].avatar === 'smile_tiger' ? '🐯' : '👧'}
              </div>
              <h4 className="text-sm font-black text-slate-800">{top3[2].name}</h4>
              <span className="text-[10px] text-slate-400 font-mono mb-2">@{top3[2].username}</span>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {top3[2].xp} XP
              </span>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Table & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Full Leaderboard (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
            <Medal className="w-5 h-5 text-amber-500" />
            <span>DANH SÁCH THỨ HẠNG</span>
          </h3>

          <div className="flex flex-col gap-2">
            {leaderboard.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
                  item.id === user?.id
                    ? 'bg-indigo-50/70 border-indigo-200'
                    : 'bg-white border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full font-mono text-xs font-black flex items-center justify-center ${
                    idx === 0 ? 'bg-amber-400 text-slate-900' :
                    idx === 1 ? 'bg-slate-300 text-slate-800' :
                    idx === 2 ? 'bg-amber-600 text-white' : 'text-slate-500 bg-slate-100'
                  }`}>
                    {idx + 1}
                  </span>

                  <div>
                    <h5 className="text-xs font-bold text-slate-800">{item.name}</h5>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Cấp {item.level || 1} • {item.streak || 0} ngày 🔥
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-indigo-600 block">{item.xp} XP</span>
                  <span className="text-[10px] text-slate-400">Lớp {item.grade || 'Tiểu học'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Achievements Collection (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <span>BỘ SƯU TẬP DANH HIỆU</span>
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                  ach.unlocked
                    ? 'bg-gradient-to-r from-amber-50/50 to-indigo-50/30 border-amber-200'
                    : 'bg-slate-50 border-slate-200/60 opacity-60'
                }`}
              >
                <div className="text-3xl shrink-0">
                  {ach.icon || '🏅'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-slate-800 truncate">{ach.title}</h5>
                    {ach.unlocked ? (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Đã mở</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5">
                        <Lock className="w-3 h-3" />
                        <span>Chưa mở</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{ach.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
