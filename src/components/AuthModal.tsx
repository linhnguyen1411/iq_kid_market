import React, { useState } from 'react';
import { 
  X, Sparkles, User, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, 
  GraduationCap, BookOpen, ShieldCheck, Heart, Zap, ArrowRight
} from 'lucide-react';
import { playSynthSound } from './game-engines/soundUtils';

export interface AuthSuccessPayload {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    grade: number | null;
    avatar: string;
    xp: number;
    level: number;
    streak: number;
  };
  wallet: {
    balance: number;
    transactions: any[];
  };
  purchases: string[];
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (data: AuthSuccessPayload) => void;
  initialMode?: 'login' | 'register';
}

const AVATARS = [
  { id: 'smile_tiger', label: 'Hổ Trí Tuệ', emoji: '🐯', bg: 'bg-amber-100 border-amber-300 text-amber-600' },
  { id: 'logic_owl', label: 'Cú Logic', emoji: '🦉', bg: 'bg-blue-100 border-blue-300 text-blue-600' },
  { id: 'cool_fox', label: 'Cáo Nhanh Trí', emoji: '🦊', bg: 'bg-orange-100 border-orange-300 text-orange-600' },
  { id: 'smart_panda', label: 'Gấu Panda', emoji: '🐼', bg: 'bg-emerald-100 border-emerald-300 text-emerald-600' },
  { id: 'quick_rabbit', label: 'Thỏ Siêu Phàm', emoji: '🐰', bg: 'bg-pink-100 border-pink-300 text-pink-600' },
  { id: 'brave_dragon', label: 'Rồng Dũng Cảm', emoji: '🐲', bg: 'bg-purple-100 border-purple-300 text-purple-600' },
];

