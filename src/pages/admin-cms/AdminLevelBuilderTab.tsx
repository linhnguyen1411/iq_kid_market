import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen, Plus, Sparkles, Upload, Play, Trash2, CheckCircle2,
  XCircle, Layers, ArrowRight, HelpCircle, Pencil, RotateCcw
} from 'lucide-react';
import { Game } from '../../types';
import { api } from '../../services/api';
import QuestionRenderer from '../../components/QuestionRenderer';
import { playSynthSound } from '../../components/game-engines/soundUtils';
import { useAuth } from '../../context/AuthContext';
import { TEXT_PACK_TEMPLATES, DEFAULT_LEVEL_COUNT } from '../../lib/gameAccess';

interface AdminLevelBuilderTabProps {
  games: Game[];
  onRefreshGames: () => Promise<void>;
  initialGameId?: string | null;
  initialLevelNum?: number | null;
}

export const AdminLevelBuilderTab: React.FC<AdminLevelBuilderTabProps> = ({
  games,
  onRefreshGames,
  initialGameId,
  initialLevelNum,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [mode, setMode] = useState<'levels' | 'create_game' | 'ai_gen' | 'import_pack'>('levels');
  const [selectedGameId, setSelectedGameId] = useState<string>(initialGameId || games[0]?.id || 'g1');
  const [editingLevelNum, setEditingLevelNum] = useState<number | null>(initialLevelNum ?? null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Level Form
  const [levelTitle, setLevelTitle] = useState('');
  const [levelQuestionType, setLevelQuestionType] = useState('matching');
  const [levelPrompt, setLevelPrompt] = useState('Nối các cặp tương ứng với nhau:');
  const [levelPoints, setLevelPoints] = useState(25);
  const [levelXpReward, setLevelXpReward] = useState(80);
  const [levelCoinReward, setLevelCoinReward] = useState(20);

  // Matching
  const [matchingPairs, setMatchingPairs] = useState([
    { left: 'Con Mèo 🐱', right: 'Cat' },
    { left: 'Con Chó 🐶', right: 'Dog' },
    { left: 'Con Chim 🐦', right: 'Bird' },
  ]);

  // Quiz
  const [quizQuestion, setQuizQuestion] = useState('Con vật nào sau đây biết bay?');
  const [quizOptions, setQuizOptions] = useState(['Con Chó', 'Con Mèo', 'Con Chim', 'Con Cá']);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState(2);

  // Math
  const [mathExpression, setMathExpression] = useState('35 + 28 = ?');
  const [mathAnswer, setMathAnswer] = useState('63');
  const [mathHint, setMathHint] = useState('Cộng hàng đơn vị 5 + 8 = 13, viết 3 nhớ 1');

  // Sequence
  const [seqItems, setSeqItems] = useState('2, 4, ?, 8, 10');
  const [seqAnswer, setSeqAnswer] = useState('6');

  // Memory
  const [memoryItems, setMemoryItems] = useState('🐱, 🐶, 🐭, 🐹');
  const [memoryTheme, setMemoryTheme] = useState('con_vat');

  // New Game Form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('20000');
  const [newTemplate, setNewTemplate] = useState('matching');
  const [newCategory, setNewCategory] = useState('iq');
  const [newGradeMin, setNewGradeMin] = useState('1');
  const [newGradeMax, setNewGradeMax] = useState('3');

  // AI Gen Form
  const [aiTopic, setAiTopic] = useState('Khám phá Hệ Mặt Trời và Các Hành Tinh 🪐');
  const [aiTemplate, setAiTemplate] = useState('quiz');
  const [aiGradeMin, setAiGradeMin] = useState('2');
  const [aiGradeMax, setAiGradeMax] = useState('4');

  // Import Pack Form
  const [packTemplate, setPackTemplate] = useState('quiz');
  const [packTopic, setPackTopic] = useState('Toán tư duy nhanh');
  const [packGradeMin, setPackGradeMin] = useState('1');
  const [packGradeMax, setPackGradeMax] = useState('2');
  const [packJson, setPackJson] = useState('');

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) || games[0],
    [games, selectedGameId]
  );

  useEffect(() => {
    if (initialGameId && games.some((g) => g.id === initialGameId)) {
      setSelectedGameId(initialGameId);
      setMode('levels');
      const targetGame = games.find((g) => g.id === initialGameId);
      if (targetGame && targetGame.levels && targetGame.levels.length > 0) {
        let lvlToEdit = null;
        if (initialLevelNum != null) {
          lvlToEdit = targetGame.levels.find((l) => l.level_num === initialLevelNum);
        }
        if (!lvlToEdit && targetGame.levels.length > 0) {
          lvlToEdit = targetGame.levels[0];
        }
        if (lvlToEdit) {
          setEditingLevelNum(lvlToEdit.level_num);
          loadLevelIntoForm(lvlToEdit, targetGame.template_code);
        }
      }
    }
  }, [initialGameId, initialLevelNum, games]);

  const clearLevelEdit = () => {
    setEditingLevelNum(null);
    setLevelTitle('');
    setLevelPrompt('Hoàn thành thử thách sau:');
    setLevelPoints(25);
    setLevelXpReward(80);
    setLevelCoinReward(20);
  };

  const loadLevelIntoForm = (level: any, template: string) => {
    setLevelTitle(level.title || `Màn ${level.level_num}`);
    setLevelXpReward(level.xp_reward || 80);
    setLevelCoinReward(level.coin_reward || 20);

    const q = level.questions?.[0];
    if (!q) {
      setLevelPrompt('Hoàn thành thử thách sau:');
      setLevelPoints(25);
      return;
    }

    setLevelPrompt(q.prompt || '');
    setLevelPoints(q.points || 25);
    const rawType = q.question_type || template || 'matching';
    const qType = rawType === 'multiple_choice' ? 'quiz' : rawType;
    setLevelQuestionType(qType);

    const d = q.data || {};
    if (qType === 'matching' && Array.isArray(d.pairs)) {
      setMatchingPairs(d.pairs.length > 0 ? d.pairs : [{ left: '', right: '' }]);
    } else if (qType === 'quiz') {
      setQuizQuestion(d.question || q.prompt || '');
      setQuizOptions(Array.isArray(d.options) && d.options.length >= 2 ? d.options : ['A', 'B', 'C', 'D']);
      setQuizCorrectIndex(typeof d.correct_index === 'number' ? d.correct_index : 0);
    } else if (qType === 'math') {
      setMathExpression(d.expression || '');
      setMathAnswer(d.answer != null ? String(d.answer) : '');
      setMathHint(d.hint || '');
    } else if (qType === 'sequence') {
      setSeqItems(Array.isArray(d.sequence) ? d.sequence.join(', ') : String(d.sequence || ''));
      setSeqAnswer(d.answer != null ? String(d.answer) : '');
    } else if (qType === 'memory') {
      setMemoryItems(Array.isArray(d.items) ? d.items.join(', ') : '');
      setMemoryTheme(d.theme || 'con_vat');
    } else if (qType === 'language') {
      if (d.type === 'unscramble') {
        setSeqItems(Array.isArray(d.scrambled_words) ? d.scrambled_words.join(', ') : '');
        setSeqAnswer(Array.isArray(d.correct_order) ? d.correct_order.join(' ') : '');
      } else {
        setQuizQuestion(d.sentence || q.prompt || '');
        setQuizOptions(Array.isArray(d.options) && d.options.length >= 2 ? d.options : ['A', 'B', 'C', 'D']);
        setMathAnswer(d.answer != null ? String(d.answer) : '');
        const foundIdx = (d.options || []).findIndex((opt: string) => opt === d.answer);
        setQuizCorrectIndex(foundIdx >= 0 ? foundIdx : 0);
      }
    }
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame) return;
    setLoading(true);
    setMsg(null);

    let levelData: any = {};
    if (levelQuestionType === 'matching') {
      const validPairs = matchingPairs.filter((p) => p.left.trim() && p.right.trim());
      if (validPairs.length < 2) {
        setMsg({ type: 'err', text: 'Ghép cặp cần ít nhất 2 cặp vế trái ➔ vế phải!' });
        setLoading(false);
        return;
      }
      levelData = { pairs: validPairs };
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
    } else if (levelQuestionType === 'memory') {
      levelData = {
        items: memoryItems.split(',').map((s) => s.trim()),
        theme: memoryTheme,
      };
    } else if (levelQuestionType === 'language') {
      levelData = {
        type: 'fill_in_the_blank',
        sentence: quizQuestion,
        options: quizOptions,
        answer: mathAnswer || quizOptions[quizCorrectIndex] || '',
      };
    }

    const questionPayload = {
      question_type: levelQuestionType,
      prompt: levelPrompt || 'Hoàn thành thử thách sau:',
      points: levelPoints,
      data: levelData,
    };

    try {
      if (editingLevelNum != null) {
        const res = await api.admin.updateLevel(selectedGame.id, editingLevelNum, {
          title: levelTitle || `Màn ${editingLevelNum}`,
          xp_reward: levelXpReward,
          coin_reward: levelCoinReward,
          question: questionPayload,
        });
        if (res.success) {
          setMsg({ type: 'ok', text: `Cập nhật Màn ${editingLevelNum} thành công!` });
          playSynthSound('victory');
          await onRefreshGames();
        }
      } else {
        const res = await api.admin.addLevel({
          gameId: selectedGame.id,
          title: levelTitle || `Màn ${(selectedGame.levels?.length || 0) + 1}`,
          xp_reward: levelXpReward,
          coin_reward: levelCoinReward,
          question: questionPayload,
          creatorId: user?.id,
        });
        if (res.success) {
          setMsg({ type: 'ok', text: `Đã thêm màn chơi mới vào game "${selectedGame.title}"!` });
          playSynthSound('victory');
          clearLevelEdit();
          await onRefreshGames();
        }
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi khi lưu màn chơi' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setMsg({ type: 'err', text: 'Vui lòng nhập tên trò chơi!' });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.createGame({
        title: newTitle,
        description: newDesc || `Trò chơi rèn luyện trí tuệ ${newTitle}`,
        price: parseInt(newPrice, 10) || 0,
        template_code: newTemplate,
        category: newCategory,
        grade_from: parseInt(newGradeMin, 10) || 1,
        grade_to: parseInt(newGradeMax, 10) || 5,
        creatorId: user?.id,
      });
      if (res.success) {
        setMsg({ type: 'ok', text: `Đã tạo trò chơi mới "${newTitle}" thành công!` });
        playSynthSound('victory');
        setNewTitle('');
        setNewDesc('');
        await onRefreshGames();
        setMode('levels');
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi tạo trò chơi' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleAiGen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      setMsg({ type: 'err', text: 'Vui lòng nhập chủ đề cho AI!' });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.aiGenerateGame({
        topic: aiTopic,
        template_code: aiTemplate,
        grade_from: parseInt(aiGradeMin, 10) || 1,
        grade_to: parseInt(aiGradeMax, 10) || 4,
        creator_id: user?.id,
        creator_name: user?.name,
      });
      if (res.success) {
        setMsg({ type: 'ok', text: `AI đã tạo thành công game "${res.game?.title || aiTopic}"!` });
        playSynthSound('victory');
        await onRefreshGames();
        setMode('levels');
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi AI sinh màn chơi' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleImportPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packJson.trim()) {
      setMsg({ type: 'err', text: 'Vui lòng dán nội dung JSON pack!' });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const parsed = JSON.parse(packJson);
      const res = await api.admin.uploadGamePack(parsed);
      if (res.success) {
        setMsg({ type: 'ok', text: res.message || 'Import gói màn chơi thành công!' });
        playSynthSound('victory');
        setPackJson('');
        await onRefreshGames();
        setMode('levels');
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Dữ liệu JSON không hợp lệ' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('levels')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'levels'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Soạn Thảo Màn Chơi
          </button>
          <button
            type="button"
            onClick={() => setMode('create_game')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'create_game'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Tạo Game Mới
          </button>
          <button
            type="button"
            onClick={() => setMode('ai_gen')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'ai_gen'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Sinh Game Bằng AI
          </button>
          <button
            type="button"
            onClick={() => setMode('import_pack')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'import_pack'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Import JSON Pack
          </button>
        </div>

        <span className="text-xs font-mono font-bold text-slate-400">
          Tổng cộng: {games.length} trò chơi
        </span>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            msg.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {msg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Mode 1: Level Builder */}
      {mode === 'levels' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wide block mb-1">
                  1. Chọn trò chơi:
                </label>
                <select
                  value={selectedGameId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedGameId(nextId);
                    const nextGame = games.find((g) => g.id === nextId);
                    if (nextGame?.levels && nextGame.levels.length > 0) {
                      setEditingLevelNum(nextGame.levels[0].level_num);
                      loadLevelIntoForm(nextGame.levels[0], nextGame.template_code);
                    } else {
                      clearLevelEdit();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400"
                >
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.thumbnail || '🎮'} {g.title} ({g.levels?.length || 0} màn) {g.is_seed ? '[Gốc]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wide block mb-1">
                  2. Chọn màn chỉnh sửa:
                </label>
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
                    const lvl = selectedGame?.levels?.find((l) => l.level_num === num);
                    if (lvl) loadLevelIntoForm(lvl, selectedGame.template_code);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400"
                >
                  <option value="">— Thêm màn chơi mới —</option>
                  {(selectedGame?.levels || []).map((lvl) => (
                    <option key={lvl.level_num} value={lvl.level_num}>
                      Màn {lvl.level_num}: {lvl.title || 'Không tên'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <form onSubmit={handleSaveLevel} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Tên Màn Chơi:</label>
                  <input
                    type="text"
                    value={levelTitle}
                    onChange={(e) => setLevelTitle(e.target.value)}
                    placeholder={editingLevelNum ? `Màn ${editingLevelNum}` : `Màn ${(selectedGame?.levels?.length || 0) + 1}: Thử thách mới`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Loại Game Engine:</label>
                  <select
                    value={levelQuestionType}
                    onChange={(e) => setLevelQuestionType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800"
                  >
                    <option value="matching">Ghép Cặp (Matching)</option>
                    <option value="quiz">Trắc Nghiệm (Quiz)</option>
                    <option value="math">Toán Học (Math)</option>
                    <option value="sequence">Dãy Quy Luật (Sequence)</option>
                    <option value="memory">Lật Thẻ Trí Nhớ (Memory)</option>
                    <option value="language">Ngôn Ngữ & Tiếng Việt (Language)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Lời dẫn / Đề bài:</label>
                <input
                  type="text"
                  value={levelPrompt}
                  onChange={(e) => setLevelPrompt(e.target.value)}
                  placeholder="Ví dụ: Em hãy ghép các từ vựng tương ứng hoặc giải câu đố sau:"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Điểm câu hỏi:</label>
                  <input
                    type="number"
                    value={levelPoints}
                    onChange={(e) => setLevelPoints(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Thưởng XP:</label>
                  <input
                    type="number"
                    value={levelXpReward}
                    onChange={(e) => setLevelXpReward(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Thưởng Xu:</label>
                  <input
                    type="number"
                    value={levelCoinReward}
                    onChange={(e) => setLevelCoinReward(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Dynamic Engine Content */}
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 block">
                  Cấu Hình Dữ Liệu ({levelQuestionType.toUpperCase()})
                </span>

                {levelQuestionType === 'matching' && (
                  <div className="space-y-2">
                    {matchingPairs.map((pair, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Vế Trái"
                          value={pair.left}
                          onChange={(e) => {
                            const up = [...matchingPairs];
                            up[idx].left = e.target.value;
                            setMatchingPairs(up);
                          }}
                          className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                        />
                        <span className="text-slate-400 font-bold">➔</span>
                        <input
                          type="text"
                          placeholder="Vế Phải"
                          value={pair.right}
                          onChange={(e) => {
                            const up = [...matchingPairs];
                            up[idx].right = e.target.value;
                            setMatchingPairs(up);
                          }}
                          className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                        />
                        {matchingPairs.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const up = [...matchingPairs];
                              up.splice(idx, 1);
                              setMatchingPairs(up);
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMatchingPairs([...matchingPairs, { left: '', right: '' }])}
                      className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm cặp nối
                    </button>
                  </div>
                )}

                {levelQuestionType === 'quiz' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Nội dung câu hỏi trắc nghiệm:</label>
                      <input
                        type="text"
                        value={quizQuestion}
                        onChange={(e) => setQuizQuestion(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-600 block">4 Phương án & Chọn đáp án đúng (Radio):</label>
                      {quizOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="quiz_correct_radio"
                            checked={quizCorrectIndex === idx}
                            onChange={() => setQuizCorrectIndex(idx)}
                            className="cursor-pointer"
                          />
                          <span className="text-xs font-mono font-bold text-slate-500 w-4">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const up = [...quizOptions];
                              up[idx] = e.target.value;
                              setQuizOptions(up);
                            }}
                            className={`flex-1 bg-white border rounded-xl p-2 text-xs font-semibold ${
                              quizCorrectIndex === idx ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200'
                            }`}
                          />
                          {quizCorrectIndex === idx && (
                            <span className="text-[10px] font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-md">
                              Đáp án đúng
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {levelQuestionType === 'math' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Biểu thức phép tính:</label>
                      <input
                        type="text"
                        value={mathExpression}
                        onChange={(e) => setMathExpression(e.target.value)}
                        placeholder="Ví dụ: 15 + 28 = ?"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Đáp án đúng:</label>
                        <input
                          type="text"
                          value={mathAnswer}
                          onChange={(e) => setMathAnswer(e.target.value)}
                          placeholder="Ví dụ: 43"
                          className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Gợi ý cách tính (nếu sai):</label>
                        <input
                          type="text"
                          value={mathHint}
                          onChange={(e) => setMathHint(e.target.value)}
                          placeholder="Ví dụ: 5 + 8 = 13, viết 3 nhớ 1"
                          className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {levelQuestionType === 'sequence' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Dãy số quy luật (phân cách bằng dấu phẩy):</label>
                      <input
                        type="text"
                        value={seqItems}
                        onChange={(e) => setSeqItems(e.target.value)}
                        placeholder="Ví dụ: 3, 6, ?, 12, 15"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Đáp án điền vào dấu ?: </label>
                      <input
                        type="text"
                        value={seqAnswer}
                        onChange={(e) => setSeqAnswer(e.target.value)}
                        placeholder="Ví dụ: 9"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold font-mono"
                      />
                    </div>
                  </div>
                )}

                {levelQuestionType === 'memory' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Biểu tượng / Emoji thẻ lật (phân cách bằng dấu phẩy):</label>
                      <input
                        type="text"
                        value={memoryItems}
                        onChange={(e) => setMemoryItems(e.target.value)}
                        placeholder="Ví dụ: 🐱, 🐶, 🐭, 🐹"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
                >
                  {loading ? 'Đang lưu…' : editingLevelNum ? `Lưu Cập Nhật Màn ${editingLevelNum}` : 'Lưu & Thêm Màn Mới'}
                </button>
                {editingLevelNum && (
                  <button
                    type="button"
                    onClick={clearLevelEdit}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                  >
                    Hủy sửa màn
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right: Preview & Level Navigation */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Màn Chơi Hiện Có ({selectedGame?.levels?.length || 0} màn)
                </h4>
                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {selectedGame?.template_code}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                {(selectedGame?.levels || []).map((lvl) => {
                  const isEditing = editingLevelNum === lvl.level_num;
                  return (
                    <button
                      key={lvl.level_num}
                      type="button"
                      onClick={() => {
                        setEditingLevelNum(lvl.level_num);
                        loadLevelIntoForm(lvl, selectedGame.template_code);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        isEditing
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>Màn {lvl.level_num}</span>
                    </button>
                  );
                })}
                {(selectedGame?.levels || []).length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center w-full">Trò chơi này chưa có màn nào.</p>
                )}
              </div>
            </div>

            {/* Live Preview */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
                Xem Trước Màn Chơi (Live Preview)
              </h4>
              <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                <QuestionRenderer
                  question={{
                    id: 'preview_q',
                    question_type: levelQuestionType,
                    prompt: levelPrompt || 'Hoàn thành thử thách:',
                    points: levelPoints,
                    data:
                      levelQuestionType === 'matching'
                        ? { pairs: matchingPairs.filter((p) => p.left && p.right) }
                        : levelQuestionType === 'quiz'
                        ? { question: quizQuestion, options: quizOptions, correct_index: quizCorrectIndex }
                        : levelQuestionType === 'math'
                        ? { expression: mathExpression, answer: mathAnswer, hint: mathHint }
                        : levelQuestionType === 'sequence'
                        ? { sequence: seqItems.split(',').map((s) => s.trim()), answer: seqAnswer }
                        : { items: memoryItems.split(',').map((s) => s.trim()) },
                  } as any}
                  levelNum={editingLevelNum || 1}
                  xpReward={levelXpReward}
                  coinReward={levelCoinReward}
                  onSuccess={() => alert('Thử nghiệm thành công!')}
                  onBack={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Create Game Form */}
      {mode === 'create_game' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs max-w-2xl mx-auto">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>TẠO TRÒ CHƠI MỚI THỦ CÔNG</span>
          </h3>

          <form onSubmit={handleCreateGame} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Tên Trò Chơi:</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ví dụ: Thử Thách Ghép Động Vật Rừng Xanh"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Mô tả trò chơi:</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Mô tả kỹ năng và lợi ích cho bé..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Loại Engine:</label>
                <select
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
                >
                  <option value="matching">Ghép Cặp (matching)</option>
                  <option value="quiz">Trắc Nghiệm (quiz)</option>
                  <option value="math">Toán Học (math)</option>
                  <option value="sequence">Dãy Số (sequence)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Thể loại:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
                >
                  <option value="iq">Tư Duy IQ</option>
                  <option value="math">Toán Học</option>
                  <option value="scratch">Lập Trình & Thuật Toán</option>
                  <option value="vietnamese">Tiếng Việt</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Từ lớp:</label>
                <input
                  type="number"
                  value={newGradeMin}
                  onChange={(e) => setNewGradeMin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Đến lớp:</label>
                <input
                  type="number"
                  value={newGradeMax}
                  onChange={(e) => setNewGradeMax(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Giá mở khóa (Xu Napas):</label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
            >
              {loading ? 'Đang tạo…' : 'Xác Nhận Tạo Game Mới'}
            </button>
          </form>
        </div>
      )}

      {/* Mode 3: AI Gen */}
      {mode === 'ai_gen' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs max-w-2xl mx-auto">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>TRỢ LÝ AI GEMINI SINH TỰ ĐỘNG BỘ MÀN CHƠI (10-20 MÀN)</span>
          </h3>

          <form onSubmit={handleAiGen} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Chủ đề bài học (Prompt):</label>
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Ví dụ: Phép nhân nhẩm bảng 2 đến 5, hoặc Từ vựng Tiếng Anh loài hoa..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Loại Engine:</label>
                <select
                  value={aiTemplate}
                  onChange={(e) => setAiTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
                >
                  <option value="quiz">Trắc Nghiệm (quiz)</option>
                  <option value="math">Toán Học (math)</option>
                  <option value="matching">Ghép Cặp (matching)</option>
                  <option value="sequence">Dãy Số (sequence)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Từ lớp:</label>
                <input
                  type="number"
                  value={aiGradeMin}
                  onChange={(e) => setAiGradeMin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Đến lớp:</label>
                <input
                  type="number"
                  value={aiGradeMax}
                  onChange={(e) => setAiGradeMax(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 disabled:opacity-50 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'AI đang thiết kế 10-20 màn chơi…' : 'Kích Hoạt AI Sinh Màn Chơi'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Mode 4: Import JSON Pack */}
      {mode === 'import_pack' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs max-w-2xl mx-auto">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>NHẬP GÓI CÂU HỎI TỪ FILE JSON (IMPORT PACK)</span>
          </h3>

          <form onSubmit={handleImportPack} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Dán cấu trúc JSON pack:</label>
              <textarea
                value={packJson}
                onChange={(e) => setPackJson(e.target.value)}
                placeholder='{"title": "Toán Nhanh Lớp 1", "template_code": "math", "category": "math", "levels": [...]}'
                rows={8}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
            >
              {loading ? 'Đang nạp dữ liệu…' : 'Nhập Pack Vào Kho Game'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
