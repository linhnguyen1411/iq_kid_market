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
  defaultTheme?: 'monkey' | 'cat' | 'robot' | 'spaceship';
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
  defaultTheme = 'monkey',
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
  const starPos: [number, number] = initialScene.star_pos || [3, 3];

  const [spriteTheme, setSpriteTheme] = useState<'monkey' | 'cat' | 'robot' | 'spaceship'>(defaultTheme);
  const [characterPos, setCharacterPos] = useState<[number, number]>(initialScene.cat_pos || [0, 0]);
  const [characterDir, setCharacterDir] = useState<'right' | 'down' | 'left' | 'up'>(initialScene.cat_dir || 'right');
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
  }, [lesson.lesson_num, lesson.title, lesson.start_scene_json]);

  const resetSimulation = () => {
    isCancelledRef.current = true;
    setCharacterPos(initialScene.cat_pos || [0, 0]);
    setCharacterDir(initialScene.cat_dir || 'right');
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
    let curDir: 'right' | 'down' | 'left' | 'up' = initialScene.cat_dir || 'right';

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
        const soundMsg =
          spriteTheme === 'monkey'
            ? 'Chú Khỉ con: "Khẹc Khẹc! 🐒🍌"'
            : spriteTheme === 'cat'
            ? 'Chú Mèo kêu: "Meo Meo! 🐱"'
            : spriteTheme === 'robot'
            ? 'Robot phát tín hiệu: "Bíp Bíp! 🤖"'
            : 'Phi thuyền phát tín hiệu sonar! 🚀';
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

  const renderSprite = (theme: 'monkey' | 'cat' | 'robot' | 'spaceship') => {
    if (theme === 'monkey') {
      return (
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center select-none" title="Chú Khỉ Con Hướng Đi">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
            {/* Tail curled at back (left) */}
            <path
              d="M 18 36 C 8 38 4 28 8 20 C 12 15 18 18 16 23 C 14 26 12 26 11 29"
              stroke="#92400E"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Back Feet */}
            <ellipse cx="22" cy="46" rx="4.5" ry="3" fill="#78350F" />
            <ellipse cx="36" cy="46" rx="4.5" ry="3" fill="#78350F" />

            {/* Monkey Body */}
            <ellipse cx="28" cy="35" rx="13" ry="11" fill="#B45309" />
            {/* Belly */}
            <ellipse cx="30" cy="36" rx="8" ry="6" fill="#FDE68A" />

            {/* Head facing forward right */}
            <circle cx="41" cy="24" r="12" fill="#B45309" />

            {/* Ears */}
            <circle cx="34" cy="14" r="5" fill="#B45309" />
            <circle cx="34" cy="14" r="2.5" fill="#FDE68A" />
            <circle cx="45" cy="14" r="5" fill="#B45309" />
            <circle cx="45" cy="14" r="2.5" fill="#FDE68A" />

            {/* Face Mask */}
            <ellipse cx="43" cy="25" rx="8.5" ry="7.5" fill="#FDE68A" />

            {/* Eyes */}
            <circle cx="42" cy="22" r="1.8" fill="#1E293B" />
            <circle cx="42.6" cy="21.4" r="0.6" fill="#FFFFFF" />
            <circle cx="47.5" cy="22" r="1.8" fill="#1E293B" />
            <circle cx="48.1" cy="21.4" r="0.6" fill="#FFFFFF" />

            {/* Snout & Smile */}
            <ellipse cx="46.5" cy="27.5" rx="3.8" ry="2.2" fill="#FCD34D" />
            <circle cx="46" cy="26.8" r="0.6" fill="#78350F" />
            <circle cx="48" cy="26.8" r="0.6" fill="#78350F" />
            <path d="M 44.5 28.5 Q 46.5 30.5 48.5 28.5" stroke="#78350F" strokeWidth="1" strokeLinecap="round" fill="none" />

            {/* Hands holding Banana pointing forward */}
            <path
              d="M 40 37 C 46 34 52 38 57 33 C 55 38 48 42 41 40 Z"
              fill="#FACC15"
              stroke="#CA8A04"
              strokeWidth="0.8"
            />
            <circle cx="39" cy="38" r="2.8" fill="#B45309" />
            <circle cx="44" cy="39" r="2.4" fill="#B45309" />

            {/* Forward Direction Sight Arrow (Mũi tên chỉ hướng nhìn) */}
            <polygon points="57,32 63,35 57,38" fill="#EF4444" />
          </svg>
          {/* Subtle directional beacon dot */}
          <span className="absolute -right-1 top-1/2 -translate-y-1/2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        </div>
      );
    }
    if (theme === 'robot') {
      return (
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center select-none" title="Robot">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
            <rect x="14" y="24" width="26" height="24" rx="6" fill="#0284C7" stroke="#0369A1" strokeWidth="2" />
            <circle cx="27" cy="36" r="6" fill="#38BDF8" />
            <rect x="36" y="26" width="18" height="18" rx="4" fill="#0284C7" stroke="#0369A1" strokeWidth="2" />
            <circle cx="46" cy="35" r="3" fill="#38BDF8" />
            <circle cx="47" cy="34" r="1" fill="#FFFFFF" />
            <line x1="45" y1="26" x2="45" y2="18" stroke="#0369A1" strokeWidth="2" />
            <circle cx="45" cy="17" r="2.5" fill="#EF4444" />
            <polygon points="56,32 62,35 56,38" fill="#38BDF8" />
          </svg>
        </div>
      );
    }
    if (theme === 'spaceship') {
      return (
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center select-none" title="Phi Thuyền">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
            <polygon points="12,32 6,28 8,32 6,36" fill="#F97316" />
            <polygon points="14,32 8,29 10,32 8,35" fill="#FACC15" />
            <path d="M 16 26 L 40 26 C 50 26 58 32 58 32 C 58 32 50 38 40 38 L 16 38 Z" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
            <polygon points="16,26 24,18 28,26" fill="#EF4444" />
            <polygon points="16,38 24,46 28,38" fill="#EF4444" />
            <ellipse cx="40" cy="32" rx="5" ry="3.5" fill="#0284C7" stroke="#38BDF8" strokeWidth="1" />
          </svg>
        </div>
      );
    }
    // Cat theme
    return (
      <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center select-none" title="Mèo Con">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
          <path d="M 18 36 C 10 38 6 28 10 22 C 14 18 18 22 14 26" stroke="#EA580C" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <ellipse cx="28" cy="36" rx="13" ry="11" fill="#F97316" />
          <circle cx="41" cy="26" r="12" fill="#F97316" />
          <polygon points="34,16 38,10 40,16" fill="#EA580C" />
          <polygon points="43,16 47,10 49,16" fill="#EA580C" />
          <circle cx="43" cy="24" r="1.8" fill="#1E293B" />
          <circle cx="48" cy="24" r="1.8" fill="#1E293B" />
          <circle cx="47" cy="28" r="1.2" fill="#BE123C" />
          <line x1="47" y1="28" x2="55" y2="26" stroke="#1E293B" strokeWidth="1" />
          <line x1="47" y1="29" x2="55" y2="30" stroke="#1E293B" strokeWidth="1" />
        </svg>
      </div>
    );
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
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <BrainCircuit className="w-3.5 h-3.5" /> TƯ DUY THUẬT TOÁN & MÊ CUNG CHÚ KHỈ 🐒
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
              onClick={() => setSpriteTheme('monkey')}
              className={`px-2 py-1 rounded-lg transition-all ${spriteTheme === 'monkey' ? 'bg-amber-100 shadow-xs text-amber-800 font-black' : 'hover:bg-slate-200'}`}
              title="Nhân vật Chú Khỉ Thông Minh (Mặc định)"
            >
              🐒 Khỉ Con
            </button>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Column 1: Toolbox Block Palette (4 Cols) */}
        <div className="lg:col-span-4 order-3 lg:order-1 bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
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
        <div className="lg:col-span-4 order-2 lg:order-2 bg-purple-50/40 rounded-2xl p-4 border-2 border-dashed border-purple-200 min-h-[300px] flex flex-col justify-between">
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
              <div className="text-center py-12 sm:py-20 text-xs text-slate-400 font-medium">
                Bấm các bước lệnh ở mục "KHO LỆNH" để lập trình đường đi! 🧭
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
        <div className="lg:col-span-4 order-1 lg:order-3 bg-slate-900 rounded-3xl p-4 sm:p-5 border-4 border-slate-800 text-white flex flex-col items-center">
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
                      className={`select-none transition-transform duration-200 inline-block ${rotationClass}`}
                    >
                      {renderSprite(spriteTheme)}
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
