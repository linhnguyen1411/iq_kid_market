import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, KeyRound, Save, 
  Sparkles, Flame, Coins, ShieldCheck, CheckCircle2, History 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, refreshSession } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [grade, setGrade] = useState<number>(user?.grade || 2);
  const [avatar, setAvatar] = useState(user?.avatar || 'smile_tiger');

  // Change password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Attempt History state
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const avatarList = [
    { id: 'smile_tiger', emoji: '🐯', label: 'Hổ Vàng Thông Thái' },
    { id: 'smart_bear', emoji: '🐻', label: 'Gấu Trí Tuệ' },
    { id: 'cool_cat', emoji: '🐱', label: 'Mèo Scratch' },
    { id: 'clever_fox', emoji: '🦊', label: 'Cáo Nhanh Trí' },
    { id: 'wise_owl', emoji: '🦉', label: 'Cú Mèo Học Rộng' },
    { id: 'star_kid', emoji: '👦', label: 'Học Sinh Siêu Sao' },
  ];

  useEffect(() => {
    if (user?.id) {
      setLoadingHistory(true);
      api.attempts.getHistory(user.id)
        .then((data) => setHistoryList(data || []))
        .catch((err) => console.warn('Lỗi tải lịch sử chơi:', err))
        .finally(() => setLoadingHistory(false));
    }
  }, [user?.id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setProfileMsg(null);
    try {
      const res = await api.auth.updateProfile({
        userId: user.id,
        name,
        grade,
        avatar,
      });
      if (res.success) {
        setProfileMsg({ type: 'success', message: 'Cập nhật hồ sơ thành công!' });
        await refreshSession();
      }
    } catch (err: any) {
      setProfileMsg({ type: 'error', message: err.message || 'Lỗi cập nhật hồ sơ' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', message: 'Mật khẩu xác nhận không khớp!' });
      return;
    }
    setLoading(true);
    setPwMsg(null);
    try {
      const res = await api.auth.changePassword({
        userId: user.id,
        old_password: oldPassword,
        new_password: newPassword,
      });
      if (res.success) {
        setPwMsg({ type: 'success', message: 'Đổi mật khẩu thành công!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPwMsg({ type: 'error', message: err.message || 'Lỗi khi đổi mật khẩu' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 text-left">
      {/* Profile Overview Card */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-5xl shrink-0 shadow-lg">
          {avatarList.find((a) => a.id === user?.avatar)?.emoji || '👦'}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <h2 className="text-2xl font-black">{user?.name}</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider border border-white/20">
              {user?.role === 'student' ? 'Học sinh' : user?.role === 'teacher' ? 'Giáo viên' : user?.role === 'parent' ? 'Phụ huynh' : user?.role === 'admin' ? 'Quản trị' : 'Thành viên'}
            </span>
          </div>
          <p className="text-xs text-white/80 font-mono mb-4">@{user?.username} • ID: {user?.id}</p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs">
            <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Cấp {user?.level || 1} ({user?.xp || 0} XP)</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-orange-400/20 border border-orange-300/40 text-orange-200 font-bold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-300" />
              <span>{user?.streak || 0} Ngày Streak 🔥</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Edit Info Form */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-indigo-600" />
            <span>CHỈNH SỬA HỒ SƠ</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Cập nhật tên gọi, khối lớp và hình đại diện</p>

          {profileMsg && (
            <div
              className={`p-3 mb-4 rounded-xl text-xs font-bold ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {profileMsg.message}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Họ và tên</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Khối lớp</label>
              <select
                value={grade}
                onChange={(e) => setGrade(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                  <option key={g} value={g}>Khối Lớp {g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Chọn hình đại diện</label>
              <div className="grid grid-cols-3 gap-2">
                {avatarList.map((av) => (
                  <button
                    type="button"
                    key={av.id}
                    onClick={() => setAvatar(av.id)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      avatar === av.id
                        ? 'bg-indigo-50 border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{av.emoji}</span>
                    <span className="text-[10px] font-bold text-slate-600 block line-clamp-1">{av.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>LƯU HỒ SƠ</span>
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <span>ĐỔI MẬT KHẨU</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Bảo vệ an toàn cho tài khoản học tập</p>

          {pwMsg && (
            <div
              className={`p-3 mb-4 rounded-xl text-xs font-bold ${
                pwMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {pwMsg.message}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mật khẩu hiện tại</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mật khẩu mới</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>CẬP NHẬT MẬT KHẨU</span>
            </button>
          </form>
        </div>
      </div>

      {/* Attempt History Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <span>LỊCH SỬ CHINH PHỤC THỬ THÁCH</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">Các màn chơi và bài thi đã hoàn thành gần đây</p>

        {loadingHistory ? (
          <div className="text-center py-8 text-slate-400 text-xs">Đang tải lịch sử...</div>
        ) : historyList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Trò chơi / Màn</th>
                  <th className="py-2.5 px-3">Điểm số</th>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {historyList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800 block">{item.game_id || item.gameId}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Màn {item.level_num || item.levelNum}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                      {item.score} điểm
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {item.created_at || 'Vừa xong'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Hoàn thành</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs font-medium">
            Chưa có lịch sử làm bài nào. Hãy vào Chợ Game để thử sức ngay!
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
