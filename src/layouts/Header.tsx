import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain, Sparkles, Coins, LogOut, User as UserIcon, 
  Settings, Trophy, CreditCard, ChevronDown, 
  LogIn, UserPlus, ShieldCheck, GraduationCap, Heart, Volume2, VolumeX 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../context/SoundContext';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { 
    user, wallet, authToken, currentUserId, 
    switchUser, logout, openAuthModal 
  } = useAuth();
  const { isSoundEnabled, toggleSound } = useSound();

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const demoAccounts = [
    { id: 'u1', name: 'Bé Nam (Lớp 3)', role: 'student', icon: '👦', desc: 'Học sinh tiểu học' },
    { id: 'u2', name: 'Cô Lan (Toán học)', role: 'teacher', icon: '👩‍🏫', desc: 'Giáo viên sáng tạo' },
    { id: 'u3', name: 'Mẹ Thu Hà', role: 'parent', icon: '👩‍👧', desc: 'Phụ huynh quản lý' },
    { id: 'u_admin', name: 'Ban Quản Trị', role: 'admin', icon: '🛡️', desc: 'Quản trị hệ thống' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-indigo-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* LOGO */}
        <div 
          onClick={() => setActiveTab('landing')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 bg-clip-text text-transparent tracking-tight">
                IQ Kid Market
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider border border-amber-200">
                AI 2.0
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Sàn Đổi Game Trí Tuệ & Lập Trình Nhí
            </p>
          </div>
        </div>

        {/* STATS & AUTH WIDGETS */}
        <div className="flex items-center gap-2 sm:gap-4">
          {user && (
            <>
              {/* STREAK BADGE */}
              <div 
                title="Chuỗi ngày học liên tục"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-bold shadow-xs hover:bg-orange-100 transition-colors"
              >
                <span className="text-sm">🔥</span>
                <span>{user.streak || 0} ngày</span>
              </div>

              {/* LEVEL & XP BADGE */}
              <div 
                onClick={() => setActiveTab('leaderboard')}
                title={`Kinh nghiệm: ${user.xp || 0} XP`}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold shadow-xs hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Cấp {user.level || 1}</span>
                <span className="text-[10px] text-indigo-400 font-normal">({user.xp || 0} XP)</span>
              </div>

              {/* WALLET COINS */}
              <div 
                onClick={() => setActiveTab('wallet')}
                title="Ví xu của bạn - Bấm để nạp thêm"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-extrabold shadow-xs hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <Coins className="w-4 h-4 text-amber-600 animate-bounce" />
                <span>{(wallet?.balance || 0).toLocaleString('vi-VN')} xu</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('wallet');
                  }}
                  className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-black hover:bg-amber-600 cursor-pointer"
                >
                  +
                </button>
              </div>
            </>
          )}

          {/* GLOBAL SOUND TOGGLE BUTTON */}
          <button
            type="button"
            onClick={toggleSound}
            title={isSoundEnabled ? 'Bấm để tắt hiệu ứng âm thanh' : 'Bấm để bật hiệu ứng âm thanh'}
            className={`p-2 rounded-full border transition-all cursor-pointer flex items-center justify-center shadow-xs ${
              isSoundEnabled
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* USER PROFILE DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 p-1.5 pl-2 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all bg-white shadow-xs"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                {user?.name ? user.name.charAt(0) : '👶'}
              </div>
              <div className="text-left hidden md:block pr-1">
                <p className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[100px]">
                  {user?.name || 'Khách'}
                </p>
                <p className="text-[10px] text-slate-500 capitalize">
                  {user?.role === 'student' ? 'Học sinh' : user?.role === 'teacher' ? 'Giáo viên' : user?.role === 'parent' ? 'Phụ huynh' : user?.role === 'admin' ? 'Quản trị' : 'Thành viên'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* DROPDOWN MENU */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-800">{user?.name || 'Tài khoản'}</p>
                  <p className="text-xs text-slate-500 font-mono">@{user?.username || currentUserId}</p>
                </div>

                {/* Quick Switch Demo Account */}
                <div className="p-2 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                    Chuyển nhanh vai trò (Demo)
                  </p>
                  <div className="space-y-1">
                    {demoAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          switchUser(acc.id);
                          setIsProfileDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                          currentUserId === acc.id
                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{acc.icon}</span>
                          <span>{acc.name}</span>
                        </div>
                        {currentUserId === acc.id && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation Items */}
                <div className="p-1">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>Hồ sơ cá nhân & Đổi mật khẩu</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('wallet');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span>Ví xu & Lịch sử giao dịch</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('leaderboard');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <Trophy className="w-4 h-4 text-slate-400" />
                    <span>Bảng vàng & Huy hiệu</span>
                  </button>
                </div>

                {/* Auth Actions */}
                <div className="p-1 border-t border-slate-100">
                  {authToken ? (
                    <button
                      onClick={() => {
                        logout();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Đăng xuất</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-1 p-1">
                      <button
                        onClick={() => {
                          openAuthModal('login');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Đăng nhập</span>
                      </button>
                      <button
                        onClick={() => {
                          openAuthModal('register');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-bold hover:opacity-95 transition-opacity"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Đăng ký</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
