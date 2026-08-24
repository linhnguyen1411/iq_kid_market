import React, { useEffect, useState } from 'react';
import { 
  X, Sparkles, User, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, 
  GraduationCap, BookOpen, Heart, ArrowRight
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

const fieldClass =
  'block w-full min-w-0 max-w-full box-border rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100';

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

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher' | 'parent'>('student');
  const [grade, setGrade] = useState('2');
  const [avatar, setAvatar] = useState('smile_tiger');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const getPasswordStrength = () => {
    if (!password) return { text: '', color: 'bg-transparent', width: '0%' };
    if (password.length < 4) return { text: 'Quá ngắn (ít nhất 4 ký tự) ❌', color: 'bg-rose-500', width: '25%' };
    if (password.length < 6) return { text: 'Tạm được ⚠️', color: 'bg-amber-500', width: '50%' };
    if (password.length < 8) return { text: 'Khá mạnh 👍', color: 'bg-blue-500', width: '75%' };
    return { text: 'Siêu cấp bảo mật! 🔥', color: 'bg-emerald-500', width: '100%' };
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
          body: JSON.stringify({ username: username.trim(), password }),
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
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password,
            name: name.trim() || username.trim(),
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
  const modalWidth = mode === 'register' ? 'max-w-xl' : 'max-w-md';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div
        className={`relative flex w-full ${modalWidth} max-h-[92vh] flex-col overflow-hidden rounded-3xl border border-white/80 bg-white shadow-2xl`}
        style={{ boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.25)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-white/90 p-2 text-slate-400 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 pt-6 pb-4 text-center text-white">
          <div className="pointer-events-none absolute -top-6 -left-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-yellow-400/20 blur-xl" />

          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold text-yellow-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" /> SMART KIDS
          </div>

          <h2 className="font-display text-xl font-black tracking-wide text-white drop-shadow-sm md:text-2xl">
            {mode === 'login' ? 'ĐĂNG NHẬP THẾ GIỚI TRÍ TUỆ 🚀' : 'GIA NHẬP THẾ HỆ THÔNG THÁI ✨'}
          </h2>
          <p className="mt-1 text-xs text-blue-100 opacity-90 md:text-sm">
            {mode === 'login'
              ? 'Đăng nhập bằng tài khoản thật — xác thực JWT bảo mật'
              : 'Tạo tài khoản để nhận quà tặng ví và bộ game khởi đầu'}
          </p>

          <div className="mx-auto mt-4 flex max-w-xs rounded-2xl border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); playSynthSound('click'); }}
              className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-white font-extrabold text-slate-800 shadow-md'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); playSynthSound('click'); }}
              className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all ${
                mode === 'register'
                  ? 'bg-white font-extrabold text-slate-800 shadow-md'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Đăng Ký Mới ✨
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-left sm:p-6">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-4">
            {mode === 'register' && (
              <>
                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-extrabold uppercase text-slate-600">
                    <span>1. Chọn Linh Vật Của Bạn</span>
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-normal normal-case text-purple-600">
                      Avatar 3D
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
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
                          className={`flex min-w-0 flex-col items-center rounded-2xl border-2 p-2 transition-all ${
                            isSelected
                              ? `${av.bg} scale-105 shadow-md ring-2 ring-purple-400`
                              : 'border-slate-100 bg-slate-50 opacity-70 hover:bg-slate-100 hover:opacity-100'
                          }`}
                        >
                          <span className="text-2xl">{av.emoji}</span>
                          <span className="mt-1 w-full truncate text-center text-[10px] font-bold text-slate-700">
                            {av.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-1.5 text-xs font-extrabold uppercase text-slate-600">
                    2. Bạn Là Ai? (Chọn Vai Trò)
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {ROLES.map((r) => {
                      const isSelected = role === r.id;
                      const IconComponent = r.icon;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setRole(r.id as 'student' | 'teacher' | 'parent');
                            playSynthSound('click');
                          }}
                          className={`relative flex min-w-0 flex-col justify-between rounded-2xl border-2 p-3 text-left transition-all ${
                            isSelected
                              ? `${r.activeBorder} scale-[1.02] shadow-sm ring-2 ring-blue-300 ring-offset-1`
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="mb-1 flex items-center justify-between gap-1">
                              <span className="text-xs font-extrabold">{r.title}</span>
                              <IconComponent className="h-4 w-4 shrink-0 opacity-80" />
                            </div>
                            <p className="line-clamp-2 text-[10px] opacity-75">{r.desc}</p>
                          </div>
                          <span className="mt-2 inline-block rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-600">
                            {r.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {role === 'student' && (
                  <div className="flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs font-bold text-blue-900">
                      🎒 Chọn khối lớp học tập của bé:
                    </span>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-extrabold text-blue-700 shadow-sm outline-none sm:w-auto"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                        <option key={g} value={g}>Lớp {g}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="min-w-0">
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Họ và Tên Hiển Thị
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Bé Minh Anh hoặc Cô Lan Anh"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </>
            )}

            <div className="min-w-0">
              <label className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-700">
                <User className="h-3.5 w-3.5 text-slate-400" /> Tên Đăng Nhập
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="VD: kid_binh, teacher_lan..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="min-w-0">
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-700">
                  <Lock className="h-3.5 w-3.5 text-slate-400" /> Mật Khẩu
                </label>
                {mode === 'register' && strength.text && (
                  <span className="text-[10px] font-bold text-slate-500">{strength.text}</span>
                )}
              </div>
              <div className="relative min-w-0">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {mode === 'register' && password && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'ĐĂNG NHẬP NGAY' : 'HOÀN TẤT ĐĂNG KÝ'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
