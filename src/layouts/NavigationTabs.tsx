import React from 'react';
import { 
  Compass, Gamepad2, Code, Trophy, 
  CreditCard, Settings 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type TabType = 
  | 'landing' 
  | 'marketplace' 
  | 'scratch' 
  | 'leaderboard' 
  | 'wallet' 
  | 'admin' 
  | 'profile';

interface NavigationTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, setActiveTab }) => {
  const { user, authToken } = useAuth();
  const isLoggedIn = Boolean(authToken && user);
  const isTeacherStudio = isLoggedIn && ['admin', 'teacher', 'creator'].includes(user!.role);
  const isParent = isLoggedIn && user!.role === 'parent';

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'landing', label: 'Khám Phá', icon: <Compass className="w-4 h-4" /> },
    { id: 'marketplace', label: 'Chợ Game Trí Tuệ', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'scratch', label: 'Lập Trình Scratch', icon: <Code className="w-4 h-4" />, badge: 'Hot' },
    { id: 'leaderboard', label: 'Bảng Vàng', icon: <Trophy className="w-4 h-4" /> },
  ];

  if (isParent) {
    tabs.push({ id: 'wallet', label: 'Ví Xu', icon: <CreditCard className="w-4 h-4" /> });
  }

  if (isTeacherStudio) {
    tabs.push({
      id: 'admin',
      label: 'Studio Sáng Tạo',
      icon: <Settings className="w-4 h-4" />,
      badge: 'Studio',
    });
  }

  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-18 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-200 scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NavigationTabs;
