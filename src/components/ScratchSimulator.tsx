import { useState, useEffect } from "react";
import { Play, RotateCcw, Plus, Trash2, ArrowRight, Save, Award, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ScratchLesson {
  lesson_num: number;
  title: string;
  content: string;
  target_block_sequence: string;
  start_scene_json: string;
  xp_reward: number;
}

export interface ScratchSimulatorProps {
  lesson: ScratchLesson;
  onLessonComplete: (xpEarned: number) => void;
  onBack: () => void;
}

export default function ScratchSimulator({
  lesson,
  onLessonComplete,
  onBack
}: ScratchSimulatorProps) {
  // Parsing the initial grid
  const initialScene = JSON.parse(lesson.start_scene_json);
  const GRID_SIZE = 4; // 4x4 coordinate space
  
  const [catPos, setCatPos] = useState<[number, number]>(initialScene.cat_pos || [0, 0]);
  const [catDirection, setCatDirection] = useState<'right' | 'down' | 'left' | 'up'>('right');
  const [starPos] = useState<[number, number]>(initialScene.star_pos || [3, 3]);
  const [blocksWorkplace, setBlocksWorkplace] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string>("Sắp xếp các khối lệnh bên trái rồi ấn Chạy Lệnh ▶️!");
  const [success, setSuccess] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);

  // Available toolbox blocks kids can tap
  const TOOLBOX = [
    { code: "move_forward", label: "Di chuyển tới ➡️", color: "bg-blue-500", desc: "Đi về hướng đang quay mặt" },
    { code: "turn_right", label: "Quay phải ↪️", color: "bg-orange-500", desc: "Xoay mặt 94 độ theo chiều kim đồng hồ" },
    { code: "turn_left", label: "Quay trái ↩️", color: "bg-purple-500", desc: "Xoay mặt ngược chiều kim đồng hồ" },
    { code: "repeat_3[move_forward]", label: "Lặp lại 3x [Di chuyển] 🔄", color: "bg-teal-500", desc: "Lặp lệnh 3 lần" }
  ];

  // Sync state if lesson changes
  useEffect(() => {
    resetSimulation();
    setBlocksWorkplace([]);
    setSuccess(false);
  }, [lesson]);

  const resetSimulation = () => {
    const scene = JSON.parse(lesson.start_scene_json);
    setCatPos(scene.cat_pos || [0, 0]);
    setCatDirection('right');
    setIsRunning(false);
    setStepIndex(-1);
    setMessage("Đã hoàn tác màn chơi. Sẵn sàng chạy thử!");
  };

  const addBlock = (code: string) => {
    if (blocksWorkplace.length >= 8) {
      setMessage("Kho chứa tối đa 8 câu lệnh!");
      return;
    }
    setBlocksWorkplace([...blocksWorkplace, code]);
  };

  const removeBlock = (index: number) => {
    const updated = [...blocksWorkplace];
    updated.splice(index, 1);
    setBlocksWorkplace(updated);
  };

  const clearBlocks = () => {
    setBlocksWorkplace([]);
  };

  const runSimulation = async () => {
    if (blocksWorkplace.length === 0) {
      setMessage("Vui lòng kích chọn ít nhất một khối lệnh!");
      return;
    }

    setIsRunning(true);
    setMessage("Đang khởi tạo thuật toán...");
    
    // Reset position first before stepping
    const scene = JSON.parse(lesson.start_scene_json);
    let currentPos: [number, number] = [...(scene.cat_pos || [0, 0])] as [number, number];
    let currentDir: 'right' | 'down' | 'left' | 'up' = 'right';

    setCatPos(currentPos);
    setCatDirection(currentDir);

    // Expand repeat loop blocks if any
    let expandedCommands: string[] = [];
    for (const b of blocksWorkplace) {
      if (b === "repeat_3[move_forward]") {
        expandedCommands.push("move_forward", "move_forward", "move_forward");
      } else {
        expandedCommands.push(b);
      }
    }

    // Step by step scheduler
    for (let i = 0; i < expandedCommands.length; i++) {
      setStepIndex(i);
      const cmd = expandedCommands[i];
      await new Promise(resolve => setTimeout(resolve, 800));

      if (cmd === "move_forward") {
        let [x, y] = currentPos;
        if (currentDir === 'right') x = Math.min(GRID_SIZE - 1, x + 1);
        else if (currentDir === 'down') y = Math.min(GRID_SIZE - 1, y + 1);
        else if (currentDir === 'left') x = Math.max(0, x - 1);
        else if (currentDir === 'up') y = Math.max(0, y - 1);
        
        currentPos = [x, y];
        setCatPos(currentPos);
      } else if (cmd === "turn_right") {
        const order: Array<'right' | 'down' | 'left' | 'up'> = ['right', 'down', 'left', 'up'];
        const currentIdx = order.indexOf(currentDir);
        currentDir = order[(currentIdx + 1) % 4];
        setCatDirection(currentDir);
      } else if (cmd === "turn_left") {
        const order: Array<'right' | 'down' | 'left' | 'up'> = ['right', 'down', 'left', 'up'];
        const currentIdx = order.indexOf(currentDir);
        currentDir = order[(currentIdx + 3) % 4];
        setCatDirection(currentDir);
      }

      setMessage(`Đang thực thi lệnh ${i + 1}/${expandedCommands.length}...`);
    }

    // Done executing: Evaluate if cat reached star
    const successCondition = currentPos[0] === starPos[0] && currentPos[1] === starPos[1];
    if (successCondition) {
      setSuccess(true);
      setMessage("XUẤT SẮC! Chú mèo lập trình đã lấy được sao vàng rực rỡ! ⭐");
    } else {
      setIsRunning(false);
      setMessage("Thử thách chưa thành công! Hãy lắp ráp các khối lệnh chuẩn hơn nhé!");
    }
  };

  const handleClaimSuccessReward = () => {
    onLessonComplete(lesson.xp_reward);
  };

  return (
    <div className="bg-white rounded-3xl p-5 md:p-8 shadow-xl border-4 border-slate-100 max-w-5xl mx-auto">
      
      {/* Title block */}
      <div className="flex flex-wrap justify-between items-center pb-4 mb-6 border-b-2 border-slate-100">
        <div className="flex items-center gap-3">
          <button 
            id="back_to_scratch_btn"
            onClick={onBack}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
          >
            ↩️ Thoát
          </button>
          <div>
            <h5 className="font-display text-xs tracking-wide text-kids-purple uppercase flex items-center gap-1">
              <BrainCircuit className="w-3.5 h-3.5" /> Tư Duy Thuật Toán (Lớp 7-9)
            </h5>
            <h3 className="font-display text-lg md:text-xl text-slate-800">Bài {lesson.lesson_num}: {lesson.title}</h3>
          </div>
        </div>
        <div className="bg-purple-100 text-purple-700 font-display text-sm font-bold px-4 py-2 rounded-2xl">
          Phần thưởng: +{lesson.xp_reward} XP
        </div>
      </div>

      <p className="bg-slate-50 border border-slate-100 text-slate-600 rounded-2xl p-4 text-xs md:text-sm mb-6 leading-relaxed">
        📖 <strong>Nhiệm vụ:</strong> {lesson.content}
      </p>

      {/* Main split work region */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Module A: Toolbox (4 cols) */}
        <div className="md:col-span-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <h4 className="font-display text-sm text-slate-700 mb-3 font-bold border-b border-slate-200 pb-2">📂 HỘP CÔNG CỤ BLOCKS</h4>
          <div className="flex flex-col gap-2.5">
            {TOOLBOX.map((tool) => (
              <button
                id={`toolbox_add_${tool.code}`}
                key={tool.code}
                onClick={() => addBlock(tool.code)}
                disabled={isRunning || success}
                className="w-full text-left p-3.5 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-kids-purple rounded-xl transition-all flex items-center justify-between shadow-sm active:scale-97 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div>
                  <div className={`inline-block text-xs font-bold text-white px-2.5 py-1 ${tool.color} rounded-lg mb-1`}>
                    {tool.label}
                  </div>
                  <div className="text-xxs text-slate-500">{tool.desc}</div>
                </div>
                <Plus className="w-5 h-5 text-slate-400 group-hover:text-kids-purple" />
              </button>
            ))}
          </div>
        </div>

        {/* Module B: Workspace (4 cols) */}
        <div className="md:col-span-4 bg-purple-50/50 rounded-2xl p-4 border-2 border-dashed border-purple-200 min-h-[350px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-purple-100">
              <h4 className="font-display text-sm text-purple-800 font-bold">📑 KỊCH BẢN CỦA EM</h4>
              {blocksWorkplace.length > 0 && (
                <button
                  id="scratch_clear_all"
                  onClick={clearBlocks}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                  title="Xoá kịch bản"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {blocksWorkplace.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-400 font-medium">
                Hãy bấm thêm khối lệnh bên trái để lập trình đường đi! 🐈
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {blocksWorkplace.map((block, idx) => {
                  const resolvedTool = TOOLBOX.find(t => t.code === block);
                  return (
                    <motion.div
                      id={`workspace_item_${idx}`}
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 text-white font-bold rounded-xl text-xs flex justify-between items-center ${resolvedTool?.color || "bg-indigo-500"} shadow-md`}
                    >
                      <span>{idx + 1}. {resolvedTool?.label}</span>
                      <button
                        id={`remove_w_${idx}`}
                        onClick={() => removeBlock(idx)}
                        className="text-white/80 hover:text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-purple-100 flex gap-2">
            {!success ? (
              <>
                <button
                  id="scratch_run_btn"
                  onClick={runSimulation}
                  disabled={isRunning || blocksWorkplace.length === 0}
                  className="flex-1 py-3 bg-kids-green text-slate-900 font-display font-bold rounded-xl text-sm justify-center flex items-center gap-1.5 shadow disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed transform active:translate-y-0.5"
                >
                  <Play className="w-4 h-4" /> Chạy Lệnh
                </button>
                <button
                  id="scratch_reset_btn"
                  onClick={resetSimulation}
                  disabled={!isRunning && catPos[0] === initialScene.cat_pos?.[0] && catPos[1] === initialScene.cat_pos?.[1]}
                  className="py-3 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl text-sm justify-center flex items-center shadow"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                id="scratch_claim_reward_btn"
                onClick={handleClaimSuccessReward}
                className="w-full py-4.5 bg-yellow-400 text-slate-900 font-display font-bold rounded-xl text-sm justify-center flex items-center gap-2 shadow kids-btn-shadow-yellow transform hover:scale-102 transition-all"
              >
                <Award className="w-5 h-5" /> Nhận {lesson.xp_reward} XP & Hoàn Thành
              </button>
            )}
          </div>
        </div>

        {/* Module C: Interactive Math Block Simulator Grid (4 cols) */}
        <div className="md:col-span-4 bg-slate-900 rounded-3xl p-5 border-4 border-slate-800 text-white flex flex-col items-center">
          <div className="text-center font-display text-xs mb-3 font-semibold text-slate-400 tracking-wider">MÔ THẢ KHÔNG GIAN BÀI TOÁN</div>
          
          <div className="relative w-full aspect-square max-w-[240px] bg-slate-850 rounded-2xl grid grid-cols-4 grid-rows-4 gap-1 p-2 border border-slate-750">
            {/* Loop render cell squares of grid */}
            {Array.from({ length: 16 }).map((_, i) => {
              const x = i % 4;
              const y = Math.floor(i / 4);
              const isWithCat = catPos[0] === x && catPos[1] === y;
              const isWithStar = starPos[0] === x && starPos[1] === y;

              // Rotate cat depends on vector
              const rotationClass = 
                catDirection === 'right' ? "rotate-0" :
                catDirection === 'down' ? "rotate-90" :
                catDirection === 'left' ? "rotate-180" : "rotate-274";

              return (
                <div 
                  id={`simulator_cell_${x}_${y}`}
                  key={i} 
                  className="relative bg-slate-800/60 rounded-lg flex items-center justify-center border border-slate-700/30 overflow-hidden"
                >
                  {isWithStar && (
                    <motion.div 
                      className="absolute inset-0 flex items-center justify-center text-2xl z-2"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      ⭐
                    </motion.div>
                  )}

                  {isWithCat && (
                    <motion.div 
                      id="scratch_cat_sprite"
                      layoutId="cat_cell"
                      className={`absolute text-2xl z-5 transition-transform duration-200 ${rotationClass}`}
                    >
                      🐱
                    </motion.div>
                  )}

                  <span className="absolute bottom-0.5 right-1 font-mono text-xxxxs text-slate-600 select-none">({x},{y})</span>
                </div>
              );
            })}
          </div>

          <div className="w-full mt-4 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
            <div className={`text-xs font-medium text-center ${success ? "text-green-400 font-bold" : "text-amber-300"}`}>
              {message}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
