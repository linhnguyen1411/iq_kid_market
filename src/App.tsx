import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SoundProvider } from './context/SoundContext';
import Header from './layouts/Header';
import NavigationTabs, { TabType } from './layouts/NavigationTabs';
import Footer from './layouts/Footer';
import LandingPage from './pages/LandingPage';
import MarketplacePage from './pages/MarketplacePage';
import GamePlayPage from './pages/GamePlayPage';
import ScratchPage from './pages/ScratchPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import WalletPage from './pages/WalletPage';
import AdminPage from './pages/AdminPage';
import { AuthModal } from './components/AuthModal';
import { PurchaseModal } from './components/PurchaseModal';
import { Game, LeaderboardItem } from './types';
import { api } from './services/api';

function MainLayout() {
  const { isAuthModalOpen, authModalMode, closeAuthModal, login, user, authToken } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('landing');
  const [games, setGames] = useState<Game[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activePlayGame, setActivePlayGame] = useState<Game | null>(null);
  const [activePlayLevelNum, setActivePlayLevelNum] = useState<number>(1);
  const [unlockGame, setUnlockGame] = useState<Game | null>(null);

  const fetchInitialData = useCallback(async () => {
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
    fetchInitialData();
  }, [fetchInitialData]);

  // Chặn tab không còn trong menu / không đúng vai trò
  useEffect(() => {
    const isTeacherStudio = Boolean(
      authToken && user && ['admin', 'teacher', 'creator'].includes(user.role)
    );
    const isParent = Boolean(authToken && user?.role === 'parent');

    if (activeTab === 'wallet' && !isParent) {
      setActiveTab('landing');
    }
    if (activeTab === 'admin' && !isTeacherStudio) {
      setActiveTab('landing');
    }
  }, [activeTab, authToken, user]);

  const handleStartPlayGame = (game: Game, levelNum = 1) => {
    setActivePlayGame(game);
    setActivePlayLevelNum(levelNum);
  };

  const handleBackToMarketplace = () => {
    setActivePlayGame(null);
    setActiveTab('marketplace');
  };

  const goToWalletIfParent = () => {
    if (user?.role === 'parent') {
      setActiveTab('wallet');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* 1. Header with Stats & User profile */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. Navigation Tabs bar */}
      {!activePlayGame && (
        <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      )}

      {/* 3. Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activePlayGame ? (
          <GamePlayPage
            game={activePlayGame}
            initialLevelNum={activePlayLevelNum}
            onBack={handleBackToMarketplace}
            onRequestUnlock={(g) => setUnlockGame(g)}
          />
        ) : (
          <>
            {activeTab === 'landing' && (
              <LandingPage
                games={games}
                leaderboard={leaderboard}
                onExplore={() => setActiveTab('marketplace')}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setActiveTab('marketplace');
                }}
                onSelectGame={(game) => handleStartPlayGame(game, 1)}
                onViewLeaderboard={() => setActiveTab('leaderboard')}
              />
            )}

            {activeTab === 'marketplace' && (
              <MarketplacePage
                games={games}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                onPlayGame={handleStartPlayGame}
                onNavigateToWallet={goToWalletIfParent}
              />
            )}

            {activeTab === 'scratch' && <ScratchPage />}

            {activeTab === 'leaderboard' && <LeaderboardPage />}

            {activeTab === 'wallet' && user?.role === 'parent' && <WalletPage />}

            {activeTab === 'profile' && (
              <ProfilePage
                games={games}
                onPlayGame={handleStartPlayGame}
                onNavigateToWallet={goToWalletIfParent}
              />
            )}

            {activeTab === 'admin' && (
              <AdminPage
                games={games}
                onRefreshGames={fetchInitialData}
              />
            )}
          </>
        )}
      </main>

      {/* 4. Global Footer */}
      {!activePlayGame && <Footer />}

      {/* 5. Global Authentication Modal */}
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

      {/* 6. Unlock paid levels while playing */}
      {unlockGame && (
        <PurchaseModal
          game={unlockGame}
          onClose={() => setUnlockGame(null)}
          onSuccess={() => setUnlockGame(null)}
          onNavigateToWallet={() => {
            setUnlockGame(null);
            goToWalletIfParent();
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return <MainLayout />;
}
