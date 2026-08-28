import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Gamepad2,
  ArrowLeft, CheckCircle2, XCircle, RefreshCw, Search, Eye, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Game, AdminStats } from '../../types';
import { paths } from '../../routes/paths';
import QuestionRenderer from '../../components/QuestionRenderer';
import { FREE_LEVEL_COUNT } from '../../lib/gameAccess';
import { useAppData } from '../../layouts/AppShell';

type CmsTab = 'dashboard' | 'users' | 'games';

const ROLE_OPTIONS = ['admin', 'teacher', 'creator', 'student', 'member'] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị',
  teacher: 'Giáo viên',
  creator: 'Creator',
  student: 'Học sinh',
  member: 'Thành viên',
};

function tabFromPath(pathname: string): CmsTab {
  if (pathname.startsWith(paths.admin.users)) return 'users';
  if (pathname.startsWith(paths.admin.games)) return 'games';
  return 'dashboard';
}

export default function AdminCmsPage() {
  const { user, authToken, openAuthModal } = useAuth();
  const { refreshGames } = useAppData();
  const { pathname } = useLocation();
  const tab = tabFromPath(pathname);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [gameStatusFilter, setGameStatusFilter] = useState('pending_review');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [previewLevelIdx, setPreviewLevelIdx] = useState(0);

  const isAdmin = Boolean(authToken && user?.role === 'admin');

  const loadDashboard = useCallback(async () => {
    setStats(await api.admin.getStats());
  }, []);

  const loadUsers = useCallback(async () => {
    const data = await api.admin.listUsers({
      role: userRoleFilter,
      search: userSearch.trim() || undefined,
    });
    setUsers(data || []);
  }, [userRoleFilter, userSearch]);

  const loadGames = useCallback(async () => {
    setGames((await api.admin.getGameInventory(gameStatusFilter)) || []);
  }, [gameStatusFilter]);

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setMsg(null);
    try {
      if (tab === 'dashboard') await loadDashboard();
      if (tab === 'users') await loadUsers();
      if (tab === 'games') await loadGames();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Không tải được dữ liệu CMS' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, tab, loadDashboard, loadUsers, loadGames]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pendingCount = useMemo(
    () => games.filter((g) => g.review_status === 'pending_review').length,
    [games],
  );

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) || null,
    [games, selectedGameId],
  );

  useEffect(() => {
    setSelectedGameId(null);
    setPreviewLevelIdx(0);
  }, [gameStatusFilter]);

  useEffect(() => {
    if (selectedGameId && !games.some((g) => g.id === selectedGameId)) {
      setSelectedGameId(null);
      setPreviewLevelIdx(0);
    }
  }, [games, selectedGameId]);

  useEffect(() => {
    setPreviewLevelIdx(0);
  }, [selectedGameId]);

  const navItems: Array<{ to: string; id: CmsTab; label: string; icon: React.ReactNode }> = [
    { to: paths.admin.root, id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: paths.admin.users, id: 'users', label: 'Người dùng', icon: <Users className="w-4 h-4" /> },
    { to: paths.admin.games, id: 'games', label: 'Kho game / Duyệt', icon: <Gamepad2 className="w-4 h-4" /> },
  ];

  if (!authToken) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-indigo-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">🛡️</div>
        <h1 className="mb-2 text-xl font-black text-slate-800">CMS Quản trị hệ thống</h1>
        <p className="mb-5 text-sm text-slate-500">Cần đăng nhập bằng tài khoản admin để tiếp tục.</p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Đăng nhập Admin
        </button>
        <Link to={paths.home} className="mt-4 block text-sm text-slate-500 hover:text-indigo-600">← Về trang chủ</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to={paths.home} replace />;
  }

  const handleReview = async (gameId: string, action: 'approve' | 'reject') => {
    const title = games.find((g) => g.id === gameId)?.title || 'game';
    setLoading(true);
    try {
      await api.admin.decideReview({ gameId, action });
      if (selectedGameId === gameId) {
        setSelectedGameId(null);
        setPreviewLevelIdx(0);
      }
      if (action === 'approve') {
        setMsg({
          type: 'ok',
          text: `Đã duyệt “${title}” — đã publish lên Chợ Game. Mở tab Đã duyệt / Chợ Game để xem.`,
        });
        // Rời hàng đợi chờ duyệt → chuyển sang tab Đã duyệt để thấy ngay
        if (gameStatusFilter === 'pending_review') {
          setGameStatusFilter('approved');
        } else {
          await loadGames();
        }
        await refreshGames();
      } else {
        setMsg({
          type: 'ok',
          text: `Đã từ chối “${title}” — xem lại ở tab Từ chối (không bị xóa).`,
        });
        if (gameStatusFilter === 'pending_review') {
          setGameStatusFilter('rejected');
        } else {
          await loadGames();
        }
        await refreshGames();
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Thao tác kiểm duyệt thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const openPreview = (game: Game) => {
    setSelectedGameId(game.id);
    setPreviewLevelIdx(0);
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 text-left">
      {/* Hero */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-tr from-slate-900 via-indigo-950 to-purple-900 text-white p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-pink-500/20 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-1">IQ Kids · Admin CMS</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Quản trị hệ thống</h1>
            <p className="text-sm text-indigo-200/90 mt-1">
              Xin chào <strong className="text-white">@{user?.username}</strong> — dashboard, người dùng & kho game / kiểm duyệt.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={paths.home}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Về app
            </Link>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Sub nav pills */}
      <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" aria-label="CMS">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.id === 'dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
            {item.id === 'games' && pendingCount > 0 && (
              <span className="ml-1 text-[10px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {msg && (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-bold border ${
            msg.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {msg.text}
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Người dùng', value: stats?.totalUsers ?? '—', tone: 'text-indigo-700' },
            { label: 'Tổng game', value: stats?.totalGames ?? '—', tone: 'text-slate-800' },
            { label: 'Game custom', value: stats?.customGamesCount ?? '—', tone: 'text-purple-700' },
            { label: 'Doanh thu (xu)', value: (stats?.totalRevenue ?? 0).toLocaleString('vi-VN'), tone: 'text-pink-600 font-mono' },
          ].map((card) => (
            <div key={card.label} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{card.label}</p>
              <p className={`text-3xl font-black mt-2 ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Tìm username / tên / id..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-indigo-400 focus:bg-white"
              />
            </div>
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
            >
              <option value="all">Tất cả role</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadUsers}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold"
            >
              Lọc
            </button>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-bold">Người dùng</th>
                  <th className="px-4 py-3 font-bold">Role</th>
                  <th className="px-4 py-3 font-bold">XP / Level</th>
                  <th className="px-4 py-3 font-bold">Ví (xu)</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-400">@{u.username} · {u.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.xp} XP · Lv.{u.level}</td>
                    <td className="px-4 py-3 font-mono text-pink-600 font-bold">
                      {(u.wallet_balance || 0).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">Không có người dùng</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'games' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([
              { id: 'pending_review', label: 'Chờ duyệt' },
              { id: 'approved', label: 'Đã duyệt' },
              { id: 'rejected', label: 'Từ chối' },
              { id: 'all', label: 'Toàn bộ kho' },
            ] as const).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setGameStatusFilter(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  gameStatusFilter === s.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Chọn một game để <strong className="text-indigo-700">xem nhanh nội dung</strong>.
            Duyệt / từ chối chỉ đổi trạng thái — game không bị xóa (chuyển sang tab Đã duyệt / Từ chối).
          </p>

          <div className={`grid gap-4 ${selectedGame ? 'lg:grid-cols-2' : ''}`}>
            <div className="grid gap-3 min-w-0 content-start">
              {games.map((g) => {
                const isSelected = selectedGameId === g.id;
                return (
                  <div
                    key={g.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openPreview(g)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openPreview(g);
                      }
                    }}
                    className={`rounded-3xl border p-4 flex flex-col gap-3 shadow-xs cursor-pointer transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-50/60 ring-1 ring-indigo-200'
                        : 'border-slate-200/80 bg-white hover:border-indigo-200 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-2xl shrink-0">
                        {g.thumbnail || '🎮'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-800 truncate">{g.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {g.template_code} · {g.levels?.length || 0} màn · Lớp {g.grade_from}-{g.grade_to} ·{' '}
                          <span className="font-bold text-amber-700">{g.review_status}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {g.creator_name || '—'} · {g.is_published ? 'Published' : 'Unpublished'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openPreview(g)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" /> {isSelected ? 'Đang xem' : 'Xem nhanh'}
                      </button>
                      {!g.is_seed && g.review_status === 'pending_review' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReview(g.id, 'approve')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReview(g.id, 'reject')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Từ chối
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {games.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400 text-sm">
                  Không có game trong bộ lọc này
                </div>
              )}
            </div>

            {selectedGame && (
              <div className="rounded-3xl border border-indigo-200 bg-white shadow-sm overflow-hidden lg:sticky lg:top-4 self-start">
                <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1">
                      Xem nhanh nội dung
                    </p>
                    <h3 className="text-base font-black text-slate-800 truncate">{selectedGame.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {selectedGame.description || selectedGame.detailed_description || '—'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      {selectedGame.template_code} · {selectedGame.levels?.length || 0} màn ·{' '}
                      {FREE_LEVEL_COUNT} free đầu
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGameId(null);
                      setPreviewLevelIdx(0);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                    title="Đóng preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {(selectedGame.levels?.length || 0) > 0 ? (
                  <>
                    <div className="px-4 pt-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-50">
                      {selectedGame.levels.map((lvl, idx) => (
                        <button
                          key={lvl.id || idx}
                          type="button"
                          onClick={() => setPreviewLevelIdx(idx)}
                          className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                            previewLevelIdx === idx
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          Màn {lvl.level_num || idx + 1}
                          {(lvl.level_num || idx + 1) <= FREE_LEVEL_COUNT ? (
                            <span className="ml-1 opacity-70">·free</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                    <div className="p-4 bg-slate-50/80">
                      {selectedGame.levels[previewLevelIdx]?.questions?.[0] ? (
                        <div key={`${selectedGame.id}-${previewLevelIdx}-${selectedGame.levels[previewLevelIdx].questions[0].id}`}>
                          <QuestionRenderer
                            question={selectedGame.levels[previewLevelIdx].questions[0] as any}
                            levelNum={selectedGame.levels[previewLevelIdx].level_num || previewLevelIdx + 1}
                            xpReward={selectedGame.levels[previewLevelIdx].xp_reward || 80}
                            coinReward={selectedGame.levels[previewLevelIdx].coin_reward || 20}
                            onSuccess={() => undefined}
                            onBack={() => {
                              setSelectedGameId(null);
                              setPreviewLevelIdx(0);
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 text-center py-8">Màn này chưa có câu hỏi.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-10">Game chưa có màn chơi.</p>
                )}

                {!selectedGame.is_seed && selectedGame.review_status === 'pending_review' && (
                  <div className="flex gap-2 p-4 border-t border-slate-100 bg-white">
                    <button
                      type="button"
                      onClick={() => handleReview(selectedGame.id, 'approve')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(selectedGame.id, 'reject')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Từ chối
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
