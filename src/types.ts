export interface UserSession {
  user: {
    id: string;
    username: string;
    name: string;
    role: 'student' | 'teacher' | 'parent' | 'creator' | 'admin';
    grade: number | null;
    avatar: string;
    xp: number;
    level: number;
    streak: number;
  };
  wallet: {
    balance: number;
    transactions: Array<{
      id: string;
      amount: number;
      type: string;
      detail: string;
      date: string;
    }>;
  };
  purchases: string[];
}
