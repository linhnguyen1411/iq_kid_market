import React from 'react';
import AlgorithmMazeEngine from '../game-engines/AlgorithmMazeEngine';
import BlockSequenceExercise from './BlockSequenceExercise';
import BlockQuizExercise from './BlockQuizExercise';
import BlockPredictExercise from './BlockPredictExercise';
import BlockDebugExercise from './BlockDebugExercise';
import ScratchStudioEngine from '../scratch-studio/ScratchStudioEngine';

export interface UnifiedExerciseProps {
  lesson: {
    id?: string | number;
    course_id?: string;
    lesson_num: number;
    title: string;
    content?: string;
    mission_prompt?: string;
    description?: string;
    engine_type?: string;
    target_block_sequence?: string | string[];
    start_scene_json?: string | any;
    simulation_scene?: any;
    xp_reward?: number;
    hint_text?: string;
  };
  onLessonComplete: (submittedSequence: string[]) => void;
  onBack: () => void;
}

export default function UnifiedExerciseRenderer({
  lesson,
  onLessonComplete,
  onBack,
}: UnifiedExerciseProps) {
  const engineType = (lesson.engine_type || 'algorithm_maze').toLowerCase().trim();

  // Normalized lesson object for child engines
  const normalizedLesson = {
    lesson_num: lesson.lesson_num,
    title: lesson.title,
    content: lesson.mission_prompt || lesson.description || lesson.content || '',
    target_block_sequence: lesson.target_block_sequence || '',
    start_scene_json: typeof lesson.start_scene_json === 'string'
      ? lesson.start_scene_json
      : typeof lesson.simulation_scene === 'string'
      ? lesson.simulation_scene
      : JSON.stringify(lesson.start_scene_json || lesson.simulation_scene || {}),
    xp_reward: lesson.xp_reward || 100,
  };

  const engineKey = `${engineType}-${lesson.course_id || 'course'}-${lesson.lesson_num}`;

  switch (engineType) {
    case 'block_sequence':
      return (
        <BlockSequenceExercise
          key={engineKey}
          lesson={normalizedLesson}
          onLessonComplete={onLessonComplete}
          onBack={onBack}
        />
      );

    case 'block_quiz':
      return (
        <BlockQuizExercise
          key={engineKey}
          lesson={normalizedLesson}
          onLessonComplete={onLessonComplete}
          onBack={onBack}
        />
      );

    case 'block_predict':
      return (
        <BlockPredictExercise
          key={engineKey}
          lesson={normalizedLesson}
          onLessonComplete={onLessonComplete}
          onBack={onBack}
        />
      );

    case 'block_debug':
      return (
        <BlockDebugExercise
          key={engineKey}
          lesson={normalizedLesson}
          onLessonComplete={onLessonComplete}
          onBack={onBack}
        />
      );

    case 'scratch_studio':
      return (
        <ScratchStudioEngine
          key={engineKey}
          lesson={normalizedLesson}
          onLessonComplete={onLessonComplete}
          onBack={onBack}
        />
      );

    case 'algorithm_maze':
    default:
      return (
        <AlgorithmMazeEngine
          key={engineKey}
          lesson={{
            lesson_num: normalizedLesson.lesson_num,
            title: normalizedLesson.title,
            content: normalizedLesson.content,
            target_block_sequence: Array.isArray(normalizedLesson.target_block_sequence)
              ? normalizedLesson.target_block_sequence.join(',')
              : String(normalizedLesson.target_block_sequence || ''),
            start_scene_json: normalizedLesson.start_scene_json,
            xp_reward: normalizedLesson.xp_reward,
          }}
          onLessonComplete={onLessonComplete}
          onBack={onBack}
        />
      );
  }
}
