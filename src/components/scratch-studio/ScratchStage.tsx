import React, { useRef, useEffect } from 'react';
import { Flag, Square, RotateCcw, Grid, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface SpriteState {
  x: number; // -240 to +240
  y: number; // -180 to +180
  direction: number; // 0=up, 90=right, 180=down, 270/-90=left
  size: number; // Percentage, 100 is default
  visible: boolean;
  speechBubble: {
    text: string;
    type?: 'say' | 'think';
  } | null;
}

export interface ScratchStageProps {
  sprite: SpriteState;
  isRunning: boolean;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
  onSpriteClick?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
}

export const STAGE_WIDTH = 480;
export const STAGE_HEIGHT = 360;

export default function ScratchStage({
  sprite,
  isRunning,
  onRun,
  onStop,
  onReset,
  onSpriteClick,
  showGrid = false,
  onToggleGrid,
}: ScratchStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Chuyển đổi tọa độ Scratch sang pixel Canvas
  // Tâm (0, 0) ở giữa canvas (240, 180)
  // X: -240..240 -> px: 0..480
  // Y: -180..180 -> py: 360..0 (Y của Scratch hướng lên trên)
  const pixelX = 240 + sprite.x;
  const pixelY = 180 - sprite.y;

  // Vẽ lưới tọa độ nếu được bật
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

    if (showGrid) {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#E2E8F0';

      // Vẽ các đường lưới phụ 50px
      for (let x = 40; x < STAGE_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, STAGE_HEIGHT);
        ctx.stroke();
      }
      for (let y = 30; y < STAGE_HEIGHT; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(STAGE_WIDTH, y);
        ctx.stroke();
      }

      // Trục tọa độ chính X (ngang) và Y (dọc)
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#94A3B8';
      // Trục X (y=180)
      ctx.beginPath();
      ctx.moveTo(0, 180);
      ctx.lineTo(480, 180);
      ctx.stroke();

      // Trục Y (x=240)
      ctx.beginPath();
      ctx.moveTo(240, 0);
      ctx.lineTo(240, 360);
      ctx.stroke();

      // Nhãn đánh dấu tọa độ
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#64748B';
      ctx.fillText('(0, 0)', 245, 195);
      ctx.fillText('x: -200', 45, 175);
      ctx.fillText('x: 200', 425, 175);
      ctx.fillText('y: 150', 245, 35);
      ctx.fillText('y: -150', 245, 335);

      ctx.restore();
    }
  }, [showGrid]);

  // Góc xoay của sprite: mặc định hình vẽ Chú Khỉ nhìn sang phải (90 độ)
  const rotationDegrees = sprite.direction - 90;
  const scale = (sprite.size || 100) / 100;

  return (
    <div className="flex flex-col bg-slate-900/90 rounded-3xl p-3 md:p-4 border border-slate-700/80 shadow-2xl text-white">
      {/* 1. Header Toolbar của Sân Khấu (Green Flag, Red Stop, Grid, Reset) */}
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          {/* Nút Cờ Xanh */}
          <button
            onClick={onRun}
            title="Bắt đầu chạy kịch bản (Cờ Xanh)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-md ${
              isRunning
                ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 ring-offset-1 ring-offset-slate-900 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <Flag className="w-3.5 h-3.5 fill-white" />
            <span>Chạy</span>
          </button>

          {/* Nút Đỏ Dừng */}
          <button
            onClick={onStop}
            title="Dừng kịch bản ngay lập tức"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all cursor-pointer shadow-md"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Dừng</span>
          </button>

          {/* Trạng thái thực thi */}
          {isRunning && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Đang chạy...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Bật / Tắt lưới tọa độ */}
          {onToggleGrid && (
            <button
              onClick={onToggleGrid}
              title="Bật/Tắt hiển thị lưới trục tọa độ X-Y"
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                showGrid
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          )}

          {/* Đặt lại vị trí ban đầu */}
          <button
            onClick={onReset}
            title="Đặt lại vị trí nhân vật về tâm (0, 0)"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Sân Khấu Canvas 480x360 Tỷ Lệ 4:3 */}
      <div className="relative w-full aspect-[4/3] bg-white rounded-2xl overflow-hidden border-2 border-slate-300 shadow-inner select-none flex items-center justify-center">
        {/* Canvas vẽ nền & lưới tọa độ */}
        <canvas
          ref={canvasRef}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Sprite Nhân Vật (Chú Khỉ Thông Thái Scratch) */}
        {sprite.visible && (
          <div
            onClick={onSpriteClick}
            style={{
              position: 'absolute',
              left: `${(pixelX / STAGE_WIDTH) * 100}%`,
              top: `${(pixelY / STAGE_HEIGHT) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${rotationDegrees}deg) scale(${scale})`,
              transformOrigin: 'center center',
              transition: isRunning ? 'none' : 'transform 0.2s ease-out, left 0.1s linear, top 0.1s linear',
              cursor: 'pointer',
              zIndex: 10,
            }}
            className="group"
            title="Nhân vật Chú Khỉ Thông Thái (Bấm để tương tác!)"
          >
            {/* Vector SVG Chú Khỉ Thông Thái IQ Kids */}
            <svg
              width="68"
              height="68"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg group-hover:scale-105 transition-transform"
            >
              <defs>
                <linearGradient id="stageMonkeyFur" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#D97706" />
                  <stop offset="1" stopColor="#B45309" />
                </linearGradient>
                <linearGradient id="stageMonkeyFace" x1="45" y1="30" x2="75" y2="60" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FEF3C7" />
                  <stop offset="1" stopColor="#FDE68A" />
                </linearGradient>
              </defs>

              {/* Curled Monkey Tail */}
              <path
                d="M 28 62 C 14 66 8 48 18 38 C 24 32 32 38 28 46 C 25 51 22 52 20 58"
                stroke="#92400E"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Back Feet */}
              <ellipse cx="36" cy="80" rx="9" ry="5.5" fill="#78350F" />
              <ellipse cx="58" cy="80" rx="9" ry="5.5" fill="#78350F" />

              {/* Monkey Body */}
              <ellipse cx="46" cy="62" rx="22" ry="18" fill="url(#stageMonkeyFur)" stroke="#78350F" strokeWidth="2.5" />
              {/* Light Belly */}
              <ellipse cx="50" cy="63" rx="13" ry="11" fill="url(#stageMonkeyFace)" />

              {/* Ears */}
              {/* Left Ear */}
              <circle cx="43" cy="22" r="8" fill="url(#stageMonkeyFur)" stroke="#78350F" strokeWidth="2" />
              <circle cx="43" cy="22" r="4.5" fill="#FDE68A" />
              {/* Right Ear */}
              <circle cx="77" cy="22" r="8" fill="url(#stageMonkeyFur)" stroke="#78350F" strokeWidth="2" />
              <circle cx="77" cy="22" r="4.5" fill="#FDE68A" />

              {/* Monkey Head (Facing forward-right) */}
              <circle cx="60" cy="36" r="20" fill="url(#stageMonkeyFur)" stroke="#78350F" strokeWidth="2.5" />

              {/* Top Hair Tuft */}
              <path d="M 54 17 C 57 9 65 9 62 18 C 66 11 71 13 66 20 Z" fill="#92400E" />

              {/* Face Mask (Heart-rounded muzzle) */}
              <path
                d="M 62 26 C 54 18 44 24 46 36 C 46 47 56 53 66 53 C 76 53 82 45 80 36 C 78 24 70 18 62 26 Z"
                fill="url(#stageMonkeyFace)"
              />

              {/* Cheeks Blush */}
              <ellipse cx="50" cy="42" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.7" />
              <ellipse cx="74" cy="42" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.7" />

              {/* Eyes (Looking playfully forward/right) */}
              <ellipse cx="55" cy="33" rx="4.5" ry="6" fill="#1E293B" />
              <circle cx="53.5" cy="31" r="2" fill="#FFFFFF" />
              <circle cx="56.5" cy="35" r="1" fill="#FFFFFF" />

              <ellipse cx="69" cy="33" rx="4.5" ry="6" fill="#1E293B" />
              <circle cx="67.5" cy="31" r="2" fill="#FFFFFF" />
              <circle cx="70.5" cy="35" r="1" fill="#FFFFFF" />

              {/* Cute Nose & Snout */}
              <ellipse cx="63" cy="42" rx="4" ry="2.5" fill="#F59E0B" opacity="0.3" />
              <circle cx="61.5" cy="41.5" r="1" fill="#78350F" />
              <circle cx="64.5" cy="41.5" r="1" fill="#78350F" />

              {/* Happy Smile */}
              <path d="M 58 45 Q 63 49 68 45" stroke="#78350F" strokeWidth="2" strokeLinecap="round" fill="none" />

              {/* Front Hands/Arms waving or pointing */}
              <path
                d="M 62 64 C 70 60 78 64 84 59 C 82 65 74 69 64 68 Z"
                fill="#FDE68A"
                stroke="#78350F"
                strokeWidth="1.5"
              />
            </svg>

            {/* Bong bóng thoại (Speech Bubble) */}
            <AnimatePresence>
              {sprite.speechBubble && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-20"
                >
                  <div className="relative bg-white text-slate-800 text-xs font-bold px-3.5 py-2 rounded-2xl shadow-xl border-2 border-indigo-500 whitespace-nowrap min-w-[60px] text-center">
                    {sprite.speechBubble.text}
                    {/* Mũi nhọn bóng thoại trỏ xuống miệng Khỉ */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-indigo-500"></div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[2px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-white"></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 3. Footer Status Bar (Tọa độ X, Y, Hướng, Kích thước) */}
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800 text-center font-mono text-[11px]">
        <div className="bg-slate-800/80 rounded-xl py-1.5 border border-slate-700/60">
          <span className="text-slate-400 font-sans block text-[9px] uppercase tracking-wider">Tọa độ X</span>
          <span className="font-bold text-indigo-400">{Math.round(sprite.x)}</span>
        </div>
        <div className="bg-slate-800/80 rounded-xl py-1.5 border border-slate-700/60">
          <span className="text-slate-400 font-sans block text-[9px] uppercase tracking-wider">Tọa độ Y</span>
          <span className="font-bold text-indigo-400">{Math.round(sprite.y)}</span>
        </div>
        <div className="bg-slate-800/80 rounded-xl py-1.5 border border-slate-700/60">
          <span className="text-slate-400 font-sans block text-[9px] uppercase tracking-wider">Hướng</span>
          <span className="font-bold text-amber-400">{Math.round(sprite.direction)}°</span>
        </div>
        <div className="bg-slate-800/80 rounded-xl py-1.5 border border-slate-700/60">
          <span className="text-slate-400 font-sans block text-[9px] uppercase tracking-wider">Kích Thước</span>
          <span className="font-bold text-emerald-400">{Math.round(sprite.size)}%</span>
        </div>
      </div>
    </div>
  );
}
