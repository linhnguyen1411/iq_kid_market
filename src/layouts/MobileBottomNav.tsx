import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Compass, Gamepad2, Code, Trophy,
  Coins, User as UserIcon, ShieldCheck, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { paths } from '../routes/paths';

interface MobileNavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  end?: boolean;
}

export const MobileBottomNav: React.FC = () => {
  const { user, authToken, openAuthModal } = useAuth();
  const isLoggedIn = Boolean(authToken && user);
  const isStudent = isLoggedIn && user!.role === 'student';
  const isAdmin = isLoggedIn && user!.role === 'admin';
  const isTeacherOrCreator = isLoggedIn && ['teacher', 'creator'].includes(user!.role);

  const fifthTab: MobileNavItem = isAdmin
    ? { to: paths.admin.root, label: 'Quản trị', icon: <ShieldCheck className="w-5 h-5" /> }
    : isTeacherOrCreator
    ? { to: paths.studio, label: 'Studio', icon: <Settings className="w-5 h-5" /> }
    : isStudent
    ? { to: paths.wallet, label: 'Ví Sao IQ', icon: <Coins className="w-5 h-5" /> }
    : { to: paths.profile, label: 'Tài khoản', icon: <UserIcon className="w-5 h-5" /> };

  const navItems: MobileNavItem[] = [
    { to: paths.home, label: 'Khám phá', icon: <Compass className="w-5 h-5" />, end: true },
    { to: paths.marketplace, label: 'Kho Game', icon: <Gamepad2 className="w-5 h-5" /> },
    { to: paths.scratch, label: 'Lập trình', icon: <Code className="w-5 h-5" />, badge: 'HOT' },
    { to: paths.leaderboard, label: 'Bảng vàng', icon: <Trophy className="w-5 h-5" /> },
    fifthTab,
  ];

  return (
    <nav
      aria-label="Thanh điều hướng di động"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          // If not logged in and clicking profile/account tab, trigger login modal
          if (!isLoggedIn && item.label === 'Tài khoản') {
            return (
              <button
                key="account-login"
                type="button"
                onClick={() => openAuthModal('login')}
                className="flex flex-1 flex-col items-center justify-center gap-1 h-full py-1 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <div className="relative">
                  <UserIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold tracking-tight">Tài khoản</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-1 h-full py-1 transition-all duration-200 cursor-pointer relative ${
                  isActive
                    ? 'text-indigo-600 font-extrabold scale-105'
                    : 'text-slate-500 hover:text-slate-800 font-semibold'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center">
                    {item.icon}
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[8px] font-black px-1 rounded-full animate-pulse shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight leading-none line-clamp-1">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-1 w-5 h-1 bg-indigo-600 rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
