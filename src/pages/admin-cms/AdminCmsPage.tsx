import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, NavLink, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Gamepad2, Tags, BookOpen, Code,
  ArrowLeft, CheckCircle2, XCircle, RefreshCw, Search, Eye, X, Pencil, Plus, Trash2, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Game, AdminStats, GameCategory } from '../../types';
import { paths } from '../../routes/paths';
import QuestionRenderer from '../../components/QuestionRenderer';
import { FREE_LEVEL_COUNT } from '../../lib/gameAccess';
import { useAppData } from '../../layouts/AppShell';
import { AdminLevelBuilderTab } from './AdminLevelBuilderTab';
import { AdminScratchTab } from './AdminScratchTab';

type CmsTab = 'dashboard' | 'users' | 'games' | 'builder' | 'scratch' | 'categories';

const ROLE_OPTIONS = ['admin', 'teacher', 'creator', 'student', 'member'] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: 'Quản trị',
  teacher: 'Giáo viên',
  creator: 'Creator',
  student: 'Học sinh',
  member: 'Thành viên',
};

const AVATAR_OPTIONS = [
  { id: 'smile_tiger', label: 'Hổ Trí Tuệ', emoji: '🐯' },
  { id: 'logic_owl', label: 'Cú Logic', emoji: '🦉' },
  { id: 'cool_fox', label: 'Cáo Nhanh Trí', emoji: '🦊' },
  { id: 'smart_panda', label: 'Gấu Panda', emoji: '🐼' },
  { id: 'quick_rabbit', label: 'Thỏ Siêu Phàm', emoji: '🐰' },
  { id: 'brave_dragon', label: 'Rồng Dũng Cảm', emoji: '🐲' },
];

const AVATAR_EMOJI: Record<string, string> = {
  smile_tiger: '🐯',
  logic_owl: '🦉',
  cool_fox: '🦊',
  smart_panda: '🐼',
  quick_rabbit: '🐰',
  brave_dragon: '🐲',
};

const GAME_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'iq', label: 'Tư Duy IQ Não Bộ' },
  { value: 'math', label: 'Toán Học Logic' },
  { value: 'scratch', label: 'Lập Trình & Thuật Toán' },
  { value: 'vietnamese', label: 'Tiếng Việt & Ngôn Ngữ' },
];

const categoryLabel = (cat: string, categories?: GameCategory[]) => {
  const fromApi = categories?.find((c) => c.code === cat);
  if (fromApi) return fromApi.label;
  return GAME_CATEGORIES.find((c) => c.value === cat)?.label || cat;
};

function tabFromPath(pathname: string): CmsTab {
  if (pathname.startsWith(paths.admin.users)) return 'users';
  if (pathname.startsWith(paths.admin.games)) return 'games';
  if (pathname.startsWith(paths.admin.builder)) return 'builder';
  if (pathname.startsWith(paths.admin.scratch)) return 'scratch';
  if (pathname.startsWith(paths.admin.categories)) return 'categories';
  return 'dashboard';
}

