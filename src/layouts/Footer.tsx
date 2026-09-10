import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Heart, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { paths } from '../routes/paths';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-12 mt-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3 md:col-span-2">
          <Link to={paths.home} className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Brain className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base text-white">IQ Kid Market</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              EdTech AI 2.0
            </span>
          </Link>
          <p className="text-slate-400 max-w-sm leading-relaxed">
            Hệ sinh thái EdTech giáo dục thông minh: Vừa chơi game rèn tư duy logic, vừa học lập trình khối Scratch sáng tạo với động lực ví Sao IQ Napas và AI đồng hành.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-slate-200 text-sm">Khám phá</h4>
          <ul className="space-y-1.5 text-slate-400">
            <li><Link to={paths.marketplace} className="hover:text-white">Chợ Game Trí Tuệ</Link></li>
            <li><Link to={paths.scratch} className="hover:text-white">Lập trình Scratch</Link></li>
            <li><Link to={paths.leaderboard} className="hover:text-white">Bảng Vàng</Link></li>
            <li><Link to={paths.home} className="hover:text-white">Trang chủ</Link></li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-slate-200 text-sm">Địa chỉ & Liên hệ</h4>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>Số 123 Đường Sáng Tạo, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Hotline: 1900 6868 · 0988 123 456</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Email: hotro@iqkidsmarket.vn</span>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Giờ mở cửa: 8:00 - 21:00 (Thứ 2 – Chủ Nhật)</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
        <p>© 2026 IQ Kid Market. Bản quyền thuộc về Đội ngũ Phát triển EdTech.</p>
        <p className="flex items-center gap-1">
          Thiết kế với <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> dành cho học sinh Việt Nam.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
