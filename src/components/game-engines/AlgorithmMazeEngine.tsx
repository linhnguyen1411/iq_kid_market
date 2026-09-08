import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, RotateCcw, Plus, Trash2, ArrowRight, 
  Award, BrainCircuit, Flag, Octagon, Sparkles, Volume2, HelpCircle,
  Compass, Bot, Cat, Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSynthSound } from './soundUtils';

export interface AlgorithmMazeLesson {
  lesson_num: number;
  title: string;
  content: string;
  target_block_sequence: string;
  start_scene_json: string;
  xp_reward: number;
}

export interface AlgorithmMazeProps {
  lesson: AlgorithmMazeLesson;
  defaultTheme?: 'cat' | 'robot' | 'spaceship';
  onLessonComplete: (submittedBlocks: string[]) => void;
  onBack: () => void;
}

interface ToolboxItem {
  code: string;
  label: string;
  category: 'motion' | 'turn' | 'control' | 'action';
  color: string;
  desc: string;
}

const TOOLBOX: ToolboxItem[] = [
  {
    code: 'move_forward',
    label: 'Tiến 1 bước ➡️',
    category: 'motion',
    color: 'bg-blue-600 border-blue-700 hover:bg-blue-500',
    desc: 'Đi thẳng 1 ô về phía trước',
  },
  {
    code: 'turn_right',
    label: 'Quay phải 90° ↪️',
    category: 'turn',
    color: 'bg-indigo-600 border-indigo-700 hover:bg-indigo-500',
    desc: 'Xoay hướng sang phải theo chiều kim đồng hồ',
  },
  {
    code: 'turn_left',
    label: 'Quay trái 90° ↩️',
    category: 'turn',
    color: 'bg-purple-600 border-purple-700 hover:bg-purple-500',
    desc: 'Xoay hướng sang trái 90°',
  },
  {
    code: 'jump_forward',
    label: 'Nhảy vọt 2 bước 🦘',
    category: 'motion',
    color: 'bg-cyan-600 border-cyan-700 hover:bg-cyan-500',
    desc: 'Nhảy qua 2 ô thẳng hàng',
  },
  {
    code: 'repeat_2[move_forward]',
    label: 'Lặp lại 2 lần [Đi thẳng] 🔄',
    category: 'control',
    color: 'bg-orange-500 border-orange-600 hover:bg-orange-400',
    desc: 'Thực hiện 2 bước tiến liên tiếp',
  },
  {
    code: 'repeat_3[move_forward]',
    label: 'Lặp lại 3 lần [Đi thẳng] 🔄',
    category: 'control',
    color: 'bg-amber-500 border-amber-600 hover:bg-amber-400',
    desc: 'Thực hiện 3 bước tiến liên tiếp',
  },
  {
    code: 'meow_sound',
    label: 'Phát tín hiệu vui nhộn 🔔',
    category: 'action',
    color: 'bg-pink-600 border-pink-700 hover:bg-pink-500',
    desc: 'Nhân vật phát âm thanh chào mừng',
  },
];

