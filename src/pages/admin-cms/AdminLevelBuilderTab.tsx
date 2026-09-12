import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen, Plus, Sparkles, Upload, Play, Trash2, CheckCircle2,
  XCircle, Layers, ArrowRight, HelpCircle, Pencil, RotateCcw,
  Copy, Check, Eye, AlertTriangle, FileText, ShieldAlert, ShieldCheck,
  Download, Search, Filter, Database, CheckSquare, Square, Zap
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

  const [mode, setMode] = useState<'levels' | 'create_game' | 'ai_gen' | 'import_pack' | 'build_from_bank'>('levels');
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

  // Phase 3: Staging & Quality Gate Preview State
  const [importPreview, setImportPreview] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    game?: any;
    stats?: {
      total_levels: number;
      total_questions: number;
      unique_questions: number;
      safe_for_kids: boolean;
    };
  } | null>(null);
  const [previewLevelIdx, setPreviewLevelIdx] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [templatesData, setTemplatesData] = useState<Record<string, any>>({});
  const [promptGuidelines, setPromptGuidelines] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Phase 4: Question Bank & Game Builder Integration State
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankTotal, setBankTotal] = useState(0);
  const [bankPage, setBankPage] = useState(1);
  const [bankPageSize] = useState(15);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankFilterEngine, setBankFilterEngine] = useState('');
  const [bankFilterGrade, setBankFilterGrade] = useState('');
  const [bankFilterSubject, setBankFilterSubject] = useState('');
  const [bankFilterSearch, setBankFilterSearch] = useState('');
  const [selectedBankQids, setSelectedBankQids] = useState<string[]>([]);
  const [bankActionTab, setBankActionTab] = useState<'build' | 'append'>('build');
  const [bankTargetGameId, setBankTargetGameId] = useState<string>(selectedGameId || games[0]?.id || '');
  const [previewBankQ, setPreviewBankQ] = useState<any | null>(null);

  // Phase 5: Game Blueprints & Template Presets State
  const [blueprintTab, setBlueprintTab] = useState<'recipes' | 'custom_bank'>('recipes');
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [blueprintsLoading, setBlueprintsLoading] = useState(false);
  const [buildingBpId, setBuildingBpId] = useState<string | null>(null);
  const [bpFilterGrade, setBpFilterGrade] = useState<string>('');
  const [bpFilterSubject, setBpFilterSubject] = useState<string>('');

  // Build from Bank Form State
  const [buildTitle, setBuildTitle] = useState('');
  const [buildDesc, setBuildDesc] = useState('');
  const [buildTemplate, setBuildTemplate] = useState('quiz');
  const [buildCategory, setBuildCategory] = useState('iq');
  const [buildGradeFrom, setBuildGradeFrom] = useState(1);
  const [buildGradeTo, setBuildGradeTo] = useState(5);
  const [buildPrice, setBuildPrice] = useState(0);

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

  useEffect(() => {
    if (mode === 'import_pack' && Object.keys(templatesData).length === 0) {
      api.admin.getImportTemplates().then((res) => {
        if (res.templates) setTemplatesData(res.templates);
        if (res.promptGuidelines) setPromptGuidelines(res.promptGuidelines);
      }).catch(() => {});
    }
  }, [mode]);

  const handleCopyTemplatePrompt = () => {
    const template = templatesData[packTemplate];
    if (!template) return;
    const promptText = `${promptGuidelines || 'Hãy tạo bộ bài tập giáo dục cho trẻ em theo cấu trúc JSON chuẩn sau:'}\n\nCấu trúc JSON mẫu cho engine '${packTemplate}':\n${JSON.stringify(template, null, 2)}`;
    navigator.clipboard.writeText(promptText);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
    playSynthSound('click');
  };

  const handlePreviewPack = async () => {
    if (!packJson.trim()) {
      setMsg({ type: 'err', text: 'Vui lòng dán nội dung JSON pack để kiểm tra!' });
      return;
    }
    setPreviewLoading(true);
    setMsg(null);
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(packJson);
      } catch (err: any) {
        throw new Error('Cú pháp JSON không hợp lệ: ' + err.message);
      }
      const res = await api.admin.previewGamePack(parsed);
      setImportPreview(res);
      setPreviewLevelIdx(0);
      if (res.valid) {
        playSynthSound('victory');
      } else {
        playSynthSound('incorrect');
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi kiểm tra cấu trúc JSON' });
      playSynthSound('incorrect');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImportPack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        setImportPreview(null);
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

  const fetchBankQuestions = async (page = 1) => {
    setBankLoading(true);
    try {
      const res = await api.questions.list({
        page,
        page_size: bankPageSize,
        engine_code: bankFilterEngine || undefined,
        grade: bankFilterGrade ? parseInt(bankFilterGrade, 10) : undefined,
        subject: bankFilterSubject || undefined,
        search: bankFilterSearch.trim() || undefined,
        status: 'active',
      });
      setBankQuestions(res.items || []);
      setBankTotal(res.total || 0);
      setBankPage(page);
    } catch (err: any) {
      setMsg({ type: 'err', text: 'Không thể tải ngân hàng câu hỏi: ' + (err.message || '') });
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'build_from_bank') {
      fetchBankQuestions(1);
    }
  }, [mode, bankFilterEngine, bankFilterGrade, bankFilterSubject]);

  const toggleSelectBankQid = (id: string) => {
    setSelectedBankQids((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBuildGameFromBank = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!buildTitle.trim()) {
      setMsg({ type: 'err', text: 'Vui lòng nhập tên trò chơi mới!' });
      return;
    }
    if (!buildDesc.trim()) {
      setMsg({ type: 'err', text: 'Vui lòng nhập mô tả trò chơi!' });
      return;
    }
    if (selectedBankQids.length === 0) {
      setMsg({ type: 'err', text: 'Vui lòng chọn ít nhất 1 câu hỏi từ ngân hàng!' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.buildGameFromBank({
        title: buildTitle.trim(),
        description: buildDesc.trim(),
        template_code: buildTemplate,
        category: buildCategory,
        grade_from: Number(buildGradeFrom),
        grade_to: Number(buildGradeTo),
        price: Number(buildPrice),
        question_ids: selectedBankQids,
      });
      if (res.success) {
        setMsg({ type: 'ok', text: `Tạo game "${res.game.title}" từ ${selectedBankQids.length} câu hỏi thành công!` });
        playSynthSound('victory');
        setSelectedBankQids([]);
        setBuildTitle('');
        setBuildDesc('');
        await onRefreshGames();
        setSelectedGameId(res.game.id);
        setMode('levels');
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi khi ghép game từ ngân hàng' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestionsToGame = async () => {
    if (!bankTargetGameId) {
      setMsg({ type: 'err', text: 'Vui lòng chọn game cần bổ sung câu hỏi!' });
      return;
    }
    if (selectedBankQids.length === 0) {
      setMsg({ type: 'err', text: 'Vui lòng chọn ít nhất 1 câu hỏi từ ngân hàng!' });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.addQuestionsFromBank(bankTargetGameId, selectedBankQids);
      if (res.success) {
        setMsg({ type: 'ok', text: `Đã bổ sung ${res.added_count} câu hỏi vào game (Tổng: ${res.total_levels} màn)!` });
        playSynthSound('victory');
        setSelectedBankQids([]);
        await onRefreshGames();
        setSelectedGameId(bankTargetGameId);
        setMode('levels');
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi bổ sung câu hỏi vào game' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlueprints = async () => {
    setBlueprintsLoading(true);
    try {
      const res = await api.blueprints.list({
        grade: bpFilterGrade ? parseInt(bpFilterGrade, 10) : undefined,
        subject: bpFilterSubject || undefined,
        is_active: true,
      });
      setBlueprints(res.items || []);
    } catch (err: any) {
      console.error('Lỗi tải công thức game:', err);
    } finally {
      setBlueprintsLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'build_from_bank' && blueprintTab === 'recipes') {
      fetchBlueprints();
    }
  }, [mode, blueprintTab, bpFilterGrade, bpFilterSubject]);

  const handleBuildFromBlueprint = async (bp: any) => {
    setBuildingBpId(bp.id);
    setMsg(null);
    try {
      const res = await api.admin.buildGameFromBlueprint(bp.id, {
        title: `${bp.title} - ${new Date().toLocaleDateString('vi-VN')}`,
      });
      if (res.success) {
        setMsg({
          type: 'ok',
          text: `Đã sinh thành công Game "${res.game.title}" (${res.levels_count} màn) từ công thức "${bp.title}"! Bản phát hành v${res.version} đã được đóng băng snapshot an toàn.`,
        });
        playSynthSound('victory');
        await onRefreshGames();
        setSelectedGameId(res.game.id);
        setMode('levels');
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi khi sinh game từ công thức' });
      playSynthSound('incorrect');
    } finally {
      setBuildingBpId(null);
    }
  };

  const handleExtractCurrentGameToBank = async () => {
    if (!selectedGame?.id) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.extractQuestionsToBank(selectedGame.id);
      if (res.success) {
        setMsg({
          type: 'ok',
          text: `Trích xuất hoàn tất: ${res.extracted_count} câu hỏi mới vào Bank (${res.skipped_duplicate_count} câu trùng lặp đã bỏ qua)!`,
        });
        playSynthSound('victory');
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi khi trích xuất câu hỏi vào ngân hàng' });
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
          {isAdmin && (
            <button
              type="button"
              onClick={() => setMode('ai_gen')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                mode === 'ai_gen'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Sinh Game Bằng AI (Admin)
            </button>
          )}
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
          <button
            type="button"
            onClick={() => setMode('build_from_bank')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'build_from_bank'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> Ghép Từ Ngân Hàng
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

              {/* Phase 4: Fast Bank Operations */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-3">
                <button
                  type="button"
                  onClick={() => handleExtractCurrentGameToBank()}
                  disabled={loading || !selectedGame?.levels || selectedGame.levels.length === 0}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  title="Trích xuất các câu hỏi trong game này vào Ngân hàng câu hỏi dùng chung"
                >
                  <Download className="w-3.5 h-3.5" /> Trích Xuất Vào Bank
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBankTargetGameId(selectedGameId);
                    setBankActionTab('append');
                    setMode('build_from_bank');
                  }}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                  title="Chọn thêm câu hỏi từ Ngân hàng để bổ sung vào game này"
                >
                  <Layers className="w-3.5 h-3.5" /> Bổ Sung Từ Bank
                </button>
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

      {/* Mode 5: Build from Bank (Phase 4) */}
      {mode === 'build_from_bank' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block mb-1">
                  KIẾN TRÚC TÁI SỬ DỤNG NỘI DUNG (SNAPSHOT REUSE PATTERN)
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" />
                  <span>NGÂN HÀNG CÂU HỎI & GHÉP GAME</span>
                </h3>
                <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                  Chọn lọc các câu hỏi có sẵn trong Ngân hàng để lắp ráp thành Game độc lập hoặc bổ sung vào Game hiện có.
                  Nội dung màn chơi được lưu bản sao độc lập (snapshot), giúp bảo vệ tính bất biến của Game đã phát hành.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1.5 rounded-xl text-white">
                  Đã chọn: <strong className="text-amber-300 text-sm">{selectedBankQids.length}</strong> câu hỏi
                </span>
                {selectedBankQids.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedBankQids([])}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition"
                  >
                    Bỏ chọn tất cả
                  </button>
                )}
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-indigo-700/50">
              <button
                type="button"
                onClick={() => setBlueprintTab('recipes')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                  blueprintTab === 'recipes'
                    ? 'bg-amber-400 text-slate-900 shadow-md'
                    : 'bg-indigo-950/60 text-indigo-200 hover:bg-indigo-900 border border-indigo-700/60'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Công Thức GDPT Mẫu (5 Blueprints)</span>
              </button>
              <button
                type="button"
                onClick={() => setBlueprintTab('custom_bank')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                  blueprintTab === 'custom_bank'
                    ? 'bg-amber-400 text-slate-900 shadow-md'
                    : 'bg-indigo-950/60 text-indigo-200 hover:bg-indigo-900 border border-indigo-700/60'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-indigo-300" />
                <span>Tự Chọn Câu Hỏi Lẻ (Custom Bank)</span>
              </button>
            </div>

            {/* Filter Bar for Custom Bank */}
            {blueprintTab === 'custom_bank' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-indigo-700/50">
              <div>
                <label className="text-[10px] font-bold text-indigo-200 uppercase block mb-1">Loại Game Engine:</label>
                <select
                  value={bankFilterEngine}
                  onChange={(e) => setBankFilterEngine(e.target.value)}
                  className="w-full bg-slate-800/80 border border-indigo-600/50 rounded-xl p-2 text-xs font-semibold text-white outline-none"
                >
                  <option value="">Tất cả Engine</option>
                  <option value="quiz">Trắc Nghiệm (Quiz)</option>
                  <option value="matching">Ghép Cặp (Matching)</option>
                  <option value="math">Toán Học (Math)</option>
                  <option value="sequence">Dãy Số (Sequence)</option>
                  <option value="memory">Lật Thẻ (Memory)</option>
                  <option value="language">Ngôn Ngữ (Language)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-indigo-200 uppercase block mb-1">Khối Lớp:</label>
                <select
                  value={bankFilterGrade}
                  onChange={(e) => setBankFilterGrade(e.target.value)}
                  className="w-full bg-slate-800/80 border border-indigo-600/50 rounded-xl p-2 text-xs font-semibold text-white outline-none"
                >
                  <option value="">Tất cả Khối Lớp</option>
                  {[1, 2, 3, 4, 5].map((g) => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-indigo-200 uppercase block mb-1">Môn Học:</label>
                <select
                  value={bankFilterSubject}
                  onChange={(e) => setBankFilterSubject(e.target.value)}
                  className="w-full bg-slate-800/80 border border-indigo-600/50 rounded-xl p-2 text-xs font-semibold text-white outline-none"
                >
                  <option value="">Tất cả Môn</option>
                  <option value="math">Toán Học</option>
                  <option value="vietnamese">Tiếng Việt</option>
                  <option value="english">Tiếng Anh</option>
                  <option value="science">Khoa Học</option>
                  <option value="logic">Tư Duy Logic</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-indigo-200 uppercase block mb-1">Tìm Kiếm:</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={bankFilterSearch}
                      onChange={(e) => setBankFilterSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') fetchBankQuestions(1); }}
                      placeholder="Tìm đề bài, chủ đề, kỹ năng..."
                      className="w-full bg-slate-800/80 border border-indigo-600/50 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-white outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchBankQuestions(1)}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Filter className="w-3.5 h-3.5" /> Lọc
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* View 1: Blueprints Grid */}
          {blueprintTab === 'recipes' && (
            <div className="space-y-6">
              {/* Blueprint Filter Bar Card */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Khối Lớp:</label>
                    <select
                      value={bpFilterGrade}
                      onChange={(e) => setBpFilterGrade(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="">Tất cả Khối Lớp</option>
                      {[1, 2, 3, 4, 5].map((g) => (
                        <option key={g} value={g}>Lớp {g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Môn Học:</label>
                    <select
                      value={bpFilterSubject}
                      onChange={(e) => setBpFilterSubject(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="">Tất cả Môn</option>
                      <option value="math">Toán Học</option>
                      <option value="vietnamese">Tiếng Việt</option>
                      <option value="science">Khoa Học</option>
                      <option value="logic">Tư Duy Logic</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchBlueprints}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5" /> Làm Mới Danh Sách
                </button>
              </div>

              {/* Blueprint Cards Grid */}
              {blueprintsLoading ? (
                <div className="py-16 text-center text-slate-400 text-xs font-semibold">
                  Đang tải danh sách công thức trò chơi GDPT...
                </div>
              ) : blueprints.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs font-semibold">
                  Không tìm thấy công thức nào phù hợp.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {blueprints.map((bp) => (
                    <div
                      key={bp.id}
                      className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-black uppercase">
                            Lớp {bp.grade} • {bp.subject === 'math' ? 'Toán' : bp.subject === 'vietnamese' ? 'Tiếng Việt' : bp.subject === 'science' ? 'Khoa Học' : 'Logic'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                            Engine: {bp.target_engine}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-sm text-slate-900 leading-tight">
                            {bp.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                            {bp.description}
                          </p>
                        </div>

                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-[11px]">
                          <div className="flex items-center justify-between text-slate-600 font-bold">
                            <span>Quy chuẩn bài giảng:</span>
                            <span className="text-indigo-600 font-black">{bp.total_questions} màn chơi</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Phân bổ độ khó:</span>
                            <span className="font-mono text-[10px] font-semibold text-slate-700">
                              {bp.rule_config?.difficulty_distribution
                                ? Object.entries(bp.rule_config.difficulty_distribution)
                                    .map(([k, v]) => `Cấp ${k}: ${v}`)
                                    .join(' | ')
                                : 'Tự động'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500 text-[10px]">
                            <span>Lượt đã tạo:</span>
                            <span className="font-bold">{bp.usage_count || 0} lần</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={buildingBpId === bp.id}
                          onClick={() => handleBuildFromBlueprint(bp)}
                          className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                          <span>{buildingBpId === bp.id ? 'Đang Lắp Ráp Game...' : '1-Click Sinh Game Từ Công Thức'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View 2: Custom Bank Questions */}
          {blueprintTab === 'custom_bank' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Question List Table */}
            <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>Danh Sách Câu Hỏi ({bankTotal} kết quả)</span>
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const idsOnPage = bankQuestions.map((q) => q.id);
                      const allSelected = idsOnPage.every((id) => selectedBankQids.includes(id));
                      if (allSelected) {
                        setSelectedBankQids((prev) => prev.filter((id) => !idsOnPage.includes(id)));
                      } else {
                        setSelectedBankQids((prev) => Array.from(new Set([...prev, ...idsOnPage])));
                      }
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    Chọn / Bỏ trang này
                  </button>
                </div>
              </div>

              {bankLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                  Đang tải câu hỏi từ ngân hàng...
                </div>
              ) : bankQuestions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                  Không tìm thấy câu hỏi nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {bankQuestions.map((q) => {
                    const isSelected = selectedBankQids.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleSelectBankQid(q.id)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                            : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/80'
                        }`}
                      >
                        <div className="pt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 uppercase font-mono">
                              {q.engine_code}
                            </span>
                            {q.grade != null && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                                Lớp {q.grade}
                              </span>
                            )}
                            {q.subject && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                {q.subject}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-slate-400 ml-auto">
                              Đã dùng: <strong>{q.usage_count || 0}</strong> lần
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                            {q.prompt}
                          </p>

                          {q.topic && (
                            <p className="text-[11px] text-slate-500 mt-1 truncate">
                              Chủ đề: {q.topic}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewBankQ(q);
                          }}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-slate-200 text-slate-600 border border-slate-200 text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Xem
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {bankTotal > bankPageSize && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-slate-600">
                  <span>
                    Trang {bankPage} / {Math.ceil(bankTotal / bankPageSize)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={bankPage <= 1 || bankLoading}
                      onClick={() => fetchBankQuestions(bankPage - 1)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-bold"
                    >
                      Trang Trước
                    </button>
                    <button
                      type="button"
                      disabled={bankPage >= Math.ceil(bankTotal / bankPageSize) || bankLoading}
                      onClick={() => fetchBankQuestions(bankPage + 1)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-bold"
                    >
                      Trang Sau
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Assembly Action Console */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                {/* Mode Selector Tabs */}
                <div className="flex rounded-2xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setBankActionTab('build')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      bankActionTab === 'build'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    Ghép Game Mới
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankActionTab('append')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      bankActionTab === 'append'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    Bổ Sung Vào Game Có Sẵn
                  </button>
                </div>

                {bankActionTab === 'build' ? (
                  <form onSubmit={handleBuildGameFromBank} className="space-y-3.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Tên Trò Chơi Mới: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={buildTitle}
                        onChange={(e) => setBuildTitle(e.target.value)}
                        placeholder="Ví dụ: Thử Thách Trắc Nghiệm Thông Minh"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Mô Tả Trò Chơi: <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={buildDesc}
                        onChange={(e) => setBuildDesc(e.target.value)}
                        placeholder="Tóm tắt nội dung học tập và kỹ năng rèn luyện cho bé..."
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Template Code:</label>
                        <select
                          value={buildTemplate}
                          onChange={(e) => setBuildTemplate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                        >
                          <option value="quiz">quiz</option>
                          <option value="matching">matching</option>
                          <option value="math">math</option>
                          <option value="sequence">sequence</option>
                          <option value="memory">memory</option>
                          <option value="language">language</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Danh Mục:</label>
                        <select
                          value={buildCategory}
                          onChange={(e) => setBuildCategory(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                        >
                          <option value="iq">Tư Duy IQ</option>
                          <option value="math">Toán Học</option>
                          <option value="language">Ngôn Ngữ</option>
                          <option value="science">Khoa Học</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Lớp từ:</label>
                        <input
                          type="number"
                          min={1}
                          max={9}
                          value={buildGradeFrom}
                          onChange={(e) => setBuildGradeFrom(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Đến lớp:</label>
                        <input
                          type="number"
                          min={1}
                          max={9}
                          value={buildGradeTo}
                          onChange={(e) => setBuildGradeTo(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Giá (Xu):</label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={buildPrice}
                          onChange={(e) => setBuildPrice(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-semibold text-center"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading || selectedBankQids.length === 0}
                        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                      >
                        <Layers className="w-4 h-4" />
                        <span>
                          {loading ? 'Đang Ghép Game...' : `Ghép Thành Game Mới (${selectedBankQids.length} Màn)`}
                        </span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Chọn Game Đích Cần Bổ Sung:
                      </label>
                      <select
                        value={bankTargetGameId}
                        onChange={(e) => setBankTargetGameId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none"
                      >
                        {games.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.thumbnail || '🎮'} {g.title} ({g.levels?.length || 0} màn) {g.is_seed ? '[Gốc]' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-1">
                      <p className="font-bold">Lưu ý bổ sung màn chơi:</p>
                      <p className="text-[11px]">
                        Các câu hỏi được chọn ({selectedBankQids.length} câu) sẽ được thêm tuần tự vào cuối danh sách màn chơi của game đích dưới dạng bản sao độc lập (snapshot).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddQuestionsToGame}
                      disabled={loading || selectedBankQids.length === 0 || !bankTargetGameId}
                      className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {loading ? 'Đang Bổ Sung...' : `Bổ Sung ${selectedBankQids.length} Câu Vào Game`}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Live Preview Modal / Card if previewBankQ */}
              {previewBankQ && (
                <div className="bg-white p-4 rounded-3xl border border-indigo-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-indigo-700 uppercase">
                      Xem Trước Câu Hỏi: {previewBankQ.engine_code}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewBankQ(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕ Đóng
                    </button>
                  </div>

                  <QuestionRenderer
                    question={{
                      id: previewBankQ.id,
                      question_type: previewBankQ.engine_code,
                      prompt: previewBankQ.prompt,
                      points: 25,
                      data: previewBankQ.data,
                    } as any}
                    levelNum={1}
                    xpReward={80}
                    coinReward={20}
                    onSuccess={() => alert('Thử nghiệm câu hỏi từ Ngân hàng thành công!')}
                    onBack={() => setPreviewBankQ(null)}
                  />
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* Mode 4: Import JSON Pack — Quality Gate Staging & Interactive Preview (Phase 3) */}
      {mode === 'import_pack' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header Card & Guidance */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Nhập Nội Dung Từ AI Bên Ngoài (JSON Import Staging)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sử dụng ChatGPT, Claude hoặc Gemini bên ngoài để tạo JSON chuẩn theo mẫu, sau đó dán vào đây để kiểm định trước khi lưu.
                  </p>
                </div>
              </div>

              {/* Template Picker & Copy Button */}
              <div className="flex items-center gap-2">
                <select
                  value={packTemplate}
                  onChange={(e) => setPackTemplate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-hidden"
                >
                  <option value="quiz">Trắc Nghiệm (quiz)</option>
                  <option value="matching">Ghép Cặp (matching)</option>
                  <option value="sequence">Dãy Số (sequence)</option>
                  <option value="math">Toán Học (math)</option>
                  <option value="memory">Lật Thẻ (memory)</option>
                  <option value="sorting">Sắp Xếp (sorting)</option>
                  <option value="language">Ngôn Ngữ (language)</option>
                  <option value="flashcard">Flashcard (flashcard)</option>
                  <option value="observation">Quan Sát (observation)</option>
                  <option value="coding">Lập Trình (coding)</option>
                </select>

                <button
                  type="button"
                  onClick={handleCopyTemplatePrompt}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                  title="Sao chép prompt mẫu kèm cấu trúc JSON để dán vào ChatGPT / Claude"
                >
                  {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedTemplate ? 'Đã sao chép prompt!' : 'Sao chép Prompt mẫu'}</span>
                </button>
              </div>
            </div>

            {/* Notice */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Quy tắc chất lượng nội dung:</span>
                <span className="text-amber-800 ml-1">
                  Hệ thống không tự ý nhân bản câu hỏi (chấm dứt padding spam). Mỗi màn chơi cần có nội dung thật.
                  Để đủ điều kiện xuất bản lên Chợ Game, trò chơi cần có tối thiểu 5 màn chơi hợp lệ.
                </span>
              </div>
            </div>

            {/* JSON Input Area */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                <span>Dán nội dung JSON pack vào đây:</span>
                <span className="text-[11px] font-normal text-slate-400 font-mono">Tối đa 2MB · Tự động làm sạch XSS</span>
              </label>
              <textarea
                value={packJson}
                onChange={(e) => {
                  setPackJson(e.target.value);
                  if (importPreview) setImportPreview(null);
                }}
                rows={10}
                placeholder='{\n  "title": "Toán Nhanh Lớp 1",\n  "template_code": "math",\n  "category": "math",\n  "levels": [ ... ]\n}'
                className="w-full font-mono text-xs bg-slate-950 text-emerald-300 border border-slate-800 rounded-2xl p-4 outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={previewLoading || !packJson.trim()}
                onClick={handlePreviewPack}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>{previewLoading ? 'Đang thẩm định nội dung…' : 'Kiểm Tra & Xem Trước (Quality Gate)'}</span>
              </button>

              {importPreview?.valid && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleImportPack()}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{loading ? 'Đang nạp dữ liệu…' : 'Xác Nhận Nạp Vào Kho Game'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quality Gate Verification Report & Live Preview */}
          {importPreview && (
            <div className="space-y-6">
              {/* Quality Gate Report Card */}
              <div
                className={`p-5 rounded-3xl border shadow-xs ${
                  importPreview.valid
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-current/10">
                  <div className="flex items-center gap-2 font-black text-sm">
                    {importPreview.valid ? (
                      <>
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <span>KẾT QUẢ: ĐẠT TIÊU CHUẨN QUALITY GATE</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-5 h-5 text-rose-600" />
                        <span>KẾT QUẢ: PHÁT HIỆN LỖI CHẤT LƯỢNG NỘI DUNG</span>
                      </>
                    )}
                  </div>

                  {importPreview.stats && (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
                      <span className="px-2.5 py-1 bg-white/80 rounded-lg shadow-2xs">
                        {importPreview.stats.total_levels} màn chơi
                      </span>
                      <span className="px-2.5 py-1 bg-white/80 rounded-lg shadow-2xs">
                        {importPreview.stats.unique_questions}/{importPreview.stats.total_questions} câu độc nhất
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg shadow-2xs ${
                        importPreview.stats.safe_for_kids ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {importPreview.stats.safe_for_kids ? 'An toàn K-12: Đạt' : 'An toàn K-12: Vi phạm'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Errors list */}
                {importPreview.errors.length > 0 && (
                  <div className="mb-3">
                    <h5 className="font-bold text-xs text-rose-800 mb-1">Các lỗi cần chỉnh sửa trước khi nhập:</h5>
                    <ul className="list-disc list-inside text-xs text-rose-700 space-y-1">
                      {importPreview.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings list */}
                {importPreview.warnings.length > 0 && (
                  <div>
                    <h5 className="font-bold text-xs text-amber-800 mb-1">Lưu ý sư phạm & Cảnh báo:</h5>
                    <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                      {importPreview.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Interactive Gameplay Preview using QuestionRenderer */}
              {importPreview.game?.levels && importPreview.game.levels.length > 0 && (
                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/50">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                        XEM TRƯỚC TRẢI NGHIỆM THẬT (INTERACTIVE GAMEPLAY PREVIEW)
                      </span>
                      <h4 className="text-lg font-black text-white">{importPreview.game.title}</h4>
                      <span className="text-xs text-slate-400">
                        Template: <span className="font-mono text-emerald-300">{importPreview.game.template_code}</span> · Khối lớp: {importPreview.game.grade_from}–{importPreview.game.grade_to}
                      </span>
                    </div>

                    {/* Level Selector Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {importPreview.game.levels.map((lvl: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewLevelIdx(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            previewLevelIdx === idx
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          Màn {lvl.level_num || idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Render active question inside QuestionRenderer */}
                  {importPreview.game.levels[previewLevelIdx]?.questions?.[0] && (
                    <div className="text-slate-900 bg-slate-50 rounded-2xl p-4">
                      <QuestionRenderer
                        question={importPreview.game.levels[previewLevelIdx].questions[0]}
                        levelNum={importPreview.game.levels[previewLevelIdx].level_num || previewLevelIdx + 1}
                        xpReward={importPreview.game.levels[previewLevelIdx].xp_reward || 80}
                        coinReward={importPreview.game.levels[previewLevelIdx].coin_reward || 20}
                        onSuccess={() => alert('🎉 Bạn vừa hoàn thành thử thách xem trước!')}
                        onBack={() => {}}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
