import React, { useState, useEffect, useRef } from 'react';
import { 
  Code, Lock, CheckCircle2, Play, 
  Sparkles, Coins, ArrowLeft, Trophy,
  Compass, Bot, Layers, BookOpen, Rocket, Check, Flame,
  Folder, Plus, Trash2, Copy, Download, Upload, Clock, FileCode2
} from 'lucide-react';
import { ScratchCourse, ScratchLesson, ScratchProjectSummary } from '../types';
import UnifiedExerciseRenderer from '../components/exercise-engine/UnifiedExerciseRenderer';
import ScratchStudioEngine from '../components/scratch-studio/ScratchStudioEngine';
import ScratchAnalyticsWidget from '../components/scratch-studio/ScratchAnalyticsWidget';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ScratchPage: React.FC = () => {
  const { user, wallet, updateUserStats, updateUserWallet } = useAuth();

  // Active Pedagogical Track: 'algorithm_maze' (Lớp 1-3) | 'scratch_studio' (Lớp 3-9)
  const [activeTrack, setActiveTrack] = useState<'algorithm_maze' | 'scratch_studio'>('algorithm_maze');
  const [isFreeStudioOpen, setIsFreeStudioOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Quản lý dự án của bé (Phase 6)
  const [userProjects, setUserProjects] = useState<ScratchProjectSummary[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);

  const [courses, setCourses] = useState<ScratchCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<ScratchCourse | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<ScratchLesson | null>(null);
  const [lessonFeedback, setLessonFeedback] = useState<{
    success: boolean;
    message: string;
    xpAwarded?: number;
    coinAwarded?: number;
    hint?: string;
  } | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await api.scratch.getCourses(user?.id);
      setCourses(data);
      if (data.length > 0 && !selectedCourse) {
        setSelectedCourse(data[0]);
      }
    } finally {
      setLoading(false);
    }
  };
  const fetchUserProjects = async () => {
    if (!user) return;
    setLoadingProjects(true);
    try {
      const projs = await api.scratch.getProjects();
      setUserProjects(projs);
    } catch (err) {
      console.error('Lỗi khi tải danh sách dự án:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchUserProjects();
  }, [user?.id]);

  const handleCreateNewProject = () => {
    setCurrentProjectId(null);
    setIsFreeStudioOpen(true);
  };

  const handleOpenProject = (projectId: string) => {
    setCurrentProjectId(projectId);
    setIsFreeStudioOpen(true);
  };

  const handleDuplicateProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    try {
      await api.scratch.duplicateProject(projectId);
      await fetchUserProjects();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi nhân bản dự án!');
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Bé có chắc chắn muốn xóa dự án "${title}" không?`)) return;
    try {
      await api.scratch.deleteProject(projectId);
      await fetchUserProjects();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa dự án!');
    }
  };

  const handleQuickExportSb3 = async (e: React.MouseEvent, projectId: string, title: string) => {
    e.stopPropagation();
    try {
      const blob = await api.scratch.exportSb3({ title, project_data: {} }, projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = title.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_') || 'du_an_scratch';
      a.download = `${safeTitle}.sb3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải xuống file .sb3!');
    }
  };

  const handleUploadSb3File = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await api.scratch.importSb3(file, true);
      if (res.saved_project_id) {
        setCurrentProjectId(res.saved_project_id);
        setIsFreeStudioOpen(true);
        await fetchUserProjects();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đọc file .sb3!');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleSelectLesson = async (course: ScratchCourse, lesson: ScratchLesson) => {
    if (lesson.isLocked) return;
    try {
      const detail = await api.scratch.getLessonDetail(course.id, lesson.lesson_num, user?.id);
      setSelectedLesson(detail);
      setLessonFeedback(null);
    } catch (err) {
      console.error('Lỗi khi tải chi tiết bài học:', err);
      setSelectedLesson(lesson);
    }
  };

  const handleLessonSubmit = async (submittedBlocks: any) => {
    if (!user || !selectedCourse || !selectedLesson) return;

    try {
      const res = await api.scratch.submitLesson({
        userId: user.id,
        courseId: selectedCourse.id,
        lessonNum: selectedLesson.lesson_num,
        submittedSequence: submittedBlocks,
      });

      setLessonFeedback({
        success: res.success,
        message: res.message,
        xpAwarded: res.xpAwarded,
        coinAwarded: res.coinAwarded,
        hint: res.hint,
      });

      if (res.success) {
        updateUserStats(res.xpAwarded, res.newLevel);
        if (res.coinAwarded && res.coinAwarded > 0 && wallet) {
          updateUserWallet((wallet.balance || 0) + res.coinAwarded);
        }
        // Refresh courses to update progression lock
        await fetchCourses();
      }
    } catch (err: any) {
      setLessonFeedback({
        success: false,
        message: err.message || 'Lỗi kiểm tra khối lệnh!',
      });
    }
  };

  // Filter courses for active track
  const filteredCourses = courses.filter((c) => {
    if (activeTrack === 'algorithm_maze') {
      return !c.course_type || c.course_type === 'algorithm_maze';
    }
    return c.course_type === 'scratch_studio';
  });

  const getEngineBadge = (engineType?: string) => {
    switch (engineType) {
      case 'scratch_studio':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">🚀 Scratch Studio</span>;
      case 'block_sequence':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">🧩 Sắp xếp</span>;
      case 'block_quiz':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">❓ Trắc nghiệm</span>;
      case 'block_predict':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">🔮 Đoán mã</span>;
      case 'block_debug':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">🐞 Gỡ lỗi</span>;
      case 'algorithm_maze':
      default:
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">🧭 Mê cung</span>;
    }
  };

  // Render Free Scratch Studio Sandbox or Project Editor
  if (isFreeStudioOpen) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col gap-6 text-left">
        <ScratchStudioEngine
          isSandboxMode
          initialProjectId={currentProjectId}
          onBack={() => {
            setIsFreeStudioOpen(false);
            setCurrentProjectId(null);
            fetchUserProjects();
          }}
        />
      </div>
    );
  }

  // Render Lesson Player
  if (selectedLesson && selectedCourse) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col gap-6 text-left">
        {/* Top bar inside player */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <button
            onClick={() => {
              setSelectedLesson(null);
              setLessonFeedback(null);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Danh Sách Bài</span>
          </button>

          <div className="text-center">
            <h2 className="text-sm font-black text-slate-800 line-clamp-1">{selectedCourse.title}</h2>
            <span className="text-[10px] font-mono font-bold text-indigo-600">
              Bài {selectedLesson.lesson_num}: {selectedLesson.title}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>+{selectedLesson.xp_reward || 100} XP</span>
          </div>
        </div>

        {/* Feedback Alert if any */}
        {lessonFeedback && (
          <div
            className={`p-4 rounded-2xl border text-xs font-medium ${
              lessonFeedback.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <p className="font-bold">{lessonFeedback.message}</p>
            {lessonFeedback.hint && (
              <p className="mt-1 text-slate-600">💡 Gợi ý: {lessonFeedback.hint}</p>
            )}
          </div>
        )}

        {/* Unified Exercise Player */}
        <UnifiedExerciseRenderer
          lesson={selectedLesson}
          onLessonComplete={(submitted) => {
            handleLessonSubmit(submitted);
          }}
          onBack={() => {
            setSelectedLesson(null);
            setLessonFeedback(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
            <Code className="w-3.5 h-3.5" />
            HỌC VIỆN LẬP TRÌNH & THUẬT TOÁN CHO BÉ
          </span>
          <h2 className="text-2xl md:text-3xl font-black mb-2">
            Rèn Luyện Tư Duy Thuật Toán & Lập Trình 🐱🤖
          </h2>
          <p className="text-xs md:text-sm text-white/80 leading-relaxed">
            Học lập trình theo lộ trình sư phạm chuẩn quốc tế: Khởi đầu với Mê Cung Thuật Toán trực quan cho bé nhỏ, tiến tới Scratch Studio sáng tạo game và phim hoạt hình cho bé lớn.
          </p>
        </div>

        <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-5xl shrink-0 shadow-lg">
          🤖
        </div>
      </div>

      {/* 2. Pedagogical Track Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs">
        <button
          onClick={() => setActiveTrack('algorithm_maze')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-black text-xs md:text-sm transition-all cursor-pointer ${
            activeTrack === 'algorithm_maze'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Tư Duy Thuật Toán (Mê Cung Robot)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/20 text-white">
            Lớp 1 - 3
          </span>
        </button>

        <button
          onClick={() => setActiveTrack('scratch_studio')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-black text-xs md:text-sm transition-all cursor-pointer ${
            activeTrack === 'scratch_studio'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Rocket className="w-4 h-4" />
          <span>Scratch Studio (MIT Chuẩn)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
            Lớp 3 - 9
          </span>
        </button>
      </div>

      {/* 3. Track Content */}
      {activeTrack === 'algorithm_maze' ? (
        /* Track 1: Algorithm Maze Courses */
        loading ? (
          <div className="text-center py-16 text-slate-400 text-xs font-medium">
            Đang tải lộ trình bài học Mê Cung Thuật Toán...
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl border border-indigo-100">
                      {course.thumbnail || '🧭'}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800">{course.title}</h3>
                      <p className="text-xs text-slate-500">{course.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                      Độ khó: {course.difficulty || 'Cơ bản'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                      {course.lessons?.length || 0} Bài Học
                    </span>
                  </div>
                </div>

                {/* Lessons Road Map */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {(course.lessons || []).map((lesson) => {
                    const isLocked = lesson.isLocked;
                    const isCompleted = lesson.completed;

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => handleSelectLesson(course, lesson)}
                        className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                          isLocked
                            ? 'bg-slate-50/70 border-slate-200/60 opacity-60 cursor-not-allowed'
                            : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer transform hover:-translate-y-0.5'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                                Bài {lesson.lesson_num}
                              </span>
                              {getEngineBadge(lesson.engine_type)}
                            </div>
                            {isCompleted ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Hoàn thành</span>
                              </span>
                            ) : isLocked ? (
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                Sẵn sàng
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-black text-slate-800 mb-1 line-clamp-1">
                            {lesson.title}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                            {lesson.content || lesson.description || 'Giải thuật toán điều khiển qua lưới'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-amber-600 font-bold text-[10px]">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>+{lesson.xp_reward || 100} XP</span>
                          </div>

                          {!isLocked && (
                            <span className="text-indigo-600 font-black text-[11px] flex items-center gap-1">
                              <span>Làm bài</span>
                              <Play className="w-3 h-3 fill-indigo-600" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Track 2: Scratch Studio (Blockly - MIT Standard) */
        <div className="flex flex-col gap-6">
          {/* 1. Hero Banner with Sandbox Launcher */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-6 text-white shadow-lg">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white/20 backdrop-blur-sm text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    🎉 CHÍNH THỨC RA MẮT • PHASE 4
                  </span>
                  <span className="bg-white text-orange-600 text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                    MIT Scratch 3.0 Standard
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-2">
                  Scratch Studio — Lập Trình Kéo Thả Khối Thực Thụ
                </h3>
                <p className="text-xs md:text-sm text-white/90 leading-relaxed mb-4">
                  Môi trường lập trình hoàn chỉnh ứng dụng công nghệ Google Blockly: Kéo thả 6 nhóm khối lệnh, điều khiển Sprite Chú Mèo trên Sân Khấu 480x360 theo thời gian thực!
                </p>

                <button
                  onClick={() => setIsFreeStudioOpen(true)}
                  className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white text-orange-600 hover:bg-orange-50 font-black text-xs md:text-sm transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
                >
                  <span className="text-base">🎨</span>
                  <span>Mở Phòng Sáng Tạo Scratch Studio (Free Sandbox)</span>
                  <Rocket className="w-4 h-4 text-orange-600" />
                </button>
              </div>

              <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-5xl shrink-0 shadow-lg select-none">
                🐱
              </div>
            </div>

            {/* 4 Feature Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
                <span className="text-2xl mb-2 block">🏃‍♂️</span>
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider mb-1">Chuyển Động & Tọa Độ</h4>
                <p className="text-xs text-slate-600">Điều khiển Mèo di chuyển theo trục X/Y (-240 đến 240, -180 đến 180) và quay góc.</p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
                <span className="text-2xl mb-2 block">💬</span>
                <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider mb-1">Bong Bóng Thoại & Ngoại Hình</h4>
                <p className="text-xs text-slate-600">Nói bong bóng thoại, thay đổi kích thước % và hiện/ẩn nhân vật.</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                <span className="text-2xl mb-2 block">⚡</span>
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-1">Sự Kiện Cờ Xanh ⛳</h4>
                <p className="text-xs text-slate-600">Bắt đầu kịch bản khi bấm Cờ Xanh hoặc nhấp chuột trực tiếp vào Sprite.</p>
              </div>

              <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100">
                <span className="text-2xl mb-2 block">🔄</span>
                <h4 className="text-xs font-black text-orange-900 uppercase tracking-wider mb-1">Vòng Lặp & Điều Khiển</h4>
                <p className="text-xs text-slate-600">Lặp lại N lần, vòng lặp liên tục và lệnh chờ thời gian giây.</p>
              </div>
            </div>
          </div>

          {/* 2. Báo Cáo Năng Lực & Kỹ Năng Lập Trình (Phase 8 Analytics) */}
          <ScratchAnalyticsWidget />

          {/* 3. Project Library: Dự Án Scratch Của Bé */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                  📂
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Dự Án Scratch Của Bé</h3>
                  <p className="text-xs text-slate-500">
                    Tự động lưu trữ và đồng bộ kịch bản sáng tạo của bé trên mây
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileUploadInputRef}
                  accept=".sb3"
                  onChange={handleUploadSb3File}
                  className="hidden"
                />
                <button
                  onClick={() => fileUploadInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  title="Tải file .sb3 từ máy tính lên"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải Lên .sb3</span>
                </button>

                <button
                  onClick={handleCreateNewProject}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Dự Án Mới</span>
                </button>
              </div>
            </div>

            {/* Danh sách thẻ dự án */}
            {loadingProjects ? (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">
                Đang tải danh sách dự án của bé...
              </div>
            ) : userProjects.length === 0 ? (
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl mb-3">
                  🐱
                </div>
                <h4 className="text-sm font-black text-slate-700 mb-1">Bé chưa có dự án Scratch nào</h4>
                <p className="text-xs text-slate-500 max-w-md mb-4">
                  Hãy bấm nút <strong>"Tạo Dự Án Mới"</strong> hoặc mở <strong>"Phòng Sáng Tạo"</strong> để thỏa sức kéo thả khối lệnh và tạo ra câu chuyện của riêng mình!
                </p>
                <button
                  onClick={handleCreateNewProject}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bắt Đầu Tạo Dự Án Ngay</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userProjects.map((p) => {
                  const updatedDateStr = p.updated_at
                    ? new Date(p.updated_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Gần đây';

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleOpenProject(p.id)}
                      className="group bg-slate-50/60 hover:bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between text-left"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 text-white flex items-center justify-center text-xl shadow-xs">
                            {p.thumbnail || '🐱'}
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            Scratch 3.0
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-slate-800 line-clamp-1 group-hover:text-amber-600 transition-colors mb-1">
                          {p.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                          {p.description || 'Dự án Scratch sáng tạo kéo thả khối lệnh của học sinh'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{updatedDateStr}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDuplicateProject(e, p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Nhân bản dự án"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleQuickExportSb3(e, p.id, p.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Tải file .sb3 về máy"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteProject(e, p.id, p.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa dự án"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Scratch Studio Courses List */}
          {filteredCourses.length > 0 && (
            <div className="flex flex-col gap-8">
              <div className="flex items-center gap-2 px-1">
                <BookOpen className="w-4 h-4 text-orange-600" />
                <h3 className="text-base font-black text-slate-800">Khóa Học & Thử Thách Lập Trình Scratch</h3>
              </div>

              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-2xl border border-orange-100">
                        {course.thumbnail || '🧩'}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-800">{course.title}</h3>
                        <p className="text-xs text-slate-500">{course.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                        Độ khó: {course.difficulty || 'Trung bình'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-bold">
                        {course.lessons?.length || 0} Bài Học
                      </span>
                    </div>
                  </div>

                  {/* Lessons Road Map */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {(course.lessons || []).map((lesson) => {
                      const isLocked = lesson.isLocked;
                      const isCompleted = lesson.completed;

                      return (
                        <div
                          key={lesson.id}
                          onClick={() => handleSelectLesson(course, lesson)}
                          className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                            isLocked
                              ? 'bg-slate-50/60 border-slate-200/60 opacity-60 cursor-not-allowed'
                              : 'bg-white border-slate-200/80 hover:border-orange-300 hover:shadow-md cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-[10px] font-mono font-bold text-orange-600">
                                Bài {lesson.lesson_num}
                              </span>
                              {getEngineBadge(lesson.engine_type)}
                            </div>

                            <h4 className="text-xs font-black text-slate-800 line-clamp-1 mb-1">
                              {lesson.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">
                              {lesson.content}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                            <div className="flex items-center gap-1 font-bold text-amber-600">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>+{lesson.xp_reward || 100} XP</span>
                            </div>

                            {!isLocked && (
                              <span className="text-orange-600 font-black text-[11px] flex items-center gap-1">
                                <span>Vào học</span>
                                <Play className="w-3 h-3 fill-orange-600" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
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

export default ScratchPage;
