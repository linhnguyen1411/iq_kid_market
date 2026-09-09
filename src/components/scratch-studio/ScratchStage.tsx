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

  // Góc xoay của sprite: mặc định hình vẽ mèo nhìn sang phải (90 độ)
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

        {/* Sprite Nhân Vật (Chú Mèo Scratch) */}
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
          >
            {/* Vector SVG Chú Mèo Scratch */}
            <svg
              width="64"
              height="64"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-md group-hover:scale-105 transition-transform"
            >
              {/* Đuôi Mèo */}
              <path
                d="M20 60 C10 65 5 45 15 40 C20 38 25 48 20 60 Z"
                fill="#FFAB19"
                stroke="#000"
                strokeWidth="2.5"
              />
              {/* Thân Mèo */}
              <ellipse
                cx="48"
                cy="62"
                rx="24"
                ry="18"
                fill="#FFAB19"
                stroke="#000"
                strokeWidth="2.5"
              />
              <ellipse
                cx="48"
                cy="64"
                rx="14"
                ry="11"
                fill="#FFFFFF"
              />
              {/* Chân Mèo */}
              <ellipse cx="34" cy="78" rx="8" ry="5" fill="#FFFFFF" stroke="#000" strokeWidth="2.5" />
              <ellipse cx="58" cy="78" rx="8" ry="5" fill="#FFFFFF" stroke="#000" strokeWidth="2.5" />
              {/* Tai Mèo */}
              <polygon points="42,22 32,8 54,16" fill="#FFAB19" stroke="#000" strokeWidth="2.5" />
              <polygon points="44,20 37,12 50,17" fill="#FF8C1A" />
              <polygon points="68,22 80,8 76,20" fill="#FFAB19" stroke="#000" strokeWidth="2.5" />
              <polygon points="69,20 76,12 73,19" fill="#FF8C1A" />
              {/* Đầu Mèo */}
              <ellipse
                cx="56"
                cy="32"
                rx="24"
                ry="20"
                fill="#FFAB19"
                stroke="#000"
                strokeWidth="2.5"
              />
              {/* Mõm trắng */}
              <ellipse cx="64" cy="38" rx="12" ry="9" fill="#FFFFFF" />
              <ellipse cx="50" cy="38" rx="10" ry="9" fill="#FFFFFF" />
              {/* Mũi hồng */}
              <polygon points="56,35 53,38 59,38" fill="#FF6680" stroke="#000" strokeWidth="1" />
              {/* Mắt to */}
              <ellipse cx="48" cy="28" rx="5" ry="7" fill="#FFFFFF" stroke="#000" strokeWidth="2" />
              <circle cx="50" cy="28" r="3" fill="#000" />
              <circle cx="51" cy="26" r="1" fill="#FFF" />
              <ellipse cx="62" cy="28" rx="5" ry="7" fill="#FFFFFF" stroke="#000" strokeWidth="2" />
              <circle cx="64" cy="28" r="3" fill="#000" />
              <circle cx="65" cy="26" r="1" fill="#FFF" />
              {/* Râu Mèo */}
              <line x1="68" y1="36" x2="84" y2="34" stroke="#000" strokeWidth="2" strokeLinecap="round" />
              <line x1="68" y1="40" x2="84" y2="42" stroke="#000" strokeWidth="2" strokeLinecap="round" />
              <line x1="44" y1="36" x2="28" y2="34" stroke="#000" strokeWidth="2" strokeLinecap="round" />
              <line x1="44" y1="40" x2="28" y2="42" stroke="#000" strokeWidth="2" strokeLinecap="round" />
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
                    {/* Mũi nhọn bóng thoại trỏ xuống miệng Mèo */}
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
