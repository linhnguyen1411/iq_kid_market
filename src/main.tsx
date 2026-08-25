import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SoundProvider } from './context/SoundContext';
import App from './App.tsx';
import AdminCmsPage from './pages/admin-cms/AdminCmsPage';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SoundProvider>
          <Routes>
            <Route path="/admin/*" element={<AdminCmsPage />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </SoundProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
