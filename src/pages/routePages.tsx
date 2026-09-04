import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import MarketplacePage from './MarketplacePage';
import ScratchPage from './ScratchPage';
import LeaderboardPage from './LeaderboardPage';
import ProfilePage from './ProfilePage';
import WalletPage from './WalletPage';
import AdminPage from './AdminPage';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../layouts/AppShell';
import { paths } from '../routes/paths';

export function HomeRoute() {
  const { games, leaderboard, setSelectedCategory, startPlay } = useAppData();
  const navigate = useNavigate();
  return (
    <LandingPage
      games={games}
      leaderboard={leaderboard}
      onExplore={() => navigate(paths.marketplace)}
      onSelectCategory={(cat) => {
        setSelectedCategory(cat);
        navigate(paths.marketplace);
      }}
      onSelectGame={(game) => startPlay(game, 1)}
      onViewLeaderboard={() => navigate(paths.leaderboard)}
    />
  );
}

export function MarketplaceRoute() {
  const {
    games,
    gameCategories,
    selectedCategory,
    setSelectedCategory,
    startPlay,
    goWallet,
    refreshGames,
  } = useAppData();

  // Đồng bộ lại list publish mỗi lần vào chợ (sau duyệt CMS / import)
  React.useEffect(() => {
    void refreshGames();
  }, [refreshGames]);

  return (
    <MarketplacePage
      games={games}
      gameCategories={gameCategories}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      onPlayGame={startPlay}
      onNavigateToWallet={goWallet}
    />
  );
}

export function ScratchRoute() {
  return <ScratchPage />;
}

export function LeaderboardRoute() {
  return <LeaderboardPage />;
}

export function WalletRoute() {
  const { user, authToken } = useAuth();
  if (!authToken || user?.role !== 'student') {
    return <Navigate to={paths.home} replace />;
  }
  return <WalletPage />;
}

export function ProfileRoute() {
  const { games, startPlay, goWallet } = useAppData();
  return (
    <ProfilePage
      games={games}
      onPlayGame={startPlay}
      onNavigateToWallet={goWallet}
    />
  );
}

export function StudioRoute() {
  const { user, authToken } = useAuth();
  const { games, refreshGames } = useAppData();
  const allowed = Boolean(authToken && user && ['admin', 'teacher', 'creator'].includes(user.role));
  if (!allowed) return <Navigate to={paths.home} replace />;
  return <AdminPage games={games} onRefreshGames={refreshGames} />;
}
