import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Header from '../layouts/Header';
import NavigationTabs from '../layouts/NavigationTabs';
import Footer from '../layouts/Footer';
import { AuthModal } from '../components/AuthModal';
import { PurchaseModal } from '../components/PurchaseModal';
import { useAuth } from '../context/AuthContext';
import { Game, LeaderboardItem } from '../types';
import { api } from '../services/api';
import { paths } from '../routes/paths';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

interface AppDataContextValue {
  games: Game[];
  leaderboard: LeaderboardItem[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  refreshGames: () => Promise<void>;
  startPlay: (game: Game, levelNum?: number) => void;
  goWallet: () => void;
  unlockGame: Game | null;
  setUnlockGame: (game: Game | null) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppShell');
  return ctx;
}

export function AppShell() {
  const { isAuthModalOpen, authModalMode, closeAuthModal, login, user } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle();

  const [games, setGames] = useState<Game[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [unlockGame, setUnlockGame] = useState<Game | null>(null);
  const [hideChrome, setHideChrome] = useState(false);

  const refreshGames = useCallback(async () => {
    try {
      const [gamesData, lbData] = await Promise.all([
        api.games.getGames(),
        api.scores.getLeaderboard(),
      ]);
      setGames(gamesData || []);
      setLeaderboard(lbData || []);
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu khởi tạo:', err);
    }
  }, []);

  useEffect(() => {
    refreshGames();
  }, [refreshGames]);

  const startPlay = useCallback(
    (game: Game, levelNum = 1) => {
      navigate(paths.play(game.id, levelNum));
    },
    [navigate],
  );

  const goWallet = useCallback(() => {
    if (user?.role === 'student') navigate(paths.wallet);
  }, [navigate, user?.role]);

  const value = useMemo(
    () => ({
      games,
      leaderboard,
      selectedCategory,
      setSelectedCategory,
      refreshGames,
      startPlay,
      goWallet,
      unlockGame,
      setUnlockGame,
    }),
    [games, leaderboard, selectedCategory, refreshGames, startPlay, goWallet, unlockGame],
  );

  const outletContext = useMemo(() => ({ setHideChrome }), []);

  return (
    <AppDataContext.Provider value={value}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
        {!hideChrome && <Header />}
        {!hideChrome && <NavigationTabs />}

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet context={outletContext} />
        </main>

        {!hideChrome && <Footer />}

        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            initialMode={authModalMode}
            onClose={closeAuthModal}
            onAuthSuccess={(payload) => {
              login(payload.access_token, payload.user as any);
            }}
          />
        )}

        {unlockGame && (
          <PurchaseModal
            game={unlockGame}
            onClose={() => setUnlockGame(null)}
            onSuccess={() => setUnlockGame(null)}
            onNavigateToWallet={() => {
              setUnlockGame(null);
              goWallet();
            }}
          />
        )}
      </div>
    </AppDataContext.Provider>
  );
}
