import React, { useState, useEffect } from 'react';
import { 
  Settings, PlusCircle, Sparkles, CheckCircle2, 
  XCircle, Trash2, Eye, BarChart2, ShieldCheck, 
  BookOpen, Brain, RefreshCw, RotateCcw, TrendingUp, 
  Play, Plus, ArrowRight, HelpCircle, Layers 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Game, AdminStats } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import QuestionRenderer from '../components/QuestionRenderer';
import { playSynthSound } from '../components/game-engines/soundUtils';

interface AdminPageProps {
  games: Game[];
  onRefreshGames: () => Promise<void>;
}

export const AdminPage: React.FC<AdminPageProps> = ({ games, onRefreshGames }) => {
  const { user } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Game[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'ai_gen' | 'create' | 'levels' | 'review' | 'my_games'>('stats');
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
  const [aiGeneratedGame, setAiGeneratedGame] = useState<Game | null>(null);
  const [aiPreviewLevelIdx, setAiPreviewLevelIdx] = useState(0);

  // Dynamic Level Builder state
  const [selectedGameId, setSelectedGameId] = useState(games[0]?.id || 'g1');
  const [levelTitle, setLevelTitle] = useState('');
  const [levelQuestionType, setLevelQuestionType] = useState('matching');
  const [levelPrompt, setLevelPrompt] = useState('Nối các cặp tương ứng với nhau:');
  const [levelPoints, setLevelPoints] = useState(25);
  
  // Matching pairs state
  const [matchingPairs, setMatchingPairs] = useState([
    { left: 'Con Mèo 🐱', right: 'Cat' },
    { left: 'Con Chó 🐶', right: 'Dog' },
    { left: 'Con Chim 🐦', right: 'Bird' },
  ]);

  // Quiz state
  const [quizQuestion, setQuizQuestion] = useState('Con vật nào sau đây biết bay?');
  const [quizOptions, setQuizOptions] = useState(['Con Chó', 'Con Mèo', 'Con Chim', 'Con Cá']);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState(2);

  // Math state
  const [mathExpression, setMathExpression] = useState('35 + 28 = ?');
  const [mathAnswer, setMathAnswer] = useState('63');
  const [mathHint, setMathHint] = useState('Cộng hàng đơn vị 5 + 8 = 13, viết 3 nhớ 1');

  // Sequence state
  const [seqItems, setSeqItems] = useState('2, 4, ?, 8, 10');
  const [seqAnswer, setSeqAnswer] = useState('6');

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

  // Handler: Manual Create Game
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
        playSynthSound('victory');
        await onRefreshGames();
        await fetchData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi khi tạo game' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  // Handler: AI Generate Game
  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập chủ đề bài học cho AI!' });
      return;
    }
    setLoading(true);
    setMsg(null);
    setAiGeneratedGame(null);
    try {
      const res = await api.admin.aiGenerateGame({
        topic: aiTopic,
        template_code: aiTemplate,
        grade_from: parseInt(aiGradeMin, 10) || 2,
        grade_to: parseInt(aiGradeMax, 10) || 4,
        creator_id: user?.id,
        creator_name: user?.name,
      });
      if (res.success && res.game) {
        setAiGeneratedGame(res.game);
        setAiPreviewLevelIdx(0);
        setMsg({ 
          type: 'success', 
          text: `✨ ${res.message} - Game "${res.game.title}" đã được sinh với ${res.game.levels?.length || 1} màn chơi hoàn chỉnh!` 
        });
        playSynthSound('victory');
        await onRefreshGames();
        await fetchData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi sinh game tự động bằng AI' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Dynamic Add Level
  const handleAddLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    let levelData: any = {};
    if (levelQuestionType === 'matching') {
      levelData = { pairs: matchingPairs.filter((p) => p.left && p.right) };
    } else if (levelQuestionType === 'quiz') {
      levelData = {
        question: quizQuestion,
        options: quizOptions,
        correct_index: quizCorrectIndex,
      };
    } else if (levelQuestionType === 'math') {
      levelData = {
        expression: mathExpression,
        answer: mathAnswer,
        hint: mathHint,
      };
    } else if (levelQuestionType === 'sequence') {
      levelData = {
        sequence: seqItems.split(',').map((s) => s.trim()),
        answer: seqAnswer,
      };
    } else {
      levelData = { info: 'Custom Level Data' };
    }

    try {
      const res = await api.admin.addLevel({
        gameId: selectedGameId,
        title: levelTitle || 'Màn chơi mới',
        question: {
          question_type: levelQuestionType,
          prompt: levelPrompt || 'Hoàn thành thử thách sau:',
          points: levelPoints,
          data: levelData,
        },
        creatorId: user?.id,
      });
      if (res.success) {
        setMsg({ type: 'success', text: 'Đã bổ sung màn chơi mới vào game thành công!' });
        setLevelTitle('');
        playSynthSound('victory');
        await onRefreshGames();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi bổ sung màn chơi' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Review Decision
  const handleDecideReview = async (gameId: string, action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      const res = await api.admin.decideReview({ gameId, action });
      if (res.success) {
        setMsg({ type: 'success', text: res.message });
        playSynthSound('victory');
        await onRefreshGames();
        await fetchData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi xử lý kiểm duyệt game' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Delete Game
  const handleDeleteGame = async (gameId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa game này không?')) return;
    setLoading(true);
    try {
      const res = await api.admin.deleteGame(gameId);
      if (res.success) {
        setMsg({ type: 'success', text: res.message });
        playSynthSound('victory');
        await onRefreshGames();
        await fetchData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi xóa game' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Reset Games
  const handleResetGames = async () => {
    if (!window.confirm('Bạn có muốn đặt lại toàn bộ kho game về dữ liệu ban đầu không?')) return;
    setLoading(true);
    try {
      const res = await api.admin.resetGames();
      if (res.success) {
        setMsg({ type: 'success', text: res.message });
        playSynthSound('victory');
        await onRefreshGames();
        await fetchData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi reset game' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Tháng 4', doanh_thu: 350000 },
    { name: 'Tháng 5', doanh_thu: 520000 },
    { name: 'Tháng 6', doanh_thu: 890000 },
    { name: 'Tháng 7', doanh_thu: 1450000 },
    { name: 'Tháng 8', doanh_thu: 2600000 },
  ];

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* 1. Top Header Banner */}
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

      {/* 2. Sub Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'stats', label: 'Thống Kê Tổng Quan', icon: <BarChart2 className="w-4 h-4 text-emerald-500" /> },
          { id: 'ai_gen', label: 'Trợ Lý AI Gemini', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
          { id: 'create', label: 'Tạo Game Mới', icon: <PlusCircle className="w-4 h-4 text-indigo-500" /> },
          { id: 'levels', label: 'Soạn Thảo Màn Chơi', icon: <BookOpen className="w-4 h-4 text-purple-500" /> },
          { id: 'review', label: `Kiểm Duyệt (${reviewQueue.length})`, icon: <ShieldCheck className="w-4 h-4 text-rose-500" /> },
          { id: 'my_games', label: `Kho Game (${games.length})`, icon: <Brain className="w-4 h-4 text-cyan-500" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id as any);
              playSynthSound('click');
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Message Banner */}
      {msg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Sub Tabs Content */}

      {/* Tab 1: Stats & Dashboard */}
      {activeSubTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Tổng Người Dùng</span>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{stats?.totalUsers || 28} Học sinh</h3>
              <span className="text-[11px] text-emerald-600 font-bold mt-2 block">↑ Tăng 12% so với tháng trước</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Tổng Trò Chơi</span>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{stats?.totalGames || games.length} Game</h3>
              <span className="text-[11px] text-indigo-600 font-bold mt-2 block">90+ Màn chơi hoạt động</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Doanh Thu Hệ Thống</span>
              <h3 className="text-2xl font-black text-pink-600 font-mono mt-1">
                {(stats?.totalRevenue || 2600000).toLocaleString('vi-VN')} xu
              </h3>
              <span className="text-[11px] text-emerald-600 font-bold mt-2 block">Chia sẻ 80% tác giả</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Số Lượt Chơi</span>
              <h3 className="text-2xl font-black text-amber-500 font-mono mt-1">{stats?.attemptsCount || 1420} Lượt</h3>
              <span className="text-[11px] text-amber-600 font-bold mt-2 block">Tỷ lệ hoàn thành 92%</span>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>BIỂU ĐỒ DOANH THU & PHÁT TRIỂN NỀN TẢNG</span>
            </h3>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDoanhThu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} />
                  <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString('vi-VN')} xu`, 'Doanh Thu']} />
                  <Area type="monotone" dataKey="doanh_thu" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorDoanhThu)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI Game Studio */}
      {activeSubTab === 'ai_gen' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                TRỢ LÝ AI GEMINI SINH BÀI GIẢNG GAME TỰ ĐỘNG
              </h3>
            </div>

            <form onSubmit={handleAiGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Chủ đề bài học / Mục tiêu sư phạm:
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Ví dụ: Vòng đời của loài ếch, Bảng cửu chương 7..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Loại Game Template:</label>
                <select
                  value={aiTemplate}
                  onChange={(e) => setAiTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  <option value="quiz">Trắc Nghiệm Đố Vui (Quiz)</option>
                  <option value="matching">Nối Cột Ghép Cặp (Matching)</option>
                  <option value="sequence">Điền Dãy Số Quy Luật (Sequence)</option>
                  <option value="math">Giải Toán Tương Tác (Math)</option>
                  <option value="memory">Lật Thẻ Trí Nhớ (Memory)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Từ Lớp:</label>
                  <select
                    value={aiGradeMin}
                    onChange={(e) => setAiGradeMin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Lớp {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Đến Lớp:</label>
                  <select
                    value={aiGradeMax}
                    onChange={(e) => setAiGradeMax(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Lớp {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:opacity-95 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? '🤖 AI Đang Thiết Kế Trò Chơi...' : '✨ SINH TRÒ CHƠI BẰNG AI GEMINI'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* AI Live Preview */}
          {aiGeneratedGame && aiGeneratedGame.levels && aiGeneratedGame.levels.length > 0 && (
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/50">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                    BẢN CHƠI THỬ TRỰC QUAN (LIVE DEMO GAMEPLAY)
                  </span>
                  <h3 className="text-xl font-black">{aiGeneratedGame.title}</h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {aiGeneratedGame.levels.map((lvl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAiPreviewLevelIdx(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        aiPreviewLevelIdx === idx
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Màn {lvl.level_num || idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Render Question Preview */}
              {aiGeneratedGame.levels[aiPreviewLevelIdx]?.questions?.[0] && (
                <div className="text-slate-900">
                  <QuestionRenderer
                    question={aiGeneratedGame.levels[aiPreviewLevelIdx].questions[0]}
                    levelNum={aiGeneratedGame.levels[aiPreviewLevelIdx].level_num || aiPreviewLevelIdx + 1}
                    xpReward={80}
                    coinReward={20}
                    onSuccess={() => alert('🎉 Bạn vừa giải mã thành công màn chơi AI!')}
                    onBack={() => setAiGeneratedGame(null)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Manual Create Game */}
      {activeSubTab === 'create' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            <span>TỰ TAY THIẾT KẾ TRÒ CHƠI MỚI (MANUAL BUILDER)</span>
          </h3>

          <form onSubmit={handleCreateGame} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-600 block mb-1">Tên Trò Chơi:</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Thử Thách Ghép Đôi Siêu Cấp..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-600 block mb-1">Mô Tả Bài Học:</label>
              <textarea
                rows={3}
                required
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Mô tả nội dung rèn luyện kiến thức..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Loại Game Template:</label>
              <select
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
              >
                <option value="matching">Ghép Cặp Cột A-B (Matching)</option>
                <option value="quiz">Trắc Nghiệm Đố Vui (Quiz)</option>
                <option value="sequence">Điền Dãy Số (Sequence)</option>
                <option value="math">Giải Toán Tương Tác (Math)</option>
                <option value="memory">Lật Thẻ Trí Nhớ (Memory)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Thể Loại:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
              >
                <option value="math">Toán Học Logic</option>
                <option value="iq">Tư Duy Não Bộ IQ</option>
                <option value="scratch">Lập Trình Robot Scratch</option>
                <option value="vietnamese">Tiếng Việt</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Giá Bán (Xu - 0 là Miễn Phí):</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold font-mono text-slate-800 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Từ Lớp:</label>
                <select
                  value={gradeMin}
                  onChange={(e) => setGradeMin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map((g) => (
                    <option key={g} value={g}>
                      Lớp {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Đến Lớp:</label>
                <select
                  value={gradeMax}
                  onChange={(e) => setGradeMax(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map((g) => (
                    <option key={g} value={g}>
                      Lớp {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>{loading ? 'Đang tạo game...' : 'TẠO GAME & GỬI KIỂM DUYỆT'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Dynamic Level Builder */}
      {activeSubTab === 'levels' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>SOẠN THẢO BỔ SUNG MÀN CHƠI (DYNAMIC LEVEL BUILDER)</span>
          </h3>

          <form onSubmit={handleAddLevel} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Chọn Game Cần Thêm Màn:</label>
                <select
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Tên Màn Chơi:</label>
                <input
                  type="text"
                  value={levelTitle}
                  onChange={(e) => setLevelTitle(e.target.value)}
                  placeholder="Ví dụ: Màn 2: Thử thách nâng cao"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Loại Câu Hỏi / Game Engine:</label>
                <select
                  value={levelQuestionType}
                  onChange={(e) => setLevelQuestionType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  <option value="matching">Ghép Cặp Nối Cột (Matching)</option>
                  <option value="quiz">Trắc Nghiệm (Quiz)</option>
                  <option value="math">Toán Học Tương Tác (Math)</option>
                  <option value="sequence">Điền Dãy Số (Sequence)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Điểm Thưởng (Points):</label>
                <input
                  type="number"
                  value={levelPoints}
                  onChange={(e) => setLevelPoints(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold font-mono text-slate-800 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Lời Dẫn / Đề Bài:</label>
              <input
                type="text"
                value={levelPrompt}
                onChange={(e) => setLevelPrompt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-hidden"
              />
            </div>

            {/* Dynamic Form per Question Type */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-black text-indigo-700 uppercase tracking-wider block">
                CẤU HÌNH DỮ LIỆU CÂU HỎI ({levelQuestionType.toUpperCase()})
              </span>

              {levelQuestionType === 'matching' && (
                <div className="space-y-2">
                  {matchingPairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Vế A (Trái)"
                        value={pair.left}
                        onChange={(e) => {
                          const updated = [...matchingPairs];
                          updated[idx].left = e.target.value;
                          setMatchingPairs(updated);
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                      />
                      <span className="text-slate-400 font-bold">➔</span>
                      <input
                        type="text"
                        placeholder="Vế B (Phải)"
                        value={pair.right}
                        onChange={(e) => {
                          const updated = [...matchingPairs];
                          updated[idx].right = e.target.value;
                          setMatchingPairs(updated);
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                      />
                      {matchingPairs.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...matchingPairs];
                            updated.splice(idx, 1);
                            setMatchingPairs(updated);
                          }}
                          className="p-2 text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setMatchingPairs([...matchingPairs, { left: '', right: '' }])}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Cặp Nối Mới</span>
                  </button>
                </div>
              )}

              {levelQuestionType === 'quiz' && (
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Câu hỏi:</label>
                    <input
                      type="text"
                      value={quizQuestion}
                      onChange={(e) => setQuizQuestion(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {quizOptions.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct_opt"
                          checked={quizCorrectIndex === oIdx}
                          onChange={() => setQuizCorrectIndex(oIdx)}
                          className="cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...quizOptions];
                            updated[oIdx] = e.target.value;
                            setQuizOptions(updated);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {levelQuestionType === 'math' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Phép tính:</label>
                    <input
                      type="text"
                      value={mathExpression}
                      onChange={(e) => setMathExpression(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Đáp án đúng:</label>
                    <input
                      type="text"
                      value={mathAnswer}
                      onChange={(e) => setMathAnswer(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {levelQuestionType === 'sequence' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Dãy số (phân cách bởi dấu phẩy):</label>
                    <input
                      type="text"
                      value={seqItems}
                      onChange={(e) => setSeqItems(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Đáp án ô trống ?:</label>
                    <input
                      type="text"
                      value={seqAnswer}
                      onChange={(e) => setSeqAnswer(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Đang lưu...' : 'LƯU & BỔ SUNG MÀN CHƠI'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 5: Review Queue */}
      {activeSubTab === 'review' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-500" />
            <span>HÀNG ĐỢI KIỂM DUYỆT NỘI DUNG SƯ PHẠM ({reviewQueue.length})</span>
          </h3>

          {reviewQueue.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 font-medium">
              🎉 Hiện tại không có trò chơi nào đang chờ duyệt. Mọi giáo án đã được xử lý!
            </div>
          ) : (
            <div className="space-y-3">
              {reviewQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-3xl shadow-2xs shrink-0">
                      {item.thumbnail || '🎮'}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{item.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                      <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                        Tác giả: {item.creator_name || 'Giáo viên'} • Lớp {item.grade_from}-{item.grade_to} • {item.levels?.length || 1} màn
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDecideReview(item.id, 'approve')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Duyệt Thông Qua</span>
                    </button>
                    <button
                      onClick={() => handleDecideReview(item.id, 'reject')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Yêu Cầu Sửa</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: My Games Repository */}
      {activeSubTab === 'my_games' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-600" />
            <span>KHO TRÒ CHƠI ĐÃ XUẤT BẢN ({games.length})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {games.map((g) => (
              <div
                key={g.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-3xl shadow-2xs shrink-0">
                    {g.thumbnail || '🎮'}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 line-clamp-1">{g.title}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Lớp {g.grade_from}-{g.grade_to} • {g.levels?.length || 1} Màn • {g.price === 0 ? 'Miễn phí' : `${g.price} xu`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteGame(g.id)}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Xóa trò chơi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