const ROLES = [
  {
    id: 'student',
    title: 'Bé Học Sinh',
    icon: GraduationCap,
    desc: 'Giải Game IQ, học Scratch, leo Bảng Vàng',
    badge: 'Tặng 90.000đ + 100 XP 🎁',
    activeBorder: 'border-blue-500 bg-blue-50/70 text-blue-700',
  },
  {
    id: 'teacher',
    title: 'Thầy Cô / Creator',
    icon: BookOpen,
    desc: 'Sáng tạo Game IQ, khóa học Scratch & kiếm doanh thu',
    badge: 'Tặng ví 500.000đ 🎨',
    activeBorder: 'border-purple-500 bg-purple-50/70 text-purple-700',
  },
  {
    id: 'parent',
    title: 'Ba Mẹ / Phụ Huynh',
    icon: Heart,
    desc: 'Nạp ví cho con, mua mở khóa game giáo dục & theo dõi',
    badge: 'Tặng ví 1.000.000đ 👨‍👩‍👧',
    activeBorder: 'border-emerald-500 bg-emerald-50/70 text-emerald-700',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher' | 'parent'>('student');
  const [grade, setGrade] = useState('2');
  const [avatar, setAvatar] = useState('smile_tiger');

  if (!isOpen) return null;

  // Tính độ mạnh mật khẩu vui nhộn
  const getPasswordStrength = () => {
    if (!password) return { text: '', color: 'bg-transparent', width: '0%' };
    if (password.length < 4) return { text: 'Quá ngắn (ít nhất 4 ký tự) ❌', color: 'bg-rose-500', width: '25%' };
    if (password.length < 6) return { text: 'Tạm được ⚠️', color: 'bg-amber-500', width: '50%' };
    if (password.length < 8) return { text: 'Khá mạnh 👍', color: 'bg-blue-500', width: '75%' };
    return { text: 'Siêu cấp bảo mật! 🔥', color: 'bg-emerald-500', width: '100%' };
  };

  const handleQuickDemoLogin = (demoUsername: string) => {
    playSynthSound('click');
    setUsername(demoUsername);
    setPassword('123456');
    setMode('login');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Đăng nhập thất bại!');
        }
        playSynthSound('victory');
        setSuccessMsg(`Chào mừng bạn trở lại, ${data.user.name}! 🎉`);
        setTimeout(() => {
          onAuthSuccess(data);
          onClose();
        }, 600);
      } else {
        // Register mode
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            name: name.trim() || username,
            role,
            grade: role === 'student' ? Number(grade) : undefined,
            avatar,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Đăng ký thất bại!');
        }
        playSynthSound('victory');
        setSuccessMsg('🎉 Đăng ký thành công! Chào mừng bạn đến với IQ Kid Market!');
        setTimeout(() => {
          onAuthSuccess(data);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      playSynthSound('incorrect');
      setErrorMsg(err.message || 'Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-white/95 rounded-3xl shadow-2xl border border-white/80 overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.25)',
        }}
      >
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-slate-700 bg-white/80 hover:bg-slate-100 rounded-full transition-all shadow-xs"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Lung Linh */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-center overflow-hidden">
          {/* Decorative Sparkles */}
          <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-yellow-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-yellow-300 mb-2 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 animate-spin" /> IQ KID MARKET • EDTECH
          </div>

          <h2 className="text-xl md:text-2xl font-display font-black tracking-wide text-white drop-shadow-sm">
            {mode === 'login' ? 'ĐĂNG NHẬP THẾ GIỚI TRÍ TUỆ 🚀' : 'GIA NHẬP THẾ HỆ THÔNG THÁI ✨'}
          </h2>
          <p className="text-xs md:text-sm text-blue-100 font-sans mt-0.5 opacity-90">
            {mode === 'login' 
              ? 'Tiếp tục chuỗi ngày học tập và rèn luyện tư duy vượt trội' 
              : 'Tạo tài khoản để nhận quà tặng ví và bộ game khởi đầu'}
          </p>

          {/* Tab Switcher */}
          <div className="flex bg-black/20 p-1 rounded-2xl mt-4 max-w-xs mx-auto border border-white/10">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); playSynthSound('click'); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                mode === 'login' 
                  ? 'bg-white text-slate-800 shadow-md font-extrabold' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); playSynthSound('click'); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                mode === 'register' 
                  ? 'bg-white text-slate-800 shadow-md font-extrabold' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Đăng Ký Mới ✨
            </button>
          </div>
        </div>

        {/* Body scrollable */}
        <div className="p-6 overflow-y-auto flex-1 text-left space-y-4">
          
          {/* Thông báo lỗi / thành công */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold animate-bounce">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* PHẦN ĐẶC BIỆT KHI ĐĂNG KÝ */}
            {mode === 'register' && (
              <>
                {/* 1. Chọn Linh Vật Đại Diện */}
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5 flex items-center gap-1">
                    <span>1. Chọn Linh Vật Của Bạn</span>
                    <span className="text-xxs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Avatar 3D</span>
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATARS.map((av) => {
                      const isSelected = avatar === av.id;
                      return (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => {
                            setAvatar(av.id);
                            playSynthSound('click');
                          }}
                          className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-all transform ${
                            isSelected 
                              ? `${av.bg} scale-110 shadow-md ring-2 ring-purple-400` 
                              : 'border-slate-100 bg-slate-50 hover:bg-slate-100 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <span className="text-2xl">{av.emoji}</span>
                          <span className="text-[10px] font-bold mt-1 text-slate-700 truncate w-full text-center">
                            {av.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Chọn Vai Trò (Role Cards) */}
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
                    2. Bạn Là Ai? (Chọn Vai Trò)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {ROLES.map((r) => {
                      const isSelected = role === r.id;
                      const IconComponent = r.icon;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setRole(r.id as any);
                            playSynthSound('click');
                          }}
                          className={`p-3 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                            isSelected 
                              ? `${r.activeBorder} shadow-sm ring-2 ring-offset-1 ring-blue-300 scale-[1.02]` 
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-extrabold text-xs">{r.title}</span>
                              <IconComponent className="w-4 h-4 opacity-80" />
                            </div>
                            <p className="text-[10px] opacity-75 line-clamp-2">{r.desc}</p>
                          </div>
                          <span className="text-[9px] font-bold mt-2 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-md inline-block">
                            {r.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nếu là Học Sinh -> Chọn Lớp */}
                {role === 'student' && (
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      🎒 Chọn khối lớp học tập của bé:
                    </span>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="bg-white border border-blue-200 text-xs font-extrabold text-blue-700 rounded-xl px-3 py-1.5 shadow-xs outline-none cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                        <option key={g} value={g}>Lớp {g} (Tiểu học & THCS)</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Họ và tên */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và Tên Hiển Thị
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Bé Thế Bình 🌟 hoặc Cô Lan Anh 👩‍🏫"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </>
            )}

            {/* FORM ĐĂNG NHẬP / CHUNG */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" /> Tên Đăng Nhập (Username)
              </label>
              <input
                type="text"
                required
                placeholder="VD: kid_binh, teacher_lan..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Mật Khẩu
                </label>
                {mode === 'register' && strength.text && (
                  <span className="text-[10px] font-bold text-slate-500">{strength.text}</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Thanh đo mật khẩu khi đăng ký */}
              {mode === 'register' && password && (
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className={`h-full transition-all duration-300 ${strength.color}`} 
                    style={{ width: strength.width }} 
                  />
                </div>
              )}
            </div>

            {/* NÚT SUBMIT CHÍNH */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-display font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'ĐĂNG NHẬP NGAY' : 'HOÀN TẤT ĐĂNG KÝ'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* PHẦN ĐĂNG NHẬP NHANH (DEMO 1-CLICK LOGIN) */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 block text-center mb-2 flex items-center justify-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Trải nghiệm nhanh với tài khoản mẫu (1-Click):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('kid_binh')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-[11px] font-bold text-slate-700 hover:text-blue-700 transition-all flex items-center justify-center gap-1"
              >
                <span>🐯 Bé Bình</span>
                <span className="text-[9px] text-slate-400">(Lớp 2)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('giao_vien_lan')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl text-[11px] font-bold text-slate-700 hover:text-purple-700 transition-all flex items-center justify-center gap-1"
              >
                <span>👩‍🏫 Cô Lan</span>
                <span className="text-[9px] text-slate-400">(Creator)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('phu_huynh_dung')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-[11px] font-bold text-slate-700 hover:text-emerald-700 transition-all flex items-center justify-center gap-1"
              >
                <span>👨‍💼 Bố Dũng</span>
                <span className="text-[9px] text-slate-400">(Phụ huynh)</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
