import React from 'react';
import AlgorithmMazeEngine, {
  AlgorithmMazeLesson,
  AlgorithmMazeProps,
} from './game-engines/AlgorithmMazeEngine';

/**
 * @deprecated Dùng AlgorithmMazeEngine thay thế. ScratchSimulator được giữ lại làm adapter tương thích ngược cho Phase 2.
 */
export type ScratchLesson = AlgorithmMazeLesson;
export type ScratchSimulatorProps = AlgorithmMazeProps;

export default function ScratchSimulator(props: ScratchSimulatorProps) {
  return <AlgorithmMazeEngine {...props} />;
}

export { AlgorithmMazeEngine };
