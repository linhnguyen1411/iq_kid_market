import React, { useState, useEffect, useCallback } from 'react';
import {
  Code, Plus, Trash2, Pencil, CheckCircle2, XCircle,
  ExternalLink, Layers, BookOpen, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ScratchCourse, ScratchLesson } from '../../types';
import { api } from '../../services/api';
import { paths } from '../../routes/paths';
import { playSynthSound } from '../../components/game-engines/soundUtils';

export const AdminScratchTab: React.FC = () => {
  const [courses, setCourses] = useState<ScratchCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Lesson Form
  const [lessonNum, setLessonNum] = useState<number>(1);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [targetSeq, setTargetSeq] = useState('move,move,turn_right,move');
  const [startScene, setStartScene] = useState('{"cat_pos":[0,0],"star_pos":[2,0],"obstacles":[]}');
  const [xpReward, setXpReward] = useState(30);
  const [engineType, setEngineType] = useState<'algorithm_maze' | 'scratch_studio'>('algorithm_maze');

  // New Course Form Modal / toggle
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [newCourseDifficulty, setNewCourseDifficulty] = useState('Cơ bản');
  const [newCourseType, setNewCourseType] = useState<'algorithm_maze' | 'scratch_studio'>('algorithm_maze');

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.scratch.getCourses();
      setCourses(data || []);
      if (!selectedCourseId && data && data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi tải danh sách khóa học Scratch' });
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  const clearLessonForm = () => {
    setEditingLessonId(null);
    setLessonNum((selectedCourse?.lessons?.length || 0) + 1);
    setLessonTitle('');
    setLessonContent('Lắp ráp các khối lệnh để điều khiển nhân vật hoàn thành nhiệm vụ.');
    setTargetSeq('move,move');
    setStartScene('{"cat_pos":[0,0],"star_pos":[2,0],"obstacles":[]}');
    setXpReward(30);
    setEngineType(selectedCourse?.course_type || 'algorithm_maze');
  };

  const handleSelectLessonToEdit = (lesson: ScratchLesson) => {
    setEditingLessonId(Number(lesson.id) || null);
    setLessonNum(lesson.lesson_num);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content || '');
    setTargetSeq(lesson.target_block_sequence || '');
    setStartScene(lesson.start_scene_json || '');
    setXpReward(lesson.xp_reward || 30);
    setEngineType(lesson.engine_type || selectedCourse?.course_type || 'algorithm_maze');
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !lessonTitle.trim()) {
      setMsg({ type: 'err', text: 'Vui lòng nhập tên bài học!' });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      if (editingLessonId != null) {
        await api.scratch.updateLesson(editingLessonId, {
          title: lessonTitle,
          content: lessonContent,
          target_block_sequence: targetSeq,
          start_scene_json: startScene,
          xp_reward: xpReward,
          engine_type: engineType,
        });
        setMsg({ type: 'ok', text: `Đã cập nhật bài học "${lessonTitle}"!` });
      } else {
        await api.scratch.createLesson({
          course_id: selectedCourseId,
          lesson_num: lessonNum,
          title: lessonTitle,
          content: lessonContent,
          target_block_sequence: targetSeq,
          start_scene_json: startScene,
          xp_reward: xpReward,
          engine_type: engineType,
        });
        setMsg({ type: 'ok', text: `Đã thêm bài học "${lessonTitle}" vào khóa học!` });
        clearLessonForm();
      }
      playSynthSound('victory');
      await loadCourses();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi khi lưu bài học Scratch' });
      playSynthSound('incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lesson: ScratchLesson) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài học "${lesson.title}"?`)) return;
    setLoading(true);
    setMsg(null);
    try {
      await api.scratch.deleteLesson(Number(lesson.id));
      setMsg({ type: 'ok', text: `Đã xóa bài học "${lesson.title}"!` });
      playSynthSound('victory');
      if (editingLessonId === Number(lesson.id)) clearLessonForm();
      await loadCourses();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi khi xóa bài học' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      await api.scratch.createCourse({
        title: newCourseTitle,
        description: newCourseDesc || 'Khóa học lập trình kéo thả Scratch thông minh',
        difficulty: newCourseDifficulty,
        course_type: newCourseType,
      });
      setMsg({ type: 'ok', text: `Đã tạo khóa học Scratch "${newCourseTitle}"!` });
      setShowNewCourseModal(false);
      setNewCourseTitle('');
      setNewCourseDesc('');
      await loadCourses();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi khi tạo khóa học' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Code className="w-4 h-4 text-indigo-600" />
            <span>HỆ THỐNG LẬP TRÌNH & THUẬT TOÁN (SCRATCH STUDIO CMS)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị các lộ trình đào tạo: Mê Cung Thuật Toán (CSTA) và Scratch Studio Khối Lệnh (MIT).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={paths.scratch}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
          >
            <span>Mở Studio Học Sinh</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setShowNewCourseModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm Khóa Học Mới
          </button>
        </div>
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

      {/* Courses List */}
      <div className="flex flex-wrap gap-2">
        {courses.map((c) => {
          const isSelected = selectedCourseId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedCourseId(c.id);
                clearLessonForm();
              }}
              className={`px-4 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80'
              }`}
            >
              <span>{c.thumbnail || '🐒'}</span>
              <span>{c.title}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {c.lessons?.length || 0} bài
              </span>
            </button>
          );
        })}
      </div>

      {/* Course Detail & Lesson Management */}
      {selectedCourse && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Lessons Table */}
          <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Danh Sách Bài Học ({selectedCourse.lessons?.length || 0} bài)
              </h4>
              <button
                type="button"
                onClick={clearLessonForm}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Soạn bài học mới
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {(selectedCourse.lessons || []).map((l) => {
                const isEditing = editingLessonId === Number(l.id);
                return (
                  <div
                    key={l.id}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                      isEditing
                        ? 'border-indigo-400 bg-indigo-50/50'
                        : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                          {l.lesson_num}
                        </span>
                        <p className="font-bold text-xs text-slate-800 truncate">{l.title}</p>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        Lệnh: <code className="font-mono text-indigo-600 font-bold">{l.target_block_sequence || '—'}</code> · {l.xp_reward || 30} XP
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSelectLessonToEdit(l)}
                        className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 font-bold text-xs"
                        title="Chỉnh sửa bài học"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLesson(l)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 font-bold text-xs"
                        title="Xóa bài học"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {(selectedCourse.lessons || []).length === 0 && (
                <p className="text-xs text-slate-400 py-8 text-center">Khóa học này chưa có bài học nào.</p>
              )}
            </div>
          </div>

          {/* Right: Lesson Editor Form */}
          <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>{editingLessonId ? `Chỉnh Sửa Bài ${lessonNum}` : 'Soạn Bài Học Mới'}</span>
              {editingLessonId && (
                <button
                  type="button"
                  onClick={clearLessonForm}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                >
                  Hủy sửa
                </button>
              )}
            </h4>

            <form onSubmit={handleSaveLesson} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Màn số:</label>
                  <input
                    type="number"
                    value={lessonNum}
                    onChange={(e) => setLessonNum(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Thưởng XP:</label>
                  <input
                    type="number"
                    value={xpReward}
                    onChange={(e) => setXpReward(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Engine:</label>
                  <select
                    value={engineType}
                    onChange={(e) => setEngineType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                  >
                    <option value="algorithm_maze">Mê cung</option>
                    <option value="scratch_studio">Khối lệnh</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Tiêu đề bài học:</label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Ví dụ: Khởi Động Động Cơ, Bẻ Lái Tránh Chướng Ngại Vật..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nhiệm vụ & Hướng dẫn (Content):</label>
                <textarea
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Chuỗi khối lệnh mục tiêu (phân cách bằng dấu phẩy):
                </label>
                <input
                  type="text"
                  value={targetSeq}
                  onChange={(e) => setTargetSeq(e.target.value)}
                  placeholder="move,move,turn_right,move"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-indigo-700"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Cấu hình sân khấu mê cung (Start Scene JSON):
                </label>
                <textarea
                  value={startScene}
                  onChange={(e) => setStartScene(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
              >
                {loading ? 'Đang lưu…' : editingLessonId ? 'Cập Nhật Bài Học' : 'Thêm Bài Học Mới'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Course */}
      {showNewCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl max-w-md w-full space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
              TẠO KHÓA HỌC SCRATCH MỚI
            </h3>
            <form onSubmit={handleCreateCourse} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Tên khóa học:</label>
                <input
                  type="text"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="Ví dụ: Chinh phục Scratch Vũ Trụ Tinh Vân"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Mô tả:</label>
                <textarea
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Độ khó:</label>
                  <select
                    value={newCourseDifficulty}
                    onChange={(e) => setNewCourseDifficulty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                  >
                    <option value="Cơ bản">Cơ bản</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Nâng cao">Nâng cao</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Loại bài học:</label>
                  <select
                    value={newCourseType}
                    onChange={(e) => setNewCourseType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold"
                  >
                    <option value="algorithm_maze">Mê cung thuật toán</option>
                    <option value="scratch_studio">Scratch khối lệnh</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCourseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Tạo khóa học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
