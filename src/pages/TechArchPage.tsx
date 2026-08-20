import React from 'react';
import TechArchBoard from '../components/TechArchBoard';

export const TechArchPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="inline-block bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider border border-indigo-500/30">
            HỆ THỐNG KIẾN TRÚC EDTECH VIỆT NAM
          </span>
          <h2 className="text-2xl md:text-3xl font-black mb-2">
            Sơ Đồ Kỹ Thuật & Luồng Dữ Liệu 🛠️
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
            Mô hình phân tầng FastAPI Backend, PostgreSQL Indexes, React 19 Frontend, Alembic Migrations và Trợ lý Gemini AI Content Generator.
          </p>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-3xl shadow-lg shrink-0">
          🏛️
        </div>
      </div>

      <TechArchBoard />
    </div>
  );
};

export default TechArchPage;
