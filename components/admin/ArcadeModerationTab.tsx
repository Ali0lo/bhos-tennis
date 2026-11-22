'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ARCADE_INFINITY_MODE,
  ArcadeLeaderboardRow,
  deleteArcadeScore,
  fetchArcadeLeaderboard,
} from '../../lib/services/arcade';
import {
  Gamepad2,
  Search,
  RotateCcw,
  Trash2,
  Loader2,
} from 'lucide-react';

interface ArcadeModerationTabProps {
  showToast: (msg: string) => void;
}

export default function ArcadeModerationTab({ showToast }: ArcadeModerationTabProps) {
  const [arcadeScores, setArcadeScores] = useState<ArcadeLeaderboardRow[]>([]);
  const [arcadeSearch, setArcadeSearch] = useState('');
  const [loadingArcade, setLoadingArcade] = useState(false);
  const [deletingArcadeUserId, setDeletingArcadeUserId] = useState<string | null>(null);

  const loadScores = useCallback(async () => {
    setLoadingArcade(true);
    try {
      const data = await fetchArcadeLeaderboard(ARCADE_INFINITY_MODE, 100);
      setArcadeScores(data);
    } catch {
    } finally {
      setLoadingArcade(false);
    }
  }, []);

  useEffect(() => {
    void loadScores();
  }, [loadScores]);

  const handleDeleteArcadeScore = async (row: ArcadeLeaderboardRow) => {
    if (!window.confirm(`${row.full_name} üçün ${row.score} ralli nəticəsini silmək istəyirsiniz?`)) {
      return;
    }
    setDeletingArcadeUserId(row.user_id);
    try {
      await deleteArcadeScore(row.user_id, ARCADE_INFINITY_MODE, true);
      showToast(`${row.full_name} üçün nəticə uğurla silindi!`);
      await loadScores();
    } catch (err: any) {
      alert(err?.message || 'Xəta baş verdi');
    } finally {
      setDeletingArcadeUserId(null);
    }
  };

  return (
    <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-white">
              🏓 Arcade (Sonsuz Ralli) Nəticələrinin İdarə Edilməsi
            </h2>
            <p className="text-xs text-slate-400">
              Mini-oyun liderlər lövhəsindəki rekordların siyahısı və arzuolunmaz nəticələrin silinməsi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Oyunçu axtar..."
              value={arcadeSearch}
              onChange={(e) => setArcadeSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 w-48 sm:w-56"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadScores()}
            title="Yenilə"
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loadingArcade ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loadingArcade && arcadeScores.length === 0 ? (
        <div className="py-8 flex items-center justify-center text-slate-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
          <span>Arcade nəticələri yüklənir...</span>
        </div>
      ) : arcadeScores.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">
          Hələ heç bir arcade nəticəsi qeydə alınmayıb.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Sıra</th>
                <th className="py-2.5 px-3">Oyunçu</th>
                <th className="py-2.5 px-3">İxtisas / Qrup</th>
                <th className="py-2.5 px-3 text-right">Rekord (Ralli)</th>
                <th className="py-2.5 px-3 text-center">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {arcadeScores
                .filter((r) =>
                  arcadeSearch.trim() === ''
                    ? true
                    : (r.full_name || '').toLowerCase().includes(arcadeSearch.toLowerCase()) ||
                      (r.department || '').toLowerCase().includes(arcadeSearch.toLowerCase())
                )
                .map((row, idx) => (
                  <tr key={row.user_id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-white">{row.full_name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {row.department || 'Tələbə'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-rose-400">
                      {row.score} ralli
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        disabled={deletingArcadeUserId === row.user_id}
                        onClick={() => handleDeleteArcadeScore(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/15 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-[11px] font-semibold transition disabled:opacity-50"
                      >
                        {deletingArcadeUserId === row.user_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        <span>Sil</span>
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
