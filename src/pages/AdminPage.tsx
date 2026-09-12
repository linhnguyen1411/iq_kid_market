import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, PlusCircle, Sparkles, CheckCircle2, 
  XCircle, Trash2, Eye, BarChart2, ShieldCheck, 
  BookOpen, Brain, RefreshCw, RotateCcw, TrendingUp, 
  Play, Plus, ArrowRight, HelpCircle, Layers, Download, Upload, Pencil, Award, AlertTriangle, Copy,
  Cpu, Database, Check
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Game, AdminStats, QualityReportOut, DuplicateCheckOut, AiBatchGenerateQuestionsOut } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import QuestionRenderer from '../components/QuestionRenderer';
import { playSynthSound } from '../components/game-engines/soundUtils';
import { TEXT_PACK_TEMPLATES, DEFAULT_LEVEL_COUNT, FREE_LEVEL_COUNT } from '../lib/gameAccess';

interface AdminPageProps {
  games: Game[];
  onRefreshGames: () => Promise<void>;
}

type StudioTab = 'stats' | 'ai_gen' | 'import_pack' | 'create' | 'levels' | 'review' | 'my_games';

export const AdminPage: React.FC<AdminPageProps> = ({ games, onRefreshGames }) => {
  const { user, authToken, openAuthModal } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Game[]>([]);
  const [myGames, setMyGames] = useState<Game[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<StudioTab>('stats');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [editingLevelNum, setEditingLevelNum] = useState<number | null>(null);
  const [selectedQualityReport, setSelectedQualityReport] = useState<QualityReportOut | null>(null);
  const [loadingQualityReport, setLoadingQualityReport] = useState(false);
  const [selectedDuplicateCheck, setSelectedDuplicateCheck] = useState<DuplicateCheckOut | null>(null);
  const [loadingDuplicateCheck, setLoadingDuplicateCheck] = useState(false);

  // Manual Create Game state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('20000');
  const [templateCode, setTemplateCode] = useState('matching');
  const [category, setCategory] = useState('math');
  const [gradeMin, setGradeMin] = useState('1');
  const [gradeMax, setGradeMax] = useState('3');

  // AI Generator state (admin only)
  const [aiTopic, setAiTopic] = useState('Khám phá các hành tinh trong Hệ Mặt Trời 🪐');
  const [aiTemplate, setAiTemplate] = useState('quiz');
  const [aiGradeMin, setAiGradeMin] = useState('2');
  const [aiGradeMax, setAiGradeMax] = useState('4');
  const [aiGeneratedGame, setAiGeneratedGame] = useState<Game | null>(null);
  const [aiPreviewLevelIdx, setAiPreviewLevelIdx] = useState(0);

  // Phase 8: Admin AI Content Factory state
  const [factoryTopic, setFactoryTopic] = useState('Phép cộng có nhớ trong phạm vi 100');
  const [factoryTemplate, setFactoryTemplate] = useState('math');
  const [factoryGrade, setFactoryGrade] = useState(2);
  const [factoryCategory, setFactoryCategory] = useState('math');
  const [factoryCount, setFactoryCount] = useState(3);
  const [factorySaveToBank, setFactorySaveToBank] = useState(true);
  const [factoryLoading, setFactoryLoading] = useState(false);
  const [factoryResult, setFactoryResult] = useState<AiBatchGenerateQuestionsOut | null>(null);


  // Import pack (teacher/creator)
  const [packTemplate, setPackTemplate] = useState('quiz');
  const [packTopic, setPackTopic] = useState('Toán nhanh lớp 1');
  const [packGradeMin, setPackGradeMin] = useState('1');
  const [packGradeMax, setPackGradeMax] = useState('1');
  const [packJson, setPackJson] = useState('');
  const [packPreview, setPackPreview] = useState<any | null>(null);

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

  const fetchMyGames = async () => {
    if (!user?.id) {
      setMyGames([]);
      return;
    }
    try {
      if (user.role === 'admin') {
        const inventory = await api.admin.getGameInventory('all');
        setMyGames(
          (Array.isArray(inventory) ? inventory : []).filter((g: Game) => !g.is_seed),
        );
      } else {
        const data = await api.games.getGames({
          creatorId: user.id,
          includePending: true,
        });
        setMyGames(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Lỗi khi tải kho game của tôi:', err);
    }
  };

  const fetchData = async () => {
    try {
      const statsPromise = api.admin.getStats().catch(() => null);
      const queuePromise =
        user?.role === 'admin'
          ? api.admin.getReviewQueue().catch(() => [])
          : Promise.resolve([]);
      const [statsData, queueData] = await Promise.all([statsPromise, queuePromise]);
      if (statsData) setStats(statsData);
      setReviewQueue(
        (Array.isArray(queueData) ? queueData : []).filter(
          (g: Game) => g.review_status === 'pending_review',
        ),
      );
      await fetchMyGames();
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu admin:', err);
    }
  };

  const editableGames = useMemo(() => {
    return myGames.filter((g) => {
      if (g.is_seed) return false;
      if (isAdmin) return true;
      return g.creator_id === user?.id;
    });
  }, [myGames, isAdmin, user?.id]);

  const canEditGame = (game: Game) => {
    if (game.is_seed) return false;
    if (isAdmin) return true;
    return game.creator_id === user?.id;
  };

  const reviewStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'Chờ duyệt';
      case 'approved':
        return 'Đã duyệt';
      case 'rejected':
        return 'Cần sửa';
      default:
        return status;
    }
  };

  const reviewStatusClass = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const resetGameForm = () => {
    setEditingGameId(null);
    setTitle('');
    setDesc('');
    setPrice('20000');
    setTemplateCode('matching');
    setCategory('math');
    setGradeMin('1');
    setGradeMax('3');
  };

  const openEditGame = (game: Game) => {
    if (!canEditGame(game)) return;
    setEditingGameId(game.id);
    setTitle(game.title);
    setDesc(game.description || '');
    setPrice(String(game.price ?? 0));
    setTemplateCode(game.template_code);
    setCategory(game.category);
    setGradeMin(String(game.grade_from));
    setGradeMax(String(game.grade_to));
    setActiveSubTab('create');
    playSynthSound('click');
  };

  const openEditPack = (game: Game) => {
    if (!canEditGame(game)) return;
    const pack = {
      id: game.id,
      title: game.title,
      description: game.description,
      detailed_description: game.detailed_description,
      template_code: game.template_code,
      category: game.category,
      price: game.price,
      grade_from: game.grade_from,
      grade_to: game.grade_to,
      thumbnail: game.thumbnail,
      levels: game.levels,
    };
    setPackJson(JSON.stringify(pack, null, 2));
    setPackPreview(pack);
    setActiveSubTab('import_pack');
    setMsg({
      type: 'success',
      text: `Đã nạp JSON game "${game.title}". Sửa và Import lại để cập nhật (giữ nguyên id).`,
    });
    playSynthSound('click');
  };

  const loadLevelIntoForm = (level: any, template: string) => {
    setLevelTitle(level.title || '');
    const q = level.questions?.[0];
    if (!q) return;
    const qType = q.question_type || template;
    setLevelQuestionType(qType);
    setLevelPrompt(q.prompt || '');
    setLevelPoints(q.points || 25);
    const data = q.data || {};
    if (qType === 'matching') {
      setMatchingPairs(data.pairs?.length ? data.pairs : [{ left: '', right: '' }]);
    } else if (qType === 'quiz') {
      const opts = data.options || ['', '', '', ''];
      setQuizQuestion(data.question || q.prompt || '');
      setQuizOptions(opts);
      if (typeof data.correct_index === 'number') {
        setQuizCorrectIndex(data.correct_index);
      } else if (data.answer) {
        const idx = opts.findIndex(
          (o: string) => o === data.answer || String(o).startsWith(String(data.answer)),
        );
        setQuizCorrectIndex(idx >= 0 ? idx : 0);
      }
    } else if (qType === 'math') {
      setMathExpression(data.expression || '');
      setMathAnswer(String(data.answer ?? ''));
      setMathHint(data.hint || '');
    } else if (qType === 'sequence') {
      setSeqItems((data.sequence || []).join(', '));
      setSeqAnswer(String(data.answer ?? ''));
    }
  };

  const clearLevelEdit = () => {
    setEditingLevelNum(null);
    setLevelTitle('');
    setLevelPrompt('Nối các cặp tương ứng với nhau:');
    setLevelPoints(25);
  };

  useEffect(() => {
    fetchData();
  }, [user?.role, user?.id]);

  useEffect(() => {
    if (editableGames.length > 0 && !editableGames.some((g) => g.id === selectedGameId)) {
      setSelectedGameId(editableGames[0].id);
      clearLevelEdit();
    }
  }, [editableGames, selectedGameId]);

  useEffect(() => {
    if (activeSubTab === 'ai_gen' && user && user.role !== 'admin') {
      setActiveSubTab('import_pack');
    }
    if (activeSubTab === 'review' && user && user.role !== 'admin') {
      setActiveSubTab('my_games');
    }
  }, [activeSubTab, user]);

  // Handler: Manual Create / Update Game
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const payload = {
        title,
        description: desc,
        price: parseInt(price, 10) || 0,
        grade_from: parseInt(gradeMin, 10) || 1,
        grade_to: parseInt(gradeMax, 10) || 3,
        category,
      };

      if (editingGameId) {
        const res = await api.admin.updateGame(editingGameId, payload);
        if (res.success) {
          setMsg({
            type: 'success',
            text:
              res.message?.trim() ||
              'Cập nhật game thành công! Game đã được gửi lại hàng đợi kiểm duyệt (nếu là giáo viên).',
          });
          resetGameForm();
          playSynthSound('victory');
          await onRefreshGames();
          await fetchData();
        }
      } else {
        const res = await api.admin.createGame({
          ...payload,
          template_code: templateCode,
          creatorId: user?.id,
        });
        if (res.success) {
          setMsg({
            type: 'success',
            text:
              res.message?.trim() ||
              'Tạo game mới thành công! Game đã được thêm vào hàng đợi kiểm duyệt.',
          });
          resetGameForm();
          playSynthSound('victory');
          await onRefreshGames();
          await fetchData();
        }
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi khi lưu game' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  // Handler: AI Generate Game (admin only)
  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setMsg({ type: 'error', text: 'Chỉ tài khoản admin được dùng Trợ lý AI Gemini.' });
      return;
    }
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
        const levelCount = res.game.levels?.length || 0;
        setMsg({
          type: 'success',
          text:
            res.message?.trim() ||
            `✨ Đã sinh game "${res.game.title}" với ${levelCount} màn chơi hoàn chỉnh!`,
        });
        playSynthSound('victory');
        await onRefreshGames();
        await fetchData();
      } else {
        setMsg({ type: 'error', text: 'AI không trả về game hợp lệ. Vui lòng thử lại.' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi sinh game tự động bằng AI' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Phase 8 Admin AI Content Factory (Batch Generation with Algorithmic Verification)
  const handleBatchGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setMsg({ type: 'error', text: 'Chỉ tài khoản admin được dùng Admin AI Content Factory.' });
      return;
    }
    if (!factoryTopic.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập chủ đề câu hỏi cho AI Factory!' });
      return;
    }
    setFactoryLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.batchGenerateAiQuestions({
        topic: factoryTopic.trim(),
        template_code: factoryTemplate,
        count: factoryCount,
        grade: factoryGrade,
        category: factoryCategory,
        save_to_bank: factorySaveToBank,
      });
      setFactoryResult(res);
      playSynthSound('victory');
      setMsg({
        type: 'success',
        text: `Đã sinh thành công ${res.total_generated} câu hỏi (${res.total_verified} câu đạt chuẩn thẩm định thuật toán, ${res.saved_to_bank_count} lưu vào Ngân hàng câu hỏi)!`,
      });
      await onRefreshGames();
      await fetchData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Lỗi khi sinh lô câu hỏi từ AI Factory' });
      playSynthSound('incorrect');
    } finally {
      setFactoryLoading(false);
    }
  };


  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSamplePack = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const sample = await api.admin.exportSamplePack({
        template_code: packTemplate,
        topic: packTopic,
        grade_from: parseInt(packGradeMin, 10) || 1,
        grade_to: parseInt(packGradeMax, 10) || 3,
        category: 'iq',
      });
      const { _meta, ...pack } = sample;
      setPackPreview(pack);
      setPackJson(JSON.stringify(pack, null, 2));
      downloadJson(pack, `iqkids-sample-${packTemplate}-1cau.json`);
      setMsg({
        type: 'success',
        text: `Đã tải mẫu 1 câu hỏi. Khi import sẽ nhân bản đủ ${DEFAULT_LEVEL_COUNT} màn (${FREE_LEVEL_COUNT} free).`,
      });
      playSynthSound('victory');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Không tải được mẫu JSON' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleImportPack = async () => {
    setLoading(true);
    setMsg(null);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(packJson);
      } catch {
        throw new Error('JSON không hợp lệ. Kiểm tra lại cú pháp.');
      }
      const res = await api.admin.uploadGamePack(parsed);
      if (res.success) {
        setMsg({
          type: 'success',
          text: res.message || `Đã import ${res.count} game vào hàng đợi kiểm duyệt.`,
        });
        playSynthSound('victory');
        await onRefreshGames();
        await fetchData();
        setActiveSubTab('my_games');
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Import pack thất bại' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handlePackFileUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      JSON.parse(text); // validate
      setPackJson(text);
      setPackPreview(JSON.parse(text));
      setMsg({ type: 'success', text: `Đã nạp file ${file.name}. Bấm Import để gửi lên hệ thống.` });
    } catch {
      setMsg({ type: 'error', text: 'File JSON không hợp lệ.' });
    }
  };

  // Handler: Dynamic Add / Update Level
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
        answer: quizOptions[quizCorrectIndex],
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

    const questionPayload = {
      question_type: levelQuestionType,
      prompt: levelPrompt || 'Hoàn thành thử thách sau:',
      points: levelPoints,
      data: levelData,
    };

    try {
      if (editingLevelNum != null) {
        const res = await api.admin.updateLevel(selectedGameId, editingLevelNum, {
          title: levelTitle || `Màn ${editingLevelNum}`,
          question: questionPayload,
        });
        if (res.success) {
          setMsg({ type: 'success', text: `Đã cập nhật màn ${editingLevelNum} thành công!` });
          clearLevelEdit();
          playSynthSound('victory');
          await onRefreshGames();
          await fetchMyGames();
        }
      } else {
        const res = await api.admin.addLevel({
          gameId: selectedGameId,
          title: levelTitle || 'Màn chơi mới',
          question: questionPayload,
          creatorId: user?.id,
        });
        if (res.success) {
          setMsg({ type: 'success', text: 'Đã bổ sung màn chơi mới vào game thành công!' });
          setLevelTitle('');
          playSynthSound('victory');
          await onRefreshGames();
          await fetchMyGames();
        }
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi lưu màn chơi' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Review Decision
  const handleViewQualityReport = async (gameId: string) => {
    try {
      setLoadingQualityReport(true);
      const report = await api.admin.getGameQualityReport(gameId);
      setSelectedQualityReport(report);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Không thể tải báo cáo chất lượng sư phạm' });
    } finally {
      setLoadingQualityReport(false);
    }
  };

  const handleCheckDuplicates = async (gameId: string) => {
    try {
      setLoadingDuplicateCheck(true);
      const result = await api.admin.checkGameDuplicates(gameId);
      setSelectedDuplicateCheck(result);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Không thể kiểm tra đối soát trùng lặp' });
    } finally {
      setLoadingDuplicateCheck(false);
    }
  };

  const handleDecideReview = async (gameId: string, action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      const res = await api.admin.decideReview({ gameId, action });
      if (res.success) {
        setMsg({
          type: 'success',
          text: res.message?.trim() || (action === 'approve' ? 'Đã duyệt game thành công!' : 'Đã từ chối game.'),
        });
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

  if (!authToken || !user) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-indigo-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">🔐</div>
        <h2 className="mb-2 text-xl font-black text-slate-800">Cần đăng nhập</h2>
        <p className="mb-5 text-sm text-slate-500">
          Studio sáng tạo chỉ mở khi bạn đăng nhập bằng tài khoản giáo viên / admin.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Đăng nhập để tiếp tục
        </button>
      </div>
    );
  }

  if (!['admin', 'teacher', 'creator'].includes(user.role)) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-3xl">🚫</div>
        <h2 className="mb-2 text-xl font-black text-slate-800">Không đủ quyền truy cập</h2>
        <p className="text-sm text-slate-500">
          Tài khoản <strong>@{user.username}</strong> ({user.role}) không được phép vào Studio CMS.
        </p>
      </div>
    );
  }

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
            Công cụ dành riêng cho Giáo viên & Quản trị viên: thiết kế màn chơi, import pack JSON 20 màn
            {isAdmin ? ', trợ lý AI Gemini' : ''} và kiểm duyệt nội dung học đường.
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
        {([
          { id: 'stats' as const, label: 'Thống Kê Tổng Quan', icon: <BarChart2 className="w-4 h-4 text-emerald-500" />, roles: ['admin', 'teacher', 'creator'] },
          { id: 'ai_gen' as const, label: 'Trợ Lý AI Gemini', icon: <Sparkles className="w-4 h-4 text-amber-500" />, roles: ['admin'] },
          { id: 'import_pack' as const, label: 'Export / Import Pack', icon: <Upload className="w-4 h-4 text-teal-500" />, roles: ['admin', 'teacher', 'creator'] },
          { id: 'create' as const, label: 'Tạo Game Mới', icon: <PlusCircle className="w-4 h-4 text-indigo-500" />, roles: ['admin', 'teacher', 'creator'] },
          { id: 'levels' as const, label: 'Soạn Thảo Màn Chơi', icon: <BookOpen className="w-4 h-4 text-purple-500" />, roles: ['admin', 'teacher', 'creator'] },
          { id: 'review' as const, label: `Kiểm Duyệt (${reviewQueue.length})`, icon: <ShieldCheck className="w-4 h-4 text-rose-500" />, roles: ['admin'] },
          { id: 'my_games' as const, label: `Kho Game (${myGames.length})`, icon: <Brain className="w-4 h-4 text-cyan-500" />, roles: ['admin', 'teacher', 'creator'] },
        ] as const)
          .filter((tab) => tab.roles.includes((user?.role || '') as any))
          .map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id);
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

      {/* Message Banner — fixed toast so luôn nhìn thấy nội dung */}
      {msg && (
        <div
          role="status"
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-[80] max-w-lg w-[calc(100%-2rem)] p-4 rounded-2xl border text-sm font-bold flex items-start gap-3 shadow-xl ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <span className="flex-1 leading-relaxed whitespace-pre-wrap">
            {msg.text?.trim() || (msg.type === 'success' ? 'Thao tác thành công!' : 'Có lỗi xảy ra.')}
          </span>
          <button
            type="button"
            onClick={() => setMsg(null)}
            className="text-slate-400 hover:text-slate-700 shrink-0"
            aria-label="Đóng thông báo"
          >
            <XCircle className="w-5 h-5" />
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

      {/* Tab 2: AI Game Studio — admin only */}
      {activeSubTab === 'ai_gen' && isAdmin && (
        <div className="space-y-6">
          {/* Phase 8: Admin AI Content Factory (Batch Generation & Deterministic Verification) */}
          <div className="bg-white p-6 rounded-3xl border border-indigo-200/80 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cpu className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    AI CONTENT FACTORY & THẨM ĐỊNH XÁC ĐỊNH
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                      PHASE 8
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sinh lô câu hỏi có kiểm soát (1-5 câu) • Thẩm định thuật toán xác định qua Safe AST parser • Không để AI tự ý quyết định
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                Question Bank Integration
              </span>
            </div>

            <form onSubmit={handleBatchGenerateQuestions} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Chủ đề / Yêu cầu sư phạm:
                </label>
                <input
                  type="text"
                  value={factoryTopic}
                  onChange={(e) => setFactoryTopic(e.target.value)}
                  placeholder="Ví dụ: Phép nhân trong bảng cửu chương 6, Nhận diện danh từ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Game Engine (Loại câu):</label>
                <select
                  value={factoryTemplate}
                  onChange={(e) => setFactoryTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  <option value="math">Giải Toán (Math - AST verified)</option>
                  <option value="quiz">Trắc Nghiệm (Quiz - Option containment)</option>
                  <option value="matching">Ghép Cặp (Matching - Pair balance)</option>
                  <option value="sequence">Dãy Số Quy Luật (Sequence)</option>
                  <option value="sorting">Sắp Xếp Quy Trình (Sorting)</option>
                  <option value="memory">Thẻ Nhớ (Memory)</option>
                  <option value="language">Ngôn Ngữ & Tiếng Việt (Language)</option>
                  <option value="observation">Quan Sát Nhanh (Observation)</option>
                  <option value="flashcard">Thẻ Học Thông Minh (Flashcard)</option>
                  <option value="coding">Tư Duy Lập Trình (Coding)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Cấp độ Lớp:</label>
                <select
                  value={factoryGrade}
                  onChange={(e) => setFactoryGrade(Number(e.target.value))}
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
                <label className="text-xs font-bold text-slate-600 block mb-1">Thể loại:</label>
                <select
                  value={factoryCategory}
                  onChange={(e) => setFactoryCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  <option value="math">Toán Học (Math)</option>
                  <option value="iq">Tư Duy IQ (Logic)</option>
                  <option value="science">Khoa Học (Science)</option>
                  <option value="language">Ngôn Ngữ (Language)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Số lượng (Strict Batch Limit: 1 - 5):
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={factoryCount}
                  onChange={(e) => setFactoryCount(Math.min(5, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={factorySaveToBank}
                    onChange={(e) => setFactorySaveToBank(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Tự động lưu câu hỏi đạt chuẩn thẩm định vào Question Bank hệ thống (<code className="text-indigo-600 font-mono">visibility: system</code>)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={factoryLoading}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
                >
                  <Cpu className="w-4 h-4" />
                  <span>{factoryLoading ? '🤖 Đang Sinh & Thẩm Định...' : '🏭 CHẠY AI FACTORY & THẨM ĐỊNH'}</span>
                </button>
              </div>
            </form>

            {/* Results Panel */}
            {factoryResult && (
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Yêu Cầu</span>
                    <span className="text-lg font-black text-slate-700">{factoryResult.total_requested} câu</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Đã Sinh</span>
                    <span className="text-lg font-black text-slate-700">{factoryResult.total_generated} câu</span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200/70 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block">Đạt Thẩm Định</span>
                    <span className="text-lg font-black text-emerald-700">{factoryResult.total_verified} câu</span>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-200/70 text-center">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 block">Lưu Question Bank</span>
                    <span className="text-lg font-black text-indigo-700">{factoryResult.saved_to_bank_count} câu</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    DANH SÁCH CÂU HỎI THẨM ĐỊNH THUẬT TOÁN:
                  </h4>
                  {factoryResult.items.map((it) => (
                    <div
                      key={it.index}
                      className={`p-4 rounded-2xl border transition-all ${
                        it.is_verified
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            #{it.index}
                          </span>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 uppercase">
                            {it.question_type}
                          </span>
                          {it.is_verified ? (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ĐẠT THẨM ĐỊNH XÁC ĐỊNH
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-rose-700 flex items-center gap-1 bg-rose-100 px-2.5 py-0.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              TỪ CHỐI THẨM ĐỊNH: {it.error_message}
                            </span>
                          )}
                        </div>

                        {it.saved_question_id && (
                          <span className="text-[11px] font-mono font-bold text-indigo-600 bg-white px-2.5 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            ID: {it.saved_question_id}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-800 mb-2">
                        {it.prompt}
                      </p>

                      <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 text-[11px] font-mono text-slate-700 overflow-x-auto">
                        <pre>{JSON.stringify(it.data, null, 2)}</pre>
                      </div>

                      {it.normalized_hash && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                          <span>Normalized Hash: {it.normalized_hash}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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

      {/* Tab: Export / Import JSON pack (teacher & creator) */}
      {activeSubTab === 'import_pack' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <Download className="w-5 h-5 text-teal-600" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Nhập Gói Bài Tập Từ JSON (Import Pack)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Nhập nội dung bài tập từ file JSON do bạn soạn thảo hoặc tạo từ AI bên ngoài (ChatGPT, Claude, Gemini).
              Hệ thống sẽ giữ đúng số màn bạn đã soạn (không tự động nhân bản) và thẩm định chất lượng trước khi nạp vào hàng đợi kiểm duyệt.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Thể loại text-pack:</label>
                <select
                  value={packTemplate}
                  onChange={(e) => setPackTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  {TEXT_PACK_TEMPLATES.map((t) => (
                    <option key={t.code} value={t.code}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Chủ đề mẫu:</label>
                <input
                  type="text"
                  value={packTopic}
                  onChange={(e) => setPackTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 outline-hidden focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Từ lớp:</label>
                <select
                  value={packGradeMin}
                  onChange={(e) => setPackGradeMin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>Lớp {g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Đến lớp:</label>
                <select
                  value={packGradeMax}
                  onChange={(e) => setPackGradeMax(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map((g) => <option key={g} value={g}>Lớp {g}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                disabled={loading}
                onClick={handleExportSamplePack}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Tải JSON mẫu (1 câu)
              </button>
              <label className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Chọn file JSON…
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => handlePackFileUpload(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <label className="text-xs font-bold text-slate-600 block mb-1">
              JSON pack (dán hoặc chỉnh sau khi export):
            </label>
            <textarea
              value={packJson}
              onChange={(e) => setPackJson(e.target.value)}
              rows={14}
              spellCheck={false}
              placeholder='{"title":"...","template_code":"quiz","level_template":{...1 câu...}}'
              className="w-full font-mono text-[11px] bg-slate-950 text-emerald-300 border border-slate-700 rounded-2xl p-4 outline-hidden focus:border-teal-400"
            />

            {packPreview && (
              <p className="mt-2 text-[11px] text-slate-500 font-bold">
                Preview: {packPreview.title || '(chưa có title)'} · mẫu{' '}
                {packPreview.levels?.length || (packPreview.level_template ? 1 : 0)} câu · template{' '}
                {packPreview.template_code} → import ra {packPreview.levels?.length || 1} màn
              </p>
            )}

            <button
              type="button"
              disabled={loading || !packJson.trim()}
              onClick={handleImportPack}
              className="mt-4 w-full md:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {loading ? 'Đang import…' : 'Import pack vào hàng đợi kiểm duyệt'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Manual Create Game */}
      {activeSubTab === 'create' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            {editingGameId ? (
              <>
                <Pencil className="w-4 h-4 text-amber-600" />
                <span>CHỈNH SỬA TRÒ CHƠI</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                <span>TỰ TAY THIẾT KẾ TRÒ CHƠI MỚI (MANUAL BUILDER)</span>
              </>
            )}
          </h3>

          {editingGameId && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 font-semibold">
              Đang sửa game <strong>{title}</strong>. Giáo viên sau khi lưu sẽ gửi lại kiểm duyệt; admin giữ trạng thái
              publish nếu game đã duyệt.
            </p>
          )}

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
                disabled={!!editingGameId}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer disabled:opacity-60"
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

            <div className="md:col-span-2 pt-2 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 min-w-[200px] py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
              >
                {editingGameId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>
                  {loading
                    ? 'Đang lưu...'
                    : editingGameId
                      ? 'LƯU THAY ĐỔI GAME'
                      : 'TẠO GAME & GỬI KIỂM DUYỆT'}
                </span>
              </button>
              {editingGameId && (
                <button
                  type="button"
                  onClick={() => {
                    resetGameForm();
                    setMsg(null);
                  }}
                  className="px-5 py-3.5 rounded-2xl border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-50"
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Dynamic Level Builder */}
      {activeSubTab === 'levels' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>SOẠN THẢO / SỬA MÀN CHƠI (LEVEL BUILDER)</span>
          </h3>

          {editableGames.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Chưa có game custom để soạn thảo. Tạo game mới hoặc import pack trước.
            </p>
          ) : (
          <form onSubmit={handleAddLevel} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Chọn Game:</label>
                <select
                  value={selectedGameId}
                  onChange={(e) => {
                    setSelectedGameId(e.target.value);
                    clearLevelEdit();
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  {editableGames.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({reviewStatusLabel(g.review_status)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Chọn màn để sửa (hoặc để trống = thêm mới):</label>
                <select
                  value={editingLevelNum ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      clearLevelEdit();
                      return;
                    }
                    const num = parseInt(val, 10);
                    setEditingLevelNum(num);
                    const game = editableGames.find((g) => g.id === selectedGameId);
                    const level = game?.levels?.find((l: any) => l.level_num === num);
                    if (level && game) loadLevelIntoForm(level, game.template_code);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-hidden cursor-pointer"
                >
                  <option value="">— Thêm màn mới —</option>
                  {(editableGames.find((g) => g.id === selectedGameId)?.levels || []).map((lvl: any) => (
                    <option key={lvl.level_num} value={lvl.level_num}>
                      Màn {lvl.level_num}: {lvl.title || 'Không tên'}
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
              {editingLevelNum != null ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>
                {loading
                  ? 'Đang lưu...'
                  : editingLevelNum != null
                    ? `LƯU MÀN ${editingLevelNum}`
                    : 'LƯU & BỔ SUNG MÀN CHƠI'}
              </span>
            </button>
          </form>
          )}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-800">{item.title}</h4>
                        {item.quality_score !== undefined && item.quality_score !== null && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            item.quality_score >= 80 
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : item.quality_score >= 60
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : item.quality_score >= 40
                              ? 'bg-amber-100 text-amber-700 border border-amber-300'
                              : 'bg-rose-100 text-rose-700 border border-rose-300'
                          }`}>
                            ★ {item.quality_score}/100 • {item.quality_grade || (item.quality_score >= 80 ? 'EXCELLENT' : item.quality_score >= 60 ? 'GOOD' : item.quality_score >= 40 ? 'FAIR' : 'POOR')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                      <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                        Tác giả: {item.creator_name || 'Giáo viên'} • Lớp {item.grade_from}-{item.grade_to} • {item.levels?.length || 1} màn
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleViewQualityReport(item.id)}
                      disabled={loadingQualityReport}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-indigo-200 shadow-2xs"
                      title="Xem Báo Cáo Thẩm Định Sư Phạm"
                    >
                      <Award className="w-4 h-4 text-indigo-600" />
                      <span>Báo Cáo Sư Phạm</span>
                    </button>
                    <button
                      onClick={() => handleCheckDuplicates(item.id)}
                      disabled={loadingDuplicateCheck}
                      className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-purple-200 shadow-2xs"
                      title="Kiểm Tra Đối Soát Trùng Lặp Chéo (Jaccard)"
                    >
                      <Copy className="w-4 h-4 text-purple-600" />
                      <span>So Khớp Trùng Lặp</span>
                    </button>
                    {item.review_status === 'pending_review' ? (
                      <>
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
                      </>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 px-3 py-2 rounded-xl bg-white border border-slate-200">
                        {item.review_status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quality Report Modal */}
          {selectedQualityReport && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-slate-800">
                        BÁO CÁO THẨM ĐỊNH CHẤT LƯỢNG SƯ PHẠM
                      </h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                        selectedQualityReport.total_score >= 80
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                          : selectedQualityReport.total_score >= 60
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : selectedQualityReport.total_score >= 40
                          ? 'bg-amber-100 text-amber-700 border border-amber-300'
                          : 'bg-rose-100 text-rose-700 border border-rose-300'
                      }`}>
                        {selectedQualityReport.grade} ({selectedQualityReport.total_score}/100)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Trò chơi: <span className="font-bold text-slate-700">{selectedQualityReport.title || selectedQualityReport.game_id}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedQualityReport(null)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto space-y-4 my-4 pr-1 flex-1">
                  <div className={`p-3 rounded-2xl text-xs font-medium border ${
                    selectedQualityReport.is_publishable
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    {selectedQualityReport.summary}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                      Đánh Giá Chi Tiết Theo 5 Chiều Sư Phạm:
                    </h4>
                    {selectedQualityReport.dimensions.map((dim) => (
                      <div key={dim.dimension_key} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                          <span>{dim.name}</span>
                          <span className={`font-mono ${
                            dim.status === 'pass' ? 'text-emerald-600' : dim.status === 'warning' ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {dim.score}/{dim.max_score} điểm
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full ${
                              dim.status === 'pass' ? 'bg-emerald-500' : dim.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${(dim.score / dim.max_score) * 100}%` }}
                          />
                        </div>
                        {dim.issues.length > 0 && (
                          <div className="space-y-1 mt-1.5">
                            {dim.issues.map((iss, i) => (
                              <p key={i} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <span>{iss}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedQualityReport.recommendations.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                      <h4 className="text-xs font-black uppercase text-indigo-900 tracking-wider mb-2">
                        Khuyến Nghị Cải Thiện:
                      </h4>
                      <ul className="space-y-1 list-disc list-inside text-xs text-indigo-800">
                        {selectedQualityReport.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setSelectedQualityReport(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Check Modal (Phase 7) */}
          {selectedDuplicateCheck && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-slate-800">
                        ĐỐI SOÁT TRÙNG LẶP LIÊN TRÒ CHƠI (JACCARD)
                      </h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                        selectedDuplicateCheck.overall_risk_level === 'HIGH'
                          ? 'bg-rose-100 text-rose-700 border border-rose-300'
                          : selectedDuplicateCheck.overall_risk_level === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-700 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      }`}>
                        Mức rủi ro: {selectedDuplicateCheck.overall_risk_level} ({selectedDuplicateCheck.max_similarity_percent}% MAX)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Trò chơi kiểm tra: <span className="font-bold text-slate-700">{selectedDuplicateCheck.title || selectedDuplicateCheck.game_id}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDuplicateCheck(null)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto space-y-4 my-4 pr-1 flex-1">
                  <div className={`p-3.5 rounded-2xl text-xs font-medium border ${
                    selectedDuplicateCheck.overall_risk_level === 'HIGH'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : selectedDuplicateCheck.overall_risk_level === 'MEDIUM'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    {selectedDuplicateCheck.overall_risk_level === 'HIGH' ? (
                      <div>
                        <strong>Cảnh báo nguy cơ sao chép cao (Clone Candidate):</strong> Trò chơi có độ tương đồng ngữ nghĩa ≥ 80% với nội dung đã có. Cần xem xét kỹ nội dung trước khi xuất bản.
                      </div>
                    ) : selectedDuplicateCheck.overall_risk_level === 'MEDIUM' ? (
                      <div>
                        <strong>Phát hiện trùng lặp một phần (Possible Duplicate):</strong> Trò chơi chia sẻ 60-79% nội dung câu hỏi với game khác.
                      </div>
                    ) : (
                      <div>
                        <strong>Nội dung độc nhất (Unique Content):</strong> Độ tương đồng dưới 60%, không phát hiện trùng lặp đáng kể với các game hiện có trên hệ thống.
                      </div>
                    )}
                    <p className="mt-1 text-[11px] opacity-80">
                      * Nguyên tắc bảo vệ nội dung: Hệ thống không tự động xóa bài của giáo viên. Kết quả này chỉ phục vụ công tác đối soát kiểm duyệt.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">
                      Danh Sách Trò Chơi Tương Đồng Đã Phát Hiện ({selectedDuplicateCheck.candidates.length}):
                    </h4>
                    {selectedDuplicateCheck.candidates.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">
                        🎉 Không có trò chơi nào trên hệ thống vượt ngưỡng tương đồng 60%. Nội dung hoàn toàn mới lạ!
                      </div>
                    ) : (
                      selectedDuplicateCheck.candidates.map((cand) => (
                        <div key={cand.game_id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="text-xs font-black text-slate-800">{cand.title}</h5>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                ID: {cand.game_id} • Tác giả: {cand.creator_name || cand.creator_id || 'Chưa rõ'}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                              cand.risk_level === 'HIGH'
                                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                : 'bg-amber-100 text-amber-700 border border-amber-300'
                            }`}>
                              {cand.similarity_percent}% tương đồng
                            </span>
                          </div>

                          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                cand.risk_level === 'HIGH' ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${cand.similarity_percent}%` }}
                            />
                          </div>

                          <span className="text-[11px] text-slate-500">
                            Trùng {cand.common_count} câu hỏi trên tổng số {cand.total_target_questions} câu của bài đang xét (Game đối sánh có {cand.total_candidate_questions} câu).
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setSelectedDuplicateCheck(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: My Games Repository */}
      {activeSubTab === 'my_games' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-600" />
            <span>
              {isAdmin ? 'KHO GAME CUSTOM (QUẢN TRỊ)' : 'GAME CỦA TÔI'} ({myGames.length})
            </span>
          </h3>

          {myGames.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 font-medium">
              Chưa có game nào. Tạo game mới hoặc import pack JSON.
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myGames.map((g) => (
              <div
                key={g.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-3xl shadow-2xs shrink-0">
                      {g.thumbnail || '🎮'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800 line-clamp-1">{g.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Lớp {g.grade_from}-{g.grade_to} • {g.levels?.length || 1} màn •{' '}
                        {g.price === 0 ? 'Miễn phí' : `${g.price} xu`}
                      </span>
                      {g.creator_name && isAdmin && (
                        <span className="text-[10px] text-slate-400 block">Tác giả: {g.creator_name}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0 ${reviewStatusClass(g.review_status)}`}
                  >
                    {reviewStatusLabel(g.review_status)}
                  </span>
                </div>

                {g.review_status === 'rejected' && g.review_feedback && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-2 leading-relaxed">
                    Phản hồi: {g.review_feedback}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {canEditGame(g) && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditGame(g)}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-xl flex items-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Sửa thông tin
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditPack(g)}
                        className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] rounded-xl flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Sửa JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGameId(g.id);
                          clearLevelEdit();
                          setActiveSubTab('levels');
                        }}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] rounded-xl flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Sửa màn
                      </button>
                    </>
                  )}
                  {canEditGame(g) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteGame(g.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Xóa trò chơi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
