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
  switchUser: (newUserId: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUserWallet: (newBalance: number) => void;
  addPurchase: (gameId: string) => void;
  updateUserStats: (xpAwarded: number, newLevel?: number, newStreak?: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('iqkids_auth_token'));
  const [currentUserId, setCurrentUserId] = useState<string>(() => localStorage.getItem('iqkids_current_user_id') || 'u1');
  const [session, setSession] = useState<UserSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const fetchSession = useCallback(async (uid: string) => {
    setLoadingSession(true);
    try {
      const data = await api.session.getUserSession(uid);
      setSession(data);
    } catch (err) {
      console.warn('Lỗi khi tải phiên người dùng:', err);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    fetchSession(currentUserId);
  }, [currentUserId, fetchSession]);

  const login = async (token: string, loggedUser: User) => {
    setAuthToken(token);
    setCurrentUserId(loggedUser.id);
    localStorage.setItem('iqkids_auth_token', token);
    localStorage.setItem('iqkids_current_user_id', loggedUser.id);
    await fetchSession(loggedUser.id);
    setIsAuthModalOpen(false);
  };

  const register = async (token: string, registeredUser: User) => {
    await login(token, registeredUser);
  };

  const logout = () => {
    setAuthToken(null);
    localStorage.removeItem('iqkids_auth_token');
    // Fallback về tài khoản mặc định học sinh u1 để trải nghiệm demo
    setCurrentUserId('u1');
    localStorage.setItem('iqkids_current_user_id', 'u1');
    fetchSession('u1');
  };

  const switchUser = async (newUserId: string) => {
    setCurrentUserId(newUserId);
    localStorage.setItem('iqkids_current_user_id', newUserId);
    await fetchSession(newUserId);
  };

  const refreshSession = async () => {
    await fetchSession(currentUserId);
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
        switchUser,
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
