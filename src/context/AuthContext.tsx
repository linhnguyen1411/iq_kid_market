import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Wallet, UserSession } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  authToken: string | null;
  currentUserId: string;
  session: UserSession | null;
  user: User | null;
  wallet: Wallet | null;
  purchases: string[];
  loadingSession: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (token: string, user: User) => Promise<void>;
  register: (token: string, user: User) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  updateUserWallet: (newBalance: number) => void;
  addPurchase: (gameId: string) => void;
  updateUserStats: (xpAwarded: number, newLevel?: number, newStreak?: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('iqkids_auth_token'));
  const [session, setSession] = useState<UserSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(!!localStorage.getItem('iqkids_auth_token'));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const clearAuth = useCallback(() => {
    setAuthToken(null);
    setSession(null);
    localStorage.removeItem('iqkids_auth_token');
    localStorage.removeItem('iqkids_current_user_id');
  }, []);

  const fetchSession = useCallback(async () => {
    const token = localStorage.getItem('iqkids_auth_token');
    if (!token) {
      setSession(null);
      setLoadingSession(false);
      return;
    }

    setLoadingSession(true);
    try {
      const data = await api.auth.getMe();
      setSession({
        user: data.user,
        wallet: data.wallet,
        purchases: data.purchases || [],
      });
      if (data.user?.id) {
        localStorage.setItem('iqkids_current_user_id', data.user.id);
      }
    } catch (err) {
      console.warn('Phiên JWT không hợp lệ, yêu cầu đăng nhập lại:', err);
      clearAuth();
    } finally {
      setLoadingSession(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    fetchSession();
  }, [authToken, fetchSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuth();
      openAuthModal('login');
    };
    window.addEventListener('iqkids_auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('iqkids_auth_unauthorized', handleUnauthorized);
  }, [clearAuth, openAuthModal]);

  const login = async (token: string, loggedUser: User) => {
    localStorage.setItem('iqkids_auth_token', token);
    localStorage.setItem('iqkids_current_user_id', loggedUser.id);
    setAuthToken(token);
    setIsAuthModalOpen(false);
    await fetchSession();
  };

  const register = async (token: string, registeredUser: User) => {
    await login(token, registeredUser);
  };

  const logout = () => {
    clearAuth();
    setLoadingSession(false);
  };

  const refreshSession = async () => {
    await fetchSession();
  };

  const updateUserWallet = (newBalance: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        wallet: {
          ...prev.wallet,
          balance: newBalance,
        },
      };
    });
  };

  const addPurchase = (gameId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        purchases: [...(prev.purchases || []), gameId],
      };
    });
  };

  const updateUserStats = (xpAwarded: number, newLevel?: number, newStreak?: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        user: {
          ...prev.user,
          xp: (prev.user.xp || 0) + xpAwarded,
          level: newLevel ?? prev.user.level,
          streak: newStreak ?? prev.user.streak,
        },
      };
    });
  };

  const user = session?.user || null;
  const wallet = session?.wallet || null;
  const purchases = session?.purchases || [];
  const currentUserId = user?.id || '';

  return (
    <AuthContext.Provider
      value={{
        authToken,
        currentUserId,
        session,
        user,
        wallet,
        purchases,
        loadingSession,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        refreshSession,
        updateUserWallet,
        addPurchase,
        updateUserStats,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
