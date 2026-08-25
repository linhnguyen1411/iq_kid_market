import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Compass, Gamepad2, Code, Trophy,
  CreditCard, Settings, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { paths } from '../routes/paths';

export const NavigationTabs: React.FC = () => {
  const { user, authToken } = useAuth();
  const isLoggedIn = Boolean(authToken && user);
  const isTeacherStudio = isLoggedIn && ['admin', 'teacher', 'creator'].includes(user!.role);
  const isParent = isLoggedIn && user!.role === 'parent';
  const isAdmin = isLoggedIn && user!.role === 'admin';

  const tabs: Array<{ to: string; label: string; icon: React.ReactNode; badge?: string; end?: boolean }> = [
    { to: paths.home, label: 'Khám Phá', icon: <Compass className="w-4 h-4" />, end: true },
    { to: paths.marketplace, label: 'Chợ Game Trí Tuệ', icon: <Gamepad2 className="w-4 h-4" /> },
    { to: paths.scratch, label: 'Lập Trình Scratch', icon: <Code className="w-4 h-4" />, badge: 'Hot' },
    { to: paths.leaderboard, label: 'Bảng Vàng', icon: <Trophy className="w-4 h-4" /> },
  ];

  if (isParent) {
    tabs.push({ to: paths.wallet, label: 'Ví Xu', icon: <CreditCard className="w-4 h-4" /> });
  }

  if (isTeacherStudio) {
    tabs.push({
      to: paths.studio,
      label: 'Studio Sáng Tạo',
      icon: <Settings className="w-4 h-4" />,
      badge: 'Studio',
    });
  }

  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-18 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar" aria-label="Điều hướng chính">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-200 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default NavigationTabs;
