import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, KeyRound, Save, 
  Sparkles, Flame, Coins, ShieldCheck, CheckCircle2, 
  History, Trophy, Play, Gamepad2, CreditCard, ArrowRight, Eye, EyeOff, Award 
} from 'lucide-react';
import { Game } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { playSynthSound } from '../components/game-engines/soundUtils';

interface ProfilePageProps {
  games?: Game[];
  onPlayGame?: (game: Game, levelNum?: number) => void;
  onNavigateToWallet?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  games = [],
  onPlayGame,
  onNavigateToWallet,
}) => {
  const { user, wallet, purchases, refreshSession, authToken, openAuthModal } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [grade, setGrade] = useState<number>(user?.grade || 2);
  const [avatar, setAvatar] = useState(user?.avatar || 'smile_tiger');

  // Change password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Attempt History state
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const avatarList = [
    { id: 'smile_tiger', emoji: '🐯', label: 'Hổ Trí Tuệ' },
    { id: 'logic_owl', emoji: '🦉', label: 'Cú Logic' },
    { id: 'cool_fox', emoji: '🦊', label: 'Cáo Nhanh Trí' },
    { id: 'smart_panda', emoji: '🐼', label: 'Gấu Panda' },
    { id: 'quick_rabbit', emoji: '🐰', label: 'Thỏ Siêu Phàm' },
    { id: 'brave_dragon', emoji: '🐲', label: 'Rồng Dũng Cảm' },
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

  if (!authToken || !user) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-indigo-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">👤</div>
        <h2 className="mb-2 text-xl font-black text-slate-800">Đăng nhập để xem hồ sơ</h2>
        <p className="mb-5 text-sm text-slate-500">
          Hồ sơ cá nhân chỉ hiển thị khi bạn đã xác thực JWT.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  // Password Strength Meter
  const getPasswordStrength = () => {
    if (!newPassword) return { score: 0, text: '', color: '' };
    if (newPassword.length < 4) return { score: 1, text: 'Quá ngắn (ít nhất 4 ký tự) ❌', color: 'bg-rose-500 text-rose-600' };
    if (newPassword.length < 6) return { score: 2, text: 'Tạm được ⚠️', color: 'bg-amber-500 text-amber-600' };
    if (newPassword.length >= 8 && /\d/.test(newPassword)) {
      return { score: 4, text: 'Siêu cấp Pro! 🔥', color: 'bg-emerald-500 text-emerald-600' };
    }
    return { score: 3, text: 'Mạnh mẽ ⚡', color: 'bg-blue-500 text-blue-600' };
  };

  const strength = getPasswordStrength();

  // Purchased games list
  const myPurchasedGames = games.filter((g) => purchases.includes(g.id));

  // Progress Calculation
  const currentXp = user?.xp || 0;
  const currentLevel = user?.level || 1;
  const xpInLevel = currentXp % 100;
  const xpProgressPercent = Math.min(100, Math.round((xpInLevel / 100) * 100));

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
        playSynthSound('victory');
        setProfileMsg({ type: 'success', message: 'Cập nhật hồ sơ thành công! 🎉' });
        await refreshSession();
      }
    } catch (err: any) {
      playSynthSound('incorrect');
      setProfileMsg({ type: 'error', message: err.message || 'Lỗi cập nhật hồ sơ' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmPassword) {
      playSynthSound('incorrect');
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
        playSynthSound('victory');
        setPwMsg({ type: 'success', message: 'Đổi mật khẩu an toàn thành công! 🎉' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      playSynthSound('incorrect');
      setPwMsg({ type: 'error', message: err.message || 'Lỗi khi đổi mật khẩu' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 text-left">
      {/* 1. VIP 3D Student / Teacher Card */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 border border-white/20">
        {/* Background glow ornaments */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative group">
          <div className="w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-6xl shrink-0 shadow-xl group-hover:scale-105 transition-transform">
            {avatarList.find((a) => a.id === user?.avatar)?.emoji || '👦'}
          </div>
          <span className="absolute -bottom-2 -right-2 bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full border border-white shadow-xs">
            Lv.{currentLevel}
          </span>
        </div>

        <div className="flex-1 text-center md:text-left z-10">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">{user?.name}</h2>
            <span className="px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 uppercase tracking-widest border border-white/30 backdrop-blur-xs">
              {user?.role === 'student' ? 'Học Sinh VIP' : user?.role === 'teacher' ? 'Thầy Cô / Creator' : user?.role === 'creator' ? 'Creator' : user?.role === 'admin' ? 'Quản Trị Viên' : 'Thành Viên'}
            </span>
          </div>

          <p className="text-xs text-white/80 font-mono mb-4">
            @{user?.username} • ID Học Viên: <span className="font-bold text-yellow-300">{user?.id}</span> • Lớp: <span className="font-bold text-white">{user?.grade || 2}</span>
          </p>

          {/* XP Progress Bar */}
          <div className="max-w-md w-full mb-3">
            <div className="flex justify-between text-xs font-bold text-white/90 mb-1 font-mono">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Tiến trình Level {currentLevel}</span>
              </span>
              <span>{xpInLevel}/100 XP ({xpProgressPercent}%)</span>
            </div>
            <div className="h-2.5 w-full bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/20">
              <div
                className="h-full bg-gradient-to-r from-amber-300 via-yellow-400 to-emerald-400 rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${xpProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats on Right */}
        <div className="flex md:flex-col items-center justify-center gap-3 z-10">
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center min-w-[110px]">
            <span className="text-[10px] text-orange-200 font-bold block uppercase tracking-wider">Streak 🔥</span>
            <span className="text-lg font-black text-white font-mono">{user?.streak || 0} Ngày</span>
          </div>
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center min-w-[110px]">
            <span className="text-[10px] text-amber-200 font-bold block uppercase tracking-wider">Ví Xu 🪙</span>
            <span className="text-lg font-black text-amber-300 font-mono">
              {(wallet?.balance || 0).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Gamification Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0">
            🏆
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Màn Đã Vượt</span>
            <span className="text-xl font-black text-slate-800 font-mono">{historyList.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl shrink-0">
            🔥
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chuỗi Học Tập</span>
            <span className="text-xl font-black text-orange-600 font-mono">{user?.streak || 0} Ngày</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center text-xl shrink-0">
            🎮
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Game Đã Mua</span>
            <span className="text-xl font-black text-pink-600 font-mono">{purchases.length}</span>
          </div>
        </div>

        <div 
          onClick={onNavigateToWallet}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-2 hover:border-indigo-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
              🪙
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Số Dư Khả Dụng</span>
              <span className="text-lg font-black text-amber-600 font-mono">{(wallet?.balance || 0).toLocaleString('vi-VN')} xu</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      {/* 3. Forms: Edit Profile (Left) & Change Password (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Edit Info Form */}
        <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-indigo-600" />
            <span>CHỈNH SỬA HỒ SƠ LINH VẬT</span>
          </h3>
          <p className="text-xs text-slate-400 mb-5">Thay đổi tên gọi, khối lớp và linh vật 3D đại diện</p>

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
              <label className="text-xs font-bold text-slate-700 block mb-1">Họ và tên hiển thị</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Khối lớp học tập</label>
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
              <label className="text-xs font-bold text-slate-700 block mb-2">Chọn linh vật đại diện 3D</label>
              <div className="grid grid-cols-3 gap-2">
                {avatarList.map((av) => (
                  <button
                    type="button"
                    key={av.id}
                    onClick={() => {
                      setAvatar(av.id);
                      playSynthSound('click');
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      avatar === av.id
                        ? 'bg-indigo-50 border-indigo-600 shadow-2xs scale-102'
                        : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{av.emoji}</span>
                    <span className="text-[10px] font-bold text-slate-700 block line-clamp-1">{av.label}</span>
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
              <span>{loading ? 'Đang lưu...' : 'LƯU THAY ĐỔI HỒ SƠ'}</span>
            </button>
          </form>
        </div>

        {/* Change Password Form with Strength Meter */}
        <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <span>ĐỔI MẬT KHẨU AN TOÀN</span>
          </h3>
          <p className="text-xs text-slate-400 mb-5">Bảo vệ an toàn cho tài khoản học tập và ví xu</p>

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
                type={showPw ? 'text' : 'password'}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Mật khẩu mới</label>
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1"
                >
                  {showPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPw ? 'Ẩn' : 'Hiện'}</span>
                </button>
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span className="text-slate-400">Độ an toàn:</span>
                    <span className={strength.color.split(' ')[1]}>{strength.text}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 transition-all duration-300 ${
                          step <= strength.score ? strength.color.split(' ')[0] : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Xác nhận mật khẩu mới</label>
              <input
                type={showPw ? 'text' : 'password'}
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
              <span>{loading ? 'Đang cập nhật...' : 'CẬP NHẬT MẬT KHẨU MỚI'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* 4. My Purchased Games Section */}
      {myPurchasedGames.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-pink-600" />
            <span>KHO TRÒ CHƠI ĐÃ MỞ KHÓA BẢN QUYỀN ({myPurchasedGames.length})</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">Các trò chơi trí tuệ bé đã sở hữu vĩnh viễn</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPurchasedGames.map((game) => (
              <div
                key={game.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{game.thumbnail || '🎮'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Đã Sở Hữu
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 mb-1">{game.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{game.description}</p>
                </div>

                {onPlayGame && (
                  <button
                    onClick={() => onPlayGame(game, 1)}
                    className="w-full py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>CHƠI NGAY (MÀN 1)</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Attempt History Section */}
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
