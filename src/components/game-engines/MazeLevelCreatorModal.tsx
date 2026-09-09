import React, { useState } from 'react';
import { X, Plus, Trash2, Sparkles, MapPin, Compass, ShieldAlert, CheckCircle2, RotateCw } from 'lucide-react';
import { api } from '../../services/api';
import { ScratchCourse } from '../../types';

interface MazeLevelCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: ScratchCourse[];
  onLessonCreated: () => void;
}

type ToolMode = 'monkey' | 'star' | 'obstacle';
type Direction = 'right' | 'down' | 'left' | 'up';

export default function MazeLevelCreatorModal({
  isOpen,
  onClose,
  courses,
  onLessonCreated,
}: MazeLevelCreatorModalProps) {
  if (!isOpen) return null;

  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || 'sc1');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [gridSize, setGridSize] = useState<number>(4);
  const [monkeyPos, setMonkeyPos] = useState<[number, number]>([0, 0]);
  const [monkeyDir, setMonkeyDir] = useState<Direction>('right');
  const [starPos, setStarPos] = useState<[number, number]>([3, 0]);
  const [obstacles, setObstacles] = useState<[number, number][]>([]);
  const [toolMode, setToolMode] = useState<ToolMode>('obstacle');
  const [blocksWorkplace, setBlocksWorkplace] = useState<string[]>([]);
  const [xpReward, setXpReward] = useState<number>(150);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Available toolbox blocks for teachers to assemble
  const AVAILABLE_BLOCKS = [
    { code: 'move_forward', label: 'Tiến 1 bước ➡️', color: 'bg-blue-600 hover:bg-blue-500' },
    { code: 'turn_right', label: 'Quay phải 90° ↪️', color: 'bg-indigo-600 hover:bg-indigo-500' },
    { code: 'turn_left', label: 'Quay trái 90° ↩️', color: 'bg-purple-600 hover:bg-purple-500' },
    { code: 'jump_forward', label: 'Nhảy vọt 2 bước 🦘', color: 'bg-cyan-600 hover:bg-cyan-500' },
    { code: 'repeat_2[move_forward]', label: 'Lặp 2 lần [Đi thẳng] 🔄', color: 'bg-orange-500 hover:bg-orange-400' },
    { code: 'repeat_3[move_forward]', label: 'Lặp 3 lần [Đi thẳng] 🔄', color: 'bg-amber-500 hover:bg-amber-400' },
  ];

  const handleCellClick = (x: number, y: number) => {
    if (toolMode === 'monkey') {
      if (starPos[0] === x && starPos[1] === y) return;
      setMonkeyPos([x, y]);
      // Remove obstacle if placed here
      setObstacles(obstacles.filter(([ox, oy]) => !(ox === x && oy === y)));
    } else if (toolMode === 'star') {
      if (monkeyPos[0] === x && monkeyPos[1] === y) return;
      setStarPos([x, y]);
      setObstacles(obstacles.filter(([ox, oy]) => !(ox === x && oy === y)));
    } else if (toolMode === 'obstacle') {
      if ((monkeyPos[0] === x && monkeyPos[1] === y) || (starPos[0] === x && starPos[1] === y)) return;
      const exists = obstacles.some(([ox, oy]) => ox === x && oy === y);
      if (exists) {
        setObstacles(obstacles.filter(([ox, oy]) => !(ox === x && oy === y)));
      } else {
        setObstacles([...obstacles, [x, y]]);
      }
    }
  };

  const addBlockToSequence = (code: string) => {
    if (blocksWorkplace.length >= 12) return;
    setBlocksWorkplace([...blocksWorkplace, code]);
  };

  const removeBlockFromSequence = (index: number) => {
    const updated = [...blocksWorkplace];
    updated.splice(index, 1);
    setBlocksWorkplace(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên màn chơi!');
      return;
    }

    if (blocksWorkplace.length === 0) {
      setErrorMsg('Vui lòng tạo kịch bản giải mẫu (target block sequence)!');
      return;
    }

    const sceneData = {
      grid_size: gridSize,
      cat_pos: monkeyPos,
      cat_dir: monkeyDir,
      star_pos: starPos,
      obstacles: obstacles,
    };

    setLoading(true);
    try {
      await api.scratch.createAdminLesson({
        course_id: selectedCourseId,
        title: title.trim(),
        content: content.trim() || 'Dẫn đường cho Chú Khỉ con vượt chướng ngại vật đến ngôi sao vàng!',
        target_block_sequence: blocksWorkplace.join(','),
        start_scene_json: JSON.stringify(sceneData),
        xp_reward: xpReward,
        engine_type: 'algorithm_maze',
      });

      setSuccessMsg('🎉 Đã tạo màn chơi mới thành công vào CSDL!');
      setTimeout(() => {
        onLessonCreated();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tạo bài học mới.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 my-8 overflow-hidden text-left flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🧩</span>
            <div>
              <h3 className="text-lg font-black tracking-tight">Soạn Màn Chơi Mê Cung Mới (Giáo Viên & Admin)</h3>
              <p className="text-xs text-white/80">Thiết kế bản đồ, chướng ngại vật và độ khó cho học sinh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">Khóa học</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-indigo-500"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">Tên màn chơi</label>
              <input
                type="text"
                placeholder="VD: Bẻ Lái Tránh Vực Đá"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">Thưởng XP</label>
              <input
                type="number"
                value={xpReward}
                onChange={(e) => setXpReward(parseInt(e.target.value) || 100)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-600 mb-1">Nội dung / Lời dẫn sư phạm cho bé</label>
            <textarea
              rows={2}
              placeholder="VD: Hãy giúp Chú Khỉ con rẽ phải để tránh tảng đá và thu hoạch ngôi sao vàng tại (3,2)!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-indigo-500 font-medium"
            />
          </div>

          {/* Section 2: Interactive Grid Authoring */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Bản Đồ Mê Cung Trực Quan
                </span>
              </div>

              {/* Grid Size & Initial Direction */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span>Kích thước:</span>
                  <select
                    value={gridSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      setGridSize(newSize);
                      // Adjust star/monkey if out of bounds
                      if (monkeyPos[0] >= newSize || monkeyPos[1] >= newSize) setMonkeyPos([0, 0]);
                      if (starPos[0] >= newSize || starPos[1] >= newSize) setStarPos([newSize - 1, 0]);
                    }}
                    className="text-xs font-bold p-1 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value={3}>3x3 (Dễ)</option>
                    <option value={4}>4x4 (Chuẩn)</option>
                    <option value={5}>5x5 (Thử thách)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span>Hướng Khỉ nhìn:</span>
                  <select
                    value={monkeyDir}
                    onChange={(e) => setMonkeyDir(e.target.value as Direction)}
                    className="text-xs font-bold p-1 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="right">Phải ➡️ (0°)</option>
                    <option value="down">Dưới ⬇️ (90°)</option>
                    <option value="left">Trái ⬅️ (180°)</option>
                    <option value="up">Lên ⬆️ (270°)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Brush Tool Selector */}
            <div className="flex flex-wrap items-center gap-2 mb-4 bg-white p-2 rounded-xl border border-slate-200 text-xs font-bold">
              <span className="text-slate-400 text-[11px] font-normal mr-1">Chế độ click ô:</span>
              <button
                type="button"
                onClick={() => setToolMode('monkey')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                  toolMode === 'monkey' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>🐒 Đặt Khỉ Con</span>
                <span className="text-[10px] opacity-80">({monkeyPos[0]},{monkeyPos[1]})</span>
              </button>
              <button
                type="button"
                onClick={() => setToolMode('star')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                  toolMode === 'star' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>🌟 Đặt Ngôi Sao</span>
                <span className="text-[10px] opacity-80">({starPos[0]},{starPos[1]})</span>
              </button>
              <button
                type="button"
                onClick={() => setToolMode('obstacle')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                  toolMode === 'obstacle' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>🪨 Thêm/Xóa Đá Chướng Ngại ({obstacles.length})</span>
              </button>
            </div>

            {/* Interactive Grid Canvas */}
            <div className="flex justify-center">
              <div
                className="grid gap-2 bg-slate-900 p-3 rounded-2xl border-2 border-slate-800"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, minmax(48px, 64px))`,
                  gridTemplateRows: `repeat(${gridSize}, minmax(48px, 64px))`,
                }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                  const x = i % gridSize;
                  const y = Math.floor(i / gridSize);
                  const isMonkey = monkeyPos[0] === x && monkeyPos[1] === y;
                  const isStar = starPos[0] === x && starPos[1] === y;
                  const isObstacle = obstacles.some(([ox, oy]) => ox === x && oy === y);

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleCellClick(x, y)}
                      className={`relative aspect-square rounded-xl border flex items-center justify-center transition-all cursor-pointer select-none hover:scale-102 ${
                        isMonkey
                          ? 'bg-amber-950/80 border-amber-500 shadow-sm'
                          : isStar
                          ? 'bg-amber-950/50 border-amber-400 shadow-sm'
                          : isObstacle
                          ? 'bg-slate-800 border-slate-600'
                          : 'bg-slate-950/80 border-slate-800 hover:bg-slate-800/50'
                      }`}
                    >
                      {isMonkey && <span className="text-2xl animate-bounce">🐒</span>}
                      {isStar && <span className="text-2xl animate-pulse">🌟</span>}
                      {isObstacle && <span className="text-xl">🪨</span>}
                      <span className="absolute bottom-0.5 right-1 text-[8px] font-mono text-slate-500">
                        {x},{y}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
              💡 Bấm vào ô bất kỳ trên lưới để di chuyển Chú Khỉ, Ngôi Sao hoặc bật/tắt Tảng Đá Chướng Ngại Vật!
            </p>
          </div>

          {/* Section 3: Target Block Sequence Builder */}
          <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-200">
            <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>🎯 KỊCH BẢN GIẢI MẪU (TARGET SEQUENCE)</span>
              <span className="text-[10px] text-purple-700 font-bold">{blocksWorkplace.length}/12 khối</span>
            </h4>

            {/* Toolbox Palette Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {AVAILABLE_BLOCKS.map((b) => (
                <button
                  key={b.code}
                  type="button"
                  onClick={() => addBlockToSequence(b.code)}
                  className={`px-2.5 py-1.5 rounded-lg text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer ${b.color}`}
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  {b.label}
                </button>
              ))}
            </div>

            {/* Current Blocks in Solution */}
            {blocksWorkplace.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 font-medium bg-white/60 rounded-xl border border-dashed border-purple-200">
                Bấm các nút lệnh phía trên để tạo kịch bản giải mẫu cho màn chơi này! 🧭
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-2 bg-white/80 rounded-xl border border-purple-200">
                {blocksWorkplace.map((code, idx) => {
                  const item = AVAILABLE_BLOCKS.find((b) => b.code === code);
                  return (
                    <div
                      key={idx}
                      className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>{idx + 1}. {item?.label || code}</span>
                      <button
                        type="button"
                        onClick={() => removeBlockFromSequence(idx)}
                        className="hover:text-rose-200 cursor-pointer p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Đang lưu vào CSDL...' : 'LƯU & XUẤT BẢN MÀN CHƠI 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
