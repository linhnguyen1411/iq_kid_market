import React, { useState, useEffect } from 'react';
import { 
  Settings, PlusCircle, Sparkles, CheckCircle2, 
  XCircle, Trash2, Eye, BarChart2, ShieldCheck, 
  BookOpen, Brain, RefreshCw, RotateCcw, TrendingUp 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Game, AdminStats } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface AdminPageProps {
  games: Game[];
  onRefreshGames: () => Promise<void>;
}

export const AdminPage: React.FC<AdminPageProps> = ({ games, onRefreshGames }) => {
  const { user } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Game[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'ai_gen' | 'review' | 'levels' | 'my_games' | 'stats'>('create');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Manual Create Game state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('20000');
  const [templateCode, setTemplateCode] = useState('matching');
  const [category, setCategory] = useState('math');
  const [gradeMin, setGradeMin] = useState('1');
  const [gradeMax, setGradeMax] = useState('3');

  // AI Generator state
  const [aiTopic, setAiTopic] = useState('Khám phá các hành tinh trong Hệ Mặt Trời 🪐');
  const [aiTemplate, setAiTemplate] = useState('quiz');
  const [aiGradeMin, setAiGradeMin] = useState('2');
  const [aiGradeMax, setAiGradeMax] = useState('4');

  // Add Level state
  const [selectedGameId, setSelectedGameId] = useState(games[0]?.id || 'g1');
  const [levelTitle, setLevelTitle] = useState('');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [matchingPairs, setMatchingPairs] = useState([
    { left: 'Con Mèo 🐱', right: 'Cat' },
    { left: 'Con Chó 🐶', right: 'Dog' },
    { left: 'Con Chim 🐦', right: 'Bird' },
  ]);

  const fetchData = async () => {
    try {
      const [statsData, queueData] = await Promise.all([
        api.admin.getStats().catch(() => null),
        api.admin.getReviewQueue().catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      setReviewQueue(queueData);
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu admin:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.createGame({
        title,
        description: desc,
        price: parseInt(price, 10) || 0,
        grade_from: parseInt(gradeMin, 10) || 1,
        grade_to: parseInt(gradeMax, 10) || 3,
        template_code: templateCode,
        category,
        creatorId: user?.id,
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Tạo game mới thành công! Game đã được thêm vào hàng đợi kiểm duyệt.' });
        setTitle('');
        setDesc('');
        await onRefreshGames();
        await fetchData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi khi tạo game' });
    } finally {
      setLoading(false);
    }
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.aiGenerateGame({
        topic: aiTopic,
        template_code: aiTemplate,
        grade_from: parseInt(aiGradeMin, 10) || 2,
        grade_to: parseInt(aiGradeMax, 10) || 4,
        creator_id: user?.id,
        creator_name: user?.name,
      });
      if (res.success) {
        setMsg({ type: 'success', text: `✨ ${res.message} - Game "${res.game.title}" đã được sinh với ${res.game.levels?.length} màn chơi!` });
        await onRefreshGames();
        await fetchData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi sinh game tự động bằng AI' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.addLevel({
        gameId: selectedGameId,
        title: levelTitle || 'Màn chơi mới',
        question: {
          question_type: 'matching',
          prompt: questionPrompt || 'Nối các cặp tương ứng với nhau',
          points: 25,
          data: {
            pairs: matchingPairs.filter((p) => p.left && p.right),
          },
        },
        creatorId: user?.id,
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Đã bổ sung màn chơi mới vào game thành công!' });
        setLevelTitle('');
        setQuestionPrompt('');
        await onRefreshGames();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi bổ sung màn chơi' });
    } finally {
      setLoading(false);
    }
  };

  const handleDecideReview = async (gameId: string, action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      const res = await api.admin.decideReview({ gameId, action });
      if (res.success) {
        setMsg({ type: 'success', text: res.message });
        await onRefreshGames();
        await fetchData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi xử lý kiểm duyệt game' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa game này không?')) return;
    setLoading(true);
    try {
      const res = await api.admin.deleteGame(gameId);
      if (res.success) {
        setMsg({ type: 'success', text: res.message });
        await onRefreshGames();
        await fetchData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi xóa game' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetGames = async () => {
    if (!window.confirm('Bạn có muốn đặt lại toàn bộ kho game về dữ liệu ban đầu không?')) return;
    setLoading(true);
    try {
      const res = await api.admin.resetGames();
      if (res.success) {
        setMsg({ type: 'success', text: res.message });
        await onRefreshGames();
        await fetchData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi reset game' });
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: '20Q4', doanh_thu: 300000 },
    { name: '21Q1', doanh_thu: 450000 },
    { name: '21Q2', doanh_thu: 890000 },
    { name: '21Q3', doanh_thu: 1500000 },
    { name: '21Q4', doanh_thu: 2600000 },
  ];

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider text-indigo-300">
            <Settings className="w-3.5 h-3.5" />
            STUDIO SÁNG TẠO & QUẢN TRỊ NỘI DUNG
          </span>
          <h2 className="text-2xl md:text-3xl font-black mb-2">
            Studio Thiết Kế Trò Chơi Trí Tuệ 🎨
          </h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-xl">
            Công cụ dành riêng cho Giáo viên & Quản trị viên: Tự tay thiết kế màn chơi, ứng dụng AI Gemini tự động sinh câu hỏi và kiểm duyệt nội dung học đường.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <button
              onClick={handleResetGames}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Dữ Liệu Gốc</span>
            </button>
          )}
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-3xl shadow-lg shrink-0">
            🛠️
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'create', label: 'Tạo Game Thủ Công', icon: <PlusCircle className="w-4 h-4" /> },
          { id: 'ai_gen', label: 'Sinh Game Bằng AI Gemini', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
          { id: 'levels', label: 'Thêm Màn Chơi', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'my_games', label: `Kho Game (${games.length})`, icon: <Brain className="w-4 h-4" /> },
          { id: 'review', label: `Hàng Đợi Duyệt (${reviewQueue.length})`, icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'stats', label: 'Thống Kê & Doanh Thu', icon: <BarChart2 className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id as any);
              setMsg(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Alert Message */}
      {msg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Tab 1: Create Game */}
      {activeSubTab === 'create' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs max-w-3xl">
          <h3 className="text-base font-black text-slate-800 mb-1">TẠO TRÒ CHƠI MỚI THỦ CÔNG</h3>
          <p className="text-xs text-slate-400 mb-6">Điền các thông số cơ bản để khởi tạo game lên marketplace</p>

          <form onSubmit={handleCreateGame} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tiêu đề trò chơi</label>
              <input
                type="text"
                required
                placeholder="VD: Khám Phá Thế Giới Phép Thuật Toán Học"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mô tả ngắn gọn</label>
              <textarea
                rows={3}
                required
                placeholder="Mô tả mục tiêu học tập và đối tượng học sinh..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Thể loại</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
                >
                  <option value="math">Toán Học Logic</option>
                  <option value="iq">Tư Duy IQ</option>
                  <option value="scratch">Lập Trình Scratch</option>
                  <option value="vietnamese">Tiếng Việt & Ngôn Ngữ</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Dạng trò chơi</label>
                <select
                  value={templateCode}
                  onChange={(e) => setTemplateCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
                >
                  <option value="matching">Ghép Cặp Tương Ứng (Matching)</option>
                  <option value="math">Điền Số Quy Luật (Sequence)</option>
                  <option value="quiz">Trắc Nghiệm Đố Vui (Quiz)</option>
                  <option value="scratch">Lập Trình Kéo Thả (Scratch)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Giá bán (xu)</label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Khối lớp từ</label>
                <select
                  value={gradeMin}
                  onChange={(e) => setGradeMin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Đến khối lớp</label>
                <select
                  value={gradeMax}
                  onChange={(e) => setGradeMax(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{loading ? 'Đang tạo game...' : 'TẠO GAME MỚI'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: AI Generator */}
      {activeSubTab === 'ai_gen' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">SINH GAME TỰ ĐỘNG BẰNG GEMINI AI</h3>
              <p className="text-xs text-slate-400">Trợ lý AI sẽ tự động tạo trọn bộ 3 màn chơi kèm câu hỏi logic chuẩn EdTech</p>
            </div>
          </div>

          <form onSubmit={handleAiGenerate} className="space-y-4 mt-6">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Chủ đề bài học (Topic Prompt)</label>
              <input
                type="text"
                required
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mẫu game</label>
                <select
                  value={aiTemplate}
                  onChange={(e) => setAiTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
                >
                  <option value="quiz">Trắc Nghiệm Đố Vui (Quiz)</option>
                  <option value="matching">Ghép Cặp (Matching)</option>
                  <option value="math">Điền Số Quy Luật (Sequence)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Từ lớp</label>
                <select
                  value={aiGradeMin}
                  onChange={(e) => setAiGradeMin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
                >
                  {[1, 2, 3, 4, 5].map((g) => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Đến lớp</label>
                <select
                  value={aiGradeMax}
                  onChange={(e) => setAiGradeMax(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
                >
                  {[1, 2, 3, 4, 5].map((g) => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'AI đang thiết kế câu hỏi...' : 'SINH GAME BẰNG AI NGAY'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Add Level */}
      {activeSubTab === 'levels' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs max-w-3xl">
          <h3 className="text-base font-black text-slate-800 mb-1">BỔ SUNG MÀN CHƠI MỚI (LEVEL CREATOR)</h3>
          <p className="text-xs text-slate-400 mb-6">Thêm màn thử thách vào trò chơi đã tạo</p>

          <form onSubmit={handleAddLevel} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Chọn trò chơi</label>
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id}>{g.title} ({g.levels?.length || 0} màn)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tiêu đề màn chơi</label>
              <input
                type="text"
                required
                placeholder="VD: Màn 2: Nhận biết loài vật"
                value={levelTitle}
                onChange={(e) => setLevelTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Đề bài câu hỏi</label>
              <input
                type="text"
                required
                placeholder="VD: Em hãy nối từ tiếng Anh với hình ảnh đúng:"
                value={questionPrompt}
                onChange={(e) => setQuestionPrompt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-hidden focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Các cặp ghép (Matching Pairs)</label>
              <div className="space-y-2">
                {matchingPairs.map((pair, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={`Cột Trái ${idx + 1}`}
                      value={pair.left}
                      onChange={(e) => {
                        const next = [...matchingPairs];
                        next[idx].left = e.target.value;
                        setMatchingPairs(next);
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-hidden"
                    />
                    <input
                      type="text"
                      placeholder={`Cột Phải ${idx + 1}`}
                      value={pair.right}
                      onChange={(e) => {
                        const next = [...matchingPairs];
                        next[idx].right = e.target.value;
                        setMatchingPairs(next);
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-hidden"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>BỔ SUNG MÀN CHƠI</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: My Games Management */}
      {activeSubTab === 'my_games' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            <span>DANH SÁCH GAME ĐÃ TẠO</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((g) => (
              <div
                key={g.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{g.thumbnail || '🎮'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {g.levels?.length || 0} Màn
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 mb-1">{g.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{g.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-pink-600">{g.price} xu</span>
                  {!g.is_seed && (
                    <button
                      onClick={() => handleDeleteGame(g.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Xóa game này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Review Queue */}
      {activeSubTab === 'review' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>HÀNG ĐỢI KIỂM DUYỆT TRÒ CHƠI</span>
          </h3>

          <div className="flex flex-col gap-3">
            {reviewQueue.map((game) => (
              <div
                key={game.id}
                className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{game.thumbnail || '🎮'}</span>
                    <h4 className="text-sm font-black text-slate-800">{game.title}</h4>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Chờ duyệt
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{game.description}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Tác giả: {game.creator_name || game.creator_id || 'Chưa rõ'} • Giá: {game.price} xu
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDecideReview(game.id, 'approve')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Duyệt Game</span>
                  </button>
                  <button
                    onClick={() => handleDecideReview(game.id, 'reject')}
                    className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Từ chối</span>
                  </button>
                </div>
              </div>
            ))}

            {reviewQueue.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                Hàng đợi kiểm duyệt hiện tại đang trống!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Stats & Recharts Graph */}
      {activeSubTab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stats Cards (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Tổng Thành Viên</span>
              <span className="text-3xl font-black text-indigo-600">{stats?.totalUsers || 0}</span>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Tổng Số Game</span>
              <span className="text-3xl font-black text-purple-600">{stats?.totalGames || games.length}</span>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Lượt Thử Sức</span>
              <span className="text-3xl font-black text-amber-600">{stats?.attemptsCount || 0}</span>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Doanh Thu Hệ Thống</span>
              <span className="text-2xl font-black text-emerald-600">
                {(stats?.totalRevenue || 0).toLocaleString('vi-VN')} xu
              </span>
            </div>
          </div>

          {/* Recharts AreaChart (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-pink-500" />
              <span>TĂNG TRƯỞNG DOANH THU HỆ THỐNG</span>
            </h4>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDoanhThu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="doanh_thu"
                    stroke="#ec4899"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorDoanhThu)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-2">
              Doanh số giao dịch phát sinh tự động khi phụ huynh nạp xu cho con
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