export default function AlgorithmMazeEngine({
  lesson,
  defaultTheme = 'cat',
  onLessonComplete,
  onBack,
}: AlgorithmMazeProps) {
  // Parse initial scene
  let initialScene: any = { cat_pos: [0, 0], star_pos: [3, 3], obstacles: [] };
  try {
    if (typeof lesson.start_scene_json === 'string') {
      initialScene = JSON.parse(lesson.start_scene_json);
    } else if (lesson.start_scene_json) {
      initialScene = lesson.start_scene_json;
    }
  } catch (e) {
    console.warn('Lỗi parse start_scene_json trong AlgorithmMazeEngine:', e);
  }

  const GRID_SIZE = initialScene.grid_size || 4; // 4x4
  const obstacles: [number, number][] = initialScene.obstacles || [];

  const [spriteTheme, setSpriteTheme] = useState<'cat' | 'robot' | 'spaceship'>(defaultTheme);
  const [characterPos, setCharacterPos] = useState<[number, number]>(initialScene.cat_pos || [0, 0]);
  const [characterDir, setCharacterDir] = useState<'right' | 'down' | 'left' | 'up'>('right');
  const [starPos] = useState<[number, number]>(initialScene.star_pos || [3, 3]);
  const [blocksWorkplace, setBlocksWorkplace] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [message, setMessage] = useState<string>('Bấm chọn các khối lệnh bên trái rồi nhấn Chạy Thuật Toán ⛳!');
  const [success, setSuccess] = useState(false);
  const [isHitObstacle, setIsHitObstacle] = useState(false);

  // Cancellation guard for async loop
  const isCancelledRef = useRef(false);

  useEffect(() => {
    isCancelledRef.current = false;
    return () => {
      isCancelledRef.current = true;
    };
  }, []);

  // Reset when lesson changes
  useEffect(() => {
    resetSimulation();
    setBlocksWorkplace([]);
    setSuccess(false);
  }, [lesson]);

  const resetSimulation = () => {
    isCancelledRef.current = true;
    setCharacterPos(initialScene.cat_pos || [0, 0]);
    setCharacterDir('right');
    setIsRunning(false);
    setActiveStepIndex(-1);
    setIsHitObstacle(false);
    setMessage('Đã đưa nhân vật về điểm xuất phát. Sẵn sàng thử lại!');
  };

  const addBlock = (code: string) => {
    if (blocksWorkplace.length >= 10) {
      setMessage('Kịch bản tối đa chứa 10 khối lệnh!');
      return;
    }
    playSynthSound('click');
    setBlocksWorkplace([...blocksWorkplace, code]);
  };

  const removeBlock = (index: number) => {
    playSynthSound('click');
    const updated = [...blocksWorkplace];
    updated.splice(index, 1);
    setBlocksWorkplace(updated);
  };

  const clearBlocks = () => {
    isCancelledRef.current = true;
    setIsRunning(false);
    setActiveStepIndex(-1);
    playSynthSound('click');
    setBlocksWorkplace([]);
  };

  const runSimulation = async () => {
    if (isRunning) return;
    if (blocksWorkplace.length === 0) {
      setMessage('Hãy chọn ít nhất một bước đi vào kịch bản!');
      return;
    }

    isCancelledRef.current = false;
    setIsRunning(true);
    setIsHitObstacle(false);
    setMessage('🚀 Đang thực thi từng bước thuật toán...');
    playSynthSound('click');

    // Reset position
    let curX = initialScene.cat_pos?.[0] || 0;
    let curY = initialScene.cat_pos?.[1] || 0;
    let curDir: 'right' | 'down' | 'left' | 'up' = 'right';

    setCharacterPos([curX, curY]);
    setCharacterDir(curDir);

    // Expand commands (unroll loops)
    const expandedList: { cmd: string; origIdx: number }[] = [];
    blocksWorkplace.forEach((b, idx) => {
      if (b === 'repeat_2[move_forward]') {
        expandedList.push({ cmd: 'move_forward', origIdx: idx });
        expandedList.push({ cmd: 'move_forward', origIdx: idx });
      } else if (b === 'repeat_3[move_forward]') {
        expandedList.push({ cmd: 'move_forward', origIdx: idx });
        expandedList.push({ cmd: 'move_forward', origIdx: idx });
        expandedList.push({ cmd: 'move_forward', origIdx: idx });
      } else {
        expandedList.push({ cmd: b, origIdx: idx });
      }
    });

    for (let i = 0; i < expandedList.length; i++) {
      if (isCancelledRef.current) return;
      const { cmd, origIdx } = expandedList[i];
      setActiveStepIndex(origIdx);
      playSynthSound('click');

      await new Promise((resolve) => setTimeout(resolve, 520));
      if (isCancelledRef.current) return;

      if (cmd === 'move_forward') {
        if (curDir === 'right') curX += 1;
        else if (curDir === 'down') curY += 1;
        else if (curDir === 'left') curX -= 1;
        else if (curDir === 'up') curY -= 1;
      } else if (cmd === 'jump_forward') {
        if (curDir === 'right') curX += 2;
        else if (curDir === 'down') curY += 2;
        else if (curDir === 'left') curX -= 2;
        else if (curDir === 'up') curY -= 2;
      } else if (cmd === 'turn_right') {
        const order: Array<'right' | 'down' | 'left' | 'up'> = ['right', 'down', 'left', 'up'];
        const cIdx = order.indexOf(curDir);
        curDir = order[(cIdx + 1) % 4];
        setCharacterDir(curDir);
      } else if (cmd === 'turn_left') {
        const order: Array<'right' | 'down' | 'left' | 'up'> = ['right', 'down', 'left', 'up'];
        const cIdx = order.indexOf(curDir);
        curDir = order[(cIdx + 3) % 4];
        setCharacterDir(curDir);
      } else if (cmd === 'meow_sound') {
        playSynthSound('correct');
        const soundMsg = spriteTheme === 'cat' ? 'Chú Mèo kêu: "Meo Meo! 🐱"' : spriteTheme === 'robot' ? 'Robot phát tín hiệu: "Bíp Bíp! 🤖"' : 'Phi thuyền phát tín hiệu sonar! 🚀';
        setMessage(soundMsg);
      }

      // Check wall bounds
      if (curX < 0 || curX >= GRID_SIZE || curY < 0 || curY >= GRID_SIZE) {
        setIsHitObstacle(true);
        playSynthSound('incorrect');
        setMessage('⚠️ Ôi không! Nhân vật bị đâm vào tường! Hãy sửa lại lệnh nhé!');
        setIsRunning(false);
        setActiveStepIndex(-1);
        return;
      }

      // Check obstacles
      const isObstacle = obstacles.some(([ox, oy]) => ox === curX && oy === curY);
      if (isObstacle) {
        setIsHitObstacle(true);
        playSynthSound('incorrect');
        setMessage('🪨 Ôi không! Đã va phải chướng ngại vật! Hãy thử rẽ đường khác nhé!');
        setIsRunning(false);
        setActiveStepIndex(-1);
        return;
      }

      setCharacterPos([curX, curY]);
    }

    if (isCancelledRef.current) return;

    // Evaluation
    const isTargetReached = curX === starPos[0] && curY === starPos[1];
    if (isTargetReached) {
      setSuccess(true);
      playSynthSound('victory');
      setMessage('🎉 XUẤT SẮC! Nhân vật đã vượt qua mê cung và chạm tới Ngôi Sao Vàng!');
    } else {
      playSynthSound('incorrect');
      setMessage('Chưa đến được Ngôi Sao 🌟. Hãy bổ sung thêm các bước đi nhé!');
    }

    setIsRunning(false);
    setActiveStepIndex(-1);
  };

  const handleClaimSuccessReward = () => {
    playSynthSound('victory');
    onLessonComplete(blocksWorkplace);
  };

  const getSpriteIcon = () => {
    if (spriteTheme === 'robot') return '🤖';
    if (spriteTheme === 'spaceship') return '🚀';
    return '🐱';
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-8 shadow-xl border border-slate-200/80 max-w-6xl mx-auto text-left">
      {/* 1. Top Header Bar */}
      <div className="flex flex-wrap justify-between items-center pb-4 mb-5 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              isCancelledRef.current = true;
              onBack();
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            ↩️ Trở Lại
          </button>
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
              <BrainCircuit className="w-3.5 h-3.5" /> TƯ DUY THUẬT TOÁN & MÊ CUNG ROBOT
            </span>
            <h3 className="text-lg md:text-xl font-black text-slate-800">
              Bài {lesson.lesson_num}: {lesson.title}
            </h3>
          </div>
        </div>

        {/* Theme Avatar Selector & XP */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 border border-slate-200">
            <button
              onClick={() => setSpriteTheme('cat')}
              className={`px-2 py-1 rounded-lg transition-all ${spriteTheme === 'cat' ? 'bg-white shadow-xs text-indigo-600' : 'hover:bg-slate-200'}`}
              title="Nhân vật Mèo"
            >
              🐱 Mèo
            </button>
            <button
              onClick={() => setSpriteTheme('robot')}
              className={`px-2 py-1 rounded-lg transition-all ${spriteTheme === 'robot' ? 'bg-white shadow-xs text-indigo-600' : 'hover:bg-slate-200'}`}
              title="Nhân vật Robot"
            >
              🤖 Robot
            </button>
            <button
              onClick={() => setSpriteTheme('spaceship')}
              className={`px-2 py-1 rounded-lg transition-all ${spriteTheme === 'spaceship' ? 'bg-white shadow-xs text-indigo-600' : 'hover:bg-slate-200'}`}
              title="Nhân vật Phi Thuyền"
            >
              🚀 Tàu
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>+{lesson.xp_reward || 100} XP</span>
          </div>
        </div>
      </div>

      {/* Pedagogical Concept Bar */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3 mb-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-indigo-900 font-bold">
          <Compass className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Mục tiêu bài học:</span>
          <span className="font-normal text-slate-700">{lesson.content || 'Dẫn đường cho nhân vật vượt chướng ngại vật đến ngôi sao vàng'}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">🧩 Tuần tự</span>
          <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">↩️ Hướng xoay</span>
          <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">🔄 Vòng lặp</span>
        </div>
      </div>

      {/* 2. Main 3-Column Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: Toolbox Block Palette (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
          <h4 className="text-xs font-black text-slate-700 mb-3 uppercase tracking-wider flex items-center justify-between pb-2 border-b border-slate-200">
            <span>📦 KHO LỆNH THUẬT TOÁN</span>
            <span className="text-[10px] text-slate-400 font-normal">Bấm để thêm</span>
          </h4>

          <div className="flex flex-col gap-2">
            {TOOLBOX.map((tool) => (
              <button
                key={tool.code}
                type="button"
                onClick={() => addBlock(tool.code)}
                disabled={isRunning || success}
                className={`w-full text-left p-3 text-white rounded-xl border font-bold text-xs flex items-center justify-between shadow-xs transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${tool.color}`}
              >
                <div>
                  <span className="block text-xs font-extrabold">{tool.label}</span>
                  <span className="text-[10px] text-white/80 font-normal block">{tool.desc}</span>
                </div>
                <Plus className="w-4 h-4 text-white/80" />
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Scripting Workspace (4 Cols) */}
        <div className="lg:col-span-4 bg-purple-50/40 rounded-2xl p-4 border-2 border-dashed border-purple-200 min-h-[380px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-purple-100">
              <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider">
                📑 KỊCH BẢN THUẬT TOÁN ({blocksWorkplace.length}/10)
              </h4>
              {blocksWorkplace.length > 0 && !isRunning && (
                <button
                  onClick={clearBlocks}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                  title="Xóa hết kịch bản"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa hết</span>
                </button>
              )}
            </div>

            {blocksWorkplace.length === 0 ? (
              <div className="text-center py-20 text-xs text-slate-400 font-medium">
                Bấm các bước lệnh ở cột bên trái để lập trình đường đi! 🧭
              </div>
            ) : (
              <div className="space-y-2">
                {blocksWorkplace.map((code, idx) => {
                  const resolved = TOOLBOX.find((t) => t.code === code);
                  const isStepping = activeStepIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between text-white shadow-xs transition-all ${
                        isStepping
                          ? 'ring-3 ring-amber-400 scale-103 bg-amber-600 shadow-md'
                          : resolved?.color || 'bg-indigo-600'
                      }`}
                    >
                      <span>
                        {idx + 1}. {resolved?.label || code}
                      </span>
                      {!isRunning && (
                        <button
                          onClick={() => removeBlock(idx)}
                          className="text-white/70 hover:text-white p-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Execution Controls */}
          <div className="pt-4 border-t border-purple-100 flex gap-2">
            {!success ? (
              <>
                <button
                  type="button"
                  onClick={runSimulation}
                  disabled={isRunning || blocksWorkplace.length === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50 transition-all active:scale-98"
                >
                  <Flag className="w-4 h-4 fill-white" />
                  <span>{isRunning ? 'Đang Chạy...' : 'CHẠY THUẬT TOÁN ⛳'}</span>
                </button>
                <button
                  type="button"
                  onClick={resetSimulation}
                  disabled={isRunning}
                  className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center cursor-pointer transition-colors"
                  title="Đặt lại vị trí ban đầu"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleClaimSuccessReward}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:opacity-95 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98 animate-bounce"
              >
                <Award className="w-5 h-5" />
                <span>NHẬN +{lesson.xp_reward || 100} XP & HOÀN THÀNH 🎉</span>
              </button>
            )}
          </div>
        </div>

        {/* Column 3: Live 2D Stage Canvas Arena (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900 rounded-3xl p-5 border-4 border-slate-800 text-white flex flex-col items-center">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1">
            <span>SÂN KHẤU MÊ CUNG 2D ({GRID_SIZE}x{GRID_SIZE})</span>
          </div>

          {/* Grid Stage */}
          <div
            className="relative w-full aspect-square max-w-[260px] bg-slate-950 rounded-2xl p-2 border border-slate-700 grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              const isCharHere = characterPos[0] === x && characterPos[1] === y;
              const isStarHere = starPos[0] === x && starPos[1] === y;
              const isObstacleHere = obstacles.some(([ox, oy]) => ox === x && oy === y);

              const rotationClass =
                characterDir === 'right'
                  ? 'rotate-0'
                  : characterDir === 'down'
                  ? 'rotate-90'
                  : characterDir === 'left'
                  ? 'rotate-180'
                  : 'rotate-270';

              return (
                <div
                  key={i}
                  className={`relative rounded-xl flex items-center justify-center border transition-all overflow-hidden ${
                    isCharHere
                      ? isHitObstacle
                        ? 'bg-rose-950 border-rose-500 animate-shake'
                        : 'bg-indigo-950/80 border-indigo-500'
                      : isStarHere
                      ? 'bg-amber-950/60 border-amber-500/60'
                      : isObstacleHere
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  {/* Star Goal */}
                  {isStarHere && (
                    <span className="text-2xl select-none animate-pulse">🌟</span>
                  )}

                  {/* Obstacle Rock */}
                  {isObstacleHere && !isCharHere && (
                    <span className="text-xl select-none">🪨</span>
                  )}

                  {/* Character Avatar with direction rotation */}
                  {isCharHere && (
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className={`text-2xl select-none transition-transform duration-200 inline-block ${rotationClass}`}
                    >
                      {getSpriteIcon()}
                    </motion.div>
                  )}

                  {/* Cell Coordinate overlay for kids */}
                  <span className="absolute bottom-0.5 right-1 text-[8px] font-mono text-slate-600 select-none">
                    {x},{y}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Console / Status Message */}
          <div className="w-full mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
            <p
              className={`text-xs font-bold leading-relaxed ${
                success
                  ? 'text-emerald-400'
                  : isHitObstacle
                  ? 'text-rose-400'
                  : 'text-amber-300'
              }`}
            >
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
