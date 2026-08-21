import React, { useState, useEffect } from 'react';
import { 
  Code, Lock, CheckCircle2, Play, 
  Sparkles, Coins, ArrowLeft, Trophy 
} from 'lucide-react';
import { ScratchCourse, ScratchLesson } from '../types';
import ScratchSimulator from '../components/ScratchSimulator';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ScratchPage: React.FC = () => {
  const { user, wallet, updateUserStats, updateUserWallet } = useAuth();

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
    } catch (err) {
      console.error('Lỗi khi tải khóa học Scratch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user?.id]);

  const handleSelectLesson = async (course: ScratchCourse, lesson: ScratchLesson) => {
    if (lesson.isLocked) return;
    try {
      const detail = await api.scratch.getLessonDetail(course.id, lesson.lesson_num, user?.id);
      setSelectedLesson(detail);
      setLessonFeedback(null);
    } catch (err) {
      console.error('Lỗi khi tải chi tiết bài học Scratch:', err);
      setSelectedLesson(lesson);
    }
  };

  const handleLessonSubmit = async (submittedBlocks: string[]) => {
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

  if (selectedLesson && selectedCourse) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col gap-6 text-left">
        {/* Top bar inside simulator */}
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

        {/* Scratch Studio Simulator */}
        <ScratchSimulator
          lesson={{
            lesson_num: selectedLesson.lesson_num,
            title: selectedLesson.title,
            content: selectedLesson.description || selectedLesson.mission_prompt || '',
            target_block_sequence: Array.isArray(selectedLesson.target_block_sequence)
              ? selectedLesson.target_block_sequence.join(',')
              : (selectedLesson.target_block_sequence || ''),
            start_scene_json: typeof selectedLesson.simulation_scene === 'string'
              ? selectedLesson.simulation_scene
              : JSON.stringify(selectedLesson.simulation_scene || { cat_pos: [0, 0], star_pos: [3, 0] }),
            xp_reward: selectedLesson.xp_reward || 100,
          }}
          onLessonComplete={(xpEarned) => {
            const blocks = Array.isArray(selectedLesson.target_block_sequence)
              ? selectedLesson.target_block_sequence
              : String(selectedLesson.target_block_sequence || '').split(',').map((s) => s.trim());
            handleLessonSubmit(blocks);
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
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wider">
            <Code className="w-3.5 h-3.5" />
            HỌC LẬP TRÌNH KHỐI TRỰC QUAN
          </span>
          <h2 className="text-2xl md:text-3xl font-black mb-2">
            Học Viện Lập Trình Robot Scratch 🐱
          </h2>
          <p className="text-xs md:text-sm text-white/80 leading-relaxed">
            Lắp ráp khối lệnh logic để điều khiển phi thuyền, robot và chú mèo Scratch vượt qua các thử thách thuật toán thông minh.
          </p>
        </div>

        <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-5xl shrink-0 shadow-lg">
          🤖
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs font-medium">
          Đang tải danh sách bài học Scratch...
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl border border-indigo-100">
                    {course.thumbnail || '🚀'}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">{course.title}</h3>
                    <p className="text-xs text-slate-500">{course.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                    Khối lớp {course.grade_level}
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
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                            Bài {lesson.lesson_num}
                          </span>
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
                          {lesson.description}
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
      )}
    </div>
  );
};

export default ScratchPage;
