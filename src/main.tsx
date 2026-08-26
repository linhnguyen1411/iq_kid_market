import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SoundProvider } from './context/SoundContext';
import { AppShell } from './layouts/AppShell';
import AdminCmsPage from './pages/admin-cms/AdminCmsPage';
import PlayGameRoute from './pages/PlayGameRoute';
import {
  HomeRoute,
  MarketplaceRoute,
  ScratchRoute,
  LeaderboardRoute,
  WalletRoute,
  ProfileRoute,
  StudioRoute,
} from './pages/routePages';
import { paths } from './routes/paths';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SoundProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomeRoute />} />
              <Route path="cho-game" element={<MarketplaceRoute />} />
              <Route path="scratch" element={<ScratchRoute />} />
              <Route path="bang-vang" element={<LeaderboardRoute />} />
              <Route path="vi-xu" element={<WalletRoute />} />
              <Route path="ho-so" element={<ProfileRoute />} />
              <Route path="studio" element={<StudioRoute />} />
              <Route path="choi/:gameId" element={<PlayGameRoute />} />

              <Route path="admin" element={<AdminCmsPage />} />
              <Route path="admin/nguoi-dung" element={<AdminCmsPage />} />
              <Route path="admin/kho-game" element={<AdminCmsPage />} />

              {/* Legacy one-page aliases */}
              <Route path="marketplace" element={<Navigate to={paths.marketplace} replace />} />
              <Route path="leaderboard" element={<Navigate to={paths.leaderboard} replace />} />
              <Route path="wallet" element={<Navigate to={paths.wallet} replace />} />
              <Route path="profile" element={<Navigate to={paths.profile} replace />} />
              <Route path="*" element={<Navigate to={paths.home} replace />} />
            </Route>
          </Routes>
        </SoundProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
