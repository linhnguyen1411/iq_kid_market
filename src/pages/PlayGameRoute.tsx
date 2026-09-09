import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams, useOutletContext } from 'react-router-dom';
import GamePlayPage from './GamePlayPage';
import { useAppData } from '../layouts/AppShell';
import { paths } from '../routes/paths';
import { Game } from '../types';
import { api } from '../services/api';

export default function PlayGameRoute() {
  const { gameId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { games, setUnlockGame } = useAppData();
  const outlet = useOutletContext<{ setHideChrome?: (v: boolean) => void } | null>();
  const [fetched, setFetched] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);

  const gameFromList = useMemo(
    () => games.find((g) => g.id === gameId) || null,
    [games, gameId],
  );
  const game = gameFromList || fetched;
  const levelNum = Math.max(1, parseInt(search.get('man') || '1', 10) || 1);

  useEffect(() => {
    outlet?.setHideChrome?.(true);
    return () => outlet?.setHideChrome?.(false);
  }, [outlet]);

  useEffect(() => {
    if (!gameId || gameFromList) return;
    let cancelled = false;
    setLoading(true);
    api.games.getGameById(gameId)
      .then((g) => { if (!cancelled) setFetched(g); })
      .catch(() => { if (!cancelled) setFetched(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gameId, gameFromList]);

  if (!gameId) return <Navigate to={paths.marketplace} replace />;
  if (gameId === 'g_scratch_studio' || game?.category === 'scratch') {
    return <Navigate to={paths.scratch} replace />;
  }

  if (loading && !game) {
    return (
      <div className="py-16 text-center text-sm text-slate-400 font-bold">Đang tải màn chơi…</div>
    );
  }

  if (!game) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-500 mb-4">Không tìm thấy game <code>{gameId}</code>.</p>
        <button
          type="button"
          onClick={() => navigate(paths.marketplace)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
        >
          Về chợ game
        </button>
      </div>
    );
  }

  return (
    <GamePlayPage
      game={game}
      initialLevelNum={levelNum}
      onBack={() => navigate(paths.marketplace)}
      onRequestUnlock={(g) => setUnlockGame(g)}
    />
  );
}
