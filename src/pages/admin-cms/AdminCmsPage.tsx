import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Gamepad2, ShieldCheck, LogOut,
  ArrowLeft, CheckCircle2, XCircle, RefreshCw, Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Game, AdminStats } from '../../types';

type CmsTab = 'dashboard' | 'users' | 'games' | 'roles';

const ROLE_OPTIONS = ['admin', 'teacher', 'creator', 'parent', 'student', 'member'] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị',
  teacher: 'Giáo viên',
  creator: 'Creator',
  parent: 'Phụ huynh',
  student: 'Học sinh',
  member: 'Thành viên (con)',
};

export default function AdminCmsPage() {
  const { user, authToken, logout, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<CmsTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [gameStatusFilter, setGameStatusFilter] = useState('pending_review');

  const isAdmin = Boolean(authToken && user?.role === 'admin');

  const loadDashboard = useCallback(async () => {
    const data = await api.admin.getStats();
    setStats(data);
  }, []);

  const loadUsers = useCallback(async () => {
    const data = await api.admin.listUsers({
      role: userRoleFilter,
      search: userSearch.trim() || undefined,
    });
    setUsers(data || []);
  }, [userRoleFilter, userSearch]);

  const loadGames = useCallback(async () => {
    const data = await api.admin.getGameInventory(gameStatusFilter);
    setGames(data || []);
  }, [gameStatusFilter]);

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setMsg(null);
    try {
      if (tab === 'dashboard') await loadDashboard();
      if (tab === 'users' || tab === 'roles') await loadUsers();
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

  if (!authToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-900 p-8 text-center">
          <ShieldCheck className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">CMS Quản Trị Hệ Thống</h1>
          <p className="text-slate-400 text-sm mb-6">Cần đăng nhập bằng tài khoản admin để tiếp tục.</p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold"
          >
            Đăng nhập Admin
          </button>
          <Link to="/" className="block mt-4 text-sm text-slate-400 hover:text-white">← Về trang chủ</Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleRoleChange = async (userId: string, role: string) => {
    setLoading(true);
    try {
      const res = await api.admin.updateUserRole(userId, role);
      setMsg({ type: 'ok', text: res.message });
      await loadUsers();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Cập nhật role thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (gameId: string, action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      await api.admin.decideReview({ gameId, action });
      setMsg({ type: 'ok', text: action === 'approve' ? 'Đã duyệt game' : 'Đã từ chối game' });
      await loadGames();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Thao tác kiểm duyệt thất bại' });
    } finally {
      setLoading(false);
    }
  };

  const navItems: Array<{ id: CmsTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'Người dùng', icon: <Users className="w-4 h-4" /> },
    { id: 'games', label: 'Kho game / Duyệt', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'roles', label: 'Phân quyền', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-64 shrink-0 border-r border-white/10 bg-slate-900/80 p-4 flex flex-col gap-2">
        <div className="px-2 py-3 mb-2">
          <p className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold">IQ Kids · Admin</p>
          <h1 className="text-lg font-black">CMS Hệ Thống</h1>
          <p className="text-xs text-slate-400 mt-1">@{user?.username}</p>
        </div>

        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-left transition ${
              tab === item.id
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.id === 'games' && pendingCount > 0 && (
              <span className="ml-auto text-[10px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}

        <div className="mt-auto space-y-2 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-300 hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" /> Về app
          </button>
          <button
            type="button"
            onClick={() => { logout(); navigate('/'); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-rose-300 hover:bg-rose-500/10"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black capitalize">{navItems.find((n) => n.id === tab)?.label}</h2>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        </div>

        {msg && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-bold ${
            msg.type === 'ok' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
          }`}>
            {msg.text}
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Người dùng', value: stats?.totalUsers ?? '—' },
              { label: 'Tổng game', value: stats?.totalGames ?? '—' },
              { label: 'Game custom', value: stats?.customGamesCount ?? '—' },
              { label: 'Doanh thu (xu)', value: (stats?.totalRevenue ?? 0).toLocaleString('vi-VN') },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">{card.label}</p>
                <p className="text-3xl font-black mt-2">{card.value}</p>
              </div>
            ))}
            <div className="sm:col-span-2 xl:col-span-4 rounded-2xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm text-slate-300">
                CMS quản trị tại <code className="text-indigo-300">/admin</code>. Tài khoản mặc định:
                {' '}<strong>admin / 123456</strong>. Studio sáng tạo của giáo viên vẫn nằm trong app chính.
              </p>
            </div>
          </div>
        )}

        {(tab === 'users' || tab === 'roles') && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tìm username / tên / id..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm outline-none focus:border-indigo-400"
                />
              </div>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm"
              >
                <option value="all">Tất cả role</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadUsers}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold"
              >
                Lọc
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-slate-400 text-left">
                  <tr>
                    <th className="px-4 py-3 font-bold">Người dùng</th>
                    <th className="px-4 py-3 font-bold">Role</th>
                    <th className="px-4 py-3 font-bold">XP / Level</th>
                    <th className="px-4 py-3 font-bold">Ví (xu)</th>
                    {tab === 'roles' && <th className="px-4 py-3 font-bold">Đổi quyền</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="font-bold">{u.name}</p>
                        <p className="text-xs text-slate-500">@{u.username} · {u.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 text-xs font-bold">
                          {ROLE_LABEL[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{u.xp} XP · Lv.{u.level}</td>
                      <td className="px-4 py-3 font-mono">{(u.wallet_balance || 0).toLocaleString('vi-VN')}</td>
                      {tab === 'roles' && (
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="px-2 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>
                            ))}
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Không có người dùng</td>
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                    gameStatusFilter === s.id ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Tab mặc định chỉ hiện game <strong className="text-amber-300">chờ duyệt</strong>.
              Game đã approve nằm ở bộ lọc “Đã duyệt” / “Toàn bộ kho”.
            </p>

            <div className="grid gap-3">
              {games.map((g) => (
                <div key={g.id} className="rounded-2xl border border-white/10 bg-slate-900 p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
                  <div>
                    <p className="font-black text-base">{g.thumbnail} {g.title}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {g.id} · {g.template_code} · {g.is_published ? 'Published' : 'Unpublished'} ·{' '}
                      <span className="text-amber-300">{g.review_status}</span>
                    </p>
                  </div>
                  {!g.is_seed && g.review_status === 'pending_review' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleReview(g.id, 'approve')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(g.id, 'reject')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {games.length === 0 && (
                <p className="text-center text-slate-500 py-10">Không có game trong kho</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