export default function AdminCmsPage() {
  const { user, authToken, openAuthModal } = useAuth();
  const { refreshGames, refreshCategories } = useAppData();
  const { pathname } = useLocation();
  const tab = tabFromPath(pathname);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [gameStatusFilter, setGameStatusFilter] = useState('all');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [previewLevelIdx, setPreviewLevelIdx] = useState(0);
  const [editCategory, setEditCategory] = useState('iq');
  const [savingCategory, setSavingCategory] = useState(false);

  // User CRUD States
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState('student');
  const [createGrade, setCreateGrade] = useState('1');
  const [createInitialBalance, setCreateInitialBalance] = useState('0');
  const [createAvatar, setCreateAvatar] = useState('smile_tiger');

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('student');
  const [editGrade, setEditGrade] = useState('1');
  const [editAvatar, setEditAvatar] = useState('smile_tiger');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editWalletBalance, setEditWalletBalance] = useState('0');

  const [newCatCode, setNewCatCode] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🎮');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatSort, setNewCatSort] = useState('10');
  const [editingCatCode, setEditingCatCode] = useState<string | null>(null);
  const [editCatLabel, setEditCatLabel] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');
  const [editCatSort, setEditCatSort] = useState('0');
  const [editCatActive, setEditCatActive] = useState(true);

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

  const loadCategories = useCallback(async () => {
    setCategories((await api.admin.listCategories()) || []);
  }, []);

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setMsg(null);
    try {
      if (tab === 'dashboard') await loadDashboard();
      if (tab === 'users') await loadUsers();
      if (tab === 'games') await loadGames();
      if (tab === 'games' || tab === 'categories') await loadCategories();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Không tải được dữ liệu CMS' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, tab, loadDashboard, loadUsers, loadGames, loadCategories]);

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

  useEffect(() => {
    if (selectedGame) {
      setEditCategory(selectedGame.category || 'iq');
    }
  }, [selectedGame]);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleDeleteGame = async (gameId: string, gameTitle: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa trò chơi "${gameTitle}"?\nHành động này sẽ xóa vĩnh viễn dữ liệu liên quan và không thể hoàn tác!`)) {
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.deleteGame(gameId);
      setMsg({ type: 'ok', text: res.message || `Đã xóa trò chơi "${gameTitle}" thành công!` });
      if (selectedGameId === gameId) {
        setSelectedGameId(null);
      }
      await loadGames();
      await refreshGames();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Lỗi khi xóa trò chơi' });
    } finally {
      setLoading(false);
    }
  };

  const navItems: Array<{ to: string; id: CmsTab; label: string; icon: React.ReactNode }> = [
    { to: paths.admin.root, id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: paths.admin.users, id: 'users', label: 'Người dùng', icon: <Users className="w-4 h-4" /> },
    { to: paths.admin.games, id: 'games', label: 'Kho game & Duyệt', icon: <Gamepad2 className="w-4 h-4" /> },
    { to: paths.admin.builder, id: 'builder', label: 'Thiết kế màn chơi', icon: <BookOpen className="w-4 h-4" /> },
    { to: paths.admin.scratch, id: 'scratch', label: 'Lập trình Scratch', icon: <Code className="w-4 h-4" /> },
    { to: paths.admin.categories, id: 'categories', label: 'Thể loại game', icon: <Tags className="w-4 h-4" /> },
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
    setEditCategory(game.category || 'iq');
  };

  const handleSaveCategory = async () => {
    if (!selectedGame || selectedGame.is_seed) return;
    setSavingCategory(true);
    setMsg(null);
    try {
      const res = await api.admin.updateGame(selectedGame.id, { category: editCategory });
      const updated = res.game;
      setGames((prev) =>
        prev.map((g) => (g.id === selectedGame.id ? { ...g, category: updated?.category ?? editCategory } : g)),
      );
      setMsg({
        type: 'ok',
        text: res.message?.trim() || `Đã cập nhật thể loại thành “${categoryLabel(editCategory)}”.`,
      });
      await refreshGames();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Không lưu được thể loại' });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleCreateCategory = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.createCategory({
        code: newCatCode,
        label: newCatLabel,
        icon: newCatIcon,
        description: newCatDesc || undefined,
        sort_order: parseInt(newCatSort, 10) || 0,
      });
      setMsg({ type: 'ok', text: res.message || 'Đã tạo thể loại.' });
      setNewCatCode('');
      setNewCatLabel('');
      setNewCatIcon('🎮');
      setNewCatDesc('');
      setNewCatSort('10');
      await loadCategories();
      await refreshCategories();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Không tạo được thể loại' });
    } finally {
      setLoading(false);
    }
  };

  const startEditCategoryRow = (cat: GameCategory) => {
    setEditingCatCode(cat.code);
    setEditCatLabel(cat.label);
    setEditCatIcon(cat.icon || '🎮');
    setEditCatDesc(cat.description || '');
    setEditCatSort(String(cat.sort_order ?? 0));
    setEditCatActive(cat.is_active);
  };

  const handleSaveCategoryRow = async () => {
    if (!editingCatCode) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.updateCategory(editingCatCode, {
        label: editCatLabel,
        icon: editCatIcon,
        description: editCatDesc || undefined,
        sort_order: parseInt(editCatSort, 10) || 0,
        is_active: editCatActive,
      });
      setMsg({ type: 'ok', text: res.message || 'Đã cập nhật thể loại.' });
      setEditingCatCode(null);
      await loadCategories();
      await refreshCategories();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Không cập nhật được thể loại' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (code: string) => {
    if (!window.confirm(`Xóa hoặc ẩn thể loại "${code}"?`)) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.admin.deleteCategory(code);
      setMsg({ type: 'ok', text: res.message || 'Đã xử lý thể loại.' });
      if (editingCatCode === code) setEditingCatCode(null);
      await loadCategories();
      await refreshCategories();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Không xóa được thể loại' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateUser = () => {
    setCreateUsername('');
    setCreatePassword('');
    setCreateName('');
    setCreateRole('student');
    setCreateGrade('1');
    setCreateInitialBalance('0');
    setCreateAvatar('smile_tiger');
    setShowCreateUserModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername.trim() || !createPassword.trim() || !createName.trim()) {
      setMsg({ type: 'err', text: 'Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu và họ tên.' });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await api.admin.createUser({
        username: createUsername.trim(),
        password: createPassword.trim(),
        name: createName.trim(),
        role: createRole,
        grade: createRole === 'student' ? createGrade : undefined,
        avatar: createAvatar,
        initial_balance: Number(createInitialBalance) || 0,
      });
      setShowCreateUserModal(false);
      setMsg({ type: 'ok', text: `Tạo tài khoản @${createUsername.trim()} thành công!` });
      await loadUsers();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Không thể tạo người dùng' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditRole(u.role || 'student');
    setEditGrade(u.grade ? String(u.grade) : '1');
    setEditAvatar(u.avatar || 'smile_tiger');
    setEditNewPassword('');
    setEditWalletBalance(String(u.wallet_balance ?? 0));
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      setMsg({ type: 'err', text: 'Họ tên không được để trống.' });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await api.admin.updateUser(editingUser.id, {
        name: editName.trim(),
        role: editRole,
        grade: editRole === 'student' ? editGrade : undefined,
        avatar: editAvatar,
        password: editNewPassword.trim() ? editNewPassword.trim() : undefined,
        wallet_balance: Number(editWalletBalance) || 0,
      });
      setEditingUser(null);
      setMsg({ type: 'ok', text: `Đã cập nhật thông tin người dùng @${editingUser.username}!` });
      await loadUsers();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Không thể cập nhật người dùng' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (u: any) => {
    if (u.id === user?.id) {
      alert('Không thể xóa tài khoản Admin đang đăng nhập!');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa tài khoản @${u.username} (${u.name})? Toàn bộ ví, tiến độ học, game đã mua sẽ bị xoá vĩnh viễn.`)) {
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      await api.admin.deleteUser(u.id);
      setMsg({ type: 'ok', text: `Đã xóa tài khoản @${u.username} thành công!` });
      await loadUsers();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message || 'Không thể xoá người dùng' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex flex-col md:flex-row w-full bg-slate-50 text-left">
      {/* Left Sidebar Menu */}
      <aside className="w-full md:w-64 shrink-0 bg-white border-r border-slate-200/80 flex flex-col justify-between md:sticky md:top-18 md:h-[calc(100vh-4.5rem)] z-20">
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/80">
                ADMIN CMS v2.0
              </span>
              <p className="text-xs text-slate-500 font-medium mt-1">
                @{user?.username}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              title="Làm mới dữ liệu"
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible no-scrollbar" aria-label="CMS Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.id === 'dashboard'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm shadow-indigo-200 scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.id === 'games' && pendingCount > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {pendingCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer shortcut */}
        <div className="p-4 border-t border-slate-100 hidden md:block">
          <Link
            to={paths.home}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về sàn game</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
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
              { label: 'Doanh thu (Sao IQ)', value: (stats?.totalRevenue ?? 0).toLocaleString('vi-VN'), tone: 'text-pink-600 font-mono' },
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
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
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
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold cursor-pointer"
              >
                Lọc
              </button>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateUser}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm người dùng</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-bold">Người dùng</th>
                  <th className="px-4 py-3 font-bold">Role</th>
                  <th className="px-4 py-3 font-bold">Lớp</th>
                  <th className="px-4 py-3 font-bold">XP / Level</th>
                  <th className="px-4 py-3 font-bold">Ví (Sao IQ)</th>
                  <th className="px-4 py-3 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl shrink-0 p-1 rounded-xl bg-slate-100 border border-slate-200/60">
                          {AVATAR_EMOJI[u.avatar] || '🐯'}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">{u.name}</p>
                          <p className="text-xs text-slate-400">@{u.username} · {u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {u.role === 'student' && u.grade ? `Lớp ${u.grade}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.xp} XP · Lv.{u.level}</td>
                    <td className="px-4 py-3 font-mono text-pink-600 font-bold">
                      {(u.wallet_balance || 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Chỉnh sửa người dùng"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.id === user?.id}
                          className={`p-2 rounded-xl transition-colors ${
                            u.id === user?.id
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                          }`}
                          title={u.id === user?.id ? 'Không thể xoá chính mình' : 'Xoá người dùng'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">Không có người dùng</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Create User Modal */}
          {showCreateUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
              <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-600" />
                    <span>Thêm người dùng mới</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Tên đăng nhập (Username) *</label>
                    <input
                      type="text"
                      required
                      value={createUsername}
                      onChange={(e) => setCreateUsername(e.target.value)}
                      placeholder="vd: kid_minhanh"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Mật khẩu *</label>
                    <input
                      type="text"
                      required
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="Mật khẩu tài khoản"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      required
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="vd: Nguyễn Minh Anh"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Vai trò (Role)</label>
                      <select
                        value={createRole}
                        onChange={(e) => setCreateRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>
                        ))}
                      </select>
                    </div>

                    {createRole === 'student' ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Khối lớp</label>
                        <select
                          value={createGrade}
                          onChange={(e) => setCreateGrade(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none"
                        >
                          <option value="1">Lớp 1</option>
                          <option value="2">Lớp 2</option>
                          <option value="3">Lớp 3</option>
                          <option value="4">Lớp 4</option>
                          <option value="5">Lớp 5</option>
                        </select>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Linh vật hiển thị</label>
                    <div className="grid grid-cols-6 gap-2">
                      {AVATAR_OPTIONS.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setCreateAvatar(av.id)}
                          className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                            createAvatar === av.id
                              ? 'border-indigo-500 bg-indigo-50/80 scale-105 shadow-sm'
                              : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-2xl">{av.emoji}</span>
                          <span className="text-[9px] font-bold text-slate-600 mt-1 truncate w-full text-center">
                            {av.label.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Số dư Sao IQ khởi tạo</label>
                    <input
                      type="number"
                      min="0"
                      value={createInitialBalance}
                      onChange={(e) => setCreateInitialBalance(e.target.value)}
                      placeholder="0"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold focus:bg-white focus:border-indigo-500 outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Đơn vị: Sao IQ. Ví dụ: 50 Sao IQ.</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowCreateUserModal(false)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm disabled:opacity-50"
                    >
                      {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
              <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                      <Pencil className="w-5 h-5 text-indigo-600" />
                      <span>Chỉnh sửa tài khoản</span>
                    </h3>
                    <p className="text-xs text-slate-400">@{editingUser.username} · ID: {editingUser.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Vai trò (Role)</label>
                      <select
                        value={editRole}
                        disabled={editingUser.id === user?.id}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>
                        ))}
                      </select>
                      {editingUser.id === user?.id && (
                        <p className="text-[10px] text-amber-600 mt-0.5">Không thể tự hạ quyền admin</p>
                      )}
                    </div>

                    {editRole === 'student' ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Khối lớp</label>
                        <select
                          value={editGrade}
                          onChange={(e) => setEditGrade(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none"
                        >
                          <option value="1">Lớp 1</option>
                          <option value="2">Lớp 2</option>
                          <option value="3">Lớp 3</option>
                          <option value="4">Lớp 4</option>
                          <option value="5">Lớp 5</option>
                        </select>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Linh vật hiển thị</label>
                    <div className="grid grid-cols-6 gap-2">
                      {AVATAR_OPTIONS.map((av) => (
                        <button
                          key={av.id}
                          type="button"
                          onClick={() => setEditAvatar(av.id)}
                          className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                            editAvatar === av.id
                              ? 'border-indigo-500 bg-indigo-50/80 scale-105 shadow-sm'
                              : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-2xl">{av.emoji}</span>
                          <span className="text-[9px] font-bold text-slate-600 mt-1 truncate w-full text-center">
                            {av.label.split(' ')[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Mật khẩu mới (Reset mật khẩu)</label>
                    <input
                      type="text"
                      value={editNewPassword}
                      onChange={(e) => setEditNewPassword(e.target.value)}
                      placeholder="Để trống nếu không muốn đổi mật khẩu"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Số dư Ví Sao IQ</label>
                    <input
                      type="number"
                      min="0"
                      value={editWalletBalance}
                      onChange={(e) => setEditWalletBalance(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold focus:bg-white focus:border-indigo-500 outline-none text-pink-600"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Đơn vị: Sao IQ. Khi thay đổi số dư, hệ thống tự động ghi nhật ký giao dịch điều chỉnh.</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm disabled:opacity-50"
                    >
                      {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
                          {g.template_code} · {categoryLabel(g.category, categories)} · {g.levels?.length || 0} màn · Lớp{' '}
                          {g.grade_from}-{g.grade_to} ·{' '}
                          <span className="font-bold text-amber-700">{g.review_status}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {g.creator_name || '—'} · {g.is_published ? 'Published' : 'Unpublished'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                      <button
                        type="button"
                        onClick={() => navigate(`${paths.admin.builder}?gameId=${g.id}`)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                        title="Thiết kế và sửa các màn chơi cho game này"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Thiết kế màn
                      </button>
                      {(g.id === 'g_scratch_studio' || g.category === 'scratch') && (
                        <Link
                          to={paths.scratch}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white"
                          title="Hệ sinh thái Lập Trình & Thuật Toán"
                        >
                          <Code className="w-3.5 h-3.5" /> Lập Trình Scratch
                        </Link>
                      )}
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
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteGame(g.id, g.title)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold"
                          title="Xóa vĩnh viễn trò chơi này"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Xóa
                        </button>
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
                      {selectedGame.template_code} · {categoryLabel(selectedGame.category, categories)} ·{' '}
                      {selectedGame.levels?.length || 0} màn · {FREE_LEVEL_COUNT} free đầu
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

                {!selectedGame.is_seed && (
                  <div className="px-4 py-3 border-b border-slate-100 bg-white">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 block mb-1.5">
                      Thể loại (Chợ Game)
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="flex-1 min-w-[140px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
                      >
                        {categories.filter((c) => c.is_active).map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                        {categories.length === 0 &&
                          GAME_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleSaveCategory}
                        disabled={
                          savingCategory || editCategory === (selectedGame.category || 'iq')
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {savingCategory ? 'Đang lưu…' : 'Lưu thể loại'}
                      </button>
                    </div>
                  </div>
                )}

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

                <div className="flex flex-wrap items-center gap-2 p-4 border-t border-slate-100 bg-slate-50/60">
                  <button
                    type="button"
                    onClick={() => {
                      const currentLvl = selectedGame.levels?.[previewLevelIdx];
                      const currentLvlNum = currentLvl ? (currentLvl.level_num || previewLevelIdx + 1) : 1;
                      navigate(`${paths.admin.builder}?gameId=${selectedGame.id}&levelNum=${currentLvlNum}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Soạn thảo màn chơi này (Màn {selectedGame.levels?.[previewLevelIdx]?.level_num || previewLevelIdx + 1})
                  </button>

                  {(selectedGame.id === 'g_scratch_studio' || selectedGame.category === 'scratch') && (
                    <Link
                      to={paths.scratch}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                    >
                      <Code className="w-3.5 h-3.5" /> Mở Scratch Studio
                    </Link>
                  )}

                  {!selectedGame.is_seed && selectedGame.review_status === 'pending_review' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReview(selectedGame.id, 'approve')}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(selectedGame.id, 'reject')}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Từ chối
                      </button>
                    </>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteGame(selectedGame.id, selectedGame.title)}
                      className="px-3 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold"
                      title="Xóa vĩnh viễn trò chơi này"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa game
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'builder' && (
        <AdminLevelBuilderTab
          games={games}
          onRefreshGames={async () => {
            await loadGames();
            await refreshGames();
          }}
          initialGameId={searchParams.get('gameId')}
          initialLevelNum={searchParams.get('levelNum') ? parseInt(searchParams.get('levelNum')!, 10) : null}
        />
      )}

      {tab === 'scratch' && (
        <AdminScratchTab />
      )}

      {tab === 'categories' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Thêm thể loại mới
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Mã thể loại (slug) dùng trong game và bộ lọc Chợ Game — chữ thường, không dấu (vd:{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">science</code>).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <input
                value={newCatCode}
                onChange={(e) => setNewCatCode(e.target.value)}
                placeholder="Mã (vd: science)"
                className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono outline-none focus:border-indigo-400"
              />
              <input
                value={newCatLabel}
                onChange={(e) => setNewCatLabel(e.target.value)}
                placeholder="Tên hiển thị"
                className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-indigo-400"
              />
              <input
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                placeholder="Icon emoji"
                className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-indigo-400"
              />
              <input
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Mô tả ngắn (tuỳ chọn)"
                className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm md:col-span-2 outline-none focus:border-indigo-400"
              />
              <input
                type="number"
                value={newCatSort}
                onChange={(e) => setNewCatSort(e.target.value)}
                placeholder="Thứ tự"
                className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <button
              type="button"
              disabled={loading || !newCatCode.trim() || !newCatLabel.trim()}
              onClick={handleCreateCategory}
              className="mt-4 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tạo thể loại
            </button>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-bold">Icon</th>
                  <th className="px-4 py-3 font-bold">Mã</th>
                  <th className="px-4 py-3 font-bold">Tên</th>
                  <th className="px-4 py-3 font-bold">Game</th>
                  <th className="px-4 py-3 font-bold">TT</th>
                  <th className="px-4 py-3 font-bold">Active</th>
                  <th className="px-4 py-3 font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.code} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-xl">{cat.icon || '🎮'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{cat.code}</td>
                    <td className="px-4 py-3">
                      {editingCatCode === cat.code ? (
                        <input
                          value={editCatLabel}
                          onChange={(e) => setEditCatLabel(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-sm"
                        />
                      ) : (
                        <span className="font-bold text-slate-800">{cat.label}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{cat.game_count ?? 0}</td>
                    <td className="px-4 py-3">
                      {editingCatCode === cat.code ? (
                        <input
                          type="number"
                          value={editCatSort}
                          onChange={(e) => setEditCatSort(e.target.value)}
                          className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-sm"
                        />
                      ) : (
                        cat.sort_order
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingCatCode === cat.code ? (
                        <input
                          type="checkbox"
                          checked={editCatActive}
                          onChange={(e) => setEditCatActive(e.target.checked)}
                          className="w-4 h-4"
                        />
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            cat.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {cat.is_active ? 'Hiện' : 'Ẩn'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {editingCatCode === cat.code ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSaveCategoryRow}
                              className="p-2 rounded-lg bg-emerald-600 text-white"
                              title="Lưu"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCatCode(null)}
                              className="p-2 rounded-lg bg-slate-200 text-slate-600"
                              title="Hủy"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditCategoryRow(cat)}
                              className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50"
                              title="Sửa"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.code)}
                              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"
                              title="Xóa / ẩn"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      Chưa có thể loại — hệ thống sẽ seed mặc định khi backend khởi động.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
