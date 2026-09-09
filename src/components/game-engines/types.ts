import type { ComponentType } from "react";

export interface Question {
  id: string;
  question_type: string;
  prompt: string;
  points: number;
  data: any;
}

/**
 * Props chung mà MỌI game engine đều nhận.
 * Engine tự quản lý state nội bộ, chỉ cần gọi onComplete(score) khi giải xong.
 */
export interface GameEngineProps {
  question: Question;
  onComplete: (score: number, submittedAnswer?: any) => void;
}

export type GameEngineComponent = ComponentType<GameEngineProps>;
