import { 
  Game, UserSession, LeaderboardItem, Achievement, 
  ScratchCourse, ScratchLesson, AdminStats 
} from '../types';

const BASE_URL = '/api';

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('iqkids_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Đã xảy ra lỗi máy chủ!' }));
    const message = errorData.detail || `Lỗi HTTP ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  // ---------- AUTH & USER ----------
  auth: {
    register: (data: { username: string; password?: string; name: string; role?: string; grade?: number | null; avatar?: string }) =>
      apiRequest<{ access_token: string; refresh_token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: { username: string; password?: string }) =>
      apiRequest<{ access_token: string; refresh_token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    refresh: (refreshToken: string) =>
      apiRequest<{ access_token: string; refresh_token: string; token_type: string }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),

    getMe: () => apiRequest<any>('/auth/me'),

    resetPassword: (data: { username: string; parent_pin: string; new_password: string }) =>
      apiRequest<{ success: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    changePassword: (data: { userId: string; old_password: string; new_password: string }) =>
      apiRequest<{ success: boolean; message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateProfile: (data: { userId: string; name?: string; avatar?: string; grade?: number | null }) =>
      apiRequest<{ success: boolean; user: any }>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // ---------- SESSION ----------
  session: {
    getUserSession: (userId: string) => apiRequest<UserSession>(`/session/user/${userId}`),
  },

  // ---------- GAMES MARKETPLACE ----------
  games: {
    getGames: (params?: {
      grade?: number | string;
      category?: string;
      search?: string;
      type?: string;
      creatorId?: string;
      sortBy?: string;
      page?: number;
      pageSize?: number;
      paginated?: boolean;
    }) => {
      const cleanParams: Record<string, string> = {};
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== 'all' && v !== '') {
            cleanParams[k] = String(v);
          }
        });
      }
      const query = new URLSearchParams(cleanParams).toString();
      return apiRequest<any>(`/games${query ? `?${query}` : ''}`);
    },

    getGameById: (gameId: string) => apiRequest<Game>(`/games/${gameId}`),

    purchaseGame: (userId: string, gameId: string) =>
      apiRequest<{ success: boolean; newBalance: number; message: string }>('/games/purchase', {
        method: 'POST',
        body: JSON.stringify({ userId, gameId }),
      }),
  },

  // ---------- ATTEMPTS & GAMIFICATION ----------
  attempts: {
    submit: (data: {
      userId: string;
      gameId: string;
      levelNum: number;
      score: number;
      completed: boolean;
      duration?: number;
    }) =>
      apiRequest<{
        success: boolean;
        xpAwarded: number;
        newXP: number;
        newLevel: number;
        levelUp: boolean;
        coinReward: number;
        newStreak: number;
        unlockedAchievements: any[];
      }>('/attempts/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getHistory: (userId: string, limit = 20) =>
      apiRequest<any[]>(`/attempts/history?userId=${userId}&limit=${limit}`),
  },

  // ---------- SCORES, LEADERBOARD & ACHIEVEMENTS ----------
  scores: {
    getLeaderboard: (params?: { gameId?: string; grade?: number | string; timeframe?: string; limit?: number }) => {
      const cleanParams: Record<string, string> = {};
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== 'all' && v !== '') {
            cleanParams[k] = String(v);
          }
        });
      }
      const query = new URLSearchParams(cleanParams).toString();
      return apiRequest<LeaderboardItem[]>(`/scores/leaderboard${query ? `?${query}` : ''}`);
    },

    getUserAchievements: (userId: string) =>
      apiRequest<Achievement[]>(`/achievements/user/${userId}`),
  },

  // ---------- WALLET & PAYMENT ----------
  wallet: {
    createTopupIntent: (userId: string, amount: number) =>
      apiRequest<{
        tx_id: string;
        amount: number;
        qr_url: string;
        bank_name: string;
        bank_account: string;
        account_holder: string;
        transfer_content: string;
      }>('/wallet/create-topup-intent', {
        method: 'POST',
        body: JSON.stringify({ userId, amount }),
      }),

    confirmTopup: (userId: string, txId: string, amount: number) =>
      apiRequest<{ success: boolean; balance: number; message: string }>('/wallet/confirm-topup', {
        method: 'POST',
        body: JSON.stringify({ userId, tx_id: txId, amount }),
      }),

    getCreatorEarnings: () => apiRequest<any>('/wallet/creator-earnings'),
  },

  // ---------- SCRATCH ENGINE ----------
  scratch: {
    getCourses: (userId?: string) =>
      apiRequest<ScratchCourse[]>(`/scratch/courses${userId ? `?userId=${userId}` : ''}`),

    getLessonDetail: (courseId: string, lessonNum: number, userId?: string) =>
      apiRequest<ScratchLesson>(`/scratch/courses/${courseId}/lessons/${lessonNum}${userId ? `?userId=${userId}` : ''}`),

    submitLesson: (data: {
      userId: string;
      courseId: string;
      lessonNum: number;
      submittedSequence: string[];
    }) =>
      apiRequest<{
        success: boolean;
        xpAwarded: number;
        coinAwarded: number;
        newXP: number;
        newLevel: number;
        levelUp: boolean;
        nextLessonNum: number | null;
        message: string;
        hint?: string;
      }>('/scratch/lessons/submit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ---------- ADMIN & CREATOR STUDIO ----------
  admin: {
    getStats: () => apiRequest<AdminStats>('/admin/stats'),

    createGame: (data: {
      title: string;
      description: string;
      detailed_description?: string;
      price?: number;
      grade_from?: number;
      grade_to?: number;
      template_code: string;
      category?: string;
      creatorId?: string;
      customFirstLevel?: any;
    }) =>
      apiRequest<{ success: boolean; game: Game }>('/admin/games', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    addLevel: (data: {
      gameId: string;
      title: string;
      level_num?: number;
      xp_reward?: number;
      coin_reward?: number;
      question: {
        id?: string;
        question_type?: string;
        prompt: string;
        points?: number;
        data: any;
      };
      creatorId?: string;
    }) =>
      apiRequest<{ success: boolean; game: Game }>('/admin/levels/add', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deleteGame: (gameId: string) =>
      apiRequest<{ success: boolean; message: string }>(`/admin/games/${gameId}`, {
        method: 'DELETE',
      }),

    resetGames: () =>
      apiRequest<{ success: boolean; message: string }>('/admin/games/reset', {
        method: 'POST',
      }),

    getReviewQueue: () => apiRequest<Game[]>('/admin/review/queue'),

    decideReview: (data: { gameId: string; action: 'approve' | 'reject'; feedback?: string }) =>
      apiRequest<{ success: boolean; game: Game; message: string }>('/admin/review/decide', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    aiGenerateGame: (data: {
      topic: string;
      template_code: string;
      grade_from?: number;
      grade_to?: number;
      creator_id?: string;
      creator_name?: string;
    }) =>
      apiRequest<{ success: boolean; game: Game; message: string }>('/admin/games/ai-generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
