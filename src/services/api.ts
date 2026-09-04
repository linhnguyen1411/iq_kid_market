import { 
  Game, UserSession, LeaderboardItem, Achievement, 
  ScratchCourse, ScratchLesson, AdminStats, GameCategory 
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
    if (response.status === 401) {
      localStorage.removeItem('iqkids_auth_token');
      window.dispatchEvent(new CustomEvent('iqkids_auth_unauthorized'));
    }
    const errorData = await response.json().catch(() => ({ detail: 'Đã xảy ra lỗi máy chủ!' }));
    const raw = errorData.detail ?? errorData.message;
    let message: string;
    if (typeof raw === 'string') {
      message = raw;
    } else if (Array.isArray(raw)) {
      message = raw
        .map((item) => (typeof item === 'string' ? item : item?.msg || JSON.stringify(item)))
        .join('; ');
    } else if (raw && typeof raw === 'object') {
      message = (raw as { msg?: string }).msg || JSON.stringify(raw);
    } else {
      message = `Lỗi HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(message || `Lỗi HTTP ${response.status}`);
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

    getMe: () =>
      apiRequest<{
        access_token?: string;
        refresh_token?: string;
        token_type?: string;
        user: any;
        wallet: { balance: number; transactions: any[] };
        purchases: string[];
      }>('/auth/me'),

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
    getUserSession: () => apiRequest<UserSession>('/session'),
  },

  // ---------- GAMES MARKETPLACE ----------
  categories: {
    list: () => apiRequest<GameCategory[]>('/categories'),
  },

  games: {
    getGames: (params?: {
      grade?: number | string;
      category?: string;
      search?: string;
      type?: string;
      creatorId?: string;
      includePending?: string | boolean;
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
      apiRequest<{
        success: boolean;
        balance: number;
        newBalance?: number;
        purchases?: string[];
        message: string;
      }>('/games/purchase', {
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
        newBalance?: number;
        newStreak: number;
        unlockedAchievements: any[];
        message?: string;
        gameCleared?: boolean;
        alreadyRewarded?: boolean;
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
        static_qr_url?: string;
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
      apiRequest<{ success: boolean; game: Game; message?: string }>('/admin/games', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateGame: (
      gameId: string,
      data: {
        title?: string;
        description?: string;
        detailed_description?: string;
        price?: number;
        grade_from?: number;
        grade_to?: number;
        category?: string;
        thumbnail?: string;
        levels?: any[];
      },
    ) =>
      apiRequest<{ success: boolean; game: Game; message?: string }>(
        `/admin/games/${encodeURIComponent(gameId)}/update`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),

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

    updateLevel: (
      gameId: string,
      levelNum: number,
      data: {
        title?: string;
        xp_reward?: number;
        coin_reward?: number;
        question?: {
          question_type?: string;
          prompt: string;
          points?: number;
          data: any;
        };
      },
    ) =>
      apiRequest<{ success: boolean; game: Game }>(`/admin/levels/${gameId}/${levelNum}`, {
        method: 'PUT',
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

    getReviewQueue: (status: string = 'pending_review') => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      return apiRequest<Game[]>(`/admin/review/queue${qs}`);
    },

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

    exportSamplePack: (params: {
      template_code: string;
      topic?: string;
      grade_from?: number;
      grade_to?: number;
      category?: string;
    }) => {
      const q = new URLSearchParams();
      q.set('template_code', params.template_code);
      if (params.topic) q.set('topic', params.topic);
      if (params.grade_from != null) q.set('grade_from', String(params.grade_from));
      if (params.grade_to != null) q.set('grade_to', String(params.grade_to));
      if (params.category) q.set('category', params.category);
      return apiRequest<any>(`/admin/games/sample-export?${q.toString()}`);
    },

    uploadGamePack: (gameObject: any) =>
      apiRequest<{ success: boolean; count: number; gameIds?: string[]; message?: string }>(
        '/admin/games/upload',
        {
          method: 'POST',
          body: JSON.stringify({ gameObject }),
        },
      ),

    listUsers: (params?: { role?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.role && params.role !== 'all') q.set('role', params.role);
      if (params?.search) q.set('search', params.search);
      const qs = q.toString();
      return apiRequest<Array<any>>(`/admin/users${qs ? `?${qs}` : ''}`);
    },

    getGameInventory: (status?: string) => {
      const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
      return apiRequest<Game[]>(`/admin/games/inventory${qs}`);
    },

    listCategories: () => apiRequest<GameCategory[]>('/admin/categories'),

    createCategory: (data: {
      code: string;
      label: string;
      icon?: string;
      description?: string;
      sort_order?: number;
      is_active?: boolean;
    }) =>
      apiRequest<{ success: boolean; message: string; category: GameCategory }>(
        '/admin/categories',
        { method: 'POST', body: JSON.stringify(data) },
      ),

    updateCategory: (
      code: string,
      data: {
        label?: string;
        icon?: string;
        description?: string;
        sort_order?: number;
        is_active?: boolean;
      },
    ) =>
      apiRequest<{ success: boolean; message: string; category: GameCategory }>(
        `/admin/categories/${encodeURIComponent(code)}`,
        { method: 'PUT', body: JSON.stringify(data) },
      ),

    deleteCategory: (code: string) =>
      apiRequest<{ success: boolean; message: string; deactivated?: boolean }>(
        `/admin/categories/${encodeURIComponent(code)}`,
        { method: 'DELETE' },
      ),
  },
};
