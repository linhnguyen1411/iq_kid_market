export type Role = 'student' | 'teacher' | 'creator' | 'admin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  grade: number | null;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  last_active_date?: string | null;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  detail: string;
  date?: string;
  created_at?: string;
}

export interface Wallet {
  user_id?: string;
  balance: number;
  transactions: WalletTransaction[];
}

export interface UserSession {
  user: User;
  wallet: Wallet;
  purchases: string[];
}

export interface Question {
  id: string;
  question_type: string;
  prompt: string;
  points: number;
  data: any;
}

export interface Level {
  id: string;
  level_num: number;
  title: string;
  xp_reward: number;
  coin_reward: number;
  questions: Question[];
}

export interface Game {
  id: string;
  title: string;
  description: string;
  detailed_description?: string;
  thumbnail: string;
  price: number;
  grade_from: number;
  grade_to: number;
  template_code: string;
  category: string;
  creator_id?: string | null;
  creator_name?: string | null;
  review_status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  review_feedback?: string | null;
  quality_score?: number | null;
  quality_grade?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | null;
  is_published: boolean;
  rating_avg: number;
  plays_count: number;
  is_seed?: boolean;
  levels: Level[];
}

export interface QualityDimension {
  name: string;
  dimension_key: string;
  score: number;
  max_score: number;
  status: 'pass' | 'warning' | 'fail';
  issues: string[];
}

export interface QualityReportOut {
  game_id?: string;
  title?: string;
  total_score: number;
  max_score: number;
  grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  is_publishable: boolean;
  summary: string;
  dimensions: QualityDimension[];
  recommendations: string[];
  stats?: Record<string, any>;
}

export interface DuplicateCandidateOut {
  game_id: string;
  title: string;
  creator_id?: string | null;
  creator_name?: string | null;
  similarity: number;
  similarity_percent: number;
  common_count: number;
  total_target_questions: number;
  total_candidate_questions: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DuplicateCheckOut {
  game_id?: string;
  title?: string;
  has_duplicate_risk: boolean;
  max_similarity: number;
  max_similarity_percent: number;
  overall_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  candidates: DuplicateCandidateOut[];
}

export interface AiBatchGenerateQuestionsIn {
  topic: string;
  template_code: string;
  count?: number;
  grade?: number;
  category?: string;
  save_to_bank?: boolean;
}

export interface VerifiedQuestionItem {
  index: number;
  question_type: string;
  prompt: string;
  data: Record<string, any>;
  is_verified: boolean;
  error_message?: string | null;
  content_hash?: string | null;
  normalized_hash?: string | null;
  saved_question_id?: string | null;
}

export interface AiBatchGenerateQuestionsOut {
  success: boolean;
  topic: string;
  template_code: string;
  total_requested: number;
  total_generated: number;
  total_verified: number;
  saved_to_bank_count: number;
  items: VerifiedQuestionItem[];
}


export interface GameCategory {
  code: string;
  label: string;
  icon?: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  game_count?: number;
}

export interface Achievement {
  id: string;
  badge_code: string;
  title: string;
  description: string;
  icon: string;
  condition_type?: string;
  condition_threshold?: number;
  coin_reward?: number;
  xp_reward?: number;
  xp_bonus?: number;
  unlocked?: boolean;
  unlocked_at?: string;
  progress_percent?: number;
}

export interface ScratchLesson {
  id: string;
  course_id?: string;
  lesson_num: number;
  title: string;
  description: string;
  mission_prompt: string;
  initial_blocks: any;
  target_block_sequence: string[];
  simulation_scene: any;
  xp_reward: number;
  coin_reward: number;
  hint_text?: string;
  engine_type?: 'algorithm_maze' | 'scratch_studio';
  content?: string;
  start_scene_json?: string;
  isLocked?: boolean;
  lockReason?: 'need_purchase' | 'need_previous' | null;
  completed?: boolean;
}

export interface ScratchCourse {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  grade_level: number;
  difficulty: string;
  course_type?: 'algorithm_maze' | 'scratch_studio';
  price?: number;
  isPurchased?: boolean;
  lessons_count: number;
  lessons: ScratchLesson[];
  completed_lessons_count?: number;
  is_completed?: boolean;
}

export interface LeaderboardItem {
  id?: string;
  userId?: string;
  name: string;
  username: string;
  avatar: string;
  role?: string;
  grade: number | null;
  level: number;
  xp?: number;
  score: number;
  streak: number;
  rank?: number;
  gameId?: string;
  date?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalGames: number;
  totalRevenue: number;
  attemptsCount: number;
  customGamesCount: number;
  usersList: User[];
}

export interface ScratchProjectSummary {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  thumbnail: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScratchProject extends ScratchProjectSummary {
  project_data: {
    title?: string;
    sprite?: {
      x: number;
      y: number;
      direction: number;
      size: number;
      visible: boolean;
    };
    blocklyXml?: string;
    blocks?: any[];
    telemetry?: any;
    [key: string]: any;
  } | any;
}

export interface ScratchSkillMasteryItem {
  skill: string;
  title: string;
  mastery_percent: number;
  level_required: number;
}

export interface ScratchBadgeItem {
  id: string;
  title: string;
  description?: string | null;
  icon: string;
  badge_code: string;
  xp_bonus: number;
  unlocked: boolean;
  unlocked_at?: string | null;
}

export interface ScratchAnalytics {
  total_completed_lessons: number;
  total_curriculum_lessons: number;
  completion_rate: number;
  total_stars: number;
  total_projects: number;
  streak_days: number;
  xp_earned: number;
  skills_mastery: ScratchSkillMasteryItem[];
  badges: ScratchBadgeItem[];
}

